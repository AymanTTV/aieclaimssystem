// src/utils/driverPayWhatsApp.ts
import { DriverPay, PaymentPeriod, Payment } from '../types/driverPay';
import { format } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { ensureValidDate } from './dateHelpers';
import { resolveNameFields } from './nameAddressUtils';
import { emailTemplates } from '../constants/emailTemplates';

export interface DriverPayTemplateOption {
  id: string;
  name: string;
  category: string;
  channel?: 'all' | 'whatsapp' | 'email';
  subjectTemplate: string;
  bodyTemplate: string;
  isActive?: boolean;
  isCustom?: boolean;
}

export interface DriverPayWhatsAppContext {
  driver_name: string;
  driver_phone: string;
  payment_id: string;
  amount_paid: string;
  payment_date: string;
  payment_status: string;
  period_start: string;
  period_end: string;
  notes: string;
  // Extended helper fields
  net_pay: string;
  remaining_amount: string;
  total_amount: string;
  collection_point: string;
}

const DEFAULT_SIGNATURE = `Kind regards,
AIE Skyline Operations Team
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441`;

export const DEFAULT_DRIVER_PAY_TEMPLATES: DriverPayTemplateOption[] = [
  {
    id: 'driver_pay_advice_standard',
    name: 'Driver Payment Advice (Standard)',
    category: 'driver_pay',
    channel: 'whatsapp',
    isActive: true,
    subjectTemplate: 'Driver Payment Advice - {payment_id}',
    bodyTemplate: `Dear {driver_name},

Your driver payment details have been processed:

📋 Payment Ref: {payment_id}
💰 Amount Paid: {amount_paid}
📅 Payment Date: {payment_date}
📊 Status: {payment_status}
🗓️ Pay Period: {period_start} to {period_end}
📝 Notes: {notes}

If you have any questions regarding your statement or payout, please reply to this message.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'driver_pay_statement_summary',
    name: 'Driver Pay Statement Summary',
    category: 'driver_pay',
    channel: 'whatsapp',
    isActive: false,
    subjectTemplate: 'Payment Statement - {payment_id}',
    bodyTemplate: `Hello {driver_name},

Here is a summary of your driver payment statement for {period_start} – {period_end}:

• Payment ID: {payment_id}
• Amount Paid: {amount_paid}
• Net Pay: {net_pay}
• Status: {payment_status}
• Date: {payment_date}
• Remarks: {notes}

Thank you for your valued cooperation.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'driver_pay_remittance_ready',
    name: 'Payout Remittance Ready',
    category: 'driver_pay',
    channel: 'whatsapp',
    isActive: false,
    subjectTemplate: 'Payout Ready - {driver_name}',
    bodyTemplate: `Hi {driver_name},

Your payment of {amount_paid} for the period {period_start} to {period_end} has been confirmed.

Ref: {payment_id}
Status: {payment_status}
Collection: {collection_point}

Please review and let us know if you require any further details.

${DEFAULT_SIGNATURE}`,
  },
];

/**
 * Safely format date into dd/MM/yyyy
 */
function safeFormatDate(raw: any, fallback: string = 'N/A'): string {
  if (!raw) return fallback;
  try {
    const d = ensureValidDate(raw);
    if (!isNaN(d.getTime())) {
      return format(d, 'dd/MM/yyyy');
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Format currency in GBP
 */
function formatGBP(amount: number | undefined | null): string {
  const n = Number(amount ?? 0);
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Resolves all driver payout dynamic placeholders from a DriverPay record
 */
export function resolveDriverPayContext(record: DriverPay): DriverPayWhatsAppContext {
  const nameFields = resolveNameFields(record);
  const driver_name = record.name?.trim() || nameFields.fullName?.trim() || 'Driver';
  const driver_phone = record.phoneNumber?.trim() || '';

  // Payment ID: use driverNo if available, or payment reference, or document id
  const payment_id = record.driverNo?.trim() || (record.id ? `#${record.id.slice(-8).toUpperCase()}` : 'N/A');

  // Sorted periods: latest first
  const periods = [...(record.paymentPeriods || [])].sort(
    (a, b) => ensureValidDate(b.endDate).getTime() - ensureValidDate(a.endDate).getTime()
  );
  const latestPeriod: PaymentPeriod | undefined = periods[0];

  // Payments: check all payments across record or periods
  const allPayments: Payment[] = [
    ...(record.payments || []),
    ...periods.flatMap((p) => p.payments || []),
  ].sort((a, b) => ensureValidDate(b.date).getTime() - ensureValidDate(a.date).getTime());

  const latestPayment: Payment | undefined = allPayments[0];

  // Amount Paid: prefer record.paidAmount, or latest period paidAmount, or sum of payments
  let paidVal = record.paidAmount;
  if (paidVal === undefined || paidVal === null || paidVal === 0) {
    if (latestPayment?.amount) {
      paidVal = latestPayment.amount;
    } else if (latestPeriod?.paidAmount) {
      paidVal = latestPeriod.paidAmount;
    } else {
      paidVal = 0;
    }
  }
  const amount_paid = formatGBP(paidVal);

  // Payment Date: latest payment date, or latest period endDate, or record.updatedAt / createdAt
  let paymentDateRaw = latestPayment?.date || latestPeriod?.endDate || record.updatedAt || record.createdAt;
  const payment_date = safeFormatDate(paymentDateRaw, format(new Date(), 'dd/MM/yyyy'));

  // Payment Status: capitalize formatted status
  const rawStatus = (latestPeriod?.status || record.status || 'unpaid').toLowerCase();
  let payment_status = 'Unpaid';
  if (rawStatus === 'paid') payment_status = 'Paid';
  else if (rawStatus === 'partially_paid') payment_status = 'Partially Paid';
  else if (rawStatus === 'unpaid') payment_status = 'Unpaid';
  else payment_status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

  // Period Start and End
  const periodStartRaw = latestPeriod?.startDate || record.startDate;
  const periodEndRaw = latestPeriod?.endDate || record.endDate;
  const period_start = safeFormatDate(periodStartRaw, 'N/A');
  const period_end = safeFormatDate(periodEndRaw, 'N/A');

  // Notes: look for payment notes or period notes
  const notes =
    latestPayment?.notes?.trim() ||
    latestPeriod?.notes?.trim() ||
    latestPayment?.reference?.trim() ||
    'None';

  // Extended values
  const net_pay = formatGBP(latestPeriod?.netPay ?? record.netPay ?? 0);
  const remaining_amount = formatGBP(latestPeriod?.remainingAmount ?? record.remainingAmount ?? 0);
  const total_amount = formatGBP(latestPeriod?.totalAmount ?? record.totalAmount ?? 0);
  const collection_point = record.collection === 'OTHER' ? record.customCollection || 'Other' : record.collection || 'Standard';

  return {
    driver_name,
    driver_phone,
    payment_id,
    amount_paid,
    payment_date,
    payment_status,
    period_start,
    period_end,
    notes,
    net_pay,
    remaining_amount,
    total_amount,
    collection_point,
  };
}

/**
 * Replaces both `{placeholder}` and `[Placeholder]` variations with resolved context
 */
export function replaceDriverPayPlaceholders(
  template: string,
  context: DriverPayWhatsAppContext
): string {
  if (!template) return '';

  let res = template;

  const replaceTag = (tagKey: string, val: string) => {
    // Replaces {tagKey}, [tagKey], {Tag Key}, [Tag Key] (case-insensitive)
    const spaced = tagKey.replace(/_/g, ' ');
    const escapedTagKey = tagKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedSpaced = spaced.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`(\\{|\\[)(${escapedTagKey}|${escapedSpaced})(\\}|\\])`, 'gi');
    res = res.replace(regex, val || '');
  };

  // 1. Mandatory Driver Pay Placeholders:
  replaceTag('driver_name', context.driver_name);
  replaceTag('driver_phone', context.driver_phone);
  replaceTag('payment_id', context.payment_id);
  replaceTag('amount_paid', context.amount_paid);
  replaceTag('payment_date', context.payment_date);
  replaceTag('payment_status', context.payment_status);
  replaceTag('period_start', context.period_start);
  replaceTag('period_end', context.period_end);
  replaceTag('notes', context.notes);

  // 2. Common variants & aliases found in Custom templates
  replaceTag('recipient_name', context.driver_name);
  replaceTag('customer_name', context.driver_name);
  replaceTag('client_name', context.driver_name);
  replaceTag('driver', context.driver_name);
  replaceTag('name', context.driver_name);

  replaceTag('phone', context.driver_phone);
  replaceTag('phone_number', context.driver_phone);
  replaceTag('mobile', context.driver_phone);

  replaceTag('payment_ref', context.payment_id);
  replaceTag('reference', context.payment_id);

  replaceTag('amount', context.amount_paid);
  replaceTag('paid', context.amount_paid);
  replaceTag('paid_amount', context.amount_paid);
  replaceTag('net_pay', context.net_pay);
  replaceTag('remaining_amount', context.remaining_amount);
  replaceTag('balance', context.remaining_amount);
  replaceTag('outstanding_amount', context.remaining_amount);
  replaceTag('outstanding_balance', context.remaining_amount);
  replaceTag('owing', context.remaining_amount);
  replaceTag('total_amount', context.total_amount);

  replaceTag('date', context.payment_date);
  replaceTag('date_received', context.payment_date);
  replaceTag('dd/mm/yyyy', context.payment_date);

  replaceTag('status', context.payment_status);

  replaceTag('start_date', context.period_start);
  replaceTag('end_date', context.period_end);

  replaceTag('period_notes', context.notes);
  replaceTag('additional_notes', context.notes);
  replaceTag('collection_point', context.collection_point);

  return res;
}

/**
 * Fetches and populates template dropdown list strictly from the "Custom" folder/tab
 * under WhatsApp Communication settings.
 * Displays ALL active templates available inside the WhatsApp "Custom" folder.
 */
export async function fetchDriverPayTemplates(): Promise<DriverPayTemplateOption[]> {
  const customMap = new Map<string, DriverPayTemplateOption>();

  // 1. Seed with base templates from the "Custom" folder under WhatsApp communication settings
  const baseCustomTemplates = emailTemplates.custom || [];
  for (const tpl of baseCustomTemplates) {
    customMap.set(tpl.id, {
      id: tpl.id,
      name: tpl.name || 'Custom Template',
      category: 'custom',
      channel: 'all',
      subjectTemplate: tpl.subjectTemplate || '',
      bodyTemplate: tpl.bodyTemplate || '',
      isActive: true,
      isCustom: true,
    });
  }

  // 2. Fetch live templates from Firestore `messageTemplates` strictly under category 'custom'
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawCat = String(data.category || data.type || '').toLowerCase().trim();
      const rawChannel = String(data.channel || 'all').toLowerCase().trim();

      // STRICT REQUIREMENT: Only populate from the "Custom" folder/tab under WhatsApp Communication settings
      if (rawCat !== 'custom') return;

      // Exclude templates dedicated purely to email (only allow whatsapp or all)
      if (rawChannel === 'email') return;

      // Check if template is explicitly deactivated
      const isDeactivated = data.active === false || data.isActive === false;
      if (isDeactivated) {
        customMap.delete(docSnap.id);
        return;
      }

      const name = data.name || data.title || 'Custom Template';
      const bodyTemplate = data.bodyTemplate || data.body || data.content || '';
      const subjectTemplate = data.subjectTemplate || data.subject || '';

      customMap.set(docSnap.id, {
        id: docSnap.id,
        name,
        category: 'custom',
        channel: rawChannel === 'whatsapp' ? 'whatsapp' : 'all',
        subjectTemplate,
        bodyTemplate,
        isActive: true,
        isCustom: true,
      });
    });
  } catch (err) {
    console.warn('Could not fetch custom messageTemplates from Firestore, using base Custom templates:', err);
  }

  // Return ALL active templates available inside the WhatsApp "Custom" folder
  const activeCustomTemplates = Array.from(customMap.values()).filter((t) => t.isActive !== false);

  if (activeCustomTemplates.length === 0) {
    return DEFAULT_DRIVER_PAY_TEMPLATES.map((t) => ({ ...t, category: 'custom', isCustom: true }));
  }

  return activeCustomTemplates;
}

/**
 * Finds the currently active/default template from the Custom template list
 */
export function getActiveDriverPayTemplate(templates: DriverPayTemplateOption[]): DriverPayTemplateOption {
  if (!templates || templates.length === 0) {
    return {
      id: 'driver_pay_advice_custom',
      name: 'Driver Payment Advice (Standard)',
      category: 'custom',
      subjectTemplate: 'Driver Payment Advice - {payment_id}',
      bodyTemplate: DEFAULT_DRIVER_PAY_TEMPLATES[0].bodyTemplate,
      isActive: true,
      isCustom: true,
    };
  }

  // 1. Look for a template specifically tailored for driver payment advice
  const driverAdviceTpl = templates.find(
    (t) =>
      t.id.includes('driver_pay') ||
      t.id.includes('driver_payment') ||
      t.name.toLowerCase().includes('driver payment') ||
      t.name.toLowerCase().includes('payment advice')
  );
  if (driverAdviceTpl) return driverAdviceTpl;

  // 2. Otherwise return the first available active custom template
  return templates[0];
}

/**
 * Generates direct wa.me link with validated phone number
 */
export function buildDriverPayWhatsAppLink(
  record: DriverPay,
  message: string
): { url: string; phoneDigits: string; isValidPhone: boolean } {
  const digits = formatWhatsAppNumber(record.phoneNumber || '');
  if (!digits) {
    return {
      url: '',
      phoneDigits: '',
      isValidPhone: false,
    };
  }

  const url = buildWaMeLink(digits, message);
  return {
    url,
    phoneDigits: digits,
    isValidPhone: true,
  };
}

/**
 * Opens direct WhatsApp chat in a new window and logs communication history
 */
export async function dispatchDriverPayWhatsApp(
  record: DriverPay,
  message: string,
  userEmail?: string,
  templateId?: string
): Promise<{ success: boolean; error?: string }> {
  const { url, phoneDigits, isValidPhone } = buildDriverPayWhatsAppLink(record, message);

  if (!isValidPhone || !phoneDigits) {
    return {
      success: false,
      error: `Driver "${record.name}" does not have a valid phone number on file (${record.phoneNumber || 'None'}).`,
    };
  }

  // Open direct WhatsApp web/app link in a new browser tab/window
  window.open(url, '_blank', 'noopener,noreferrer');

  // Log to whatsappHistory
  try {
    await logWhatsappHistory({
      sentBy: userEmail || 'System',
      type: 'custom',
      templateId: templateId || 'driver_pay_custom',
      recipients: [record.id],
      subject: `Driver Payment: ${record.driverNo || record.name}`,
      body: message,
      timestamp: new Date(),
    });
  } catch (logErr) {
    console.warn('Failed to log WhatsApp history for driver pay:', logErr);
  }

  return { success: true };
}
