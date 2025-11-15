// src/utils/whatsapp.ts
import { Customer, Vehicle, Invoice, Claim, DriverPay } from '../types';
import { format } from 'date-fns';

const COMPANY_SIGNATURE = `
Best regards,
AIE Skyline Limited
📍 United House, 39-41 North Road, London, N7 9DP
📞 020 8050 5337 | 📱 +44 7999 558801
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

interface WhatsAppMessage {
  phone: string;
  message: string;
  attachments?: string[]; // Note: wa.me links cannot auto-attach; kept for API parity/future use
}

/**
 * Normalize to digits-only E.164 without the '+' (as required by wa.me path).
 * If the number looks local (leading 0, no country code), default to UK (44).
 */
export const formatWhatsAppNumber = (phone: string): string => {
  if (!phone) return '';
  let p = String(phone).trim();

  // Keep only digits and a single leading '+', then normalize
  p = p.replace(/[^+\d]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('00')) p = p.slice(2);

  // If still starts with a local 0, assume UK and drop the 0
  if (p.startsWith('0')) {
    p = p.slice(1);
    p = '44' + p;
  }

  // Final safety: digits only
  p = p.replace(/\D/g, '');
  return p;
};

/**
 * Opens WhatsApp chat (app/web) with a prefilled message and your company signature.
 * NOTE: User must tap "Send" in WhatsApp (cannot auto-send).
 */
export const sendWhatsAppMessage = ({ phone, message }: WhatsAppMessage) => {
  const digits = formatWhatsAppNumber(phone);
  if (!digits) throw new Error('Invalid phone number for WhatsApp');

  const url = buildWaMeLink(digits, message);
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ────────────────────────────────────────────────────────────────────────────
// Prebuilt notifications (reused across the app)
// ────────────────────────────────────────────────────────────────────────────

// Rental notifications
export const sendRentalReminder = (customer: Customer, rental: any) => {
  const message = `Dear ${customer.name},

Your rental payment of £${rental.remainingAmount} is due.
Rental Period: ${format(rental.startDate, 'dd/MM/yyyy')} - ${format(rental.endDate, 'dd/MM/yyyy')}
Vehicle: ${rental.vehicleName}
${rental.discountAmount ? `Discount Applied: £${rental.discountAmount}` : ''}

Please arrange payment at your earliest convenience.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
  });
};

// Invoice notifications
export const sendInvoiceReminder = (customer: Customer, invoice: Invoice) => {
  const message = `Dear ${customer.name},

This is a reminder about unpaid invoice #${invoice.id.slice(-8).toUpperCase()}.
Amount Due: £${invoice.remainingAmount}
Due Date: ${format(invoice.dueDate, 'dd/MM/yyyy')}

Please process the payment as soon as possible.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
  });
};

// Vehicle document expiry notifications
export const sendVehicleDocumentReminder = (customer: Customer, vehicle: Vehicle) => {
  const message = `Dear ${customer.name},

Important reminder about your vehicle ${vehicle.registrationNumber}:

${vehicle.motExpiry && isExpiringOrExpired(vehicle.motExpiry) ? `MOT expires on ${format(vehicle.motExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.insuranceExpiry && isExpiringOrExpired(vehicle.insuranceExpiry) ? `Insurance expires on ${format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.roadTaxExpiry && isExpiringOrExpired(vehicle.roadTaxExpiry) ? `Road Tax expires on ${format(vehicle.roadTaxExpiry, 'dd/MM/yyyy')}\n` : ''}
${vehicle.nslExpiry && isExpiringOrExpired(vehicle.nslExpiry) ? `NSL expires on ${format(vehicle.nslExpiry, 'dd/MM/yyyy')}` : ''}

Please ensure to renew these documents before expiry.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Claim notifications
export const sendClaimNotification = (customer: Customer, claim: Claim) => {
  const message = `Dear ${customer.name},

A new claim has been submitted:
Reference: ${claim.clientRef || claim.id.slice(-8).toUpperCase()}
Type: ${claim.claimType}
Status: ${claim.progress}

We will keep you updated on the progress.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message,
  });
};

// Driver Pay notifications
export const sendDriverPayNotification = (customer: Customer, driverPay: DriverPay) => {
  const message = `Dear ${customer.name},

Your driver payment has been processed:
Period: ${format(driverPay.startDate, 'dd/MM/yyyy')} - ${format(driverPay.endDate, 'dd/MM/yyyy')}
Total Amount: £${driverPay.totalAmount}
Commission (${driverPay.commissionPercentage}%): £${driverPay.commissionAmount}
Net Pay: £${driverPay.netPay}
Status: ${driverPay.status}

Collection Point: ${driverPay.collection}`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Customer document expiry notifications
export const sendCustomerDocumentReminder = (customer: Customer) => {
  const message = `Dear ${customer.name},

Important reminder about your documents:

${isExpiringOrExpired(customer.licenseExpiry) ? `Driver's License expires on ${format(customer.licenseExpiry, 'dd/MM/yyyy')}\n` : ''}
${isExpiringOrExpired(customer.billExpiry) ? `Bill expires on ${format(customer.billExpiry, 'dd/MM/yyyy')}` : ''}

Please ensure to renew these documents before expiry.`;

  return sendWhatsAppMessage({
    phone: customer.mobile,
    message
  });
};

// Helper function to check if date is expiring or expired (<=30 days)
const isExpiringOrExpired = (date?: Date | null): boolean => {
  if (!date) return false;
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return date <= thirtyDaysFromNow;
};

// ────────────────────────────────────────────────────────────────────────────
// WhatsApp helpers for wa.me links & preview  ✅ (tiny helpers you requested)
// ────────────────────────────────────────────────────────────────────────────
export function toE164Digits(raw: string): string {
  try {
    return formatWhatsAppNumber(String(raw || ''));
  } catch {
    return '';
  }
}

/**
 * Compose a nicely structured WhatsApp message.
 * Supports WhatsApp basic formatting: *bold*, _italics_, ~strike~, `mono`
 */
export function buildWhatsAppMessage(params: {
  type?: string;
  subject?: string;
  body?: string;
  recordRef?: string;
  contactText?: string;
}): string {
  const lines: string[] = [];
  if (params.type)    lines.push(`*${params.type}*`);
  if (params.subject) lines.push(`*Subject:* ${params.subject}`);
  if (params.body)    lines.push(params.body);
  if (params.recordRef) lines.push(`\n*Ref:* ${params.recordRef}`);
  if (params.contactText) {
    lines.push('\n*Contact Details:*');
    lines.push(params.contactText);
  }
  return lines.join('\n\n').trim();
}

/**
 * Build a wa.me link with the encoded message + company signature appended.
 */
export function buildWaMeLink(phoneDigits: string, message: string): string {
  // ✅ Corrected version: Only encode the message as-is.
  const encoded = encodeURIComponent(message || '');
  return `https://wa.me/${phoneDigits}?text=${encoded}`;
}
