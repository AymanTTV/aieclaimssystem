// src/utils/paymentQrCode.ts
import QRCode from 'qrcode';
import { CompanyBankAccount } from './bankAccountAllocation';

export interface PaymentQrOptions {
  reference?: string;
  amount?: number | string;
  currency?: string;
  invoiceNumber?: string;
  format?: 'standard' | 'url' | 'epc';
}

// In-memory cache for ultra-fast instant rendering
const qrCodeCache = new Map<string, string>();

/**
 * Builds a standardized payment payload for scanning via mobile camera or banking apps.
 */
export const buildPaymentQrPayload = (
  bank: Partial<CompanyBankAccount> | null | undefined,
  options?: PaymentQrOptions
): string => {
  if (!bank) return '';

  const bankName = (bank.bankName || 'LLOYDS BANK').trim();
  const accountName = (bank.accountName || 'AIE SKYLINE LIMITED').trim();
  const accountNumber = (bank.accountNumber || '').replace(/\s+/g, '');
  const sortCode = (bank.sortCode || '').replace(/\s+/g, '');
  const iban = (bank.iban || '').replace(/\s+/g, '');
  const bic = (bank.bic || '').replace(/\s+/g, '');
  const ref = (options?.reference || options?.invoiceNumber || 'AIE-PAYMENT').trim();
  const amt = options?.amount ? Number(options?.amount).toFixed(2) : undefined;
  const currency = options?.currency || 'GBP';

  // 1. EPC QR Standard (European Payments Council / SEPA standard if IBAN is specified and format is epc)
  if (options?.format === 'epc' && iban) {
    return [
      'BCD',
      '002',
      '1',
      'SCT',
      bic,
      accountName.slice(0, 70),
      iban,
      amt ? `${currency}${amt}` : '',
      '',
      ref.slice(0, 35),
      '',
    ].join('\n');
  }

  // 2. Universal Banking Web / Payment Landing URL format
  if (options?.format === 'url') {
    const cleanSort = sortCode.replace(/-/g, '');
    const params = new URLSearchParams({
      bank: bankName,
      name: accountName,
      acc: accountNumber,
      sort: cleanSort,
      ref: ref,
      ...(amt ? { amt } : {}),
      ...(currency ? { cur: currency } : {}),
    });
    return `https://pay.aieskyline.com/transfer?${params.toString()}`;
  }

  // 3. Standard UK Banking & Camera Scan-To-Pay Payload (Default)
  // This format is recognized cleanly by iOS & Android camera OCR, banking app scanners, and clipboard tools.
  const lines: string[] = [
    'AIE SKYLINE BANK TRANSFER',
    `Payee: ${accountName}`,
    `Bank: ${bankName}`,
    `Sort Code: ${sortCode}`,
    `Account: ${accountNumber}`,
  ];

  if (iban) {
    lines.push(`IBAN: ${iban}`);
  }
  if (bic) {
    lines.push(`BIC/SWIFT: ${bic}`);
  }
  lines.push(`Reference: ${ref}`);

  if (amt && Number(amt) > 0) {
    lines.push(`Amount: £${amt} ${currency}`);
  }

  return lines.join('\n');
};

/**
 * Computes a cache key based on the bank details and options.
 */
const getCacheKey = (bank: Partial<CompanyBankAccount>, options?: PaymentQrOptions): string => {
  return [
    bank.bankName || '',
    bank.accountNumber || '',
    bank.sortCode || '',
    bank.accountName || '',
    bank.iban || '',
    options?.reference || '',
    options?.amount || '',
    options?.format || 'standard',
  ].join('|');
};

/**
 * Generates a base64 PNG data URI for the payment QR code with caching.
 */
export const generatePaymentQrCodeDataUrl = async (
  bank: Partial<CompanyBankAccount> | null | undefined,
  options?: PaymentQrOptions
): Promise<string> => {
  if (!bank || (!bank.accountNumber && !bank.sortCode && !bank.bankName)) {
    return '';
  }

  const cacheKey = getCacheKey(bank, options);
  const cached = qrCodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const payload = buildPaymentQrPayload(bank, options);
  if (!payload) return '';

  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
    });

    qrCodeCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('[paymentQrCode] Failed to generate QR code:', err);
    return '';
  }
};

/**
 * Synchronous cache lookup for instant access during PDF render cycles.
 */
export const getCachedPaymentQrCode = (
  bank: Partial<CompanyBankAccount> | null | undefined,
  options?: PaymentQrOptions
): string | undefined => {
  if (!bank) return undefined;
  const cacheKey = getCacheKey(bank, options);
  return qrCodeCache.get(cacheKey);
};
