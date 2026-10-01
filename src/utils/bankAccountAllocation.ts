// src/utils/bankAccountAllocation.ts

export interface CompanyBankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  iban?: string;
  bic?: string;
  currency?: string;
  isDefault?: boolean;
  notes?: string;
}

export const DEFAULT_COMPANY_BANK_ACCOUNTS: CompanyBankAccount[] = [
  {
    id: 'bank_barclays_skyline',
    bankName: 'Barclays Bank UK PLC',
    accountName: 'AIE Skyline Limited',
    accountNumber: '12345678',
    sortCode: '20-00-00',
    iban: 'GB29BARC20000012345678',
    bic: 'BARCGB22',
    currency: 'GBP (£)',
    isDefault: true,
    notes: 'Main Operating & Rental Account',
  },
  {
    id: 'bank_lloyds_skyline',
    bankName: 'Lloyds Bank Commercial',
    accountName: 'AIE Skyline Limited',
    accountNumber: '30513162',
    sortCode: '30-99-50',
    iban: 'GB80LOYD30995030513162',
    bic: 'LOYDGB21',
    currency: 'GBP (£)',
    isDefault: false,
    notes: 'Invoicing & Corporate Receipts',
  },
  {
    id: 'bank_natwest_claims',
    bankName: 'NatWest Fleet Operations',
    accountName: 'AIE Claims Ltd',
    accountNumber: '87654321',
    sortCode: '60-12-34',
    iban: 'GB44NWBK60123487654321',
    bic: 'NWBKGB2L',
    currency: 'GBP (£)',
    isDefault: false,
    notes: 'Dedicated Claims & Credit Hire Recoveries',
  },
  {
    id: 'bank_santander_fleet',
    bankName: 'Santander UK PLC',
    accountName: 'AIE Skyline Limited',
    accountNumber: '45678901',
    sortCode: '09-01-28',
    iban: 'GB12ABBY09012845678901',
    bic: 'ABBYGB2L',
    currency: 'GBP (£)',
    isDefault: false,
    notes: 'Secondary Merchant & Settlement Account',
  },
];

/**
 * Returns merged bank accounts from company settings or fallbacks.
 */
export const getEffectiveBankAccounts = (companyDetails?: any): CompanyBankAccount[] => {
  if (Array.isArray(companyDetails?.bankAccounts) && companyDetails.bankAccounts.length > 0) {
    return companyDetails.bankAccounts;
  }

  // If single bank exists on companyDetails, harmonize it into the list
  if (companyDetails?.bankName && companyDetails?.accountNumber) {
    const customDefault: CompanyBankAccount = {
      id: 'bank_settings_primary',
      bankName: companyDetails.bankName,
      accountName: companyDetails.fullName || companyDetails.name || 'AIE Skyline Limited',
      accountNumber: companyDetails.accountNumber,
      sortCode: companyDetails.sortCode || '00-00-00',
      iban: companyDetails.iban || '',
      bic: companyDetails.bic || '',
      currency: 'GBP (£)',
      isDefault: true,
      notes: 'Primary Company Account',
    };

    const remainingDefaults = DEFAULT_COMPANY_BANK_ACCOUNTS.filter(
      (b) => b.accountNumber !== customDefault.accountNumber
    );
    return [customDefault, ...remainingDefaults];
  }

  return DEFAULT_COMPANY_BANK_ACCOUNTS;
};

/**
 * Finds the default bank account or first available.
 */
export const getDefaultBankAccount = (companyDetails?: any): CompanyBankAccount => {
  const accounts = getEffectiveBankAccounts(companyDetails);
  return accounts.find((a) => a.isDefault) || accounts[0] || DEFAULT_COMPANY_BANK_ACCOUNTS[0];
};

/**
 * Formats a bank account into a clean summary string.
 */
export const formatBankAllocationLabel = (account: CompanyBankAccount): string => {
  return `${account.bankName} • Acc: ${account.accountNumber} (SC: ${account.sortCode})${
    account.isDefault ? ' [Default]' : ''
  }`;
};
