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
 * Generates a clean, unique client web link for any document.
 * E.g., https://aieskyline.co.uk/view-doc?id=DOC_ID&type=invoice&ref=INV-1001&bank=bank_lloyds
 */
export const generateShareableDocumentUrl = (params: ShareableDocumentParams): string => {
  if (params.customUrl) return params.customUrl;

  const baseOrigin = getShareableBaseOrigin();
  const docId = params.docId || params.reference || 'DOC_PREVIEW';
  const docType = params.documentType || 'document';

  const queryParams = new URLSearchParams();
  queryParams.set('id', docId);
  queryParams.set('type', docType);

  if (params.reference) {
    queryParams.set('ref', params.reference);
  }
  if (params.bankId) {
    queryParams.set('bank', params.bankId);
  }
  if (params.customerId) {
    queryParams.set('customerId', params.customerId);
  }

  return `${baseOrigin}/view-doc?${queryParams.toString()}`;
};

/**
 * Generates direct UK Open Banking "Pay by Bank" URL for any invoice.
 * E.g., https://aieskyline.co.uk/invoice-pay?id=INV_1001
 */
export const generateInvoicePayUrl = (invoiceId: string): string => {
  const baseOrigin = getShareableBaseOrigin();
  return `${baseOrigin}/invoice-pay?id=${encodeURIComponent(invoiceId)}`;
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
}

/**
 * Constructs a one-click WhatsApp send link with pre-filled message according to specifications:
 * "Hello [Customer Name], here is your document from AIE Skyline: [Document Title].
 *  Please click the link to review, sign, and view payment details: [Shareable Link]"
 */
export const generateWhatsAppShareUrl = (options: WhatsAppShareOptions): string => {
  const customerName = (options.customerName || 'Valued Customer').trim();
  const documentTitle = options.documentTitle.trim();
  const shareUrl = options.shareUrl.trim();

  let message = `Hello ${customerName}, here is your document from AIE Skyline: ${documentTitle}. Please click the link to review, sign, and view payment details: ${shareUrl}`;
  if (options.payUrl) {
    message += `\n\nInstant UK Pay by Bank (FaceID / Open Banking): ${options.payUrl}`;
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
    `Your document from AIE Skyline is ready for review:`,
    `• Document: ${documentTitle}`,
    `• Reference: ${reference}`,
    '',
    `Payment & Settlement Notice:`,
    `• Bank: ${bankName}`,
    `• Sort Code: ${sortCode}`,
    `• Account Number: ${accountNumber}`,
    '',
  ];

  if (options.payUrl) {
    bodyLines.push(
      `Instant UK Open Banking Pay by Bank (Zero fee, One-tap FaceID / TouchID transfer):`,
      options.payUrl,
      ''
    );
  }

  bodyLines.push(
    `Please click the link below to review your document, verify payment details & QR code, and execute your e-signature:`,
    shareUrl,
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
