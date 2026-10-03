// src/server/accountsRoutes.ts
import { Router, Request, Response } from 'express';

export const accountsRouter = Router();

// Standardized Unified Account data model
export interface UnifiedAccountDto {
  id: string;
  name: string;
  accountName: string;
  accountType: string;
  balance: number;
  vehicleId?: string | null;
  vehicleName?: string | null;
  isSharedOwnership?: boolean;
  sharedOwnership?: Array<{
    accountId?: string;
    ownerName: string;
    sharePercentage: number;
    isCompany?: boolean;
  }> | null;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory synced accounts cache on backend
let serverAccounts: UnifiedAccountDto[] = [
  {
    id: 'acc_aie_claims',
    name: 'AIE CLAIMS',
    accountName: 'AIE CLAIMS',
    accountType: 'bank',
    balance: 14250,
    vehicleId: null,
    vehicleName: null,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
      { ownerName: 'Claims Operations', sharePercentage: 40, isCompany: false },
    ],
  },
  {
    id: 'acc_aie_skyline',
    name: 'AIE SKYLINE ACCOUNTS',
    accountName: 'AIE SKYLINE ACCOUNTS',
    accountType: 'bank',
    balance: 48920,
    vehicleId: null,
    vehicleName: null,
    isSharedOwnership: false,
    sharedOwnership: null,
  },
  {
    id: 'acc_ali_hassan',
    name: 'ALI HASSAN AHMED',
    accountName: 'ALI HASSAN AHMED',
    accountType: 'general',
    balance: 3200,
    vehicleId: null,
    vehicleName: null,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Ali Hassan Ahmed', sharePercentage: 50, isCompany: false },
    ],
  },
  {
    id: 'acc_dahir_hassan',
    name: 'DAHIR HASSAN ELMI',
    accountName: 'DAHIR HASSAN ELMI',
    accountType: 'general',
    balance: 2150,
    vehicleId: null,
    vehicleName: null,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Dahir Hassan Elmi', sharePercentage: 50, isCompany: false },
    ],
  },
  {
    id: 'acc_ikram_abdulaziz',
    name: 'IKRAM ABDULAZIZ',
    accountName: 'IKRAM ABDULAZIZ',
    accountType: 'general',
    balance: 4680,
    vehicleId: null,
    vehicleName: null,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Ikram Abdulaziz', sharePercentage: 50, isCompany: false },
    ],
  },
];

/**
 * GET /api/accounts
 * Unified API endpoint that both Finance Page and Invoice Page call to populate accounts dropdowns & filters
 */
accountsRouter.get('/', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: serverAccounts,
    accounts: serverAccounts,
    total: serverAccounts.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/accounts/finance
 * Returns uniform unfiltered active accounts for Finance page
 */
accountsRouter.get('/finance', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: serverAccounts,
    accounts: serverAccounts,
    total: serverAccounts.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/accounts/invoices
 * Returns uniform unfiltered active accounts for Invoice page
 */
accountsRouter.get('/invoices', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: serverAccounts,
    accounts: serverAccounts,
    total: serverAccounts.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/accounts/invoice
 * Alias for /api/accounts/invoices
 */
accountsRouter.get('/invoice', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: serverAccounts,
    accounts: serverAccounts,
    total: serverAccounts.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/accounts/sync
 * Syncs the client-side accounts list with the backend cache
 */
accountsRouter.post('/sync', (req: Request, res: Response) => {
  try {
    const { accounts } = req.body;
    if (Array.isArray(accounts) && accounts.length > 0) {
      serverAccounts = accounts.map((acc: any) => ({
        id: String(acc.id),
        name: acc.name || acc.accountName || 'Unnamed Account',
        accountName: acc.accountName || acc.name || 'Unnamed Account',
        accountType: acc.accountType || 'general',
        balance: Number(acc.balance || 0),
        vehicleId: acc.vehicleId || null,
        vehicleName: acc.vehicleName || null,
        isSharedOwnership: Boolean(acc.isSharedOwnership),
        sharedOwnership: acc.sharedOwnership || null,
        createdAt: acc.createdAt ? (acc.createdAt instanceof Date ? acc.createdAt.toISOString() : String(acc.createdAt)) : undefined,
        updatedAt: acc.updatedAt ? (acc.updatedAt instanceof Date ? acc.updatedAt.toISOString() : String(acc.updatedAt)) : undefined,
      }));
    }
    return res.json({
      success: true,
      data: serverAccounts,
      accounts: serverAccounts,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to sync accounts',
    });
  }
});
