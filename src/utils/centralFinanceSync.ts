// src/utils/centralFinanceSync.ts
import { calculateProfitMetrics, ProfitMetrics } from './profitCalculator';

export type EntityType = 'RENTAL' | 'INVOICE' | 'MAINTENANCE';
export type NormalizedPaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';
export type NormalizedCompletionStatus = 'COMPLETED' | 'SCHEDULED' | 'PENDING' | 'IN_PROGRESS' | 'CANCELLED';

export interface UnifiedFinancialFields {
  entityId: string;
  entityType: EntityType;
  referenceId?: string;
  orderNumber?: string;
  orderId?: string;
  invoiceNumber?: string;
  customerBilled: number;       // Gross Revenue billed to client
  dealerCost: number;           // Actual internal / subcontractor cost
  subcontractorCost: number;    // Alias for dealerCost
  netAmount: number;            // Net revenue excluding VAT
  vatAmount: number;            // Total VAT amount
  vatType?: string;             // e.g. 'standard_20', 'exempt'
  netProfit: number;            // customerBilled - dealerCost - vatAmount
  profitMargin: number;         // (netProfit / customerBilled) * 100
  profitMarginPercent: number;  // Alias for profitMargin
  paymentStatus: NormalizedPaymentStatus;
  completionStatus: NormalizedCompletionStatus;
  isEdited: boolean;
  date: Date;
}

export interface CentralFinanceSummary {
  totalRevenue: number;              // Gross Revenue / Total Income
  totalNetRevenue: number;           // Revenue excluding VAT
  totalExpenses: number;             // Direct finance expenses
  totalSubcontractorExpenses: number;// Real internal costs incurred
  totalNetExpense: number;           // Expenses excluding VAT
  totalIncomeVat: number;            // VAT collected
  totalExpenseVat: number;           // VAT paid
  totalVatLiability: number;         // totalIncomeVat - totalExpenseVat
  totalNetProfit: number;            // Net financial bottom-line profit
  profitMarginPercent: number;       // Overall margin %
  paidRevenue: number;
  outstandingBalance: number;
  totalRecordsCount: number;
}

/**
 * Normalizes payment statuses across all modules to a single canonical format.
 */
export function normalizePaymentStatus(status?: string | null): NormalizedPaymentStatus {
  if (!status) return 'UNPAID';
  const s = String(status).toLowerCase().trim();
  if (s === 'paid' || s === 'completed') return 'PAID';
  if (s === 'partially_paid' || s === 'partial' || s === 'part_paid') return 'PARTIAL';
  return 'UNPAID';
}

/**
 * Normalizes completion statuses across all modules to a single canonical format.
 */
export function normalizeCompletionStatus(status?: string | null): NormalizedCompletionStatus {
  if (!status) return 'PENDING';
  const s = String(status).toLowerCase().trim();
  if (s === 'completed' || s === 'closed' || s === 'resolved') return 'COMPLETED';
  if (s === 'scheduled' || s === 'booked') return 'SCHEDULED';
  if (s === 'active' || s === 'in-progress' || s === 'in_progress' || s === 'workshop' || s === 'bodywork') return 'IN_PROGRESS';
  if (s === 'cancelled' || s === 'void') return 'CANCELLED';
  return 'PENDING';
}

/**
 * Core calculation engine for Finance Page Summary Cards.
 * Keeps Total Revenue, Expenses, Net Profit, and VAT Liability 100% accurate
 * and in sync with all entries across all pages (Invoices, Rentals, Maintenance, Ledger).
 */
export function calculateCentralFinanceSummary(
  transactions: any[] = [],
  fallbackGrossIncome?: number,
  fallbackGrossExpense?: number
): CentralFinanceSummary {
  let grossIncome = 0;
  let grossExpense = 0;
  let netIncome = 0;
  let netExpense = 0;
  let incomeVat = 0;
  let expenseVat = 0;
  let totalSubCost = 0;
  let paidSum = 0;
  let outstandingSum = 0;

  transactions.forEach((tx) => {
    const isIncome = tx.type === 'income' || tx.amount >= 0;
    const isExpense = tx.type === 'expense';
    const amount = Math.abs(Number(tx.amount || tx.customerBilled || tx.cost || 0));
    const billed = Number(tx.customerBilled !== undefined ? tx.customerBilled : amount);

    // VAT Resolution
    let vat = Number(tx.vatAmount || 0);
    if (!vat && tx.includeVAT) {
      vat = Number((billed * (0.2 / 1.2)).toFixed(2));
    }
    const net = Number(tx.netAmount !== undefined ? tx.netAmount : (billed - vat));

    // Subcontractor Cost & Profit Resolution
    const isExplicitlyEdited = tx.isProfitEdited === true || tx.isEdited === true;
    const rawCost = tx.dealerCost !== undefined
      ? Number(tx.dealerCost)
      : tx.subcontractorCost !== undefined
      ? Number(tx.subcontractorCost)
      : undefined;

    // Legacy unedited rule: 100% of amount is classified as subcontractor cost, 0% profit
    const resolvedCost = isExplicitlyEdited
      ? (rawCost !== undefined ? rawCost : billed)
      : (rawCost !== undefined && rawCost !== billed ? rawCost : billed);

    if (isIncome) {
      grossIncome += billed;
      netIncome += net;
      incomeVat += vat;

      const pStatus = normalizePaymentStatus(tx.paymentStatus);
      if (pStatus === 'PAID') {
        paidSum += billed;
      } else if (pStatus === 'PARTIAL') {
        const paid = Number(tx.paidAmount || (billed * 0.5));
        paidSum += paid;
        outstandingSum += Math.max(0, billed - paid);
      } else {
        outstandingSum += billed;
      }

      // If the income transaction has a linked internal/subcontractor cost
      if (isExplicitlyEdited && rawCost !== undefined) {
        totalSubCost += resolvedCost;
      }
    } else if (isExpense) {
      grossExpense += billed;
      netExpense += net;
      expenseVat += vat;
      totalSubCost += resolvedCost;
    }
  });

  const finalRevenue = grossIncome > 0 ? grossIncome : (fallbackGrossIncome || 0);
  const finalExpenses = grossExpense > 0 ? grossExpense : (fallbackGrossExpense || 0);
  const totalVatLiability = Number((incomeVat - expenseVat).toFixed(2));

  // Net Profit formula: Total Revenue - Internal/Dealer Costs - Expenses
  // If dealer costs are logged, net profit reflects Revenue - Subcontractor Cost - VAT
  let finalNetProfit = 0;
  if (totalSubCost > 0 && finalRevenue > 0) {
    finalNetProfit = Number((finalRevenue - totalSubCost).toFixed(2));
  } else {
    finalNetProfit = Number((finalRevenue - finalExpenses).toFixed(2));
  }

  const profitMarginPercent =
    finalRevenue > 0 ? Number(((finalNetProfit / finalRevenue) * 100).toFixed(2)) : 0;

  return {
    totalRevenue: finalRevenue,
    totalNetRevenue: Number(netIncome.toFixed(2)),
    totalExpenses: finalExpenses,
    totalSubcontractorExpenses: Number(totalSubCost.toFixed(2)),
    totalNetExpense: Number(netExpense.toFixed(2)),
    totalIncomeVat: Number(incomeVat.toFixed(2)),
    totalExpenseVat: Number(expenseVat.toFixed(2)),
    totalVatLiability,
    totalNetProfit: finalNetProfit,
    profitMarginPercent,
    paidRevenue: Number(paidSum.toFixed(2)),
    outstandingBalance: Number(outstandingSum.toFixed(2)),
    totalRecordsCount: transactions.length,
  };
}

/**
 * Global Event Listener for Cross-Module Synchronization
 * Subscribes to events triggered across Rentals, Invoices, Maintenance, and Finance.
 * Automatically notifies callback functions when any entity is created, modified, or saved.
 */
export function initCentralFinanceSyncListener(
  onSyncEvent: (event: CustomEvent<any>) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleEvent = (e: Event) => {
    onSyncEvent(e as CustomEvent<any>);
  };

  const eventNames = [
    'financeRecordUpdated',
    'maintenanceRecordUpdated',
    'maintenanceCostUpdated',
    'rentalRecordUpdated',
    'invoiceRecordUpdated',
  ];

  eventNames.forEach((name) => window.addEventListener(name, handleEvent));

  return () => {
    eventNames.forEach((name) => window.removeEventListener(name, handleEvent));
  };
}

