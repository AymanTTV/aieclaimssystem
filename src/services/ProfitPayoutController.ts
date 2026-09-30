// src/services/ProfitPayoutController.ts
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account, ProfitPayoutRecord, SharedOwnerShare, Transaction, Vehicle } from '../types';
import { sanitizeForFirestore } from './unifiedSync.service';

export interface VehicleProfitPeriodResult {
  vehicleId?: string;
  vehicleName?: string;
  accountId?: string;
  accountName?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  periodLabel: string;
  grossBilled: number;
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

export interface PayoutSettlementParams {
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

export interface AtomicPayoutResult {
  success: boolean;
  payoutRecordId?: string;
  transferTransactionId?: string;
  payoutTransactionId?: string;
  clearBalanceTransactionId?: string;
  message?: string;
  error?: string;
}

export class ProfitPayoutControllerService {
  /**
   * Calculates net profit (Gross Billed - Expenses) for a vehicle over a designated period,
   * splitting the amount based on configured ownership percentages.
   */
  public calculateNetProfit(params: {
    vehicleId?: string;
    accountId?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    transactions: Transaction[];
    accounts?: Account[];
    vehicles?: Vehicle[];
    customSplit?: SharedOwnerShare[];
  }): VehicleProfitPeriodResult {
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
      ? `${targetVehicle.regNumber || targetVehicle.registrationNumber || targetVehicle.make || ''} ${targetVehicle.model || ''}`.trim()
      : targetAccount?.vehicleName || undefined;

    const accountName = targetAccount?.name || targetVehicle?.owner?.accountName || 'Vehicle Account';

    // 1. Resolve Co-ownership configuration
    let shares: SharedOwnerShare[] = [];

    if (customSplit && customSplit.length > 0) {
      shares = customSplit;
    } else if (
      targetVehicle?.sharedOwnership &&
      targetVehicle.sharedOwnership.length > 0
    ) {
      shares = targetVehicle.sharedOwnership;
    } else if (
      targetVehicle?.owner?.sharedOwnership &&
      targetVehicle.owner.sharedOwnership.length > 0
    ) {
      shares = targetVehicle.owner.sharedOwnership;
    } else if (
      targetAccount?.sharedOwnership &&
      targetAccount.sharedOwnership.length > 0
    ) {
      shares = targetAccount.sharedOwnership;
    } else {
      // Default standard 60% Company / 40% Partner co-ownership split
      const detectedOwnerName =
        targetVehicle?.owner?.name && targetVehicle.owner.name !== 'AIE Skyline'
          ? targetVehicle.owner.name
          : targetAccount?.name && !targetAccount.name.toLowerCase().includes('aie')
          ? targetAccount.name
          : 'Partner Co-Owner';

      shares = [
        {
          ownerName: 'AIE Skyline Limited',
          sharePercentage: 60,
          isCompany: true,
          accountId: 'aie_default',
        },
        {
          ownerName: detectedOwnerName,
          sharePercentage: 40,
          isCompany: false,
          accountId: targetAccount?.id,
        },
      ];
    }

    // Ensure sum equals 100% or normalize
    const totalPct = shares.reduce((sum, s) => sum + (Number(s.sharePercentage) || 0), 0);
    const scaleFactor = totalPct > 0 ? 100 / totalPct : 1;

    // 2. Filter transactions matching vehicle / account and designated date window
    const targetVehicleAccount = accounts.find(
      (a) =>
        (vehicleId && a.vehicleId === vehicleId) ||
        (targetVehicle?.registrationNumber &&
          a.name.toLowerCase().includes(targetVehicle.registrationNumber.toLowerCase()))
    );
    const targetAccId = accountId || targetVehicleAccount?.id;

    const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    let matchedTxnCount = 0;
    let grossBilled = 0;
    let expenses = 0;

    const txList = Array.isArray(transactions) ? transactions : [];

    txList.forEach((tx) => {
      // Exclude existing profit distributions/internal transfers to avoid recursion
      const cat = String(tx.category || '').toLowerCase();
      const desc = String(tx.description || '').toLowerCase();
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

      // Date window filter match
      if (tx.date) {
        const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
        const txMs = txDate.getTime();
        if (startMs && txMs < startMs) return;
        if (endMs && txMs > endMs) return;
      }

      // Vehicle or Account filter match strictly scoped
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
          tx.accountFrom === targetAccId ||
          tx.accountTo === targetAccId ||
          tx.accountsFrom?.includes(targetAccId) ||
          tx.accountsTo?.includes(targetAccId) ||
          tx.accountId === targetAccId
        ) {
          isMatch = true;
        }
      }

      if (!isMatch) {
        return;
      }

      matchedTxnCount++;

      // Compute Income (Cash-Basis Realized) vs Expenses
      const typeStr = String(tx.type || '').toLowerCase();
      const txTypeStr = String(tx.transactionType || '').toUpperCase();
      const entryTypeStr = String(tx.entryType || '').toUpperCase();

      const isIncome =
        typeStr === 'income' ||
        txTypeStr === 'INCOME' ||
        entryTypeStr === 'CREDIT';

      const isExpense =
        typeStr === 'expense' ||
        txTypeStr === 'EXPENSE' ||
        entryTypeStr === 'DEBIT';

      if (isIncome) {
        // CASH-BASIS: Only recognize realized/collected revenue
        let collectedCash = 0;
        const status = String(tx.paymentStatus || '').toLowerCase();
        if (status === 'unpaid') {
          collectedCash = 0;
        } else if (tx.paidAmount !== undefined && tx.paidAmount !== null && tx.paidAmount > 0) {
          collectedCash = Number(tx.paidAmount);
        } else if (tx.paid !== undefined && tx.paid !== null && tx.paid > 0) {
          collectedCash = Number(tx.paid);
        } else if (status === 'paid') {
          collectedCash = Number(tx.amount || tx.customerBilled || tx.grossBilling || 0);
        } else if (status === 'partially_paid') {
          collectedCash = Number(tx.paidAmount ?? tx.paid ?? 0);
        } else if (tx.status === 'completed' && !tx.paymentStatus) {
          collectedCash = Number(tx.amount || 0);
        }
        grossBilled += Math.max(0, collectedCash);
      } else if (isExpense) {
        expenses += Math.abs(Number(tx.amount ?? 0));
      }
    });

    grossBilled = Number(grossBilled.toFixed(2));
    expenses = Number(expenses.toFixed(2));
    const netProfit = Number((grossBilled - expenses).toFixed(2));

    // 3. Compute Shares based on ownership percentages
    let companyShareAmount = 0;
    let companySharePct = 0;
    let ownerShareAmount = 0;
    let ownerSharePct = 0;
    let primaryPartnerName = 'Partner Co-Owner';

    const computedShares = shares.map((s) => {
      const normalizedPct = Number((s.sharePercentage * scaleFactor).toFixed(1));
      const shareAmt =
        netProfit > 0
          ? Number(((netProfit * normalizedPct) / 100).toFixed(2))
          : 0;

      const isCompany =
        s.isCompany === true ||
        s.ownerName.toLowerCase().includes('aie skyline') ||
        s.ownerName.toLowerCase().includes('company');

      if (isCompany) {
        companyShareAmount += shareAmt;
        companySharePct += normalizedPct;
      } else {
        ownerShareAmount += shareAmt;
        ownerSharePct += normalizedPct;
        primaryPartnerName = s.ownerName;
      }

      return {
        ownerName: s.ownerName,
        sharePercentage: normalizedPct,
        shareAmount: shareAmt,
        isCompany,
        accountId: s.accountId,
      };
    });

    // 4. Calculate current outstanding owing balance for this account
    let owingBalance = 0;
    if (accountId) {
      txList.forEach((tx) => {
        const matchesAccount =
          tx.accountFrom === accountId ||
          tx.accountTo === accountId ||
          tx.accountsFrom?.includes(accountId) ||
          tx.accountsTo?.includes(accountId) ||
          tx.accountId === accountId;

        if (!matchesAccount) return;

        const amt = Number(tx.amount || 0);
        const typeStr = (tx.type || '').toLowerCase();
        if (typeStr === 'income' || tx.transactionType === 'INCOME') {
          owingBalance += amt;
        } else if (typeStr === 'expense' || tx.transactionType === 'EXPENSE') {
          owingBalance -= amt;
        }
      });
    }

    // Format Period Label
    let periodLabel = 'All Time';
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const e = new Date(endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      periodLabel = s === e ? s : `${s} - ${e}`;
    } else if (startDate) {
      periodLabel = `Since ${new Date(startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
    } else if (endDate) {
      periodLabel = `Up to ${new Date(endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
    }

    return {
      vehicleId,
      vehicleName,
      accountId,
      accountName,
      startDate,
      endDate,
      periodLabel,
      grossBilled,
      expenses,
      netProfit,
      shares: computedShares,
      companyShareAmount: Number(companyShareAmount.toFixed(2)),
      companySharePct: Number(companySharePct.toFixed(1)),
      ownerShareAmount: Number(ownerShareAmount.toFixed(2)),
      ownerSharePct: Number(ownerSharePct.toFixed(1)),
      ownerName: primaryPartnerName,
      currentOwingBalance: Number(owingBalance.toFixed(2)),
      matchedTransactionsCount: matchedTxnCount,
    };
  }

  /**
   * Executes an ATOMIC Firestore transaction batch logging:
   * 1. Company Share internal transfer transaction to AIE SKYLINE ACCOUNTS
   * 2. Partner Co-Owner payout ledger entry
   * 3. Optional balance zero-out / reconciliation ledger entry
   * 4. Audit trail entry into 'payout_history'
   */
  public async executeProfitPayoutAtomicTransaction(
    params: PayoutSettlementParams
  ): Promise<AtomicPayoutResult> {
    try {
      const {
        vehicleId,
        vehicleName,
        sourceAccountId,
        sourceAccountName,
        companyAccountId,
        companyAccountName,
        grossBilled,
        expenses,
        totalProfit,
        companySharePct,
        companyShareAmount,
        ownerName,
        ownerSharePct,
        ownerShareAmount,
        payoutReference,
        payoutDate = new Date(),
        periodCovered,
        clearOwingBalance = false,
        clearedBalanceAmount = 0,
        notes = '',
        currentUser,
      } = params;

      if (!sourceAccountId || !payoutReference) {
        throw new Error('Source Account and Payout Reference are required for profit distribution.');
      }

      const currentUserName = currentUser?.name || currentUser?.email || 'System';
      const batch = writeBatch(db);

      const transactionsCol = collection(db, 'transactions');
      const payoutHistoryCol = collection(db, 'payout_history');

      let transferTxId: string | undefined;
      let payoutTxId: string | undefined;
      let clearTxId: string | undefined;

      // 1. Post Internal Transfer for Company Share into AIE SKYLINE ACCOUNTS
      if (companyShareAmount > 0 && companyAccountId && sourceAccountId) {
        const transferDocRef = doc(transactionsCol);
        transferTxId = transferDocRef.id;

        const transferData = sanitizeForFirestore({
          type: 'expense',
          transactionType: 'EXPENSE',
          entryType: 'DEBIT',
          category: 'Profit Share Company Transfer',
          amount: companyShareAmount,
          netAmount: companyShareAmount,
          vatAmount: 0,
          description: `Internal Transfer: ${companySharePct}% Company Share for ${periodCovered} | Vehicle: ${vehicleName || sourceAccountName}`,
          customerName: companyAccountName || 'AIE Skyline Limited',
          referenceId: payoutReference,
          sourceReferenceId: payoutReference,
          vehicleId: vehicleId || null,
          vehicleName: vehicleName || null,
          accountFrom: sourceAccountId,
          accountTo: companyAccountId,
          accountsFrom: [sourceAccountId],
          accountsTo: [companyAccountId],
          paymentMethod: 'bank_transfer',
          paymentReference: payoutReference,
          status: 'completed',
          date: Timestamp.fromDate(payoutDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUserName,
          notes: notes || undefined,
        });

        batch.set(transferDocRef, transferData);
      }

      // 2. Post External Payout Ledger Entry for Co-Owner / Partner Share
      if (ownerShareAmount > 0) {
        const payoutDocRef = doc(transactionsCol);
        payoutTxId = payoutDocRef.id;

        const payoutData = sanitizeForFirestore({
          type: 'expense',
          transactionType: 'EXPENSE',
          entryType: 'DEBIT',
          category: 'Owner Profit Payout',
          amount: ownerShareAmount,
          netAmount: ownerShareAmount,
          vatAmount: 0,
          description: `Profit Share Payout (${ownerSharePct}%): ${periodCovered} | Ref: ${payoutReference} | Paid to ${ownerName}`,
          customerName: ownerName,
          referenceId: payoutReference,
          sourceReferenceId: payoutReference,
          vehicleId: vehicleId || null,
          vehicleName: vehicleName || null,
          accountFrom: sourceAccountId,
          accountsFrom: [sourceAccountId],
          paymentMethod: 'bank_transfer',
          paymentReference: payoutReference,
          status: 'completed',
          date: Timestamp.fromDate(payoutDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUserName,
          notes: notes || undefined,
        });

        batch.set(payoutDocRef, payoutData);
      }

      // 3. Optional: Balance / Zero Out "Owing to Owners" balance if requested
      if (clearOwingBalance && clearedBalanceAmount > 0) {
        const clearDocRef = doc(transactionsCol);
        clearTxId = clearDocRef.id;

        const clearData = sanitizeForFirestore({
          type: 'income',
          transactionType: 'INCOME',
          entryType: 'CREDIT',
          category: 'Owner Balance Settlement',
          amount: clearedBalanceAmount,
          description: `Balance Clearance & Reconciliation for ${ownerName} | Payout Ref: ${payoutReference}`,
          customerName: ownerName,
          referenceId: payoutReference,
          vehicleId: vehicleId || null,
          vehicleName: vehicleName || null,
          accountTo: sourceAccountId,
          accountsTo: [sourceAccountId],
          paymentMethod: 'bank_transfer',
          paymentReference: payoutReference,
          status: 'completed',
          date: Timestamp.fromDate(payoutDate),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: currentUserName,
        });

        batch.set(clearDocRef, clearData);
      }

      // 4. Record Payout Audit Entry in 'payout_history'
      const payoutAuditDocRef = doc(payoutHistoryCol);
      const payoutRecordId = payoutAuditDocRef.id;

      const payoutRecord = sanitizeForFirestore({
        vehicleId: vehicleId || null,
        vehicleName: vehicleName || null,
        accountId: sourceAccountId,
        accountName: sourceAccountName,
        datePaid: payoutDate.toISOString(),
        periodCovered,
        grossBilled: Number(grossBilled) || 0,
        expenses: Number(expenses) || 0,
        totalProfit: Number(totalProfit) || 0,
        companySharePct: Number(companySharePct) || 0,
        companyShareAmount: Number(companyShareAmount) || 0,
        companyAccountId: companyAccountId || null,
        companyAccountName: companyAccountName || 'AIE SKYLINE ACCOUNTS',
        ownerSharePct: Number(ownerSharePct) || 0,
        ownerShareAmount: Number(ownerShareAmount) || 0,
        ownerName,
        payoutReference,
        transferTransactionId: transferTxId || null,
        payoutTransactionId: payoutTxId || null,
        clearedBalanceAmount: Number(clearedBalanceAmount) || 0,
        status: 'completed',
        createdAt: serverTimestamp(),
        createdBy: currentUserName,
        notes: notes || undefined,
      });

      batch.set(payoutAuditDocRef, payoutRecord);

      // 5. ATOMIC COMMIT: All ledger entries and audit records commit simultaneously
      await batch.commit();

      // 6. Notify Backend REST Router (Fire and forget with safety)
      try {
        await fetch('/api/finance/shared-ownership/payout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId,
            vehicleName,
            sourceAccountId,
            sourceAccountName,
            companyAccountId,
            companyAccountName,
            grossBilled,
            expenses,
            totalProfit,
            companySharePct,
            companyShareAmount,
            ownerSharePct,
            ownerShareAmount,
            ownerName,
            payoutReference,
            payoutDate: payoutDate.toISOString(),
            periodCovered,
            transferTransactionId: transferTxId,
            payoutTransactionId: payoutTxId,
            clearedBalanceAmount,
            notes,
            currentUser,
          }),
        });
      } catch (err) {
        console.warn('REST audit sync warning:', err);
      }

      return {
        success: true,
        payoutRecordId,
        transferTransactionId: transferTxId,
        payoutTransactionId: payoutTxId,
        clearBalanceTransactionId: clearTxId,
        message: `Successfully executed atomic payout settlement for ${ownerName}. Recorded in Finance Ledger.`,
      };
    } catch (error: any) {
      console.error('Error executing atomic profit payout settlement:', error);
      return {
        success: false,
        error: error?.message || 'Failed to execute profit payout settlement',
      };
    }
  }

  /**
   * Fetches the complete payout audit history trail
   */
  public async fetchPayoutHistory(filters?: {
    vehicleId?: string;
    accountId?: string;
  }): Promise<ProfitPayoutRecord[]> {
    try {
      const payoutHistoryCol = collection(db, 'payout_history');
      let q = query(payoutHistoryCol, orderBy('createdAt', 'desc'));

      if (filters?.vehicleId) {
        q = query(
          payoutHistoryCol,
          where('vehicleId', '==', filters.vehicleId),
          orderBy('createdAt', 'desc')
        );
      } else if (filters?.accountId) {
        q = query(
          payoutHistoryCol,
          where('accountId', '==', filters.accountId),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const records: ProfitPayoutRecord[] = [];

      snapshot.forEach((snap) => {
        const data = snap.data();
        records.push({
          id: snap.id,
          vehicleId: data.vehicleId,
          vehicleName: data.vehicleName,
          accountId: data.accountId,
          accountName: data.accountName,
          datePaid: data.datePaid,
          periodCovered: data.periodCovered,
          grossBilled: data.grossBilled,
          expenses: data.expenses,
          totalProfit: data.totalProfit,
          companySharePct: data.companySharePct,
          companyShareAmount: data.companyShareAmount,
          companyAccountId: data.companyAccountId,
          companyAccountName: data.companyAccountName,
          ownerSharePct: data.ownerSharePct,
          ownerShareAmount: data.ownerShareAmount,
          ownerName: data.ownerName,
          payoutReference: data.payoutReference,
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
      console.warn('Error fetching payout history from Firestore, falling back to server API:', err);
      try {
        const url = new URL('/api/finance/shared-ownership/history', window.location.origin);
        if (filters?.vehicleId) url.searchParams.set('vehicleId', filters.vehicleId);
        if (filters?.accountId) url.searchParams.set('accountId', filters.accountId);

        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.success && Array.isArray(json.logs)) {
          return json.logs;
        }
      } catch (fallbackErr) {
        console.warn('Server fallback also failed:', fallbackErr);
      }
      return [];
    }
  }
}

export const ProfitPayoutController = new ProfitPayoutControllerService();

// Standalone exports matching controller method signatures
export const calculateVehicleProfitAndShare = (
  params: Parameters<ProfitPayoutControllerService['calculateNetProfit']>[0]
) => ProfitPayoutController.calculateNetProfit(params);

export const executeProfitPayoutSettlement = (
  params: Parameters<ProfitPayoutControllerService['executeProfitPayoutAtomicTransaction']>[0]
) => ProfitPayoutController.executeProfitPayoutAtomicTransaction(params);

export const fetchProfitPayoutHistory = (
  filters?: Parameters<ProfitPayoutControllerService['fetchPayoutHistory']>[0]
) => ProfitPayoutController.fetchPayoutHistory(filters);
