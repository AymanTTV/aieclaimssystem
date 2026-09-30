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
