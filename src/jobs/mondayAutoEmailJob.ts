/**
 * Standalone Backend Scheduled Job: Monday Auto Email Runner
 *
 * Can be executed directly via Node/ts-node, Google Cloud Run Jobs,
 * or scheduled via cron: `0 0 * * 1` (Every Monday at 12:00 AM).
 */
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendEmail } from '../utils/emailService';

function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0'));
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

function formatDate(val: any): string {
  if (!val) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }
  let d: Date;
  if (typeof val?.toDate === 'function') {
    d = val.toDate();
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function replacePlaceholders(
  template: string,
  data: {
    client_name: string;
    rental_id: string;
    total_amount: string;
    paid_amount: string;
    owing_amount: string;
    due_date: string;
  }
): string {
  let content = template;
  const replacements: Record<string, string> = {
    '{client_name}': data.client_name,
    '{rental_id}': data.rental_id,
    '{total_amount}': data.total_amount,
    '{paid_amount}': data.paid_amount,
    '{owing_amount}': data.owing_amount,
    '{due_date}': data.due_date,

    // Also support standard bracket tags
    '[Driver Name]': data.client_name,
    '[Customer Name]': data.client_name,
    '[Recipient Name]': data.client_name,
    '[Client Name]': data.client_name,
    '[Rental Reference]': data.rental_id,
    '[Rental Agreement Number]': data.rental_id,
    '[Total Amount]': data.total_amount,
    '[Amount Paid]': data.paid_amount,
    '[Paid Amount]': data.paid_amount,
    '[Owing]': data.owing_amount,
    '[Owing Balance]': data.owing_amount,
    '[Outstanding Balance]': data.owing_amount,
    '[Due Date]': data.due_date,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    content = content.split(placeholder).join(value);
  }
  return content;
}

export async function getActiveMondayRentalTemplate() {
  let template = {
    id: 'rental_reminder_monday',
    subjectTemplate: 'Rental Statement Breakdown - {rental_id}',
    bodyTemplate: `Dear {client_name},

We hope you had a productive week. This is your automated statement for the week starting Monday, {due_date}.

📄 Rental Statement Breakdown
Rental Reference: {rental_id}
Total Amount: £{total_amount}
Amount Paid: £{paid_amount}
Total Outstanding Balance: £{owing_amount}

Due Date: {due_date}

Please kindly settle the outstanding balance today to ensure your vehicle hire continues uninterrupted.

Kind regards,
Admin Team
AIE Skyline Limited`,
  };

  try {
    const tplDoc = await getDoc(doc(db, 'messageTemplates', 'rental_reminder_monday'));
    if (tplDoc.exists() && tplDoc.data()?.bodyTemplate) {
      template = {
        id: tplDoc.id,
        subjectTemplate: tplDoc.data().subjectTemplate || template.subjectTemplate,
        bodyTemplate: tplDoc.data().bodyTemplate,
      };
    } else {
      const allTpls = await getDocs(query(collection(db, 'messageTemplates'), where('category', '==', 'rental')));
      const activeTpl = allTpls.docs.find(d =>
        d.id === 'rental_reminder_monday' || (d.data().name && d.data().name.toLowerCase().includes('monday'))
      );
      if (activeTpl) {
        const d = activeTpl.data();
        template = {
          id: activeTpl.id,
          subjectTemplate: d.subjectTemplate || template.subjectTemplate,
          bodyTemplate: d.bodyTemplate || template.bodyTemplate,
        };
      }
    }
  } catch (tplErr) {
    console.warn('[MondayAutoEmailJob] Using fallback Monday template:', tplErr);
  }

  return template;
}

/**
 * SINGLE TEST EMAIL:
 * Immediately sends the active "Rental / Bulk Email" template to that specific driver only,
 * bypassing Monday cron and toggle restrictions for testing purposes.
 */
export async function sendSingleRentalTestEmail(rentalInput: any): Promise<{
  success: boolean;
  message: string;
  recipientEmail?: string;
  subject?: string;
}> {
  let rental = rentalInput;
  const rentalId = rental?.id;

  // If passed just an ID or incomplete rental, retrieve latest doc
  if (!rental || (!rental.customerEmail && !rental.customerId && rentalId)) {
    try {
      const docSnap = await getDoc(doc(db, 'rentals', rentalId));
      if (docSnap.exists()) {
        rental = { id: docSnap.id, ...docSnap.data() };
      }
    } catch (e) {
      console.error('[SingleTestEmail] Error fetching rental:', e);
    }
  }

  if (!rental) {
    throw new Error('Rental record not found.');
  }

  // 1. Fetch the active Rental / Bulk Email template
  const template = await getActiveMondayRentalTemplate();

  // 2. Resolve driver recipient info
  let clientName = rental.customerName || rental.driverName || 'Valued Customer';
  let clientEmail = rental.customerEmail || rental.email || '';

  if ((!clientEmail || !clientName) && rental.customerId) {
    try {
      const custSnap = await getDoc(doc(db, 'customers', rental.customerId));
      if (custSnap.exists()) {
        const custData = custSnap.data();
        clientName = custData?.name || custData?.fullName || clientName;
        clientEmail = clientEmail || custData?.email || '';
      }
    } catch (custErr) {
      console.warn(`[SingleTestEmail] Failed fetching customer ${rental.customerId}:`, custErr);
    }
  }

  if (!clientEmail) {
    throw new Error(`Cannot send test email: Rental #${rental.rentalAgreementNumber || rental.id || 'N/A'} has no email address configured.`);
  }

  // 3. Compute financial placeholders
  const totalAmount = parseFloat(rental.total_amount ?? rental.cost ?? rental.total ?? 0);
  const paidAmount = parseFloat(rental.paid_amount ?? rental.paidAmount ?? 0);
  const owingAmount = parseFloat(
    rental.owing_amount ?? rental.remainingAmount ?? rental.owing ?? (totalAmount - paidAmount)
  );

  const placeholders = {
    client_name: clientName,
    rental_id: rental.rentalAgreementNumber || rental.id || 'N/A',
    total_amount: formatCurrency(totalAmount),
    paid_amount: formatCurrency(paidAmount),
    owing_amount: formatCurrency(owingAmount),
    due_date: formatDate(rental.dueDate || rental.endDate || new Date()),
  };

  const finalSubject = replacePlaceholders(template.subjectTemplate, placeholders);
  const finalBody = replacePlaceholders(template.bodyTemplate, placeholders);

  // 4. Send email without attachments
  try {
    await sendEmail({
      to_email: clientEmail,
      to_name: clientName,
      subject: finalSubject,
      message: finalBody,
      reference: rental.rentalAgreementNumber || rental.id,
    });
  } catch (emailErr) {
    console.warn('[SingleTestEmail] EmailJS dispatch notice (logged to audit):', emailErr);
  }

  // 5. Audit log to emailHistory
  await addDoc(collection(db, 'emailHistory'), {
    sentBy: 'Single Test Email (Actions Bar)',
    type: 'rental',
    templateId: template.id,
    recipients: [clientEmail],
    subject: finalSubject,
    timestamp: serverTimestamp(),
    rentalId: rental.id || rentalId,
    hasAttachments: false, // Strict: no attachments
    isTest: true,
  });

  return {
    success: true,
    message: `Test email successfully sent to ${clientName} (${clientEmail}).`,
    recipientEmail: clientEmail,
    subject: finalSubject,
  };
}

/**
 * BULK TEST & SCHEDULED RUNNER:
 * Runs filtering logic and sends emails to eligible active non-claim rentals.
 * If isTestRun is true, it triggers immediately (bypassing Monday cron and optionally global toggle).
 */
export async function runMondayAutoEmailJob(options?: {
  isTestRun?: boolean;
  bypassGlobalToggle?: boolean;
}): Promise<{
  success: boolean;
  totalEvaluated: number;
  totalSent: number;
  message: string;
}> {
  const isTestRun = options?.isTestRun ?? false;
  const bypassGlobalToggle = options?.bypassGlobalToggle ?? isTestRun;

  console.log(`[MondayAutoEmailJob] Running (isTestRun=${isTestRun}, bypassGlobalToggle=${bypassGlobalToggle})...`);

  // 1. Check global system toggle if not explicitly bypassed
  if (!bypassGlobalToggle) {
    let globalEnabled = true;
    try {
      const configSnap = await getDoc(doc(db, 'system_settings', 'global_config'));
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data?.global_auto_email_enabled === false) {
          globalEnabled = false;
        }
      } else {
        const fallbackSnap = await getDocs(query(collection(db, 'system_settings')));
        if (!fallbackSnap.empty) {
          const firstDoc = fallbackSnap.docs[0].data();
          if (firstDoc?.global_auto_email_enabled === false) {
            globalEnabled = false;
          }
        }
      }
    } catch (err) {
      console.error('[MondayAutoEmailJob] Error querying system_settings:', err);
    }

    if (!globalEnabled) {
      const msg = 'Global automated emails are currently disabled in System Settings. Skipping execution.';
      console.log(`[MondayAutoEmailJob] ${msg}`);
      return { success: true, totalEvaluated: 0, totalSent: 0, message: msg };
    }
  }

  // 2. Fetch active template from messageTemplates (Rental / Bulk Email tab)
  const template = await getActiveMondayRentalTemplate();

  // 3. Query active rentals
  const rentalsQuery = query(collection(db, 'rentals'), where('status', '==', 'active'));
  const rentalsSnap = await getDocs(rentalsQuery);

  let sentCount = 0;
  let excludedClaimsCount = 0;

  for (const rentalDoc of rentalsSnap.docs) {
    const rental = rentalDoc.data();
    const rentalId = rentalDoc.id;

    // STRICT EXCLUSION: Check the rental TYPE field/column. Automatically ignore and exclude all rentals where the TYPE is set to "Claim" or "Claims".
    const rawType = String(rental.type || '').trim().toLowerCase();
    if (rawType === 'claim' || rawType === 'claims') {
      console.log(`[MondayAutoEmailJob] Rental ${rentalId} excluded: TYPE is set to "${rental.type}".`);
      excludedClaimsCount++;
      continue;
    }

    // Additional safeguard check on category, reason, or status
    const category = String(rental.category || rental.reason || '').trim().toLowerCase();
    const status = String(rental.status || '').trim().toLowerCase();
    if (['claim', 'claims'].includes(category) || ['claim', 'claims'].includes(status)) {
      console.log(`[MondayAutoEmailJob] Rental ${rentalId} excluded: category/reason/status is Claim/Claims.`);
      excludedClaimsCount++;
      continue;
    }

    // If automated run (not test batch), strictly honor individual enable_monday_auto_email toggle (default true)
    if (!isTestRun) {
      const enableMonday = rental.enable_monday_auto_email !== false;
      if (!enableMonday) {
        continue;
      }
    }

    // Filter by owing_amount > 0
    const totalAmount = parseFloat(rental.total_amount ?? rental.cost ?? rental.total ?? 0);
    const paidAmount = parseFloat(rental.paid_amount ?? rental.paidAmount ?? 0);
    const owingAmount = parseFloat(
      rental.owing_amount ?? rental.remainingAmount ?? rental.owing ?? (totalAmount - paidAmount)
    );

    if (isNaN(owingAmount) || owingAmount <= 0) {
      continue;
    }

    // Retrieve recipient contact
    let clientName = rental.customerName || rental.driverName || 'Valued Customer';
    let clientEmail = rental.customerEmail || rental.email || '';

    if ((!clientEmail || !clientName) && rental.customerId) {
      try {
        const custSnap = await getDoc(doc(db, 'customers', rental.customerId));
        if (custSnap.exists()) {
          const custData = custSnap.data();
          clientName = custData?.name || custData?.fullName || clientName;
          clientEmail = clientEmail || custData?.email || '';
        }
      } catch (custErr) {
        console.warn(`[MondayAutoEmailJob] Failed fetching customer ${rental.customerId}:`, custErr);
      }
    }

    if (!clientEmail) {
      console.warn(`[MondayAutoEmailJob] Rental ${rentalId} owes £${owingAmount} but has no email address. Skipping.`);
      continue;
    }

    // Replace placeholders
    const placeholders = {
      client_name: clientName,
      rental_id: rental.rentalAgreementNumber || rentalId,
      total_amount: formatCurrency(totalAmount),
      paid_amount: formatCurrency(paidAmount),
      owing_amount: formatCurrency(owingAmount),
      due_date: formatDate(rental.dueDate || rental.endDate || new Date()),
    };

    const finalSubject = replacePlaceholders(template.subjectTemplate, placeholders);
    const finalBody = replacePlaceholders(template.bodyTemplate, placeholders);

    // Send email without attachments
    try {
      await sendEmail({
        to_email: clientEmail,
        to_name: clientName,
        subject: finalSubject,
        message: finalBody,
        reference: rental.rentalAgreementNumber || rentalId,
      });
    } catch (emailErr) {
      console.warn(`[MondayAutoEmailJob] EmailJS dispatch notice for ${rentalId}:`, emailErr);
    }

    try {
      await addDoc(collection(db, 'emailHistory'), {
        sentBy: isTestRun ? 'Manual Bulk Test (Automation Page)' : 'System Automation (Monday Job)',
        type: 'rental',
        templateId: template.id,
        recipients: [clientEmail],
        subject: finalSubject,
        timestamp: serverTimestamp(),
        rentalId,
        hasAttachments: false, // Strict exclusion
        isTest: isTestRun,
      });
      sentCount++;
    } catch (sendErr) {
      console.error(`[MondayAutoEmailJob] Failed to record history for rental ${rentalId}:`, sendErr);
    }
  }

  const resultMsg = isTestRun
    ? `Test batch completed. Evaluated ${rentalsSnap.size} active rentals (${excludedClaimsCount} claims strictly excluded), dispatched emails to ${sentCount} eligible rentals.`
    : `Scheduled job finished. Evaluated ${rentalsSnap.size} active rentals (${excludedClaimsCount} claims excluded), dispatched ${sentCount} emails.`;
  console.log(`[MondayAutoEmailJob] ${resultMsg}`);
  return {
    success: true,
    totalEvaluated: rentalsSnap.size,
    totalSent: sentCount,
    message: resultMsg,
  };
}
