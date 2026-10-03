// src/utils/documentSharing.ts

export interface ShareableDocumentParams {
  docId?: string;
  documentType?: string;
  reference?: string;
  bankId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customUrl?: string;
}

/**
 * Returns the active web origin, preferring current window location or official domain.
 */
export const getShareableBaseOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://aieskyline.co.uk';
};

/**
 * Generates a clean, unique client web link for any document using authentic database record ID.
 * E.g., https://aieskyline.co.uk/doc/[realRentalId]/hireAgreement
 */
export const generateShareableDocumentUrl = (params: ShareableDocumentParams): string => {
  if (params.customUrl) return params.customUrl;

  const baseOrigin = getShareableBaseOrigin();
  const docId = params.docId || params.reference;
  if (!docId) {
    throw new Error('Valid database record ID is required to generate document share URL');
  }
  const docType = params.documentType || 'hireAgreement';

  const queryParams = new URLSearchParams();
  if (params.reference && params.reference !== docId) {
    queryParams.set('ref', params.reference);
  }
  if (params.bankId) {
    queryParams.set('bank', params.bankId);
  }
  if (params.customerId) {
    queryParams.set('customerId', params.customerId);
  }

  const qs = queryParams.toString();
  return `${baseOrigin}/doc/${encodeURIComponent(docId)}/${encodeURIComponent(docType)}${qs ? `?${qs}` : ''}`;
};

/**
 * Generates direct UK Open Banking "Pay by Bank" URL for any invoice or rental.
 * E.g., https://aieskyline.co.uk/invoice-pay?id=INV_1001
 */
export const generateInvoicePayUrl = (invoiceOrRentalId: string, liveBalance?: number): string => {
  const baseOrigin = getShareableBaseOrigin();
  const q = new URLSearchParams();
  q.set('id', invoiceOrRentalId);
  if (liveBalance !== undefined && liveBalance > 0) {
    q.set('amount', liveBalance.toFixed(2));
  }
  return `${baseOrigin}/invoice-pay?${q.toString()}`;
};

/**
 * Generates dedicated client Signature Request URL.
 * E.g., https://aieskyline.co.uk/sign/cust_123?rentalId=rent_456
 */
export const generateSignatureRequestUrl = (params: {
  customerId: string;
  rentalId?: string;
  token?: string;
}): string => {
  const baseOrigin = getShareableBaseOrigin();
  const q = new URLSearchParams();
  if (params.token) q.set('token', params.token);
  if (params.rentalId) q.set('rentalId', params.rentalId);
  const queryStr = q.toString();
  return `${baseOrigin}/sign/${encodeURIComponent(params.customerId)}${queryStr ? `?${queryStr}` : ''}`;
};

/**
 * Normalizes phone numbers for WhatsApp API (e.g. converts UK 07xxx to 447xxx).
 */
export const formatPhoneForWhatsApp = (rawPhone?: string): string => {
  if (!rawPhone) return '';
  let cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Standard UK mobile conversion
  if (cleaned.startsWith('0') && (cleaned.length === 11 || cleaned.length === 10)) {
    cleaned = '44' + cleaned.substring(1);
  }
  return cleaned;
};

export interface WhatsAppShareOptions {
  phone?: string;
  customerName?: string;
  documentTitle: string;
  shareUrl: string;
  payUrl?: string;
  signatureUrl?: string;
  outstandingBalance?: number;
}

/**
 * Constructs a clean WhatsApp share link with direct PDF document view
 * and strictly separate dedicated signature and payment links.
 */
export const generateWhatsAppShareUrl = (options: WhatsAppShareOptions): string => {
  const customerName = (options.customerName || 'Valued Customer').trim();
  const documentTitle = options.documentTitle.trim();
  const shareUrl = options.shareUrl.trim();

  let message = `Hello ${customerName}, here is your document from AIE Skyline: ${documentTitle}.\n\nPlease click the link to view and download your document directly:\n${shareUrl}`;

  if (options.signatureUrl) {
    message += `\n\n✍️ Dedicated E-Signature Request:\n${options.signatureUrl}`;
  }

  if (options.payUrl) {
    const balText = options.outstandingBalance !== undefined && options.outstandingBalance > 0
      ? ` (Balance: £${options.outstandingBalance.toFixed(2)})`
      : '';
    message += `\n\n💳 Instant UK Pay by Bank${balText}:\n${options.payUrl}`;
  }

  const cleanPhone = formatPhoneForWhatsApp(options.phone);
  const params = new URLSearchParams();
  if (cleanPhone) {
    params.set('phone', cleanPhone);
  }
  params.set('text', message);

  return `https://api.whatsapp.com/send?${params.toString()}`;
};

export interface EmailShareOptions {
  email?: string;
  customerName?: string;
  documentTitle: string;
  documentReference?: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    sortCode?: string;
  };
  shareUrl: string;
  payUrl?: string;
  signatureUrl?: string;
  outstandingBalance?: number;
}

/**
 * Constructs one-click email delivery parameters with pre-filled subject and body.
 */
export const generateEmailShareData = (options: EmailShareOptions) => {
  const customerName = (options.customerName || 'Valued Customer').trim();
  const documentTitle = options.documentTitle.trim();
  const reference = options.documentReference || 'N/A';
  const shareUrl = options.shareUrl.trim();

  const subject = `Document Ready: ${documentTitle} - AIE Skyline`;

  const bankName = options.bankDetails?.bankName || 'LLOYDS BANK';
  const sortCode = options.bankDetails?.sortCode || '30-99-50';
  const accountNumber = options.bankDetails?.accountNumber || '30513162';

  const bodyLines = [
    `Hello ${customerName},`,
    '',
    `Your official document from AIE Skyline is ready for review:`,
    `• Document: ${documentTitle}`,
    `• Reference: ${reference}`,
    '',
    `Direct Document Link:`,
    shareUrl,
    '',
  ];

  if (options.signatureUrl) {
    bodyLines.push(
      `Dedicated E-Signature Request Link:`,
      options.signatureUrl,
      ''
    );
  }

  if (options.payUrl) {
    const balText = options.outstandingBalance !== undefined && options.outstandingBalance > 0
      ? ` (Outstanding Balance: £${options.outstandingBalance.toFixed(2)})`
      : '';
    bodyLines.push(
      `Instant UK Open Banking Pay by Bank${balText}:`,
      options.payUrl,
      ''
    );
  }

  bodyLines.push(
    `Bank Remittance Details:`,
    `• Bank: ${bankName}`,
    `• Sort Code: ${sortCode}`,
    `• Account Number: ${accountNumber}`,
    '',
    `Thank you,`,
    `AIE Skyline Team`
  );

  const body = bodyLines.join('\n');

  const mailtoUrl = `mailto:${encodeURIComponent(options.email || '')}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return {
    subject,
    body,
    mailtoUrl,
  };
};
