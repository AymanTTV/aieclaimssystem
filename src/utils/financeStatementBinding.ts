// src/utils/financeStatementBinding.ts

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { format, isValid, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { Transaction, Account } from '../types';
import {
  AccountStatementDocument,
  AccountStatementData,
  StatementTransactionItem,
} from '../components/pdf/documents/AccountStatementDocument';
import {
  AIE_SKYLINE_LOGO_BASE64,
  AIE_CLAIMS_LOGO_BASE64,
} from './companyLogoResolver';
import companySignatureFallback from '../assets/signiture.png';
import companyLogoFallback from '../assets/logo.png';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface RegisteredEntityAccount {
  id: string;
  key: string;
  name: string;
  tradingName: string;
  badge: string;
  registrationNumber: string;
  vatNumber: string;
  officialAddress: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccountName: string;
  accountNumber: string;
  sortCode: string;
  iban?: string;
  bic?: string;
  currency: string;
  logoUrl: string;
  signatureUrl: string;
  isDefault?: boolean;
}

export const PRESET_REGISTERED_ENTITIES: RegisteredEntityAccount[] = [
  {
    id: 'entity_aie_skyline',
    key: 'aie_skyline',
    name: 'AIE Skyline Limited',
    tradingName: 'AIE Skyline',
    badge: 'Corporate Operating & Rentals',
    registrationNumber: '14592207',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 1234 5678',
    email: 'info@aieskyline.co.uk',
    website: 'www.aieskyline.co.uk',
    bankName: 'Lloyds Bank Commercial',
    bankAccountName: 'AIE SKYLINE LIMITED',
    accountNumber: '30513162',
    sortCode: '30-99-50',
    currency: 'GBP (£)',
    logoUrl: AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback,
    signatureUrl: companySignatureFallback,
    isDefault: true,
  },
  {
    id: 'entity_aie_claims',
    key: 'aie_claims',
    name: 'AIE Claims LTD',
    tradingName: 'AIE Claims Ltd.',
    badge: 'Accident Management & Credit Hire',
    registrationNumber: '15616639',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '+442080505337',
    email: 'claims@aieclaims.co.uk',
    website: 'www.aieclaims.co.uk',
    bankName: 'NatWest Fleet Operations',
    bankAccountName: 'AIE Claims Ltd',
    accountNumber: '87654321',
    sortCode: '60-12-34',
    currency: 'GBP (£)',
    logoUrl: AIE_CLAIMS_LOGO_BASE64 || companyLogoFallback,
    signatureUrl: companySignatureFallback,
    isDefault: false,
  },
  {
    id: 'entity_aie_vehicles',
    key: 'aie_vehicles',
    name: 'AIE Vehicles',
    tradingName: 'AIE Vehicles & Fleet',
    badge: 'Vehicle Fleet & Asset Ledger',
    registrationNumber: '14592207',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8900 1212',
    email: 'fleet@aievehicles.co.uk',
    website: 'www.aievehicles.co.uk',
    bankName: 'Barclays Bank UK PLC',
    bankAccountName: 'AIE Vehicles Ltd',
    accountNumber: '12345678',
    sortCode: '20-00-00',
    currency: 'GBP (£)',
    logoUrl: AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback,
    signatureUrl: companySignatureFallback,
    isDefault: false,
  },
  {
    id: 'entity_skyline_cabs',
    key: 'skyline_cabs',
    name: 'Skyline Cabs & Transportation Ltd',
    tradingName: 'Skyline Cabs',
    badge: 'Licensed Private Hire & Chauffeur',
    registrationNumber: '14882190',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8900 1212',
    email: 'dispatch@skylinecabs.co.uk',
    website: 'www.skylinecabs.co.uk',
    bankName: 'Santander UK PLC',
    bankAccountName: 'Skyline Cabs Ltd',
    accountNumber: '45678901',
    sortCode: '09-01-28',
    currency: 'GBP (£)',
    logoUrl: AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback,
    signatureUrl: companySignatureFallback,
    isDefault: false,
  },
  {
    id: 'entity_sayarah_ijarah',
    key: 'sayarah_ijarah',
    name: 'Sayarah Ijaraha Limited',
    tradingName: 'Sayarah Ijarah',
    badge: 'Islamic Vehicle Lease & Hire Purchase',
    registrationNumber: '14992011',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8050 5337',
    email: 'info@sayarahijarah.co.uk',
    website: 'www.sayarahijarah.co.uk',
    bankName: 'Lloyds Bank Commercial',
    bankAccountName: 'Sayarah Ijaraha Limited',
    accountNumber: '30513162',
    sortCode: '30-99-50',
    currency: 'GBP (£)',
    logoUrl: AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback,
    signatureUrl: companySignatureFallback,
    isDefault: false,
  },
];

/**
 * Standard active records from Manage Accounts modal (fallback / seed)
 */
export const DEFAULT_MANAGE_ACCOUNTS: Account[] = [
  {
    id: 'acc_aie_claims',
    name: 'AIE CLAIMS',
    accountName: 'AIE CLAIMS',
    accountType: 'bank',
    balance: 14250,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 60, isCompany: true },
      { ownerName: 'Claims Partner', sharePercentage: 40, isCompany: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc_aie_skyline',
    name: 'AIE SKYLINE ACCOUNTS',
    accountName: 'AIE SKYLINE ACCOUNTS',
    accountType: 'bank',
    balance: 48920,
    isSharedOwnership: false,
    sharedOwnership: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc_ali_hassan',
    name: 'ALI HASSAN AHMED',
    accountName: 'ALI HASSAN AHMED',
    accountType: 'general',
    balance: 3200,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Ali Hassan Ahmed', sharePercentage: 50, isCompany: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc_dahir_hassan',
    name: 'DAHIR HASSAN ELMI',
    accountName: 'DAHIR HASSAN ELMI',
    accountType: 'general',
    balance: 2150,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Dahir Hassan Elmi', sharePercentage: 50, isCompany: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc_ikram_abdulaziz',
    name: 'IKRAM ABDULAZIZ',
    accountName: 'IKRAM ABDULAZIZ',
    accountType: 'general',
    balance: 4680,
    isSharedOwnership: true,
    sharedOwnership: [
      { ownerName: 'AIE Skyline Limited', sharePercentage: 50, isCompany: true },
      { ownerName: 'Ikram Abdulaziz', sharePercentage: 50, isCompany: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Calculates current ledger balance for each account using transactions map
 */
export const calculateAccountBalances = (
  accounts: Account[] = [],
  transactions: Transaction[] = []
): Map<string, number> => {
  const balances = new Map<string, number>();
  accounts.forEach((acc) => {
    balances.set(acc.id, acc.balance ?? 0);
  });

  if (transactions && transactions.length > 0) {
    // Re-initialize from 0 if computing purely from ledger rows
    accounts.forEach((acc) => {
      balances.set(acc.id, 0);
    });

    transactions.forEach((txn) => {
      const fullAmount = Number(txn.amount) || 0;

      if (txn.type === 'income' && txn.accountsTo && txn.accountsTo.length > 0) {
        txn.accountsTo.forEach((accId) => {
          if (balances.has(accId)) {
            balances.set(accId, (balances.get(accId) || 0) + fullAmount);
          }
        });
      } else if (txn.type === 'expense' && txn.accountsFrom && txn.accountsFrom.length > 0) {
        txn.accountsFrom.forEach((accId) => {
          if (balances.has(accId)) {
            balances.set(accId, (balances.get(accId) || 0) - fullAmount);
          }
        });
      } else if (
        (!txn.accountsFrom || txn.accountsFrom.length === 0) &&
        (!txn.accountsTo || txn.accountsTo.length === 0)
      ) {
        // Fallback default operating account matching
        const defaultAccount = accounts.find(
          (a) =>
            a.name.toUpperCase().includes('SKYLINE') ||
            a.name.toUpperCase().includes('AIE')
        );
        if (defaultAccount && balances.has(defaultAccount.id)) {
          const amountToAdd = txn.type === 'income' ? fullAmount : -fullAmount;
          balances.set(defaultAccount.id, (balances.get(defaultAccount.id) || 0) + amountToAdd);
        }
      }
    });
  }

  return balances;
};

/**
 * Formats dropdown option label using real ledger metadata:
 * {Account Name} ({Shared % if co-owned} • Balance: £{Current Balance})
 */
export const formatAccountDropdownLabel = (
  account: Account,
  balance: number
): string => {
  const shares = account.sharedOwnership || [];
  const isShared = Boolean(account.isSharedOwnership || shares.length > 0);

  const formattedBalance = `£${balance.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  if (isShared) {
    let sharedText = 'Co-Owned';
    if (shares.length > 0) {
      sharedText = shares
        .map((s) => `${s.sharePercentage}% ${s.ownerName ? s.ownerName.split(' ')[0] : 'Partner'}`)
        .join(' / ');
    }
    return `${account.name} (${sharedText} • Balance: ${formattedBalance})`;
  }

  return `${account.name} (Balance: ${formattedBalance})`;
};

/**
 * Converts a dynamic Finance Account record into a RegisteredEntityAccount
 * with full corporate branding, bank details, and contact info for statement generation
 */
export const convertAccountToEntity = (
  account: Account,
  companySettings?: any,
  calculatedBalance?: number
): RegisteredEntityAccount => {
  const lowerName = account.name.toLowerCase();
  const isClaims = lowerName.includes('claim');
  const isVehicles = lowerName.includes('vehicle') || lowerName.includes('fleet');
  const isSkyline = lowerName.includes('skyline') || lowerName.includes('operating');

  let defaultPreset = PRESET_REGISTERED_ENTITIES[0]; // AIE Skyline Limited
  if (isClaims) {
    defaultPreset = PRESET_REGISTERED_ENTITIES.find((e) => e.key === 'aie_claims') || PRESET_REGISTERED_ENTITIES[1];
  } else if (isVehicles) {
    defaultPreset = PRESET_REGISTERED_ENTITIES.find((e) => e.key === 'aie_vehicles') || PRESET_REGISTERED_ENTITIES[2];
  }

  const shares = account.sharedOwnership || [];
  const isShared = Boolean(account.isSharedOwnership || shares.length > 0);

  let badge = 'Active Ledger Account';
  if (isShared) {
    badge = 'Co-Owned Account';
  } else if (account.accountType) {
    badge = `${account.accountType.toUpperCase()} Account`;
  }

  // Derive stable account number & sort code
  const accNum =
    (account as any).accountNumber ||
    (account as any).bankAccountNumber ||
    (isClaims ? '87654321' : defaultPreset.accountNumber);
  const sCode =
    (account as any).sortCode ||
    (account as any).bankSortCode ||
    (isClaims ? '60-12-34' : defaultPreset.sortCode);

  return {
    id: account.id,
    key: `acc_${account.id}`,
    name: account.name,
    tradingName: account.accountName || account.name,
    badge,
    registrationNumber: companySettings?.companyNumber || defaultPreset.registrationNumber,
    vatNumber: companySettings?.vatNumber || defaultPreset.vatNumber,
    officialAddress: companySettings?.officialAddress || defaultPreset.officialAddress,
    phone: companySettings?.phone || (isClaims ? '+442080505337' : defaultPreset.phone),
    email: companySettings?.email || (isClaims ? 'claims@aieclaims.co.uk' : defaultPreset.email),
    website: companySettings?.website || defaultPreset.website,
    bankName: isClaims ? 'NatWest Fleet Operations' : defaultPreset.bankName,
    bankAccountName: account.name,
    accountNumber: accNum,
    sortCode: sCode,
    currency: 'GBP (£)',
    logoUrl: isClaims
      ? (AIE_CLAIMS_LOGO_BASE64 || companyLogoFallback)
      : (AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback),
    signatureUrl: companySignatureFallback,
    isDefault: isSkyline,
  };
};

/**
 * Automatically defaults to the account linked to the selected transaction row
 */
export const resolveDefaultAccountForTransaction = (
  transaction: Transaction | null,
  accounts: Account[] = []
): Account => {
  if (accounts.length === 0) {
    return DEFAULT_MANAGE_ACCOUNTS[0];
  }

  if (!transaction) {
    return accounts[0];
  }

  // 1. Transaction accountsTo or accountsFrom ID match
  const targetAccId =
    transaction.type === 'income'
      ? transaction.accountsTo?.[0]
      : transaction.accountsFrom?.[0] || (transaction as any).accountId;

  if (targetAccId) {
    const matchedById = accounts.find((a) => a.id === targetAccId);
    if (matchedById) return matchedById;
  }

  // 2. Transaction accountName or account property
  const txnAccName = (transaction as any).accountName || (transaction as any).account;
  if (txnAccName) {
    const matchedByName = accounts.find(
      (a) => a.name.toLowerCase() === String(txnAccName).toLowerCase()
    );
    if (matchedByName) return matchedByName;
  }

  // 3. Search category / description
  const text = `${transaction.description || ''} ${transaction.category || ''} ${transaction.referenceId || ''}`.toLowerCase();
  const matchedByDesc = accounts.find((a) => a.name && text.includes(a.name.toLowerCase()));
  if (matchedByDesc) return matchedByDesc;

  // 4. Default to first account or Skyline/Claims
  const defaultAcc =
    accounts.find((a) => a.name.toUpperCase().includes('SKYLINE')) ||
    accounts.find((a) => a.name.toUpperCase().includes('AIE')) ||
    accounts[0];

  return defaultAcc;
};

/**
 * Builds merged list of registered accounts and corporate entities
 */
export const getEffectiveRegisteredEntities = (
  accounts: Account[] = [],
  companySettings?: any
): RegisteredEntityAccount[] => {
  const list = [...PRESET_REGISTERED_ENTITIES];

  if (companySettings) {
    if (companySettings.fullName || companySettings.name) {
      const idx = list.findIndex((e) => e.key === 'aie_skyline');
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          name: companySettings.fullName || companySettings.name || list[idx].name,
          tradingName: companySettings.tradingName || list[idx].tradingName,
          registrationNumber: companySettings.companyNumber || list[idx].registrationNumber,
          vatNumber: companySettings.vatNumber || list[idx].vatNumber,
          officialAddress: companySettings.officialAddress || list[idx].officialAddress,
          phone: companySettings.phone || list[idx].phone,
          email: companySettings.email || list[idx].email,
          website: companySettings.website || list[idx].website,
          bankName: companySettings.bankName || list[idx].bankName,
          accountNumber: companySettings.bankAccountNumber || companySettings.accountNumber || list[idx].accountNumber,
          sortCode: companySettings.bankSortCode || companySettings.sortCode || list[idx].sortCode,
        };
      }
    }
  }

  // Merge any accounts from Firestore accounts array that are not already present
  accounts.forEach((acc) => {
    const existing = list.find(
      (e) =>
        e.id === acc.id ||
        e.name.toLowerCase() === acc.name.toLowerCase() ||
        (acc.accountName && e.name.toLowerCase() === acc.accountName.toLowerCase())
    );
    if (!existing) {
      list.push({
        id: acc.id,
        key: `acc_${acc.id}`,
        name: acc.name,
        tradingName: acc.accountName || acc.name,
        badge: acc.accountType ? `${acc.accountType.toUpperCase()} Account` : 'Registered Operating Account',
        registrationNumber: '14592207',
        vatNumber: '453448875',
        officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
        phone: '020 1234 5678',
        email: 'info@aieskyline.co.uk',
        website: 'www.aieskyline.co.uk',
        bankName: 'Operating Bank Account',
        bankAccountName: acc.name,
        accountNumber: (acc as any).accountNumber || '30513162',
        sortCode: (acc as any).sortCode || '30-99-50',
        currency: 'GBP (£)',
        logoUrl: AIE_SKYLINE_LOGO_BASE64 || companyLogoFallback,
        signatureUrl: companySignatureFallback,
        isDefault: false,
      });
    }
  });

  return list;
};

/**
 * Resolves the best pre-selected entity for a given transaction
 */
export const resolveInitialEntityForTransaction = (
  transaction: Transaction | null,
  entities: RegisteredEntityAccount[],
  accounts: Account[] = []
): RegisteredEntityAccount => {
  if (!transaction || entities.length === 0) {
    return entities[0] || PRESET_REGISTERED_ENTITIES[0];
  }

  const txnAccId =
    transaction.type === 'income'
      ? transaction.accountsTo?.[0]
      : transaction.accountsFrom?.[0];

  if (txnAccId) {
    const byId = entities.find((e) => e.id === txnAccId);
    if (byId) return byId;

    const matchedAccount = accounts.find((a) => a.id === txnAccId);
    if (matchedAccount) {
      const byName = entities.find(
        (e) =>
          e.name.toLowerCase() === matchedAccount.name.toLowerCase() ||
          matchedAccount.name.toLowerCase().includes(e.tradingName.toLowerCase())
      );
      if (byName) return byName;
    }
  }

  // Check category or transaction description keywords
  const desc = `${transaction.description || ''} ${transaction.category || ''} ${transaction.referenceId || ''}`.toLowerCase();
  if (desc.includes('claim') || desc.includes('accident') || desc.includes('credit hire')) {
    const claimsEntity = entities.find((e) => e.key === 'aie_claims');
    if (claimsEntity) return claimsEntity;
  }

  if (desc.includes('vehicle') || desc.includes('maintenance') || desc.includes('mot') || desc.includes('service')) {
    const vehicleEntity = entities.find((e) => e.key === 'aie_vehicles');
    if (vehicleEntity) return vehicleEntity;
  }

  if (desc.includes('cab') || desc.includes('taxi')) {
    const cabsEntity = entities.find((e) => e.key === 'skyline_cabs');
    if (cabsEntity) return cabsEntity;
  }

  // Default to Skyline Limited (first or marked default)
  return entities.find((e) => e.isDefault) || entities[0] || PRESET_REGISTERED_ENTITIES[0];
};

/**
 * Builds standard statement data structure for a given transaction & entity
 */
export const buildStatementDataForTransaction = (
  transaction: Transaction,
  selectedEntity: RegisteredEntityAccount,
  relatedTransactions: Transaction[] = [],
  runningBalance?: number
): { statementData: AccountStatementData; companyDetails: any; filename: string } => {
  const txnDate = transaction.date
    ? (transaction.date as any)?.toDate
      ? (transaction.date as any).toDate()
      : transaction.date instanceof Date
      ? transaction.date
      : new Date(transaction.date)
    : new Date();

  const safeDate = isValid(txnDate) ? txnDate : new Date();
  const dateFrom = startOfMonth(safeDate);
  const dateTo = endOfMonth(safeDate);
  const periodLabel = format(safeDate, 'MMMM yyyy');

  const txnRef =
    transaction.referenceId ||
    transaction.orderNumber ||
    transaction.invoiceNumber ||
    transaction.id.slice(-8).toUpperCase();

  // Create clean statement line items
  // Include related transactions for this account/period if provided, else include the transaction row
  let inPeriodList: StatementTransactionItem[] = [];

  const matchedRelated = relatedTransactions.filter((t) => {
    const tDate = t.date
      ? (t.date as any)?.toDate
        ? (t.date as any).toDate()
        : t.date instanceof Date
        ? t.date
        : new Date(t.date)
      : null;
    if (!tDate || !isValid(tDate)) return false;
    // same month
    return tDate.getMonth() === safeDate.getMonth() && tDate.getFullYear() === safeDate.getFullYear();
  });

  if (matchedRelated.length > 0) {
    inPeriodList = matchedRelated.map((t) => {
      const itemDate = t.date
        ? (t.date as any)?.toDate
          ? (t.date as any).toDate()
          : t.date instanceof Date
          ? t.date
          : new Date(t.date)
        : safeDate;
      const isCredit = t.type === 'income' || t.entryType === 'CREDIT';
      return {
        id: t.id,
        date: itemDate,
        reference: t.referenceId || t.orderNumber || t.id.slice(-8).toUpperCase(),
        description: t.description || 'Transaction',
        category: t.category || 'General Ledger',
        type: isCredit ? ('credit' as const) : ('debit' as const),
        amount: Number(t.amount) || 0,
        counterparty: t.customerName || selectedEntity.name,
      };
    });
  } else {
    const isCredit = transaction.type === 'income' || transaction.entryType === 'CREDIT';
    inPeriodList = [
      {
        id: transaction.id,
        date: safeDate,
        reference: txnRef,
        description: transaction.description || 'Transaction Notification Record',
        category: transaction.category || 'General Ledger',
        type: isCredit ? ('credit' as const) : ('debit' as const),
        amount: Number(transaction.amount) || 0,
        counterparty: transaction.customerName || selectedEntity.name,
      },
    ];
  }

  // Calculate totals
  let totalInflows = 0;
  let totalOutflows = 0;
  let inCount = 0;
  let outCount = 0;

  inPeriodList.forEach((item) => {
    if (item.type === 'credit') {
      totalInflows += item.amount;
      inCount++;
    } else {
      totalOutflows += item.amount;
      outCount++;
    }
  });

  const netMovement = Number((totalInflows - totalOutflows).toFixed(2));
  const closingBalance = runningBalance !== undefined ? Number(runningBalance.toFixed(2)) : Number((totalInflows - totalOutflows).toFixed(2));
  const openingBalance = Number((closingBalance - netMovement).toFixed(2));

  let curBal = openingBalance;
  const itemsWithBalance = inPeriodList.map((item) => {
    if (item.type === 'credit') curBal += item.amount;
    else curBal -= item.amount;
    return { ...item, runningBalance: Number(curBal.toFixed(2)) };
  });

  const statementRef = `STMT-${selectedEntity.tradingName.replace(/[^a-zA-Z0-9]/g, '')}-${format(safeDate, 'yyyyMMdd')}-${transaction.id.slice(-4).toUpperCase()}`;

  const statementData: AccountStatementData = {
    statementReference: statementRef,
    statementPeriodType: 'monthly',
    periodLabel,
    dateFrom,
    dateTo,
    generatedDate: new Date(),
    account: {
      id: selectedEntity.id,
      name: selectedEntity.bankAccountName || selectedEntity.name,
      accountType: selectedEntity.badge,
      accountNumber: selectedEntity.accountNumber,
      sortCode: selectedEntity.sortCode,
      currency: 'GBP (£)',
    },
    openingBalance,
    totalInflows: Number(totalInflows.toFixed(2)),
    totalOutflows: Number(totalOutflows.toFixed(2)),
    netMovement,
    closingBalance,
    inflowCount: inCount,
    outflowCount: outCount,
    transactions: itemsWithBalance,
    notes: `Official statement issued on behalf of ${selectedEntity.name}. For inquiries, contact ${selectedEntity.email} or call ${selectedEntity.phone}.`,
    signatoryName: 'Director of Accounts',
    signatoryRole: selectedEntity.name,
    includeSignature: true,
    includeLedger: true,
  };

  const companyDetails = {
    fullName: selectedEntity.name,
    tradingName: selectedEntity.tradingName,
    companyNumber: selectedEntity.registrationNumber,
    vatNumber: selectedEntity.vatNumber,
    officialAddress: selectedEntity.officialAddress,
    phone: selectedEntity.phone,
    email: selectedEntity.email,
    website: selectedEntity.website,
    logoUrl: selectedEntity.logoUrl,
    logo: selectedEntity.logoUrl,
    signature: selectedEntity.signatureUrl,
    signatureUrl: selectedEntity.signatureUrl,
    bankName: selectedEntity.bankName,
    bankAccountNumber: selectedEntity.accountNumber,
    bankSortCode: selectedEntity.sortCode,
  };

  const safeAccName = selectedEntity.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDateStr = format(safeDate, 'dd_MM_yyyy');
  const filename = `Statement_${safeAccName}_${safeDateStr}.pdf`;
  const statementDateRange = `${format(dateFrom, 'dd/MM/yyyy')} – ${format(dateTo, 'dd/MM/yyyy')}`;

  return { statementData, companyDetails, filename, statementDateRange };
};

export interface MergeFinanceTemplateParams {
  rawText: string;
  transaction: Transaction | null;
  customerName: string;
  selectedEntity: RegisteredEntityAccount;
  runningBalance?: number;
  statementDateRange?: string;
  directStatementPdfLink?: string;
  statementDocUrl?: string;
  associatedVehicle?: any;
  formatCurrency: (amount: number) => string;
}

/**
 * Merges all dynamic Finance template placeholders into text,
 * strictly handling:
 * • {Customer_Name}
 * • {Selected_Account_Name}
 * • {Amount}
 * • {Running_Balance}
 * • {Statement_Date_Range}
 * • {Direct_Statement_PDF_Link}
 * plus all bracketed, case-insensitive, and currency-prefixed variants.
 */
export const mergeFinanceTemplateVariables = ({
  rawText,
  transaction,
  customerName,
  selectedEntity,
  runningBalance,
  statementDateRange,
  directStatementPdfLink,
  statementDocUrl,
  associatedVehicle,
  formatCurrency,
}: MergeFinanceTemplateParams): string => {
  if (!rawText || !transaction) return '';

  const txnRef =
    transaction.referenceId ||
    transaction.orderNumber ||
    transaction.invoiceNumber ||
    transaction.id.slice(-8).toUpperCase();

  const amountStr = formatCurrency(transaction.amount || 0);
  const balanceStr =
    runningBalance !== undefined
      ? formatCurrency(runningBalance)
      : formatCurrency(transaction.amount || 0);

  const txnDate = transaction.date
    ? (transaction.date as any)?.toDate
      ? (transaction.date as any).toDate()
      : transaction.date instanceof Date
      ? transaction.date
      : new Date(transaction.date)
    : new Date();
  const dateStr = isValid(txnDate) ? format(txnDate, 'dd/MM/yyyy') : 'N/A';

  const vehicleReg =
    transaction.vehicleName ||
    associatedVehicle?.registrationNumber ||
    'N/A';

  const accName = selectedEntity.name;
  const bankName = selectedEntity.bankName;
  const accNum = selectedEntity.accountNumber;
  const sortCode = selectedEntity.sortCode;

  // Resolve direct statement link
  const safeDateRange =
    statementDateRange ||
    `${format(startOfMonth(txnDate), 'dd/MM/yyyy')} – ${format(endOfMonth(txnDate), 'dd/MM/yyyy')}`;

  const pdfLink =
    directStatementPdfLink ||
    statementDocUrl ||
    `[Statement_${selectedEntity.tradingName.replace(/[^a-zA-Z0-9]/g, '_')}_${format(txnDate, 'yyyyMMdd')}.pdf]`;

  const paymentDetails = `🏦 Bank: ${bankName}\n💼 Account Name: ${selectedEntity.bankAccountName || selectedEntity.name}\n🔢 Account Number: ${accNum}\n🔣 Sort Code: ${sortCode}\n📝 Payment Reference: ${txnRef}`;

  const replacements: Record<string, string> = {
    // 1. {Customer_Name}
    '{Customer_Name}': customerName,
    '{customer_name}': customerName,
    '{client_name}': customerName,
    '{recipient_name}': customerName,
    '[Customer Name]': customerName,
    '[customer name]': customerName,
    '[Customer_Name]': customerName,
    '[Recipient Name]': customerName,
    '[recipient name]': customerName,
    '[Client Name]': customerName,
    '[client name]': customerName,

    // 2. {Selected_Account_Name}
    '{Selected_Account_Name}': accName,
    '{selected_account_name}': accName,
    '[Selected_Account_Name]': accName,
    '[Selected Account Name]': accName,
    '[selected account name]': accName,
    '{Account_Name}': accName,
    '{account_name}': accName,
    '[Account Name]': accName,
    '[account name]': accName,

    // 3. {Amount} (and prefixed £{Amount})
    '£{Amount}': amountStr,
    '£{amount}': amountStr,
    '£[Amount]': amountStr,
    '£[Amount Paid]': amountStr,
    '£[Amount Owed]': amountStr,
    '£[Total Amount]': amountStr,
    '{Amount}': amountStr,
    '{amount}': amountStr,
    '{amount_paid}': amountStr,
    '[Amount]': amountStr,
    '[Amount Paid]': amountStr,
    '[Amount Owed]': amountStr,
    '[Total Amount]': amountStr,
    '[owing balance]': amountStr,

    // 4. {Running_Balance} (and prefixed £{Running_Balance})
    '£{Running_Balance}': balanceStr,
    '£{running_balance}': balanceStr,
    '£[Running_Balance]': balanceStr,
    '£[Running Balance]': balanceStr,
    '£[Remaining Balance]': balanceStr,
    '£[New Balance]': balanceStr,
    '£[New Total Balance]': balanceStr,
    '{Running_Balance}': balanceStr,
    '{running_balance}': balanceStr,
    '{Remaining_Balance}': balanceStr,
    '{remaining_balance}': balanceStr,
    '[Running_Balance]': balanceStr,
    '[Running Balance]': balanceStr,
    '[running balance]': balanceStr,
    '[Remaining Balance]': balanceStr,
    '[New Balance]': balanceStr,
    '[New Total Balance]': balanceStr,

    // 5. {Statement_Date_Range}
    '{Statement_Date_Range}': safeDateRange,
    '{statement_date_range}': safeDateRange,
    '[Statement_Date_Range]': safeDateRange,
    '[Statement Date Range]': safeDateRange,
    '[statement date range]': safeDateRange,
    '{Date_Range}': safeDateRange,
    '{date_range}': safeDateRange,
    '[Date Range]': safeDateRange,
    '[date range]': safeDateRange,

    // 6. {Direct_Statement_PDF_Link}
    '{Direct_Statement_PDF_Link}': pdfLink,
    '{direct_statement_pdf_link}': pdfLink,
    '[Direct_Statement_PDF_Link]': pdfLink,
    '[Direct Statement PDF Link]': pdfLink,
    '[direct statement pdf link]': pdfLink,
    '{Statement_PDF_Link}': pdfLink,
    '{statement_pdf_link}': pdfLink,
    '[Statement Link]': pdfLink,
    '[Statement PDF Link]': pdfLink,
    '{Document_Url}': pdfLink,
    '{document_url}': pdfLink,

    // Additional transaction variables
    '{Transaction_Ref}': txnRef,
    '{transaction_ref}': txnRef,
    '{payment_id}': txnRef,
    '{reference}': txnRef,
    '[Bank Reference]': txnRef,
    '[Payment Reference]': txnRef,

    '{Date}': dateStr,
    '{date}': dateStr,
    '{payment_date}': dateStr,
    '[Date]': dateStr,
    '[Date Received]': dateStr,
    "[Today's Date]": format(new Date(), 'dd/MM/yyyy'),

    '{Vehicle_Reg}': vehicleReg,
    '[Vehicle Reg]': vehicleReg,
    '{Bank_Name}': bankName,
    '[Bank Name]': bankName,
    '{Account_Number}': accNum,
    '[Account Number]': accNum,
    '{Sort_Code}': sortCode,
    '[Sort Code]': sortCode,
    '{Payment_Details}': paymentDetails,
    '[Payment Details]': paymentDetails,
  };

  let result = rawText;
  Object.entries(replacements).forEach(([tag, val]) => {
    const escaped = tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    result = result.replace(new RegExp(escaped, 'gi'), val);
  });

  return result;
};

/**
 * Compiles AccountStatementDocument into an in-memory Blob and object URL
 */
export const compileStatementPdfBlob = async (
  statementData: AccountStatementData,
  companyDetails: any
): Promise<{ blob: Blob; blobUrl: string }> => {
  const blob = await pdf(
    React.createElement(AccountStatementDocument, {
      data: statementData,
      companyDetails,
    })
  ).toBlob();

  const blobUrl = URL.createObjectURL(blob);
  return { blob, blobUrl };
};

/**
 * Uploads a compiled statement blob to Firebase Storage for permanent sharing
 */
export const uploadStatementPdfBlob = async (
  blob: Blob,
  filename: string,
  transactionId: string
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `statements/finance/${transactionId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=31536000',
        originalName: filename,
      },
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn('Could not upload statement blob to Storage, falling back to local URL:', err);
    return URL.createObjectURL(blob);
  }
};
