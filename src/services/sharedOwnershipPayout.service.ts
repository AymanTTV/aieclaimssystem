// src/services/sharedOwnershipPayout.service.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account, ProfitPayoutRecord, SharedOwnerShare, Transaction, Vehicle } from '../types';
import { sanitizeForFirestore } from './unifiedSync.service';
import { createFinanceTransaction } from '../utils/financeTransactions';

export interface VehicleProfitCalculation {
  vehicleId?: string;
  vehicleName?: string;
  accountId?: string;
  accountName?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  periodLabel: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  shares: Array<{
    ownerName: string;
    sharePercentage: number;
    shareAmount: number;
    isCompany: boolean;
    accountId?: string;
  }>;
  companyShareAmount: number;
  companySharePct: number;
  ownerShareAmount: number;
  ownerSharePct: number;
  ownerName: string;
  currentOwingBalance: number;
  matchedTransactionsCount: number;
}

export interface PayoutExecutionParams {
  vehicleId?: string;
  vehicleName?: string;
  sourceAccountId: string;
  sourceAccountName: string;
  companyAccountId: string;
  companyAccountName: string;
  grossBilled: number;
  expenses: number;
  totalProfit: number;
  companySharePct: number;
  companyShareAmount: number;
  ownerName: string;
  ownerSharePct: number;
  ownerShareAmount: number;
  payoutReference: string;
  payoutDate: Date;
  periodCovered: string;
  clearOwingBalance?: boolean;
  clearedBalanceAmount?: number;
  notes?: string;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

/**
 * Calculates net profit and automated share distribution for a co-owned vehicle or account.
 */
export function calculateVehicleProfitAndShare(params: {
  vehicleId?: string;
  accountId?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  transactions: Transaction[];
  accounts: Account[];
  vehicles: Vehicle[];
  customSplit?: SharedOwnerShare[];
}): VehicleProfitCalculation {
  const {
    vehicleId,
    accountId,
    startDate,
    endDate,
    transactions = [],
    accounts = [],
    vehicles = [],
    customSplit,
  } = params;

  const targetVehicle = vehicles.find((v) => v.id === vehicleId);
  const targetAccount = accounts.find((a) => a.id === accountId);

  const vehicleName = targetVehicle
    ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.registrationNumber})`
    : targetAccount?.vehicleName || '';

  const accountName = targetAccount?.name || targetVehicle?.owner?.name || 'Vehicle Account';

  // 1. Determine Ownership Configuration
  let shares: SharedOwnerShare[] = [];
  if (customSplit && customSplit.length > 0) {
    shares = customSplit;
  } else if (targetAccount?.sharedOwnership && targetAccount.sharedOwnership.length > 0) {
    shares = targetAccount.sharedOwnership;
  } else if (targetVehicle?.sharedOwnership && targetVehicle.sharedOwnership.length > 0) {
    shares = targetVehicle.sharedOwnership;
  } else if (targetVehicle?.owner?.sharedOwnership && targetVehicle.owner.sharedOwnership.length > 0) {
    shares = targetVehicle.owner.sharedOwnership;
  } else {
    // Default fallback: 60% Company ("AIE Skyline Limited"), 40% Partner
    const partnerName = targetVehicle?.owner?.name || targetAccount?.name || 'Partner Co-Owner';
    shares = [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
      { ownerName: partnerName, sharePercentage: 40, isCompany: false, accountId },
    ];
  }

  // 2. Filter Transactions strictly for this Vehicle / Account
  const targetVehicleAccount = accounts.find(
    (a) =>
      (vehicleId && a.vehicleId === vehicleId) ||
      (targetVehicle?.registrationNumber &&
        a.name.toLowerCase().includes(targetVehicle.registrationNumber.toLowerCase()))
  );
  const targetAccId = accountId || targetVehicleAccount?.id;

  const startTime = startDate ? new Date(startDate).getTime() : 0;
  const endTime = endDate ? new Date(endDate).getTime() : Infinity;

  let revenue = 0;
  let expenses = 0;
  let matchedCount = 0;

  transactions.forEach((tx) => {
    // Exclude existing profit distributions/internal transfers to avoid double counting
    const cat = (tx.category || '').toLowerCase();
    const desc = (tx.description || '').toLowerCase();
    if (
      cat.includes('owner profit payout') ||
      cat.includes('profit share company transfer') ||
      cat.includes('profit share payout') ||
      cat.includes('profit distribution') ||
      desc.includes('profit share payout') ||
      desc.includes('profit share company transfer')
    ) {
      return;
    }

    const txDate = tx.date ? new Date(tx.date).getTime() : 0;
    if (txDate < startTime || txDate > endTime) {
      return;
    }

    // Match strictly by vehicleId or vehicle accountId
    let isMatch = false;
    if (vehicleId && tx.vehicleId === vehicleId) {
      isMatch = true;
    } else if (
      targetVehicle?.registrationNumber &&
      tx.vehicleName &&
      tx.vehicleName.toLowerCase().includes(targetVehicle.registrationNumber.toLowerCase())
    ) {
      isMatch = true;
    } else if (targetAccId) {
      if (
        tx.accountsFrom?.includes(targetAccId) ||
        tx.accountsTo?.includes(targetAccId) ||
        (tx as any).accountFrom === targetAccId ||
        (tx as any).accountTo === targetAccId ||
        (tx as any).accountId === targetAccId
      ) {
        isMatch = true;
      }
    }

    if (!isMatch) return;

    matchedCount++;
    const amt = Number(tx.amount || 0);
    const typeStr = (tx.type || '').toLowerCase();
    const isIncome = typeStr === 'income' || (tx as any).transactionType === 'INCOME' || (tx as any).entryType === 'CREDIT';
    const isExpense = typeStr === 'expense' || (tx as any).transactionType === 'EXPENSE' || (tx as any).entryType === 'DEBIT';

    if (isIncome) {
      // CASH-BASIS: Only recognize realized/collected revenue
      let collectedCash = 0;
      const status = (tx.paymentStatus || '').toLowerCase();
      if (status === 'unpaid') {
        collectedCash = 0;
      } else if (tx.paidAmount !== undefined && tx.paidAmount !== null && tx.paidAmount > 0) {
        collectedCash = Number(tx.paidAmount);
      } else if (tx.paid !== undefined && tx.paid !== null && tx.paid > 0) {
        collectedCash = Number(tx.paid);
      } else if (status === 'paid') {
        collectedCash = amt;
      } else if (status === 'partially_paid') {
        collectedCash = Number(tx.paidAmount ?? tx.paid ?? 0);
      } else if (tx.status === 'completed' && !tx.paymentStatus) {
        collectedCash = amt;
      }
      revenue += Math.max(0, collectedCash);
    } else if (isExpense) {
      expenses += amt;
    }
  });

  revenue = Number(revenue.toFixed(2));
  expenses = Number(expenses.toFixed(2));
  const netProfit = Number((revenue - expenses).toFixed(2));

  // 3. Compute Shares
  let companyShareAmount = 0;
  let companySharePct = 0;
  let ownerShareAmount = 0;
  let ownerSharePct = 0;
  let partnerOwnerName = 'Co-Owner';

  const computedShares = shares.map((s) => {
    const isCompany =
      s.isCompany === true ||
      s.ownerName.toLowerCase().includes('aie skyline') ||
      s.ownerName.toLowerCase().includes('company');

    const pct = Number(s.sharePercentage || 0);
    const amt = netProfit > 0 ? Number(((netProfit * pct) / 100).toFixed(2)) : 0;

    if (isCompany) {
      companyShareAmount += amt;
      companySharePct += pct;
    } else {
      ownerShareAmount += amt;
      ownerSharePct += pct;
      partnerOwnerName = s.ownerName;
    }

    return {
      ownerName: s.ownerName,
      sharePercentage: pct,
      shareAmount: amt,
      isCompany,
      accountId: s.accountId,
    };
  });

  // Calculate current owing balance for this account
  let currentOwingBalance = 0;
  if (targetAccount && targetAccount.balance < 0) {
    currentOwingBalance = Math.abs(targetAccount.balance);
  }

  // Format period label
  let periodLabel = 'All-Time';
  if (startDate && endDate) {
    const sStr = new Date(startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const eStr = new Date(endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    periodLabel = sStr === eStr ? sStr : `${sStr} - ${eStr}`;
  } else if (startDate) {
    periodLabel = `From ${new Date(startDate).toLocaleDateString('en-GB')}`;
  }

  return {
    vehicleId,
    vehicleName,
    accountId,
    accountName,
    startDate,
    endDate,
    periodLabel,
    revenue,
    expenses,
    netProfit,
    shares: computedShares,
    companyShareAmount: Number(companyShareAmount.toFixed(2)),
    companySharePct,
    ownerShareAmount: Number(ownerShareAmount.toFixed(2)),
    ownerSharePct,
    ownerName: partnerOwnerName,
    currentOwingBalance,
    matchedTransactionsCount: matchedCount,
  };
}

import { ProfitPayoutController } from './ProfitPayoutController';
export { ProfitPayoutController };

/**
 * Executes multi-account ledger transfer and payout settlement entries.
 */
export async function executeProfitPayoutSettlement(
  params: PayoutExecutionParams
): Promise<{
  success: boolean;
  payoutRecordId?: string;
  transferTransactionId?: string;
  payoutTransactionId?: string;
  message?: string;
}> {
  const result = await ProfitPayoutController.executeProfitPayoutAtomicTransaction(params);
  if (result.success && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance_updated'));
    window.dispatchEvent(new CustomEvent('accounts_updated'));
    window.dispatchEvent(new CustomEvent('payout_completed', { detail: { payoutId: result.payoutRecordId } }));
  }
  return {
    success: result.success,
    payoutRecordId: result.payoutRecordId,
    transferTransactionId: result.transferTransactionId,
    payoutTransactionId: result.payoutTransactionId,
    message: result.message || result.error,
  };
}

/**
 * Fetches payout history log for vehicles or accounts.
 */
export async function fetchProfitPayoutHistory(filter?: {
  vehicleId?: string;
  accountId?: string;
}): Promise<ProfitPayoutRecord[]> {
  try {
    const col = collection(db, 'payout_history');
    let q;
    if (filter?.vehicleId) {
      q = query(col, where('vehicleId', '==', filter.vehicleId));
    } else if (filter?.accountId) {
      q = query(col, where('accountId', '==', filter.accountId));
    } else {
      q = query(col);
    }

    const snap = await getDocs(q);
    const records: ProfitPayoutRecord[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      records.push({
        id: d.id,
        vehicleId: data.vehicleId,
        vehicleName: data.vehicleName,
        accountId: data.accountId,
        accountName: data.accountName,
        datePaid: data.datePaid?.toDate ? data.datePaid.toDate() : new Date(data.datePaid),
        periodCovered: data.periodCovered || 'N/A',
        grossBilled: Number(data.grossBilled || 0),
        expenses: Number(data.expenses || 0),
        totalProfit: Number(data.totalProfit || 0),
        companySharePct: Number(data.companySharePct || 0),
        companyShareAmount: Number(data.companyShareAmount || 0),
        companyAccountId: data.companyAccountId,
        companyAccountName: data.companyAccountName,
        ownerSharePct: Number(data.ownerSharePct || 0),
        ownerShareAmount: Number(data.ownerShareAmount || 0),
        ownerName: data.ownerName || 'Partner',
        payoutReference: data.payoutReference || 'N/A',
        transferTransactionId: data.transferTransactionId,
        payoutTransactionId: data.payoutTransactionId,
        clearedBalanceAmount: data.clearedBalanceAmount,
        status: data.status || 'completed',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        createdBy: data.createdBy,
        notes: data.notes,
      });
    });

    records.sort((a, b) => new Date(b.datePaid).getTime() - new Date(a.datePaid).getTime());
    return records;
  } catch (err) {
    console.warn('Error fetching payout history:', err);
    return [];
  }
}
