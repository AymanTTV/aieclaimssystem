// src/utils/profitCalculator.ts
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncMaintenanceRecord, syncInvoiceRecord } from '../services/unifiedSync.service';

export interface ProfitMetrics {
  customerBilled: number;
  subcontractorCost: number;
  dealerCost: number;
  netProfit: number;
  profitMargin: number;
  profitMarginPercent: number;
  vatAmount?: number;
  hasSubcontractorCost?: boolean;
  isDirectTransaction?: boolean;
  formattedNetProfit?: string;
  formattedMargin?: string;
}

/**
 * Calculates net profit and profit margin percentage
 * Subcontractor-Only Profit Trigger:
 * - Only execute Net Profit and Profit Margin (%) calculations when a positive Dealer/Subcontractor Cost is explicitly entered (Dealer Cost > 0).
 * - When "DEALER / SUBCONTRACTOR COST" is £0 (or left blank):
 *   • Do NOT calculate or display 100.0% Profit Margin or set Net Profit equal to the full Customer Billed amount.
 *   • Treat the transaction as Standard Income / Revenue (or Standard Expense), setting the "Net Profit / Mark-Up" field to £0.00 or "N/A (Direct Transaction)".
 * - In that scenario (Dealer Cost > 0):
 *   • Net Profit = Customer Billed - Dealer Cost - VAT
 *   • Profit Margin (%) = (Net Profit / Customer Billed) * 100
 */
export function calculateProfitMetrics(
  customerBilled: number = 0,
  subcontractorCost: number = 0,
  vatAmount: number = 0
): ProfitMetrics {
  const billed = Math.max(0, Number(customerBilled) || 0);
  const cost = Math.max(0, Number(subcontractorCost) || 0);
  const vat = Math.max(0, Number(vatAmount) || 0);

  const hasSubcontractorCost = cost > 0;
  const isDirectTransaction = !hasSubcontractorCost;

  let netProfit = 0;
  let profitMargin = 0;

  if (hasSubcontractorCost) {
    netProfit = Number((billed - cost - vat).toFixed(2));
    profitMargin = billed > 0 ? Number(((netProfit / billed) * 100).toFixed(2)) : 0;
  }

  return {
    customerBilled: billed,
    subcontractorCost: cost,
    dealerCost: cost,
    netProfit,
    profitMargin,
    profitMarginPercent: profitMargin,
    vatAmount: vat,
    hasSubcontractorCost,
    isDirectTransaction,
    formattedNetProfit: hasSubcontractorCost
      ? (netProfit >= 0 ? `+£${netProfit.toFixed(2)}` : `-£${Math.abs(netProfit).toFixed(2)}`)
      : '£0.00',
    formattedMargin: hasSubcontractorCost
      ? `${profitMargin.toFixed(1)}%`
      : 'N/A (Direct Transaction)',
  };
}

/**
 * Calculates Cash-Basis / Realized Profit and Margin according to collection status:
 *
 * 1. DIRECT TRANSACTIONS (subcontractorCost <= 0):
 *    - No subcontractor cost entered -> Realized Profit = £0.00, Margin = 0.0% / N/A
 *
 * 2. UNPAID TRANSACTIONS (Paid == £0.00 or Payment Status == 'UNPAID'):
 *    - Realized Profit = £0.00 (0.0% Margin)
 *
 * 3. PARTIALLY PAID TRANSACTIONS (0 < Paid < Total Billed):
 *    - Proportional Subcontractor Cost = Dealer Cost * (Paid / Total Billed)
 *    - Realized Profit = Paid Amount - Proportional Subcontractor Cost
 *
 * 4. FULLY PAID TRANSACTIONS (Payment Status == 'PAID' or Owing == £0.00 or Paid >= Total Billed):
 *    - Recognize 100% of Net Profit = Total Billed - Dealer Cost
 */
export function calculateRealizedProfit(
  customerBilled: number = 0,
  subcontractorCost: number = 0,
  paidAmount: number = 0,
  paymentStatus?: string
): {
  realizedProfit: number;
  realizedMargin: number;
  isUnpaid: boolean;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  hasSubcontractorCost?: boolean;
  isDirectTransaction?: boolean;
} {
  const billed = Math.max(0, Number(customerBilled) || 0);
  const cost = Math.max(0, Number(subcontractorCost) || 0);
  const statusStr = String(paymentStatus || '').toLowerCase();
  const paid = Math.max(0, Number(paidAmount || 0));

  // If there is NO positive subcontractor cost, do not execute profit/margin calculations
  if (cost <= 0) {
    return {
      realizedProfit: 0,
      realizedMargin: 0,
      isUnpaid: paid <= 0 || statusStr === 'unpaid',
      isFullyPaid: statusStr === 'paid' || paid >= billed,
      isPartiallyPaid: false,
      hasSubcontractorCost: false,
      isDirectTransaction: true,
    };
  }

  const isUnpaid = paid <= 0 || statusStr === 'unpaid';
  const isFullyPaid =
    !isUnpaid &&
    (statusStr === 'paid' ||
      paid >= billed ||
      (billed > 0 && Math.max(0, billed - paid) <= 0.001));
  const isPartiallyPaid = !isUnpaid && !isFullyPaid;

  if (isUnpaid) {
    return {
      realizedProfit: 0,
      realizedMargin: 0,
      isUnpaid: true,
      isFullyPaid: false,
      isPartiallyPaid: false,
      hasSubcontractorCost: true,
      isDirectTransaction: false,
    };
  }

  if (isFullyPaid) {
    const profit = Number((billed - cost).toFixed(2));
    const margin = billed > 0 ? Number(((profit / billed) * 100).toFixed(1)) : 0;
    return {
      realizedProfit: profit,
      realizedMargin: margin,
      isUnpaid: false,
      isFullyPaid: true,
      isPartiallyPaid: false,
      hasSubcontractorCost: true,
      isDirectTransaction: false,
    };
  }

  // Partially paid: Paid Amount - Proportional Subcontractor Cost
  const propCost = billed > 0 ? cost * (paid / billed) : cost;
  const profit = Number((paid - propCost).toFixed(2));
  const margin = paid > 0 ? Number(((profit / paid) * 100).toFixed(1)) : 0;
  return {
    realizedProfit: profit,
    realizedMargin: margin,
    isUnpaid: false,
    isFullyPaid: false,
    isPartiallyPaid: true,
    hasSubcontractorCost: true,
    isDirectTransaction: false,
  };
}

/**
 * Database update function: Updates subcontractor cost and calculated profit fields for a Maintenance Log
 * and automatically triggers 2-way synchronization across linked Invoices and Transactions.
 */
export async function updateMaintenanceSubcontractorCost(
  logId: string,
  subcontractorCost: number,
  customerBilled?: number
): Promise<ProfitMetrics> {
  if (!logId) throw new Error('Missing maintenance log ID');

  const logRef = doc(db, 'maintenanceLogs', logId);
  const snap = await getDoc(logRef);
  const data = snap.exists() ? snap.data() : {};
  const billed = customerBilled !== undefined ? customerBilled : Number(data.customerBilled ?? data.cost ?? 0);
  const metrics = calculateProfitMetrics(billed, subcontractorCost);

  await syncMaintenanceRecord(logId, {
    subcontractorCost: metrics.subcontractorCost,
    customerBilled: metrics.customerBilled,
    netProfit: metrics.netProfit,
    profitMarginPercent: metrics.profitMarginPercent,
    isProfitEdited: true,
  });

  return metrics;
}

/**
 * Database update function: Updates subcontractor cost and profit fields for an Invoice
 * and automatically triggers 2-way synchronization across linked MaintenanceLogs and Transactions.
 */
export async function updateInvoiceSubcontractorCost(
  invoiceId: string,
  subcontractorCost: number,
  customerBilled?: number
): Promise<ProfitMetrics> {
  if (!invoiceId) throw new Error('Missing invoice ID');

  const invRef = doc(db, 'invoices', invoiceId);
  const snap = await getDoc(invRef);
  const data = snap.exists() ? snap.data() : {};
  const billed = customerBilled !== undefined ? customerBilled : Number(data.customerBilled ?? data.total ?? data.amount ?? 0);
  const metrics = calculateProfitMetrics(billed, subcontractorCost);

  await syncInvoiceRecord(invoiceId, {
    subcontractorCost: metrics.subcontractorCost,
    customerBilled: metrics.customerBilled,
    netProfit: metrics.netProfit,
    profitMarginPercent: metrics.profitMarginPercent,
  });

  return metrics;
}

/**
 * Database update function: Updates subcontractor cost and profit fields for an Invoice Line Item
 * and synchronizes the total invoice and related records.
 */
export async function updateInvoiceLineItemSubcontractorCost(
  invoiceId: string,
  lineItemId: string,
  subcontractorCost: number,
  customerBilled?: number
): Promise<ProfitMetrics> {
  if (!invoiceId) throw new Error('Missing invoice ID');
  const invRef = doc(db, 'invoices', invoiceId);
  const snap = await getDoc(invRef);
  if (!snap.exists()) throw new Error('Invoice not found');

  const invData = snap.data();
  const lineItems: any[] = invData.lineItems || [];
  let updatedMetrics: ProfitMetrics | null = null;

  const newItems = lineItems.map((item) => {
    if (item.id === lineItemId) {
      const gross = (item.quantity || 1) * (item.unitPrice || 0);
      const discount = ((item.discount || 0) / 100) * gross;
      const billed =
        customerBilled !== undefined
          ? customerBilled
          : (gross - discount) * (item.includeVAT ? 1.2 : 1.0);
      const metrics = calculateProfitMetrics(billed, subcontractorCost);
      updatedMetrics = metrics;
      return {
        ...item,
        subcontractorCost: metrics.subcontractorCost,
        customerBilled: metrics.customerBilled,
        netProfit: metrics.netProfit,
        profitMarginPercent: metrics.profitMarginPercent,
      };
    }
    return item;
  });

  // Calculate invoice level totals
  const totalSubCost = newItems.reduce((acc, it) => acc + (Number(it.subcontractorCost) || 0), 0);
  const totalBilled =
    invData.total ||
    invData.amount ||
    newItems.reduce((acc, it) => acc + (Number(it.customerBilled) || 0), 0);
  const invoiceMetrics = calculateProfitMetrics(totalBilled, totalSubCost);

  await syncInvoiceRecord(invoiceId, {
    lineItems: newItems,
    subcontractorCost: invoiceMetrics.subcontractorCost,
    customerBilled: invoiceMetrics.customerBilled,
    netProfit: invoiceMetrics.netProfit,
    profitMarginPercent: invoiceMetrics.profitMarginPercent,
  });

  return updatedMetrics || invoiceMetrics;
}

export interface AggregateProfitSummary {
  totalRevenue: number;
  totalSubcontractorExpenses: number;
  totalNetProfit: number;
  profitMarginPercent: number;
  recordCount: number;
}

/**
 * Calculates aggregate revenue, subcontractor expenses, and net profit across records
 * with deduplication so synchronized records referencing the same order/invoice/job
 * are counted accurately.
 */
export function calculateAggregateProfitMetrics(
  records: Array<{
    id?: string;
    referenceId?: string;
    orderId?: string;
    orderNumber?: string;
    invoiceNumber?: string;
    customerBilled?: number;
    subcontractorCost?: number;
    netProfit?: number;
    amount?: number;
    total?: number;
    cost?: number;
    type?: string;
    isProfitEdited?: boolean;
  }>
): AggregateProfitSummary {
  const map = new Map<string, { maxRevenue: number; subCost: number; hasExplicitDealer: boolean }>();

  records.forEach((rec, idx) => {
    // Determine deduplication key across linked systems
    const primaryKey = rec.orderNumber || rec.orderId || rec.invoiceNumber || rec.referenceId || rec.id || `rec_${idx}`;
    const rev = Number(rec.customerBilled ?? rec.total ?? rec.amount ?? rec.cost ?? 0);
    const hasExplicitDealer = rec.subcontractorCost !== undefined && Number(rec.subcontractorCost) > 0;
    const hasEditedProfit = rec.isProfitEdited === true || (hasExplicitDealer && Number(rec.subcontractorCost) !== rev);
    
    const sub = hasEditedProfit && hasExplicitDealer
      ? Number(rec.subcontractorCost)
      : (hasExplicitDealer ? Number(rec.subcontractorCost) : 0);

    const existing = map.get(primaryKey);
    if (!existing) {
      map.set(primaryKey, {
        maxRevenue: Math.max(0, rev),
        subCost: hasExplicitDealer ? Math.max(0, sub) : 0,
        hasExplicitDealer,
      });
    } else {
      existing.maxRevenue = Math.max(existing.maxRevenue, rev);
      if (hasExplicitDealer && sub > 0) {
        existing.subCost = existing.subCost > 0 ? Math.min(existing.subCost, sub) : sub;
        existing.hasExplicitDealer = true;
      }
    }
  });

  let totalRevenue = 0;
  let totalSubcontractorExpenses = 0;
  let totalNetProfit = 0;
  let profitTrackingRevenue = 0;

  map.forEach(({ maxRevenue, subCost, hasExplicitDealer }) => {
    totalRevenue += maxRevenue;
    // Subcontractor-Only Profit Trigger:
    // Only execute Net Profit and Profit Margin (%) calculations when a positive Dealer/Subcontractor Cost is explicitly entered (Dealer Cost > 0).
    // Direct customer billing registers as Standard Income without inflating Company Net Profit!
    if (hasExplicitDealer && subCost > 0) {
      totalSubcontractorExpenses += subCost;
      totalNetProfit += Math.max(0, maxRevenue - subCost);
      profitTrackingRevenue += maxRevenue;
    }
  });

  const profitMarginPercent =
    profitTrackingRevenue > 0 ? Number(((totalNetProfit / profitTrackingRevenue) * 100).toFixed(2)) : 0;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalSubcontractorExpenses: Number(totalSubcontractorExpenses.toFixed(2)),
    totalNetProfit: Number(totalNetProfit.toFixed(2)),
    profitMarginPercent,
    recordCount: map.size,
  };
}

export interface FinanceSummaryMetrics {
  totalRevenue: number;
  totalIncomeNet: number;
  totalIncomeVat: number;
  totalCombinedExpenses: number;
  standardOperatingExpenses: number;
  verifiedSubcontractorExpenses: number;
  totalGrossExpenses: number;
  totalExpenseNet: number;
  totalExpenseVat: number;
  netProfit: number;
  profitMarginPercent: number;
  totalVatLiability: number;
}

/**
 * Dual-Mode Unified 4-Card Performance Summary Calculation Engine:
 * 
 * 1. LEGACY / UNEDITED MODE (isEdited === false or dealerCost == null):
 *    - Treat historical records strictly by their actual type: Pure INCOME or Pure EXPENSE.
 *    - Do NOT calculate or force historical records as Subcontractor / Dealer charges.
 *    - Net Profit = (Total Standard Income) - (Total Standard Expenses).
 *    - Preserves exact original numbers without distortion.
 * 
 * 2. SUBCONTRACTOR TRACKING MODE (isEdited === true):
 *    - ONLY when a record is manually opened, edited, and saved with an explicit dealer cost,
 *      apply the Subcontractor Expense and Margin formulas.
 * 
 * UNIFIED 4-CARD METRIC AGGREGATION:
 * - Card 1: TOTAL REVENUE / INCOME -> Sum of all Gross Income entries. (Display Net and VAT breakdown underneath).
 * - Card 2: TOTAL EXPENSES & SUBCONTRACTOR -> Display Standard Operating Expenses separately from Verified Subcontractor/Dealer Charges.
 * - Card 3: NET PROFIT & MARGIN -> Real Net Profit = (Total Billed Income) - (Standard Expenses + Verified Subcontractor Costs).
 * - Card 4: VAT LIABILITY / TAXES -> Collected VAT - Paid VAT.
 */
export function calculateFinanceSummaryCards(
  transactions: any[] = [],
  maintenanceLogs: any[] = [],
  invoices: any[] = []
): FinanceSummaryMetrics {
  const isPassThroughTxn = (t: any) => Boolean(
    t.isPassThrough ||
    t.passThrough ||
    t.isPassThroughMaintenance ||
    t.category === 'Pass-Through Maintenance' ||
    t.customCategory === 'Pass-Through Maintenance' ||
    ((t.entityType === 'MAINTENANCE' || String(t.category || '').toLowerCase() === 'maintenance') &&
      Number(t.subcontractorCost || t.dealerCost || 0) > 0 &&
      Math.abs(Number(t.amount || t.customerBilled || 0) - Number(t.subcontractorCost || t.dealerCost || 0)) < 0.01)
  );

  // 1. Card 1: TOTAL REVENUE / INCOME -> Sum of all Gross Income entries
  const incomeTxns = transactions.filter((t) => t.type === 'income');
  const totalRevenue = Number(
    incomeTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0).toFixed(2)
  );
  const totalIncomeNet = Number(
    incomeTxns
      .reduce(
        (sum, t) =>
          sum + (t.netAmount !== undefined ? Number(t.netAmount) : Number(t.amount) || 0),
        0
      )
      .toFixed(2)
  );
  const totalIncomeVat = Number(
    incomeTxns.reduce((sum, t) => sum + (Number(t.vatAmount) || 0), 0).toFixed(2)
  );

  // Expense transactions
  const expenseTxns = transactions.filter((t) => t.type === 'expense');
  const totalExpenseVat = Number(
    expenseTxns.reduce((sum, t) => sum + (Number(t.vatAmount) || 0), 0).toFixed(2)
  );

  // 2. Identify Verified Subcontractor / Dealer Costs (ONLY Subcontractor Tracking Mode)
  // Deduplicate by job identifier so multiple transactions for the same job don't double count dealer costs
  const verifiedJobDealerMap = new Map<string, { dealerCost: number; billedAmount: number }>();

  transactions.forEach((txn, idx) => {
    const isSubMode = txn.isProfitEdited === true || txn.isEdited === true;

    // Check linked invoice
    const linkedInv = invoices.find(
      (inv) =>
        inv.id === txn.invoiceId ||
        inv.id === txn.linkedInvoiceRef ||
        inv.id === txn.referenceId ||
        inv.id === txn.entityId ||
        (txn.invoiceNumber && inv.invoiceNumber === txn.invoiceNumber) ||
        (txn.paymentReference && inv.invoiceNumber && txn.paymentReference.includes(inv.invoiceNumber))
    );

    let explicitDealer: number | undefined = undefined;
    let jobBilled: number = Number(txn.customerBilled || txn.grossBilling || txn.amount || 0);

    if (txn.dealerCost !== undefined && Number(txn.dealerCost) > 0 && isSubMode) {
      explicitDealer = Number(txn.dealerCost);
    } else if (txn.subcontractorCost !== undefined && Number(txn.subcontractorCost) > 0 && isSubMode) {
      explicitDealer = Number(txn.subcontractorCost);
    } else if (linkedInv && (linkedInv.isEdited === true || linkedInv.isProfitEdited === true)) {
      if (linkedInv.dealerCost !== undefined && Number(linkedInv.dealerCost) > 0) {
        explicitDealer = Number(linkedInv.dealerCost);
        jobBilled = Number(linkedInv.customerBilled || linkedInv.total || jobBilled);
      } else if (linkedInv.subcontractorCost !== undefined && Number(linkedInv.subcontractorCost) > 0) {
        explicitDealer = Number(linkedInv.subcontractorCost);
        jobBilled = Number(linkedInv.customerBilled || linkedInv.total || jobBilled);
      }
    }

    if (explicitDealer !== undefined && explicitDealer > 0) {
      const jobKey =
        txn.invoiceNumber ||
        linkedInv?.invoiceNumber ||
        txn.orderNumber ||
        txn.orderId ||
        txn.referenceId ||
        txn.id ||
        `sub_${idx}`;
      const existing = verifiedJobDealerMap.get(jobKey);
      if (existing === undefined) {
        verifiedJobDealerMap.set(jobKey, { dealerCost: explicitDealer, billedAmount: Math.max(0, jobBilled) });
      } else {
        verifiedJobDealerMap.set(jobKey, {
          dealerCost: Math.min(existing.dealerCost, explicitDealer),
          billedAmount: Math.max(existing.billedAmount, jobBilled),
        });
      }
    }
  });

  // Verified Subcontractor / Dealer Charges total and accrued mark-up profit
  let verifiedSubcontractorExpenses = 0;
  let markUpProfitFromSubcontractors = 0;
  let subcontractorBilledRevenue = 0;

  verifiedJobDealerMap.forEach(({ dealerCost, billedAmount }) => {
    verifiedSubcontractorExpenses += dealerCost;
    subcontractorBilledRevenue += billedAmount;
    markUpProfitFromSubcontractors += Math.max(0, billedAmount - dealerCost);
  });
  verifiedSubcontractorExpenses = Number(verifiedSubcontractorExpenses.toFixed(2));

  // 3. Classify Standard Operating Expenses
  // RULE: For Linked / Split Invoices & Maintenance Orders: 
  // Do NOT subtract linked Expense rows if the Dealer Cost is already deducted from Billed Revenue!
  let standardOperatingExpenses = 0;
  let standardExpenseNet = 0;
  let standardExpenseVat = 0;

  expenseTxns.forEach((txn, idx) => {
    // Check if this expense row is linked to a job that has a verified subcontractor/dealer cost
    const jobKeys = [
      txn.invoiceNumber,
      txn.orderNumber,
      txn.orderId,
      txn.referenceId,
      txn.entityId,
      txn.invoiceId,
      txn.linkedInvoiceRef,
      txn.id,
      txn.linkedMaintenanceRecord?.orderNumber,
      txn.linkedMaintenanceRecord?.id,
      `exp_${idx}`,
    ].filter(Boolean).map((k) => String(k).trim());

    // Check if linked to any job in verifiedJobDealerMap or any linked invoice with dealer cost
    const isLinkedToDealerJob =
      jobKeys.some((k) => verifiedJobDealerMap.has(k)) ||
      invoices.some(
        (inv) =>
          (inv.dealerCost !== undefined && Number(inv.dealerCost) > 0) &&
          (inv.id === txn.invoiceId ||
            inv.id === txn.linkedInvoiceRef ||
            inv.id === txn.referenceId ||
            inv.id === txn.entityId ||
            (txn.invoiceNumber && inv.invoiceNumber === txn.invoiceNumber) ||
            (txn.paymentReference && inv.invoiceNumber && txn.paymentReference.includes(inv.invoiceNumber)))
      ) ||
      maintenanceLogs.some(
        (m) =>
          (m.dealerCost !== undefined && Number(m.dealerCost) > 0) &&
          ((txn.orderNumber && (m.orderNumber === txn.orderNumber || m.orderId === txn.orderNumber)) ||
            (txn.orderId && (m.orderId === txn.orderId || m.orderNumber === txn.orderId)) ||
            (txn.id && m.financeTransactionId === txn.id))
      );

    if (isLinkedToDealerJob) {
      // This expense row is the linked counterpart for an invoice / maintenance order
      // whose dealer cost is already deducted in verifiedSubcontractorExpenses.
      // Omit from standardOperatingExpenses and standardExpenseVat to prevent double-counting!
      return;
    }

    // Pure Standalone Standard Operational Expense (e.g. unedited operating cost, fuel, utilities)
    const amt = Number(txn.amount || 0);
    standardOperatingExpenses += amt;
    standardExpenseNet += txn.netAmount !== undefined ? Number(txn.netAmount) : amt;
    standardExpenseVat += Number(txn.vatAmount || 0);
  });

  standardOperatingExpenses = Number(standardOperatingExpenses.toFixed(2));
  standardExpenseNet = Number(standardExpenseNet.toFixed(2));
  standardExpenseVat = Number(standardExpenseVat.toFixed(2));

  // Combined Total Outgoings / Total Deductions = Standard Operational Expenses + Actual Subcontractor/Dealer Costs
  const totalCombinedExpenses = Number(
    (standardOperatingExpenses + verifiedSubcontractorExpenses).toFixed(2)
  );
  const totalExpenseNet = Number(
    (standardExpenseNet + verifiedSubcontractorExpenses).toFixed(2)
  );

  // 4. Card 3: Real Company Net Profit
  // Formula: Net Profit = Total Income - Math.abs(Total Expenses)
  // Stop copying Total Expenses into Net Profit
  const netProfit = Number((totalRevenue - Math.abs(totalCombinedExpenses)).toFixed(2));

  // Real Margin % = (Net Profit / Total Revenue) * 100
  const profitMarginPercent =
    totalRevenue > 0
      ? Number(((netProfit / totalRevenue) * 100).toFixed(1))
      : 0;

  // 5. Card 4: VAT Liability = Collected VAT - Paid VAT on standard operational expenses
  const totalVatLiability = Number((totalIncomeVat - standardExpenseVat).toFixed(2));

  return {
    totalRevenue,
    totalIncomeNet,
    totalIncomeVat,
    totalCombinedExpenses,
    standardOperatingExpenses,
    verifiedSubcontractorExpenses,
    totalGrossExpenses: totalCombinedExpenses,
    totalExpenseNet,
    totalExpenseVat,
    netProfit,
    profitMarginPercent,
    totalVatLiability,
  };
}

export interface PnLSummaryMetrics {
  totalIncome: number;
  totalExpenses: number;
  totalOutstanding?: number;
  subcontractorCost: number;
  dealerCost: number;
  netProfit: number;
  grossBilling?: number;
  totalReceived?: number;
}

export type DeduplicatedSummaryMetrics = PnLSummaryMetrics;

/**
 * STANDARD PROFIT & LOSS (P&L) SUMMARY METRICS (4-Card Model)
 * Maps over filtered transactions and aggregates into standard P&L buckets:
 * 1. TOTAL INCOME: Sum of all rows marked as 'INCOME' (or Credit).
 * 2. TOTAL EXPENSES: Sum of all rows marked as 'EXPENSE' (or Debit).
 * 3. DEALER / SUBCONTRACTOR COST: Sum of dealerCost (treats missing/null/legacy values as £0.00).
 * 4. NET PROFIT: (Total Income) - (Total Expenses) - (Dealer/Subcontractor Cost).
 */
export function calculatePnLSummaryMetrics(
  transactions: any[] = []
): PnLSummaryMetrics {
  const isIncome = (item: any): boolean => {
    const t = String(item.type || '').toLowerCase();
    const tt = String(item.transactionType || '').toUpperCase();
    const et = String(item.entryType || '').toUpperCase();
    if (et === 'CREDIT' || t === 'income' || tt === 'INCOME') return true;
    if (et === 'DEBIT' || t === 'expense' || tt === 'EXPENSE') return false;
    return Number(item.amount || 0) >= 0;
  };

  const isExpense = (item: any): boolean => {
    const t = String(item.type || '').toLowerCase();
    const tt = String(item.transactionType || '').toUpperCase();
    const et = String(item.entryType || '').toUpperCase();
    if (et === 'DEBIT' || t === 'expense' || tt === 'EXPENSE') return true;
    if (et === 'CREDIT' || t === 'income' || tt === 'INCOME') return false;
    return Number(item.amount || 0) < 0;
  };

  const getRowAmount = (item: any): number => {
    const val =
      item.amount !== undefined && item.amount !== null
        ? Number(item.amount)
        : item.customerBilled !== undefined && item.customerBilled !== null
        ? Number(item.customerBilled)
        : item.billed !== undefined && item.billed !== null
        ? Number(item.billed)
        : item.grossBilling !== undefined && item.grossBilling !== null
        ? Number(item.grossBilling)
        : 0;
    return isNaN(val) ? 0 : Math.abs(val);
  };

  const getRowDealerCost = (item: any): number => {
    if (item.dealerCost !== null && item.dealerCost !== undefined && item.dealerCost !== '' && !isNaN(Number(item.dealerCost))) {
      return Math.max(0, Number(item.dealerCost));
    }
    if (item.subcontractorCost !== null && item.subcontractorCost !== undefined && item.subcontractorCost !== '' && !isNaN(Number(item.subcontractorCost))) {
      return Math.max(0, Number(item.subcontractorCost));
    }
    return 0;
  };

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalDealerCost = 0;
  let accruedMarkUpProfit = 0;
  let standardOperatingExpenses = 0;
  let netProfit = 0;

  // Gather all job/order reference keys for Income and Expense rows
  const incomeJobKeys = new Set<string>();
  const expenseOrderKeys = new Set<string>();
  transactions.forEach((t: any) => {
    const isInc = isIncome(t);
    const isExp = isExpense(t);
    const ref = (t.referenceId || t.orderId || t.orderNumber || t.linkedInvoiceRef || t.maintenanceOrderId || t.maintenanceJobId || '')
      .toString().trim().toUpperCase();
    if (isInc && ref) incomeJobKeys.add(ref);
    if (isExp && ref) expenseOrderKeys.add(ref);
  });

  const talliedDealerCostOrders = new Set<string>();

  transactions.forEach((item) => {
    const amt = getRowAmount(item);
    const cost = getRowDealerCost(item);
    const orderKey = (item.referenceId || item.orderId || item.orderNumber || item.linkedInvoiceRef || item.maintenanceOrderId || item.maintenanceJobId || '')
      .toString().trim().toUpperCase();

    // 1. TOTAL INCOME (Pass-Through, Mark-Up Jobs & Standard Income):
    // Pass-Through Jobs: Included in Total Income and Total Expenses, with £0.00 Net Profit contribution.
    // Mark-Up Jobs (Client Billed > Subcontractor Cost):
    // Record Billed Amount as Income (e.g. £350.00).
    // Record Subcontractor Cost as Expense (e.g. £200.00).
    // Accrue Net Profit (£150.00) directly to the Finance Dashboard.
    // Direct Customer Billing (Subcontractor Cost = 0 or left blank):
    // Registers as Standard Income without inflating Company Net Profit!
    if (isIncome(item)) {
      totalIncome += amt;
      const hasSeparateExpenseRow = Boolean(orderKey && expenseOrderKeys.has(orderKey));
      if (cost > 0) {
        if (!hasSeparateExpenseRow) {
          if (!orderKey || !talliedDealerCostOrders.has(orderKey)) {
            totalExpenses += cost;
            totalDealerCost += cost;
            if (orderKey) talliedDealerCostOrders.add(orderKey);
          }
        } else {
          totalDealerCost += cost;
        }
        accruedMarkUpProfit += Math.max(0, amt - cost);
      }
    }
    // 2. TOTAL EXPENSES:
    else if (isExpense(item)) {
      const isPassThrough = Boolean(
        item.isPassThrough ||
        item.passThrough ||
        item.isPassThroughMaintenance ||
        item.category === 'Pass-Through Maintenance' ||
        item.customCategory === 'Pass-Through Maintenance' ||
        item.passThroughTag
      );
      const effectiveExpense = (cost > 0 && !isPassThrough) ? cost : amt;
      totalExpenses += effectiveExpense;
      standardOperatingExpenses += effectiveExpense;
    }
  });

  totalIncome = Number(totalIncome.toFixed(2));
  totalExpenses = Number(totalExpenses.toFixed(2));
  totalDealerCost = Number(totalDealerCost.toFixed(2));
  // Formula: Net Profit = Total Income - Math.abs(Total Expenses)
  // Example: Income (£11,391.72) - Expenses (£10,191.72) = +£1,200.00 Net Profit
  netProfit = Number((totalIncome - Math.abs(totalExpenses)).toFixed(2));

  return {
    totalIncome,
    totalExpenses,
    subcontractorCost: totalDealerCost,
    dealerCost: totalDealerCost,
    netProfit,
    grossBilling: totalIncome,
    totalReceived: totalIncome,
  };
}

export const calculateDeduplicatedSummaryMetrics = calculatePnLSummaryMetrics;
