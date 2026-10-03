// src/utils/maintenanceFinanceLink.ts
import { Transaction } from '../types';

/**
 * Normalizes an order reference string by removing prefixes like "Order #", "#", "INV-", whitespace,
 * and converting to lower case for reliable cross-module identity matching.
 */
export function normalizeOrderRef(val?: string | null): string {
  if (!val) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/^order\s*#?/i, '')
    .replace(/^inv(?:oice)?\s*#?/i, '')
    .replace(/^#/, '')
    .trim();
}

/**
 * Generates all candidate string permutations for a given order reference
 * (e.g. "A1" -> ["A1", "#A1", "Order #A1", "Order A1", "ORD-A1", "order #a1"]).
 */
export function getOrderCandidateVariants(orderNum?: string | null): string[] {
  if (!orderNum) return [];
  const raw = String(orderNum).trim();
  const normalized = normalizeOrderRef(raw);
  const variants = new Set<string>();

  if (raw) {
    variants.add(raw);
    variants.add(raw.toUpperCase());
    variants.add(raw.toLowerCase());
  }

  if (normalized) {
    variants.add(normalized);
    variants.add(normalized.toUpperCase());
    variants.add(normalized.toLowerCase());
    variants.add(`#${normalized}`);
    variants.add(`#${normalized.toUpperCase()}`);
    variants.add(`Order #${normalized}`);
    variants.add(`Order #${normalized.toUpperCase()}`);
    variants.add(`Order ${normalized}`);
    variants.add(`Order ${normalized.toUpperCase()}`);
    variants.add(`ORD-${normalized.toUpperCase()}`);
  }

  return Array.from(variants);
}

/**
 * Checks whether a given transaction links to a maintenance log.
 */
export function isMaintenanceOrderMatch(txn: any, log: any): boolean {
  if (!txn || !log) return false;

  const logId = String(log.id || '').trim();
  const logOrderRaw = String(log.orderNumber || log.orderId || '').trim();
  const logOrderNorm = normalizeOrderRef(logOrderRaw);
  const logInvRaw = String(log.invoiceNumber || '').trim().toLowerCase();

  const txnRef = String(txn.referenceId || '').trim();
  const txnLinkedRef = String(txn.linkedInvoiceRef || '').trim();
  const txnOrderRaw = String(txn.orderNumber || txn.orderId || '').trim();
  const txnOrderNorm = normalizeOrderRef(txnOrderRaw);
  const txnInvRaw = String(txn.invoiceNumber || txn.paymentReference || '').trim().toLowerCase();
  const txnDesc = String(txn.description || '').toLowerCase();

  // 1. Exact log document ID matching
  if (logId) {
    if (txnRef === logId || txnLinkedRef === logId) return true;
    if (txnOrderRaw === logId) return true;
  }

  // 2. Exact order string matching
  if (logOrderRaw) {
    if (txnOrderRaw && txnOrderRaw.toLowerCase() === logOrderRaw.toLowerCase()) return true;
    if (txnRef && txnRef.toLowerCase() === logOrderRaw.toLowerCase()) return true;
    if (txnLinkedRef && txnLinkedRef.toLowerCase() === logOrderRaw.toLowerCase()) return true;
  }

  // 3. Normalized order reference matching (e.g. "Order #A1" vs "A1")
  if (logOrderNorm) {
    if (txnOrderNorm && txnOrderNorm === logOrderNorm) return true;
    if (txnRef && normalizeOrderRef(txnRef) === logOrderNorm) return true;
    if (txnLinkedRef && normalizeOrderRef(txnLinkedRef) === logOrderNorm) return true;
  }

  // 4. Invoice number matching
  if (logInvRaw && txnInvRaw && logInvRaw === txnInvRaw) return true;

  // 5. Description fuzzy matching
  if (logOrderNorm && txnDesc) {
    if (
      txnDesc.includes(`order #${logOrderNorm}`) ||
      txnDesc.includes(`order: #${logOrderNorm}`) ||
      txnDesc.includes(`order ${logOrderNorm}`) ||
      txnDesc.includes(`order: ${logOrderNorm}`) ||
      txnDesc.includes(`#${logOrderNorm}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Enriches a Transaction model dynamically from the matching Maintenance Order object.
 * Implements strict legacy classification fallback (100% subcontractor expense, £0.00 profit)
 * UNLESS edited in Maintenance or Finance, in which case the real Dealer Cost, Net Profit,
 * and Margin are dynamically computed and returned.
 */
export function enrichTransactionWithMaintenance(
  txn: Transaction,
  maintenanceLogs: any[] = []
): Transaction {
  if (!txn) return txn;

  // Find matching maintenance log
  const matchingLog =
    txn.linkedMaintenanceRecord ||
    (Array.isArray(maintenanceLogs)
      ? maintenanceLogs.find((log) => isMaintenanceOrderMatch(txn, log))
      : null);

  const amt = Number(txn.amount || 0);
  const defaultBilled =
    txn.customerBilled !== undefined
      ? Number(txn.customerBilled)
      : Math.abs(amt);

  // If a linked maintenance record exists:
  if (matchingLog) {
    const isLogEdited =
      matchingLog.isProfitEdited === true ||
      matchingLog.isEdited === true ||
      (matchingLog.dealerCost !== undefined &&
        Number(matchingLog.dealerCost) > 0 &&
        Number(matchingLog.dealerCost) !==
          Number(matchingLog.customerBilled ?? matchingLog.cost ?? defaultBilled));

    const billed =
      matchingLog.customerBilled !== undefined
        ? Number(matchingLog.customerBilled)
        : defaultBilled;

    if (isLogEdited) {
      const dealerCost =
        matchingLog.dealerCost !== undefined
          ? Number(matchingLog.dealerCost)
          : Number(matchingLog.subcontractorCost ?? billed);

      const netProfit =
        matchingLog.netProfit !== undefined
          ? Number(matchingLog.netProfit)
          : Number((billed - dealerCost).toFixed(2));

      const profitMarginPercent =
        matchingLog.profitMarginPercent !== undefined
          ? Number(matchingLog.profitMarginPercent)
          : billed > 0
          ? Number(((netProfit / billed) * 100).toFixed(2))
          : 0;

      const isExpense = txn.type === 'expense' || txn.entryType === 'DEBIT' || String((txn as any).transactionType || '').toUpperCase() === 'EXPENSE';
      const actualAmount = (isExpense && dealerCost > 0 && Math.abs(billed - dealerCost) >= 0.01) ? dealerCost : amt;

      return {
        ...txn,
        amount: actualAmount,
        linkedMaintenanceRecord: matchingLog,
        linkedInvoiceRef: txn.linkedInvoiceRef || matchingLog.id,
        orderId: txn.orderId || matchingLog.orderNumber || matchingLog.orderId,
        orderNumber: txn.orderNumber || matchingLog.orderNumber || matchingLog.orderId,
        invoiceNumber: txn.invoiceNumber || matchingLog.invoiceNumber,
        customerBilled: billed,
        dealerCost,
        subcontractorCost: dealerCost,
        netProfit,
        profitMarginPercent,
        isProfitEdited: true,
        isEdited: true,
      };
    } else if (txn.isProfitEdited === true) {
      // Transaction was manually edited in Finance
      const dCost =
        txn.dealerCost !== undefined
          ? Number(txn.dealerCost)
          : Number(txn.subcontractorCost ?? billed);
      const profit =
        txn.netProfit !== undefined
          ? Number(txn.netProfit)
          : Number((billed - dCost).toFixed(2));
      const margin =
        txn.profitMarginPercent !== undefined
          ? Number(txn.profitMarginPercent)
          : billed > 0
          ? Number(((profit / billed) * 100).toFixed(2))
          : 0;

      const isExpense = txn.type === 'expense' || txn.entryType === 'DEBIT' || String((txn as any).transactionType || '').toUpperCase() === 'EXPENSE';
      const actualAmount = (isExpense && dCost > 0 && Math.abs(billed - dCost) >= 0.01) ? dCost : amt;

      return {
        ...txn,
        amount: actualAmount,
        linkedMaintenanceRecord: matchingLog,
        linkedInvoiceRef: txn.linkedInvoiceRef || matchingLog.id,
        orderId: txn.orderId || matchingLog.orderNumber || matchingLog.orderId,
        orderNumber: txn.orderNumber || matchingLog.orderNumber || matchingLog.orderId,
        invoiceNumber: txn.invoiceNumber || matchingLog.invoiceNumber,
        customerBilled: billed,
        dealerCost: dCost,
        subcontractorCost: dCost,
        netProfit: profit,
        profitMarginPercent: margin,
        isProfitEdited: true,
        isEdited: true,
      };
    } else {
      // Legacy / Unedited Mode: preserve pure INCOME or pure EXPENSE without artificial subcontractor charges
      return {
        ...txn,
        linkedMaintenanceRecord: matchingLog,
        linkedInvoiceRef: txn.linkedInvoiceRef || matchingLog.id,
        orderId: txn.orderId || matchingLog.orderNumber || matchingLog.orderId,
        orderNumber: txn.orderNumber || matchingLog.orderNumber || matchingLog.orderId,
        invoiceNumber: txn.invoiceNumber || matchingLog.invoiceNumber,
        customerBilled: txn.type === 'income' ? (txn.customerBilled !== undefined ? Number(txn.customerBilled) : amt) : undefined,
        dealerCost: undefined,
        subcontractorCost: undefined,
        netProfit: undefined,
        profitMarginPercent: undefined,
        isProfitEdited: false,
        isEdited: false,
      };
    }
  }

  // If no linked maintenance log, respect the direct transaction edit state ONLY if edited with explicit dealer cost
  const hasExplicitDealer =
    (txn.isProfitEdited === true || txn.isEdited === true) &&
    ((txn.dealerCost !== undefined && Number(txn.dealerCost) > 0) ||
     (txn.subcontractorCost !== undefined && Number(txn.subcontractorCost) > 0));

  if (hasExplicitDealer) {
    const dCost =
      txn.dealerCost !== undefined
        ? Number(txn.dealerCost)
        : Number(txn.subcontractorCost ?? defaultBilled);
    const profit =
      txn.netProfit !== undefined
        ? Number(txn.netProfit)
        : Number((defaultBilled - dCost).toFixed(2));
    const margin =
      txn.profitMarginPercent !== undefined
        ? Number(txn.profitMarginPercent)
        : defaultBilled > 0
        ? Number(((profit / defaultBilled) * 100).toFixed(2))
        : 0;

    const isExpense = txn.type === 'expense' || txn.entryType === 'DEBIT' || String((txn as any).transactionType || '').toUpperCase() === 'EXPENSE';
    const actualAmount = (isExpense && dCost > 0 && Math.abs(defaultBilled - dCost) >= 0.01) ? dCost : amt;

    return {
      ...txn,
      amount: actualAmount,
      customerBilled: txn.customerBilled !== undefined ? Number(txn.customerBilled) : defaultBilled,
      dealerCost: dCost,
      subcontractorCost: dCost,
      netProfit: profit,
      profitMarginPercent: margin,
      isProfitEdited: true,
      isEdited: true,
    };
  }

  // Legacy / Unedited Mode for standalone unedited record: pure INCOME or pure EXPENSE
  return {
    ...txn,
    customerBilled: txn.type === 'income' ? (txn.customerBilled !== undefined ? Number(txn.customerBilled) : defaultBilled) : undefined,
    dealerCost: undefined,
    subcontractorCost: undefined,
    netProfit: undefined,
    profitMarginPercent: undefined,
    isProfitEdited: false,
    isEdited: false,
  };
}

// Re-export vehicle department account mapping helper
export {
  mapVehicleToDepartmentAccount,
  resolveVehicleDepartmentAccount,
  type VehicleDepartmentAccountMapping,
} from './vehicleDepartmentAccount';
