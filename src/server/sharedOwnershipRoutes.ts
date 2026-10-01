// src/server/sharedOwnershipRoutes.ts
import { Router, Request, Response } from 'express';

export const sharedOwnershipRouter = Router();

// In-memory payout history store (synced with Firestore records)
interface PayoutLogEntry {
  id: string;
  vehicleId?: string;
  vehicleName?: string;
  accountId: string;
  accountName: string;
  datePaid: string;
  periodCovered: string;
  grossBilled: number;
  expenses: number;
  totalProfit: number;
  companySharePct: number;
  companyShareAmount: number;
  companyAccountId: string;
  companyAccountName: string;
  ownerSharePct: number;
  ownerShareAmount: number;
  ownerName: string;
  payoutReference: string;
  transferTransactionId?: string;
  payoutTransactionId?: string;
  clearedBalanceAmount?: number;
  notes?: string;
  status: 'completed' | 'cleared';
  createdAt: string;
  createdBy: string;
}

const serverPayoutLogs: PayoutLogEntry[] = [];

/**
 * POST /api/finance/shared-ownership/calculate
 * Computes net profit and automated share splits according to configured percentages
 */
sharedOwnershipRouter.post('/calculate', (req: Request, res: Response) => {
  try {
    const {
      grossBilled = 0,
      expenses = 0,
      sharedOwnership = [],
      ownerName = 'Partner',
    } = req.body;

    const billed = Math.max(0, Number(grossBilled) || 0);
    const exp = Math.max(0, Number(expenses) || 0);
    const netProfit = Number((billed - exp).toFixed(2));

    let shares = sharedOwnership;
    if (!Array.isArray(shares) || shares.length === 0) {
      shares = [
        { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
        { ownerName, sharePercentage: 40, isCompany: false },
      ];
    }

    let companyShareAmount = 0;
    let companySharePct = 0;
    let ownerShareAmount = 0;
    let ownerSharePct = 0;

    const computedShares = shares.map((s: any) => {
      const isCompany =
        s.isCompany === true ||
        String(s.ownerName || '').toLowerCase().includes('aie skyline') ||
        String(s.ownerName || '').toLowerCase().includes('company');
      const pct = Number(s.sharePercentage || 0);
      const amount = netProfit > 0 ? Number(((netProfit * pct) / 100).toFixed(2)) : 0;

      if (isCompany) {
        companyShareAmount += amount;
        companySharePct += pct;
      } else {
        ownerShareAmount += amount;
        ownerSharePct += pct;
      }

      return {
        ownerName: s.ownerName,
        sharePercentage: pct,
        shareAmount: amount,
        isCompany,
        accountId: s.accountId,
      };
    });

    res.json({
      success: true,
      grossBilled: billed,
      expenses: exp,
      netProfit,
      shares: computedShares,
      companyShareAmount: Number(companyShareAmount.toFixed(2)),
      companySharePct,
      ownerShareAmount: Number(ownerShareAmount.toFixed(2)),
      ownerSharePct,
    });
  } catch (error: any) {
    console.error('Error in /api/finance/shared-ownership/calculate:', error);
    res.status(500).json({ success: false, error: error?.message || 'Calculation error' });
  }
});

/**
 * POST /api/finance/shared-ownership/payout
 * Records the profit payout audit log on the server
 */
sharedOwnershipRouter.post('/payout', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.sourceAccountId || !payload.payoutReference) {
      return res.status(400).json({ success: false, error: 'Missing required payout fields' });
    }

    const logEntry: PayoutLogEntry = {
      id: `payout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      vehicleId: payload.vehicleId,
      vehicleName: payload.vehicleName,
      accountId: payload.sourceAccountId,
      accountName: payload.sourceAccountName || 'Vehicle Account',
      datePaid: payload.payoutDate || new Date().toISOString(),
      periodCovered: payload.periodCovered || 'Current Period',
      grossBilled: Number(payload.grossBilled || 0),
      expenses: Number(payload.expenses || 0),
      totalProfit: Number(payload.totalProfit || 0),
      companySharePct: Number(payload.companySharePct || 0),
      companyShareAmount: Number(payload.companyShareAmount || 0),
      companyAccountId: payload.companyAccountId || 'aie_default',
      companyAccountName: payload.companyAccountName || 'AIE SKYLINE ACCOUNTS',
      ownerSharePct: Number(payload.ownerSharePct || 0),
      ownerShareAmount: Number(payload.ownerShareAmount || 0),
      ownerName: payload.ownerName || 'Partner',
      payoutReference: payload.payoutReference,
      transferTransactionId: payload.transferTransactionId,
      payoutTransactionId: payload.payoutTransactionId,
      clearedBalanceAmount: Number(payload.clearedBalanceAmount || 0),
      notes: payload.notes,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: payload.currentUser?.name || payload.currentUser?.email || 'System',
    };

    serverPayoutLogs.unshift(logEntry);

    res.status(201).json({
      success: true,
      payoutRecord: logEntry,
      message: 'Payout recorded successfully',
    });
  } catch (error: any) {
    console.error('Error in /api/finance/shared-ownership/payout:', error);
    res.status(500).json({ success: false, error: error?.message || 'Payout settlement error' });
  }
});

/**
 * POST /api/finance/shared-ownership/commission-payout
 * Executes Account-Level Commission Payout:
 * 1. Creates a Debit/Expense entry on Partner's Account for the 70% payout
 *    Description: "Shareholder Payout: [Date From] to [Date To]"
 * 2. Creates a Debit/Expense entry on Partner's Account for the 30% commission,
 *    AND a matching Credit/Income entry on the main AIE Skyline Account
 *    Description: "Company Commission: [Account Name]"
 */
sharedOwnershipRouter.post('/commission-payout', (req: Request, res: Response) => {
  try {
    const {
      partnerAccountId,
      partnerAccountName,
      companyAccountId = 'aie_default',
      companyAccountName = 'AIE SKYLINE ACCOUNTS',
      dateFrom = '',
      dateTo = '',
      totalIncome = 0,
      totalExpenses = 0,
      netProfit = 0,
      companyCommissionPct = 30,
      companyCommissionAmount = 0,
      shareholderPayoutPct = 70,
      shareholderPayoutAmount = 0,
      payoutDate = new Date().toISOString(),
      notes = '',
      createdBy = 'System',
    } = req.body;

    if (!partnerAccountId) {
      return res.status(400).json({ success: false, error: 'Partner account ID is required' });
    }

    const periodStr = `${dateFrom} to ${dateTo}`.trim();
    const shareholderPayoutDesc = `Shareholder Payout: ${periodStr || 'Settlement Period'}`;
    const companyCommissionDesc = `Company Commission: ${partnerAccountName || 'Partner Account'}`;

    const payoutTxId = `tx-payout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const commissionDebitTxId = `tx-comm-deb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const commissionCreditTxId = `tx-comm-crd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Debit/Expense entry on Partner Account for Shareholder Payout
    const shareholderTx = {
      id: payoutTxId,
      type: 'expense',
      transactionType: 'EXPENSE',
      entryType: 'DEBIT',
      category: 'Shareholder Payout',
      amount: Number(shareholderPayoutAmount) || 0,
      netAmount: Number(shareholderPayoutAmount) || 0,
      vatAmount: 0,
      description: shareholderPayoutDesc,
      customerName: partnerAccountName,
      accountFrom: partnerAccountId,
      accountsFrom: [partnerAccountId],
      paymentMethod: 'bank_transfer',
      paymentReference: `PAYOUT-${Date.now().toString().slice(-6)}`,
      status: 'completed',
      paymentStatus: 'paid',
      date: payoutDate,
      createdAt: new Date().toISOString(),
      createdBy,
      notes,
    };

    // 2. Debit/Expense entry on Partner Account for Company Commission
    const commissionDebitTx = {
      id: commissionDebitTxId,
      type: 'expense',
      transactionType: 'EXPENSE',
      entryType: 'DEBIT',
      category: 'Company Commission',
      amount: Number(companyCommissionAmount) || 0,
      netAmount: Number(companyCommissionAmount) || 0,
      vatAmount: 0,
      description: companyCommissionDesc,
      customerName: companyAccountName,
      accountFrom: partnerAccountId,
      accountsFrom: [partnerAccountId],
      paymentMethod: 'bank_transfer',
      paymentReference: `COMM-DEB-${Date.now().toString().slice(-6)}`,
      status: 'completed',
      paymentStatus: 'paid',
      date: payoutDate,
      createdAt: new Date().toISOString(),
      createdBy,
      notes,
    };

    // 3. Matching Credit/Income entry on Main AIE Skyline Account for Company Commission
    const commissionCreditTx = {
      id: commissionCreditTxId,
      type: 'income',
      transactionType: 'INCOME',
      entryType: 'CREDIT',
      category: 'Company Commission',
      amount: Number(companyCommissionAmount) || 0,
      netAmount: Number(companyCommissionAmount) || 0,
      vatAmount: 0,
      description: companyCommissionDesc,
      customerName: partnerAccountName,
      accountTo: companyAccountId,
      accountsTo: [companyAccountId],
      paymentMethod: 'bank_transfer',
      paymentReference: `COMM-CRD-${Date.now().toString().slice(-6)}`,
      status: 'completed',
      paymentStatus: 'paid',
      date: payoutDate,
      createdAt: new Date().toISOString(),
      createdBy,
      notes,
    };

    const logEntry: PayoutLogEntry = {
      id: `payout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      accountId: partnerAccountId,
      accountName: partnerAccountName || 'Partner Account',
      datePaid: payoutDate,
      periodCovered: periodStr,
      grossBilled: Number(totalIncome) || 0,
      expenses: Number(totalExpenses) || 0,
      totalProfit: Number(netProfit) || 0,
      companySharePct: Number(companyCommissionPct) || 0,
      companyShareAmount: Number(companyCommissionAmount) || 0,
      companyAccountId,
      companyAccountName,
      ownerSharePct: Number(shareholderPayoutPct) || 0,
      ownerShareAmount: Number(shareholderPayoutAmount) || 0,
      ownerName: partnerAccountName || 'Shareholder',
      payoutReference: `SETTLE-${Date.now().toString().slice(-6)}`,
      transferTransactionId: commissionDebitTxId,
      payoutTransactionId: payoutTxId,
      notes,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy,
    };

    serverPayoutLogs.unshift(logEntry);

    // Audit Log for payout_logs collection
    const payoutAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: req.body.userId || 'unknown_user',
      userEmail: req.body.userEmail || '',
      userName: createdBy || 'Finance Admin',
      timestamp: new Date().toISOString(),
      action: 'PROFIT_DISTRIBUTION_PAYOUT_SETTLED',
      actionDescription: `Profit Distribution Payout Settled for ${partnerAccountName}: £${Number(shareholderPayoutAmount).toFixed(2)} payout to shareholder (${shareholderPayoutPct}%), £${Number(companyCommissionAmount).toFixed(2)} commission to ${companyAccountName} (${companyCommissionPct}%) for period ${dateFrom} to ${dateTo}.`,
      accountId: partnerAccountId,
      accountName: partnerAccountName,
      periodCovered: periodStr,
      totalIncome: Number(totalIncome) || 0,
      totalExpenses: Number(totalExpenses) || 0,
      netProfit: Number(netProfit) || 0,
      companyCommissionAmount: Number(companyCommissionAmount) || 0,
      shareholderPayoutAmount: Number(shareholderPayoutAmount) || 0,
      notes,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      message: 'Account-level commission payout recorded successfully',
      payoutRecord: logEntry,
      auditLog: payoutAuditLog,
      transactions: [shareholderTx, commissionDebitTx, commissionCreditTx],
    });
  } catch (error: any) {
    console.error('Error in /api/finance/shared-ownership/commission-payout:', error);
    res.status(500).json({ success: false, error: error?.message || 'Settlement error' });
  }
});

/**
 * GET /api/finance/shared-ownership/history
 * Returns the payout audit trail
 */
sharedOwnershipRouter.get('/history', (req: Request, res: Response) => {
  const { vehicleId, accountId } = req.query;
  let logs = serverPayoutLogs;

  if (vehicleId) {
    logs = logs.filter((l) => l.vehicleId === String(vehicleId));
  }
  if (accountId) {
    logs = logs.filter((l) => l.accountId === String(accountId));
  }

  res.json({
    success: true,
    logs,
  });
});

/**
 * GET /api/finance/shared-ownership/payout-logs
 * Returns settlement audit logs recording user ID, timestamp, and action description
 */
sharedOwnershipRouter.get('/payout-logs', (req: Request, res: Response) => {
  const { accountId, userId } = req.query;
  let logs = serverPayoutLogs.map((l) => ({
    id: `log-${l.id}`,
    userId: (l as any).userId || (l as any).createdBy || 'system',
    userName: (l as any).createdBy || 'Finance Admin',
    timestamp: l.createdAt || l.datePaid,
    action: 'PROFIT_DISTRIBUTION_PAYOUT_SETTLED',
    actionDescription: `Profit Distribution Payout Settled for ${l.accountName}: £${Number(l.ownerShareAmount || 0).toFixed(2)} payout to shareholder (${l.ownerSharePct || 70}%), £${Number(l.companyShareAmount || 0).toFixed(2)} commission to ${l.companyAccountName || 'AIE Skyline'} (${l.companySharePct || 30}%) for period ${l.periodCovered}.`,
    accountId: l.accountId,
    accountName: l.accountName,
    periodCovered: l.periodCovered,
    totalIncome: l.grossBilled,
    totalExpenses: l.expenses,
    netProfit: l.totalProfit,
    shareholderPayoutAmount: l.ownerShareAmount,
    companyCommissionAmount: l.companyShareAmount,
    status: l.status,
  }));

  if (accountId) {
    logs = logs.filter((l) => l.accountId === String(accountId));
  }
  if (userId) {
    logs = logs.filter((l) => l.userId === String(userId));
  }

  res.json({
    success: true,
    count: logs.length,
    logs,
  });
});
