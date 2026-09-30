// src/server/invoicePaymentRoutes.ts
import { Router, Request, Response } from 'express';

export const invoicePaymentRouter = Router();

export interface InvoicePaymentPayload {
  paymentId?: string;
  invoiceId: string;
  invoiceNumber?: string;
  orderId?: string;
  orderNumber?: string;
  referenceId?: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  date: string | Date;
  notes?: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehicleName?: string;
  accountId?: string;
  accountName?: string;
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

// In-memory audit/sync ledger store for backend persistence
interface SyncedPaymentLedgerEntry {
  id: string;
  transactionId: string;
  invoiceId: string;
  invoiceNumber: string;
  referenceId: string;
  orderId?: string;
  orderNumber?: string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  paymentDate: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehicleName?: string;
  accountId?: string;
  type: 'INCOME' | 'EXPENSE';
  entryType: 'CREDIT' | 'DEBIT';
  status: 'COMPLETED' | 'PAID' | 'UNPAID';
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
  paidAmount?: number;
  syncedAt: string;
  syncedBy: string;
}

const serverPaymentLedger: SyncedPaymentLedgerEntry[] = [];

/**
 * Controller/Event Handler logic that processes invoice payment sync
 * and enforces UPSERT & DEDUPLICATION:
 * 1. AUTOMATIC INCOME GENERATION ON FINANCE LEDGER
 *    - Query Finance Ledger for existing entry matching paymentId OR invoiceId + paymentRef.
 *    - If Found: Update existing Income transaction.
 *    - If Not Found: Insert new Income transaction row.
 * 2. UPDATE LINKED EXPENSE STATUS (REALIZE PROFIT)
 *    - When the invoice is paid, query Finance Ledger for any existing 'EXPENSE' transactions
 *      with the same referenceId (e.g. Order #A1).
 *    - Update the matched Expense entry's status to reflect the payment (status: 'PAID', paidAmount)
 *      so Realized Profit dynamically updates from £0.00 to the correct amount.
 */
export function syncInvoicePaymentToFinanceLedger(payload: InvoicePaymentPayload): {
  success: boolean;
  action: 'created' | 'updated';
  ledgerEntry: SyncedPaymentLedgerEntry;
  updatedExpensesCount?: number;
} {
  const pId = payload.paymentId || `inv_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invRef = payload.invoiceNumber || payload.invoiceId || 'N/A';
  const targetRefId =
    payload.referenceId ||
    payload.orderNumber ||
    payload.orderId ||
    (payload.invoiceNumber ? `#${payload.invoiceNumber.replace(/^#/, '')}` : null) ||
    payload.invoiceId ||
    '#A1';
  const payRef = payload.paymentReference || invRef || 'Payment';
  const amt = Math.max(0, Number(payload.amount) || 0);
  const pDate = payload.date ? new Date(payload.date).toISOString() : new Date().toISOString();

  // 1. Deduplication check: Match paymentId OR (invoiceId + paymentRef)
  const existingIdx = serverPaymentLedger.findIndex(
    (entry) =>
      entry.paymentId === pId ||
      (entry.invoiceId === payload.invoiceId &&
        entry.paymentReference === payRef &&
        Math.abs(entry.amount - amt) < 0.01)
  );

  let ledgerEntry: SyncedPaymentLedgerEntry;
  let action: 'created' | 'updated';

  if (existingIdx >= 0) {
    // UPDATE in-place
    const updated: SyncedPaymentLedgerEntry = {
      ...serverPaymentLedger[existingIdx],
      referenceId: targetRefId,
      orderId: payload.orderId || serverPaymentLedger[existingIdx].orderId,
      orderNumber: payload.orderNumber || serverPaymentLedger[existingIdx].orderNumber,
      amount: amt,
      paymentMethod: payload.paymentMethod || 'cash',
      paymentReference: payRef,
      paymentDate: pDate,
      customerId: payload.customerId || serverPaymentLedger[existingIdx].customerId,
      customerName: payload.customerName || serverPaymentLedger[existingIdx].customerName,
      vehicleId: payload.vehicleId || serverPaymentLedger[existingIdx].vehicleId,
      vehicleName: payload.vehicleName || serverPaymentLedger[existingIdx].vehicleName,
      accountId: payload.accountId || serverPaymentLedger[existingIdx].accountId,
      syncedAt: new Date().toISOString(),
      syncedBy: payload.currentUser?.name || payload.currentUser?.email || 'system',
    };
    serverPaymentLedger[existingIdx] = updated;
    ledgerEntry = updated;
    action = 'updated';
  } else {
    // INSERT new Income transaction
    const newEntry: SyncedPaymentLedgerEntry = {
      id: `sync_ledger_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId: `txn_income_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: payload.invoiceId,
      invoiceNumber: invRef,
      referenceId: targetRefId,
      orderId: payload.orderId,
      orderNumber: payload.orderNumber,
      paymentId: pId,
      amount: amt,
      paymentMethod: payload.paymentMethod || 'cash',
      paymentReference: payRef,
      paymentDate: pDate,
      customerId: payload.customerId,
      customerName: payload.customerName,
      vehicleId: payload.vehicleId,
      vehicleName: payload.vehicleName,
      accountId: payload.accountId,
      type: 'INCOME',
      entryType: 'CREDIT',
      status: 'COMPLETED',
      paymentStatus: 'paid',
      paidAmount: amt,
      syncedAt: new Date().toISOString(),
      syncedBy: payload.currentUser?.name || payload.currentUser?.email || 'system',
    };
    serverPaymentLedger.push(newEntry);
    ledgerEntry = newEntry;
    action = 'created';
  }

  // 2. UPDATE LINKED EXPENSE STATUS (REALIZE PROFIT)
  // When invoice is paid, query Finance Ledger for existing 'EXPENSE' transactions with same referenceId
  const candidateRefs = [
    targetRefId,
    payload.orderNumber,
    payload.orderId,
    payload.referenceId,
    payload.invoiceId,
    payload.invoiceNumber,
    payload.orderNumber ? payload.orderNumber.replace(/^#/, '') : null,
    payload.orderId ? payload.orderId.replace(/^#/, '') : null,
  ].filter(Boolean) as string[];

  let updatedExpensesCount = 0;
  serverPaymentLedger.forEach((entry) => {
    if (entry.type === 'EXPENSE') {
      const match =
        candidateRefs.includes(entry.referenceId) ||
        (entry.orderId && candidateRefs.includes(entry.orderId)) ||
        (entry.orderNumber && candidateRefs.includes(entry.orderNumber)) ||
        (entry.invoiceId && candidateRefs.includes(entry.invoiceId));
      if (match) {
        entry.status = 'PAID';
        entry.paymentStatus = 'paid';
        entry.paidAmount = amt;
        updatedExpensesCount++;
      }
    }
  });

  return {
    success: true,
    action,
    ledgerEntry,
    updatedExpensesCount,
  };
}

/**
 * POST /api/invoices/:invoiceId/payments
 * Record payment on invoice and sync directly to Finance Ledger as Income entry
 */
invoicePaymentRouter.post('/:invoiceId/payments', (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const body = req.body || {};

    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required' });
    }

    const payload: InvoicePaymentPayload = {
      invoiceId,
      paymentId: body.paymentId,
      invoiceNumber: body.invoiceNumber,
      amount: Number(body.amount) || 0,
      paymentMethod: body.paymentMethod || body.method || 'cash',
      paymentReference: body.paymentReference || body.reference,
      date: body.date || body.paymentDate || new Date(),
      notes: body.notes,
      customerId: body.customerId,
      customerName: body.customerName,
      vehicleId: body.vehicleId,
      vehicleName: body.vehicleName,
      accountId: body.accountId,
      accountName: body.accountName,
      currentUser: body.currentUser,
    };

    const result = syncInvoicePaymentToFinanceLedger(payload);

    return res.status(200).json({
      success: true,
      action: result.action,
      ledgerEntry: result.ledgerEntry,
      message: `Invoice payment successfully synced to Finance Ledger as Income (${result.action}).`,
    });
  } catch (err: any) {
    console.error('Error syncing invoice payment to finance ledger:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while syncing invoice payment',
    });
  }
});

/**
 * POST /api/finance/invoice-payment-sync
 * Global endpoint for direct sync from client components
 */
invoicePaymentRouter.post('/sync', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (!body.invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required' });
    }

    const result = syncInvoicePaymentToFinanceLedger({
      invoiceId: body.invoiceId,
      paymentId: body.paymentId,
      invoiceNumber: body.invoiceNumber,
      amount: Number(body.amount) || 0,
      paymentMethod: body.paymentMethod || body.method || 'cash',
      paymentReference: body.paymentReference || body.reference,
      date: body.date || body.paymentDate || new Date(),
      notes: body.notes,
      customerId: body.customerId,
      customerName: body.customerName,
      vehicleId: body.vehicleId,
      vehicleName: body.vehicleName,
      accountId: body.accountId,
      accountName: body.accountName,
      currentUser: body.currentUser,
    });

    return res.status(200).json({
      success: true,
      action: result.action,
      ledgerEntry: result.ledgerEntry,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error processing invoice payment sync',
    });
  }
});

/**
 * POST /api/finance/invoice-payments
 * Direct payment creation/upsert
 */
invoicePaymentRouter.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const invoiceId = body.invoiceId;
    if (!invoiceId) {
      return res.status(400).json({ success: false, error: 'invoiceId is required' });
    }

    const result = syncInvoicePaymentToFinanceLedger({
      invoiceId,
      paymentId: body.paymentId,
      invoiceNumber: body.invoiceNumber,
      amount: Number(body.amount) || 0,
      paymentMethod: body.paymentMethod || body.method || 'cash',
      paymentReference: body.paymentReference || body.reference,
      date: body.date || body.paymentDate || new Date(),
      notes: body.notes,
      customerId: body.customerId,
      customerName: body.customerName,
      vehicleId: body.vehicleId,
      vehicleName: body.vehicleName,
      accountId: body.accountId,
      accountName: body.accountName,
      currentUser: body.currentUser,
    });

    return res.status(200).json({
      success: true,
      action: result.action,
      ledgerEntry: result.ledgerEntry,
      message: `Invoice payment successfully synced to Finance Ledger as Income (${result.action}).`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error processing invoice payment',
    });
  }
});

/**
 * GET /api/invoices/:invoiceId/payments
 * Retrieve all synced payments for an invoice
 */
invoicePaymentRouter.get('/:invoiceId/payments', (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  const entries = serverPaymentLedger.filter((e) => e.invoiceId === invoiceId);
  return res.json({
    success: true,
    payments: entries,
  });
});

/**
 * GET /api/finance/invoice-payments
 * Retrieve all synced payments
 */
invoicePaymentRouter.get('/', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    payments: serverPaymentLedger,
  });
});

/**
 * DELETE /api/invoices/:invoiceId/payments/:paymentId
 * Remove payment from ledger
 */
invoicePaymentRouter.delete('/:invoiceId/payments/:paymentId', (req: Request, res: Response) => {
  const { invoiceId, paymentId } = req.params;
  const idx = serverPaymentLedger.findIndex(
    (e) => e.invoiceId === invoiceId && e.paymentId === paymentId
  );
  if (idx >= 0) {
    serverPaymentLedger.splice(idx, 1);
    return res.json({ success: true, message: 'Payment removed from Finance Ledger' });
  }
  return res.json({ success: true, message: 'No matching server ledger entry found' });
});

/**
 * DELETE /api/finance/invoice-payments/:paymentId
 */
invoicePaymentRouter.delete('/:paymentId', (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const idx = serverPaymentLedger.findIndex((e) => e.paymentId === paymentId);
  if (idx >= 0) {
    serverPaymentLedger.splice(idx, 1);
    return res.json({ success: true, message: 'Payment removed from Finance Ledger' });
  }
  return res.json({ success: true, message: 'No matching server ledger entry found' });
});
