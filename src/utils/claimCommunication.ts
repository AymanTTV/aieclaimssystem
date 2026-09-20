// src/utils/claimCommunication.ts
import { Claim } from '../types';
import { format } from 'date-fns';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendEmail } from './emailService';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { logEmailHistory } from '../hooks/useEmailHistory';
import { resolveNameFields } from './nameAddressUtils';
import { emailTemplates } from '../constants/emailTemplates';

export type ClaimCommunicationChannel = 'whatsapp' | 'email';
export type ClaimTemplateCategory = 'general' | 'progress';

export interface ClaimContext {
  client_name: string;
  client_phone: string;
  client_email: string;
  claim_id: string;
  vehicle_reg: string;
  incident_date: string;
  claim_status: string;
  progress_stage: string;
  latest_update_notes: string;
  next_steps: string;
}

export interface ClaimTemplateOption {
  id: string;
  name: string;
  category: ClaimTemplateCategory;
  channel?: 'all' | 'whatsapp' | 'email';
  subjectTemplate: string;
  bodyTemplate: string;
  isCustom?: boolean;
}

const DEFAULT_SIGNATURE = `Kind regards,
AIE Claims Team
📍 AIE Claims, United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 WhatsApp: 07552 553441
✉️ claims@aieclaims.co.uk
🌐 www.aieclaims.co.uk`;

export const DEFAULT_CLAIM_TEMPLATES: ClaimTemplateOption[] = [
  // ─── CLAIM PROGRESS UPDATES ───
  {
    id: 'claim_progress_default_update',
    name: 'Claim Progress Update (Standard)',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'Claim Progress Update: {progress_stage} - {claim_id}',
    bodyTemplate: `Dear {client_name},

We are writing to provide you with an update regarding your accident claim.

📋 Claim Reference: {claim_id}
🚗 Vehicle Registration: {vehicle_reg}
📅 Incident Date: {incident_date}
📊 Current Status: {claim_status}
🔄 Progress Stage: {progress_stage}

📝 Latest Update Details:
{latest_update_notes}

⏭️ Next Steps:
{next_steps}

Our team is actively monitoring and managing your case. Should you have any questions or additional information to share, please reply to this message or contact us directly.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_progress_setup',
    name: 'Status: Claim Setup Confirmation',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'New Claim Setup Confirmed - {claim_id}',
    bodyTemplate: `🛡️ AIE Claims – New Claim Setup Confirmation

Dear {client_name},

This message confirms that your claim has been successfully set up on our system.

📋 Claim Ref: {claim_id}
🚗 Vehicle Reg: {vehicle_reg}
📅 Incident Date: {incident_date}
🔄 Status: {claim_status}

Our claims specialists are currently reviewing your file and initiating contact with the relevant insurance representatives. We will provide regular progress updates as your case advances.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_progress_liability_accepted',
    name: 'Status: Liability Accepted',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'Claim Update: Liability Accepted - {claim_id}',
    bodyTemplate: `✅ Claim Update: Liability Accepted

Dear {client_name},

We have positive news regarding your claim {claim_id} ({vehicle_reg}). Liability has been officially accepted by the third-party insurer.

Current Status: {claim_status}
Progress Stage: {progress_stage}

Notes:
{latest_update_notes}

Next Steps:
{next_steps}

We will proceed with authorizing and completing the next phase of your claim without delay.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_progress_repair_ongoing',
    name: 'Status: Repair in Progress',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'Claim Update: Repair in Progress - {vehicle_reg}',
    bodyTemplate: `🔧 Claim Update: Repair in Progress

Dear {client_name},

We are pleased to inform you that authorized repairs on vehicle {vehicle_reg} under claim {claim_id} are currently underway.

Progress Stage: {progress_stage}
Update Notes:
{latest_update_notes}

Next Steps:
{next_steps}

We will update you as soon as the workshop nears completion.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_progress_repair_completed',
    name: 'Status: Repair Completed / Ready for Collection',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'Your Vehicle is Ready for Collection! - {vehicle_reg}',
    bodyTemplate: `🚗 Your Vehicle is Ready for Collection!

Dear {client_name},

Great news! The repairs to your vehicle {vehicle_reg} (Claim #{claim_id}) are complete and the vehicle is ready for collection.

Status: {claim_status}
Stage: {progress_stage}

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_progress_settlement_pending',
    name: 'Status: Settlement Pending',
    category: 'progress',
    channel: 'all',
    subjectTemplate: 'Claim Update: Settlement Review Pending - {claim_id}',
    bodyTemplate: `⚖️ Claim Update: Settlement Pending

Dear {client_name},

Your claim {claim_id} ({vehicle_reg}) has reached the settlement negotiation stage.

Current Status: {claim_status}
Progress Stage: {progress_stage}
Update Notes: {latest_update_notes}

Next Steps:
{next_steps}

Our legal team is reviewing figures and negotiating terms with the insurer. We will be in touch with final details.

${DEFAULT_SIGNATURE}`,
  },

  // ─── GENERAL CLAIM TEMPLATES ───
  {
    id: 'claim_general_acknowledgement',
    name: 'General Claim Acknowledgment & Contact',
    category: 'general',
    channel: 'all',
    subjectTemplate: 'AIE Claims - Claim Reference {claim_id}',
    bodyTemplate: `Dear {client_name},

Thank you for contacting AIE Claims regarding claim {claim_id} for vehicle {vehicle_reg}.

Incident Date: {incident_date}
Current Status: {claim_status}

Our team is dedicated to handling your claim swiftly and professionally. If you have any questions or need to send further documentation, please reply to this message or contact us at 020 8050 5337.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_general_docs_request',
    name: 'Customer Documents Request',
    category: 'general',
    channel: 'all',
    subjectTemplate: 'Request for Supporting Documents – {claim_id}',
    bodyTemplate: `Dear {client_name},

To continue advancing your claim {claim_id} for vehicle {vehicle_reg}, we kindly request the following documentation:

📄 All 4 pages of the V5C logbook
🪪 Driving license (photocard front and back)
🚖 Taxi/PCO license (if applicable)
📑 Motor insurance certificate
📸 Any scene photos, dashcam footage, or witness statements

Please reply with clear photos or scans directly via WhatsApp or email.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_general_urgent_docs',
    name: 'Urgent - Missing Documents Required',
    category: 'general',
    channel: 'all',
    subjectTemplate: 'URGENT: Missing Documents Required - {claim_id}',
    bodyTemplate: `⚠️ URGENT: Documentation Required

Dear {client_name},

We have not yet received all required documentation to finalize processing for claim {claim_id} ({vehicle_reg}).

Pending items:
{latest_update_notes}

Please provide these as soon as possible to prevent any hold-ups with your claim or replacement vehicle.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_general_additional_info',
    name: 'Customer Additional Information Required',
    category: 'general',
    channel: 'all',
    subjectTemplate: 'Additional Information Required – {claim_id}',
    bodyTemplate: `Dear {client_name},

To proceed with your claim {claim_id} ({vehicle_reg}), we require a few additional details regarding the incident on {incident_date}:

{latest_update_notes}

Please let us know at your earliest convenience so we can progress your case.

${DEFAULT_SIGNATURE}`,
  },
];

/**
 * Derives default next steps based on progress stage
 */
export function deriveDefaultNextSteps(stage?: string): string {
  const s = String(stage || '').toLowerCase();
  if (s.includes('setup') || s.includes('started')) {
    return 'Inspecting file details, verifying documentation, and serving notification to the third-party insurer.';
  }
  if (s.includes('engineer') || s.includes('inspection')) {
    return 'Liaising with the assessing engineer to finalize repair estimates and vehicle valuation report.';
  }
  if (s.includes('assessment') || s.includes('damage')) {
    return 'Submitting the completed vehicle inspection and damage assessment to the insurer for authorization.';
  }
  if (s.includes('repair')) {
    return 'Coordinating parts delivery and monitoring workshop repair milestones through to final quality inspection.';
  }
  if (s.includes('settlement') || s.includes('offer')) {
    return 'Reviewing settlement valuation, verifying deduction-free disbursement, and finalizing release documents.';
  }
  if (s.includes('legal') || s.includes('court') || s.includes('tpi')) {
    return 'Our appointed legal handler is chasing third-party insurer response and drafting formal progression submissions.';
  }
  return 'Our dedicated claims handler is following up with relevant insurance and technical parties, and will notify you of the outcome.';
}

/**
 * Resolves all claim client & progress context for placeholders
 */
export function resolveClaimContext(
  claim: Claim,
  overrideNotes?: string,
  overrideStage?: string
): ClaimContext {
  const rawAny = claim as any;

  // Resolve client name
  const clientInfoName = rawAny.clientInfo ? resolveNameFields(rawAny.clientInfo).fullName || rawAny.clientInfo.name : '';
  const submitterName = claim.submitter?.fullName || (claim.submitter?.type === 'company' ? claim.submitter.companyName : '');
  const driverName = claim.driver?.fullName || '';
  const client_name = clientInfoName || submitterName || driverName || 'Valued Client';

  // Resolve client phone
  const client_phone =
    rawAny.clientInfo?.phone ||
    claim.submitter?.contactNumber ||
    claim.driver?.contactNumber ||
    '';

  // Resolve client email
  const client_email =
    rawAny.clientInfo?.email ||
    claim.submitter?.email ||
    claim.driver?.email ||
    '';

  // Resolve Claim ID
  const claim_id = claim.claimId || (claim.id ? `#${claim.id.slice(-8).toUpperCase()}` : 'N/A');

  // Resolve Vehicle Reg
  const vehicle_reg =
    claim.clientVehicle?.registration ||
    claim.vehicle?.registration ||
    rawAny.vehicleRegistration ||
    'N/A';

  // Resolve Incident Date
  let incidentDateObj: Date | null = null;
  const rawDate = rawAny.incidentDetails?.date || claim.dateOfEvent;
  if (rawDate) {
    if (typeof (rawDate as any).toDate === 'function') {
      incidentDateObj = (rawDate as any).toDate();
    } else if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      incidentDateObj = rawDate;
    } else {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) incidentDateObj = parsed;
    }
  }
  const incident_date = incidentDateObj ? format(incidentDateObj, 'dd/MM/yyyy') : 'N/A';

  // Resolve Status & Stage
  const progress_stage = overrideStage || claim.progress || 'Under Review';
  const claim_status = claim.caseProgress || (claim as any).status || progress_stage || 'In Progress';

  // Resolve Latest Update Notes
  let latest_update_notes = overrideNotes || '';
  if (!latest_update_notes && Array.isArray(claim.progressHistory) && claim.progressHistory.length > 0) {
    const sorted = [...claim.progressHistory].sort((a, b) => {
      const ta = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const tb = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return tb - ta;
    });
    latest_update_notes = sorted[0]?.note || '';
  }
  if (!latest_update_notes && claim.statusDescription) {
    latest_update_notes = claim.statusDescription;
  }
  if (!latest_update_notes) {
    latest_update_notes = 'Your claim file is actively moving forward through this stage.';
  }

  // Derive Next Steps
  const next_steps = deriveDefaultNextSteps(progress_stage);

  return {
    client_name,
    client_phone,
    client_email,
    claim_id,
    vehicle_reg,
    incident_date,
    claim_status,
    progress_stage,
    latest_update_notes,
    next_steps,
  };
}

/**
 * Replaces both `{placeholder}` and `[Placeholder]` variations with resolved context
 */
export function replaceClaimTemplatePlaceholders(text: string, context: ClaimContext): string {
  if (!text) return '';

  let result = text;

  // Map of keys to replace
  const replacements: Record<string, string> = {
    '{client_name}': context.client_name,
    '{client_phone}': context.client_phone,
    '{client_email}': context.client_email,
    '{claim_id}': context.claim_id,
    '{vehicle_reg}': context.vehicle_reg,
    '{incident_date}': context.incident_date,
    '{claim_status}': context.claim_status,
    '{progress_stage}': context.progress_stage,
    '{latest_update_notes}': context.latest_update_notes,
    '{next_steps}': context.next_steps,

    // Bracketed variations
    '[Client Name]': context.client_name,
    '[Customer Name]': context.client_name,
    '[Recipient Name]': context.client_name,
    '[Driver Name]': context.client_name,
    '[Claim Number]': context.claim_id,
    '[Claim Reference]': context.claim_id,
    '[Claim Ref]': context.claim_id,
    '[Vehicle Reg]': context.vehicle_reg,
    '[Registration Number]': context.vehicle_reg,
    '[Client Registration]': context.vehicle_reg,
    '[Incident Date]': context.incident_date,
    '[Date]': context.incident_date,
    '[Claim Status]': context.claim_status,
    '[Status]': context.claim_status,
    '[Progress Stage]': context.progress_stage,
    '[Status Update]': context.progress_stage,
    '[Insert progress / next step]': `${context.progress_stage} - ${context.next_steps}`,
    '[Specify clearly what is missing]': context.latest_update_notes,
    '[Latest Update Notes]': context.latest_update_notes,
    '[Update Notes]': context.latest_update_notes,
    '[Next Steps]': context.next_steps,
    '[Next Step]': context.next_steps,
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    result = result.split(placeholder).join(val || '');
  }

  // Also catch lowercase / alternate case variants of brackets/braces via regex
  result = result.replace(/\{client_name\}/gi, context.client_name);
  result = result.replace(/\{claim_id\}/gi, context.claim_id);
  result = result.replace(/\{vehicle_reg\}/gi, context.vehicle_reg);
  result = result.replace(/\{incident_date\}/gi, context.incident_date);
  result = result.replace(/\{claim_status\}/gi, context.claim_status);
  result = result.replace(/\{progress_stage\}/gi, context.progress_stage);
  result = result.replace(/\{latest_update_notes\}/gi, context.latest_update_notes);
  result = result.replace(/\{next_steps\}/gi, context.next_steps);

  return result;
}

/**
 * Fetches active templates from Firestore `messageTemplates` where category is 'claim'
 * and merges with built-ins from emailTemplates.claim and DEFAULT_CLAIM_TEMPLATES
 */
export async function fetchClaimTemplates(): Promise<ClaimTemplateOption[]> {
  const result: ClaimTemplateOption[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch live custom templates from Firestore
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    snap.forEach((doc) => {
      const data = doc.data();
      const cat = String(data.category || data.type || '').toLowerCase().trim();
      if (cat === 'claim') {
        const name = data.name || 'Claim Template';
        const lowerName = name.toLowerCase();
        const lowerBody = (data.bodyTemplate || data.body || data.content || '').toLowerCase();

        // Categorize into 'progress' vs 'general'
        const isProgress =
          data.claimCategory === 'progress' ||
          lowerName.includes('progress') ||
          lowerName.includes('status') ||
          lowerName.includes('stage') ||
          lowerName.includes('update') ||
          lowerBody.includes('progress stage') ||
          lowerBody.includes('status update');

        const option: ClaimTemplateOption = {
          id: doc.id,
          name,
          category: isProgress ? 'progress' : 'general',
          channel: data.channel === 'whatsapp' ? 'whatsapp' : data.channel === 'email' ? 'email' : 'all',
          subjectTemplate: data.subjectTemplate || data.subject || 'Claim Update - {claim_id}',
          bodyTemplate: data.bodyTemplate || data.body || data.content || '',
          isCustom: true,
        };

        result.push(option);
        seenIds.add(doc.id);
      }
    });
  } catch (err) {
    console.warn('Could not fetch Firestore messageTemplates for claims:', err);
  }

  // 2. Add defaults
  for (const tpl of DEFAULT_CLAIM_TEMPLATES) {
    if (!seenIds.has(tpl.id)) {
      result.push(tpl);
      seenIds.add(tpl.id);
    }
  }

  // 3. Add any from constants/emailTemplates.claim that aren't already included
  if (Array.isArray(emailTemplates?.claim)) {
    for (const tpl of emailTemplates.claim) {
      if (!seenIds.has(tpl.id)) {
        const isProgress =
          tpl.id.includes('status') ||
          tpl.name.toLowerCase().includes('status') ||
          tpl.name.toLowerCase().includes('update');

        result.push({
          id: tpl.id,
          name: tpl.name,
          category: isProgress ? 'progress' : 'general',
          channel: 'all',
          subjectTemplate: tpl.subjectTemplate,
          bodyTemplate: tpl.bodyTemplate,
          isCustom: false,
        });
        seenIds.add(tpl.id);
      }
    }
  }

  return result;
}

/**
 * Direct WhatsApp Action:
 * Opens https://wa.me/{client_phone}?text={encoded_message}
 * and logs to whatsappHistory
 */
export async function executeClaimWhatsApp(params: {
  phone: string;
  message: string;
  clientName: string;
  claim: Claim;
  userName?: string;
  templateId?: string;
  subject?: string;
}): Promise<{ url: string; digits: string }> {
  const digits = formatWhatsAppNumber(params.phone);
  if (!digits) {
    throw new Error('A valid phone number with country code is required for WhatsApp.');
  }

  const url = buildWaMeLink(digits, params.message);
  window.open(url, '_blank', 'noopener,noreferrer');

  // Record to WhatsApp history
  try {
    const claimRef = params.claim.claimId || params.claim.id.slice(-8).toUpperCase();
    await logWhatsappHistory({
      sentBy: params.userName || 'Admin',
      type: 'claim',
      templateId: params.templateId || 'claim_whatsapp_direct',
      recipients: [params.phone],
      subject: params.subject || `Claim ${claimRef} Update`,
      body: params.message,
      timestamp: new Date(),
    });
  } catch (histErr) {
    console.warn('Failed to log WhatsApp communication history:', histErr);
  }

  return { url, digits };
}

/**
 * Direct Email Action:
 * Dispatches via sendEmail (EmailJS) with fallback to mailto:
 * and logs to emailHistory
 */
export async function executeClaimEmail(params: {
  email: string;
  clientName: string;
  subject: string;
  body: string;
  claim: Claim;
  userName?: string;
  templateId?: string;
}): Promise<{ mode: 'provider' | 'mailto' }> {
  if (!params.email || !params.email.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  const claimRef = params.claim.claimId || params.claim.id.slice(-8).toUpperCase();

  // If EmailJS credentials are configured, send directly
  if (serviceId && templateId && publicKey) {
    try {
      await sendEmail({
        to_email: params.email,
        to_name: params.clientName,
        subject: params.subject,
        message: params.body,
        reference: `Claim ${claimRef}`,
      });

      // Log email history
      try {
        await logEmailHistory({
          sentBy: params.userName || 'Admin',
          type: 'claim',
          templateId: params.templateId || 'claim_email_direct',
          recipients: [params.email],
          subject: params.subject,
          timestamp: new Date(),
        });
      } catch (histErr) {
        console.warn('Failed to log email history:', histErr);
      }

      return { mode: 'provider' };
    } catch (err: any) {
      console.warn('Provider email failed, falling back to mailto:', err);
      // Fallback to mailto below
    }
  }

  // Mailto fallback
  const mailtoUrl = `mailto:${encodeURIComponent(params.email)}?subject=${encodeURIComponent(
    params.subject
  )}&body=${encodeURIComponent(params.body)}`;
  window.open(mailtoUrl, '_blank');

  try {
    await logEmailHistory({
      sentBy: params.userName || 'Admin',
      type: 'claim',
      templateId: params.templateId || 'claim_email_mailto',
      recipients: [params.email],
      subject: params.subject,
      timestamp: new Date(),
    });
  } catch (histErr) {
    console.warn('Failed to log email history for mailto:', histErr);
  }

  return { mode: 'mailto' };
}
