// src/utils/claimCommunication.ts
import { Claim } from '../types';
import { format } from 'date-fns';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { sendEmail } from './emailService';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { logEmailHistory } from '../hooks/useEmailHistory';
import { logCommunication } from '../services/communicationLogService';
import { resolveNameFields } from './nameAddressUtils';
import { emailTemplates } from '../constants/emailTemplates';
import { isTemplateInCategory, isTemplateDeletedSync } from './templateManager';
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import ClaimDocument from '../components/pdf/documents/ClaimDocument';
import { AIE_CLAIMS_COMPANY_DETAILS } from './legalDocumentUtils';

export type ClaimCommunicationChannel = 'whatsapp' | 'email';
export type ClaimTemplateCategory = 'general' | 'progress' | 'legal_handler' | 'custom' | 'all';
export type ClaimRecipientType = 'client' | 'legalHandler';

export interface LegalHandlerDetails {
  legal_handler_name: string;
  legal_handler_firm: string;
  legal_handler_email: string;
  legal_handler_phone: string;
}

export interface ClaimContext {
  // Client details
  client_name: string;
  client_phone: string;
  client_email: string;

  // Claim & Vehicle details
  claim_id: string;
  vehicle_reg: string;
  incident_date: string;
  claim_status: string;
  progress_stage: string;
  latest_update_notes: string;
  next_steps: string;

  // Legal Handler details
  legal_handler_name: string;
  legal_handler_firm: string;
  legal_handler_email: string;
  legal_handler_phone: string;
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

export interface ClaimAttachment {
  filename: string;
  url: string;
  blob?: Blob;
  data?: any;
}

export interface SelectableClaimFile {
  id: string;
  name: string;
  category: 'claim_card' | 'document' | 'image' | 'video';
  url: string;
  filename: string;
  isGeneratedPdf?: boolean;
}

function cleanFilenameFromUrl(url: string, fallback: string): string {
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const lastPart = decodeURIComponent(parts[parts.length - 1] || '');
    if (lastPart && (lastPart.includes('.') || lastPart.length < 50)) {
      return lastPart.length > 32 ? lastPart.slice(-28) : lastPart;
    }
  } catch {}
  return fallback;
}

/**
 * Extracts all available files, uploaded documents, evidence, and photos from a claim record.
 */
export function extractClaimAvailableFiles(
  claim: Claim,
  claimCardAttachment?: ClaimAttachment | null
): SelectableClaimFile[] {
  const files: SelectableClaimFile[] = [];
  const cleanClaimRef = (claim.claimId || claim.id || 'claim').replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Official Generated Claim Card PDF
  const cardUrl = claimCardAttachment?.url || (claim as any).claimCardUrl || '';
  files.push({
    id: 'claim_card_pdf',
    name: 'Claim Card PDF (Incident Particulars & Schedule)',
    category: 'claim_card',
    url: cardUrl,
    filename: claimCardAttachment?.filename || `Claim_Card_${cleanClaimRef}.pdf`,
    isGeneratedPdf: true,
  });

  // 2. Evidence Files & Documents uploaded to the claim record
  const evidence = (claim as any).evidence || {};

  // 2a. Engineer Reports
  if (Array.isArray(evidence.engineerReport)) {
    evidence.engineerReport.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `engineer_report_${idx}`,
          name: `Engineer Report ${idx + 1}`,
          category: 'document',
          url,
          filename: cleanFilenameFromUrl(url, `Engineer_Report_${idx + 1}.pdf`),
        });
      }
    });
  }

  // 2b. Bank Statements
  if (Array.isArray(evidence.bankStatement)) {
    evidence.bankStatement.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `bank_statement_${idx}`,
          name: `Bank Statement ${idx + 1}`,
          category: 'document',
          url,
          filename: cleanFilenameFromUrl(url, `Bank_Statement_${idx + 1}.pdf`),
        });
      }
    });
  }

  // 2c. Admin Documents
  if (Array.isArray(evidence.adminDocuments)) {
    evidence.adminDocuments.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `admin_doc_${idx}`,
          name: `Admin Document ${idx + 1}`,
          category: 'document',
          url,
          filename: cleanFilenameFromUrl(url, `Admin_Document_${idx + 1}.pdf`),
        });
      }
    });
  }

  // 2d. Claim Progress Document
  if ((claim as any).progressDocumentUrl && typeof (claim as any).progressDocumentUrl === 'string') {
    const pUrl = (claim as any).progressDocumentUrl;
    files.push({
      id: 'progress_document',
      name: 'Claim Progress Record Document',
      category: 'document',
      url: pUrl,
      filename: cleanFilenameFromUrl(pUrl, `Progress_Record_${cleanClaimRef}.pdf`),
    });
  }

  // 2e. Standard Claim Documents (claim.documents)
  const docLabels: Record<string, string> = {
    conditionOfHire: 'Condition of Hire',
    creditHireMitigation: 'Credit Hire Mitigation Form',
    noticeOfRightToCancel: 'Notice of Right to Cancel',
    creditHireAgreement: 'Credit Hire Agreement',
    uld: 'Uninsured Loss Document (ULD)',
    medicalReport: 'Medical Report (PI) 1',
    medicalReport2: 'Medical Report (PI) 2',
    scheduleOfLoss: 'Schedule of Loss Document',
    courtBundle: 'Court Bundle Pack',
    interimBilling: 'Interim Billing Document',
    finalBilling: 'Final Billing Document',
    invoice: 'Hire / Claim Invoice',
    chaseLetter1: 'Chase Letter 1',
    chaseLetter2: 'Chase Letter 2',
    chaseLetter3: 'Chase Letter 3',
    chaseLetter4: 'Chase Letter 4',
    chaseLetter5: 'Chase Letter 5',
  };

  if (claim.documents && typeof claim.documents === 'object') {
    Object.entries(claim.documents).forEach(([docKey, docVal]) => {
      if (typeof docVal === 'string' && docVal.trim()) {
        const label = docLabels[docKey] || `Claim Document: ${docKey}`;
        files.push({
          id: `doc_${docKey}`,
          name: label,
          category: 'document',
          url: docVal,
          filename: cleanFilenameFromUrl(docVal, `${docKey}_${cleanClaimRef}.pdf`),
        });
      }
    });
  }

  // 2f. Vehicle Documents (claim.clientVehicle?.documents)
  if (claim.clientVehicle?.documents && typeof claim.clientVehicle.documents === 'object') {
    Object.entries(claim.clientVehicle.documents).forEach(([vKey, vVal]) => {
      if (typeof vVal === 'string' && vVal.trim()) {
        files.push({
          id: `vdoc_${vKey}`,
          name: `Vehicle Document: ${vKey.toUpperCase()}`,
          category: 'document',
          url: vVal,
          filename: cleanFilenameFromUrl(vVal, `Vehicle_${vKey}_${cleanClaimRef}.pdf`),
        });
      }
    });
  }

  // 3. Claim Images & Photos uploaded under the claim record
  // 3a. Incident Evidence Images
  if (Array.isArray(evidence.images)) {
    evidence.images.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `evidence_img_${idx}`,
          name: `Incident Scene Photo ${idx + 1}`,
          category: 'image',
          url,
          filename: cleanFilenameFromUrl(url, `Incident_Photo_${idx + 1}.jpg`),
        });
      }
    });
  }

  // 3b. Client Vehicle Photos
  if (Array.isArray(evidence.clientVehiclePhotos)) {
    evidence.clientVehiclePhotos.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `vehicle_photo_${idx}`,
          name: `Client Vehicle Photo ${idx + 1}`,
          category: 'image',
          url,
          filename: cleanFilenameFromUrl(url, `Vehicle_Photo_${idx + 1}.jpg`),
        });
      }
    });
  }

  // 3c. Incident Videos
  if (Array.isArray(evidence.videos)) {
    evidence.videos.forEach((url: string, idx: number) => {
      if (typeof url === 'string' && url.trim()) {
        files.push({
          id: `evidence_video_${idx}`,
          name: `Incident Video Evidence ${idx + 1}`,
          category: 'video',
          url,
          filename: cleanFilenameFromUrl(url, `Incident_Video_${idx + 1}.mp4`),
        });
      }
    });
  }

  return files;
}

const DEFAULT_SIGNATURE = `Kind regards,
AIE Claims Team
📍 AIE Claims, United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 WhatsApp: 07552 553441
✉️ claims@aieclaims.co.uk
🌐 www.aieclaims.co.uk`;

export const DEFAULT_CLAIM_TEMPLATES: ClaimTemplateOption[] = [
  // ─── LEGAL HANDLER TEMPLATES ───
  {
    id: 'claim_legal_instruction_card',
    name: 'Legal Handler: New Claim Instruction & Claim Card',
    category: 'legal_handler',
    channel: 'all',
    subjectTemplate: 'New Claim Instruction & Claim Card: {vehicle_reg} - {claim_id}',
    bodyTemplate: `Dear {legal_handler_name},

Please find instructed the accident claim file for our client {client_name} regarding vehicle {vehicle_reg}.

📋 Claim Reference: {claim_id}
🚗 Vehicle Registration: {vehicle_reg}
📅 Incident Date: {incident_date}
⚖️ Appointed Firm: {legal_handler_firm}
📊 Current Status: {claim_status}
🔄 Progress Stage: {progress_stage}

👤 Client Contact:
• Name: {client_name}
• Contact Number: {client_phone}

Attached to this transmission is the official Claim Card ({claim_id}) containing complete incident particulars, third-party details, and declarations.

Please confirm receipt, advise your internal reference upon setup, and notify our office once initial representation has been served on the insurer.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_legal_progress_chase',
    name: 'Legal Handler: Status & Settlement Review Chase',
    category: 'legal_handler',
    channel: 'all',
    subjectTemplate: 'Claim Progression & Settlement Review Chase - {claim_id} ({vehicle_reg})',
    bodyTemplate: `Dear {legal_handler_name},

We are following up regarding the progression and settlement status for the following instructed claim:

📋 Claim Reference: {claim_id}
🚗 Vehicle Registration: {vehicle_reg}
👤 Client Name: {client_name}
📅 Incident Date: {incident_date}
⚖️ Appointed Firm: {legal_handler_firm}
🔄 Current Stage: {progress_stage}

📝 Latest Notes on File:
{latest_update_notes}

⏭️ Next Required Action:
{next_steps}

Kindly provide an update regarding third-party insurer response, current liability position, and upcoming settlement milestones.

${DEFAULT_SIGNATURE}`,
  },
  {
    id: 'claim_legal_file_request',
    name: 'Legal Handler: File Schedule & Evidence Submission',
    category: 'legal_handler',
    channel: 'all',
    subjectTemplate: 'Claim Evidence Schedule & File Update - {claim_id}',
    bodyTemplate: `Dear {legal_handler_name},

Please find the updated evidence schedule and file documents for claim {claim_id} ({vehicle_reg}).

Client: {client_name}
Contact Number: {client_phone}
Incident Date: {incident_date}
Firm: {legal_handler_firm}

Update Details:
{latest_update_notes}

The full Claim Card PDF is attached for your records. Please let us know if any further engineer or witness statements are required.

${DEFAULT_SIGNATURE}`,
  },

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
 * Resolves Legal Handler details for a given claim
 */
export function resolveLegalHandlerDetails(
  claim: Claim,
  override?: Partial<LegalHandlerDetails>
): LegalHandlerDetails {
  const rawAny = claim as any;
  const lh =
    claim.fileHandlers?.legalHandler ||
    rawAny.legalHandler ||
    rawAny.fileHandlers?.legalHandler ||
    null;

  let name = '';
  let firm = '';
  let email = '';
  let phone = '';

  if (lh) {
    if (typeof lh === 'string') {
      name = lh.trim();
      firm = lh.trim();
    } else if (typeof lh === 'object') {
      name = lh.name || lh.contactName || lh.fullName || '';
      firm = lh.firm || lh.firmName || lh.company || lh.name || '';
      email = lh.email || '';
      phone = lh.phone || lh.contactNumber || lh.telephone || '';
    }
  }

  // Fallbacks if top-level fields exist
  if (!name && rawAny.legalHandlerName) name = rawAny.legalHandlerName;
  if (!firm && rawAny.legalHandlerFirm) firm = rawAny.legalHandlerFirm;
  if (!email && rawAny.legalHandlerEmail) email = rawAny.legalHandlerEmail;
  if (!phone && rawAny.legalHandlerPhone) phone = rawAny.legalHandlerPhone;

  // Default firm to name if firm is still empty
  if (!firm && name) firm = name;

  return {
    legal_handler_name: override?.legal_handler_name !== undefined ? override.legal_handler_name : name,
    legal_handler_firm: override?.legal_handler_firm !== undefined ? override.legal_handler_firm : firm,
    legal_handler_email: override?.legal_handler_email !== undefined ? override.legal_handler_email : email,
    legal_handler_phone: override?.legal_handler_phone !== undefined ? override.legal_handler_phone : phone,
  };
}

/**
 * Resolves all claim client, vehicle, progress, and legal handler context for placeholders
 */
export function resolveClaimContext(
  claim: Claim,
  overrideNotes?: string,
  overrideStage?: string,
  overrideLegal?: Partial<LegalHandlerDetails>
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

  // Resolve Legal Handler
  const legalDetails = resolveLegalHandlerDetails(claim, overrideLegal);

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
    ...legalDetails,
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
    // Client & Claim Placeholders
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

    // Legal Handler Placeholders
    '{legal_handler_name}': context.legal_handler_name,
    '{legal_handler_firm}': context.legal_handler_firm,
    '{legal_handler_email}': context.legal_handler_email,
    '{legal_handler_phone}': context.legal_handler_phone,

    // Cross-module aliases for system-wide unlocked templates
    '{driver_name}': context.client_name,
    '{customer_name}': context.client_name,
    '{reference_number}': context.claim_id,
    '{rental_ref}': context.claim_id,
    '{maintenance_id}': context.claim_id,
    '{invoice_id}': context.claim_id,
    '{date_time}': context.incident_date,
    '{date}': context.incident_date,
    '{time}': '',
    '{additional_notes}': context.latest_update_notes,
    '{amount_due}': '',
    '{total_amount}': '',

    // Bracketed variations
    '[Driver Name]': context.client_name,
    '[Customer Name]': context.client_name,
    '[Date & Time]': context.incident_date,
    '[Additional Notes]': context.latest_update_notes,
    '[Legal Handler Name]': context.legal_handler_name,
    '[Legal Handler]': context.legal_handler_name,
    '[Handler Name]': context.legal_handler_name,
    '[Solicitor Name]': context.legal_handler_name,
    '[Legal Handler Firm]': context.legal_handler_firm,
    '[Firm Name]': context.legal_handler_firm,
    '[Solicitors]': context.legal_handler_firm,
    '[Solicitor Firm]': context.legal_handler_firm,
    '[Legal Handler Email]': context.legal_handler_email,
    '[Handler Email]': context.legal_handler_email,
    '[Legal Handler Phone]': context.legal_handler_phone,
    '[Handler Phone]': context.legal_handler_phone,

    '[Client Name]': context.client_name,
    '[Recipient Name]': context.legal_handler_name || context.client_name,
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
  result = result.replace(/\{client_phone\}/gi, context.client_phone);
  result = result.replace(/\{client_email\}/gi, context.client_email);
  result = result.replace(/\{claim_id\}/gi, context.claim_id);
  result = result.replace(/\{vehicle_reg\}/gi, context.vehicle_reg);
  result = result.replace(/\{incident_date\}/gi, context.incident_date);
  result = result.replace(/\{claim_status\}/gi, context.claim_status);
  result = result.replace(/\{progress_stage\}/gi, context.progress_stage);
  result = result.replace(/\{latest_update_notes\}/gi, context.latest_update_notes);
  result = result.replace(/\{next_steps\}/gi, context.next_steps);

  result = result.replace(/\{legal_handler_name\}/gi, context.legal_handler_name);
  result = result.replace(/\{legal_handler_firm\}/gi, context.legal_handler_firm);
  result = result.replace(/\{legal_handler_email\}/gi, context.legal_handler_email);
  result = result.replace(/\{legal_handler_phone\}/gi, context.legal_handler_phone);

  return result;
}

/**
 * Automatically generates/fetches the Claim Card PDF for a specific claim record
 */
export async function generateClaimCardPdf(claim: Claim): Promise<ClaimAttachment> {
  const cleanRef = (claim.claimId || claim.id || 'claim').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Claim_Card_${cleanRef}.pdf`;

  // Check if already stored and valid
  const rawAny = claim as any;
  if (rawAny.claimCardUrl && typeof rawAny.claimCardUrl === 'string' && rawAny.claimCardUrl.startsWith('http')) {
    return {
      filename,
      url: rawAny.claimCardUrl,
    };
  }

  // 1. Fetch company details with fallback to AIE Claims LTD
  const companyDetails: any = {
    ...AIE_CLAIMS_COMPANY_DETAILS,
  };

  // 2. Normalize claim reasons
  const normalized: Claim = {
    ...claim,
    claimReason: Array.isArray(claim.claimReason) ? claim.claimReason : [claim.claimReason as any],
  };

  // 3. Render PDF Blob
  const pdfBlob = await pdf(
    createElement(ClaimDocument, {
      data: normalized,
      companyDetails,
    })
  ).toBlob();

  // 4. Upload to Firebase Storage
  let downloadUrl = '';
  try {
    const storageRef = ref(storage, `claims/${claim.id || 'temp'}/${filename}`);
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=7200',
      },
    });
    downloadUrl = await getDownloadURL(snapshot.ref);

    // Update claim in Firestore if claim.id exists
    if (claim.id) {
      try {
        await updateDoc(doc(db, 'claims', claim.id), {
          claimCardUrl: downloadUrl,
          documentUrl: downloadUrl,
          updatedAt: new Date(),
        });
      } catch (upErr) {
        console.warn('Could not update claim with claimCardUrl:', upErr);
      }
    }
  } catch (uploadErr) {
    console.warn('Storage upload error, using object URL for preview/download:', uploadErr);
    downloadUrl = URL.createObjectURL(pdfBlob);
  }

  return {
    filename,
    url: downloadUrl,
    blob: pdfBlob,
  };
}

/**
 * Fetches active templates from Firestore `messageTemplates` where category is 'claim' or related,
 * and merges with built-ins from DEFAULT_CLAIM_TEMPLATES and emailTemplates.claim
 */
export async function fetchClaimTemplates(
  channelFilter?: ClaimCommunicationChannel
): Promise<ClaimTemplateOption[]> {
  const result: ClaimTemplateOption[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch live templates from Firestore (all categories unlocked)
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const cat = String(data.category || data.type || '').toLowerCase().trim();
      const recipientType = String(data.recipientType || data.tab || '').toLowerCase().trim();
      const rawName = data.name || 'Communication Template';
      const lowerName = rawName.toLowerCase();
      const lowerBody = (data.bodyTemplate || data.body || data.content || '').toLowerCase();
      const docChannel = String(data.channel || data.platform || '').toLowerCase().trim();

      if (isTemplateDeletedSync(docSnap.id)) return;
      if (data.isDeleted === true || data.deleted === true) return;

      // STRICT FOLDER ACCESS: Strictly allow templates from 'claim' folder + universal 'custom' folder
      const isClaim = isTemplateInCategory(cat, 'claim');
      const isCustom = isTemplateInCategory(cat, 'custom');
      if (!isClaim && !isCustom) {
        return;
      }

      // If channel filter specified, filter out non-matching channels
      if (
        channelFilter &&
        docChannel &&
        docChannel !== 'all' &&
        docChannel !== channelFilter
      ) {
        return;
      }

      // Categorize into 'legal_handler', 'progress', 'custom', or 'general'
      let templateCategory: ClaimTemplateCategory = 'general';

      if (isCustom) {
        templateCategory = 'custom';
      } else if (
        cat === 'legal_handler' ||
        cat === 'legal' ||
        recipientType === 'legalhandler' ||
        data.claimCategory === 'legal_handler' ||
        lowerName.includes('legal') ||
        lowerName.includes('solicitor') ||
        lowerName.includes('handler')
      ) {
        templateCategory = 'legal_handler';
      } else if (
        data.claimCategory === 'progress' ||
        lowerName.includes('progress') ||
        lowerName.includes('status') ||
        lowerName.includes('stage') ||
        lowerName.includes('update') ||
        lowerBody.includes('progress stage') ||
        lowerBody.includes('status update')
      ) {
        templateCategory = 'progress';
      }

      const displayName = isCustom ? `[Custom] ${rawName}` : rawName;

      // Channel is unlocked to 'all' so user can dispatch via either WhatsApp or Email
      const option: ClaimTemplateOption = {
        id: docSnap.id,
        name: displayName,
        category: templateCategory,
        channel: 'all',
        subjectTemplate: data.subjectTemplate || data.subject || 'Claim Update - {claim_id}',
        bodyTemplate: data.bodyTemplate || data.body || data.content || '',
        isCustom: true,
      };

      result.push(option);
      seenIds.add(docSnap.id);
    });
  } catch (err) {
    console.warn('Could not fetch Firestore messageTemplates for claims:', err);
  }

  // 2. Add defaults
  for (const tpl of DEFAULT_CLAIM_TEMPLATES) {
    if (!seenIds.has(tpl.id) && !isTemplateDeletedSync(tpl.id)) {
      result.push(tpl);
      seenIds.add(tpl.id);
    }
  }

  // 3. Add any from constants/emailTemplates.claim that aren't already included
  if (Array.isArray(emailTemplates?.claim)) {
    for (const tpl of emailTemplates.claim) {
      if (!seenIds.has(tpl.id) && !isTemplateDeletedSync(tpl.id)) {
        const isProgress =
          tpl.id.includes('status') ||
          tpl.name.toLowerCase().includes('status') ||
          tpl.name.toLowerCase().includes('update');

        const isLegal =
          tpl.id.includes('legal') ||
          tpl.name.toLowerCase().includes('legal') ||
          tpl.name.toLowerCase().includes('solicitor');

        result.push({
          id: tpl.id,
          name: tpl.name,
          category: isLegal ? 'legal_handler' : isProgress ? 'progress' : 'general',
          channel: 'all',
          subjectTemplate: tpl.subjectTemplate,
          bodyTemplate: tpl.bodyTemplate,
          isCustom: false,
        });
        seenIds.add(tpl.id);
      }
    }
  }

  // 4. Add any from constants/emailTemplates.custom that aren't already included (universal Custom folder)
  if (Array.isArray(emailTemplates?.custom)) {
    for (const tpl of emailTemplates.custom) {
      if (!seenIds.has(tpl.id) && !isTemplateDeletedSync(tpl.id)) {
        result.push({
          id: tpl.id,
          name: `[Custom] ${tpl.name}`,
          category: 'custom',
          channel: 'all',
          subjectTemplate: tpl.subjectTemplate,
          bodyTemplate: tpl.bodyTemplate,
          isCustom: true,
        });
        seenIds.add(tpl.id);
      }
    }
  }

  return result;
}

/**
 * Direct WhatsApp Action:
 * Opens https://wa.me/{phone}?text={encoded_message}
 * Appends secure download/view links if attachments are selected,
 * and logs to whatsappHistory
 */
export async function executeClaimWhatsApp(params: {
  phone: string;
  message: string;
  recipientName: string;
  claim: Claim;
  userName?: string;
  templateId?: string;
  subject?: string;
  recipientType?: ClaimRecipientType;
  attachments?: ClaimAttachment[];
}): Promise<{ url: string; digits: string }> {
  const digits = formatWhatsAppNumber(params.phone);
  if (!digits) {
    throw new Error('A valid phone number with country code is required for WhatsApp.');
  }

  let finalMessage = params.message.trim();

  // If attachments are selected, append secure download links to WhatsApp message
  if (params.attachments && params.attachments.length > 0) {
    const attLines = params.attachments.map((a) => {
      const isImg = Boolean(
        a.filename.match(/\.(jpeg|jpg|png|webp|gif|bmp)$/i) ||
        a.url.match(/\.(jpeg|jpg|png|webp|gif|bmp)/i) ||
        a.filename.toLowerCase().includes('photo') ||
        a.filename.toLowerCase().includes('image')
      );
      const isPdf = a.filename.toLowerCase().endsWith('.pdf') || a.url.toLowerCase().includes('.pdf');
      const prefix = isImg ? '🖼️ View Photo' : isPdf ? '📄 Download Document' : '📎 View File';
      return `• ${prefix} (${a.filename}):\n${a.url}`;
    });

    finalMessage += `\n\n📎 ATTACHED FILES & DOWNLOAD LINKS:\n${attLines.join('\n\n')}`;
  }

  const url = buildWaMeLink(digits, finalMessage);
  window.open(url, '_blank', 'noopener,noreferrer');

  // Record to WhatsApp history
  try {
    const claimRef = params.claim.claimId || (params.claim.id ? params.claim.id.slice(-8).toUpperCase() : 'N/A');
    await logWhatsappHistory({
      sentBy: params.userName || 'Admin',
      type: 'claim',
      templateId: params.templateId || 'claim_whatsapp_direct',
      recipients: [params.phone],
      subject: params.subject || `Claim ${claimRef} Update (${params.recipientType || 'client'})`,
      body: finalMessage,
      timestamp: new Date(),
      skipCommunicationLogs: true,
    });

    await logCommunication({
      communication_channel: 'WhatsApp',
      recipient_role: params.recipientType === 'legalHandler' ? 'Legal Handler' : 'Client',
      recipient_name: params.recipientName,
      recipient_contact: params.phone,
      source_module: 'Claim',
      record_id: claimRef,
      template_name: params.templateName || (params.templateId ? `Template: ${params.templateId}` : 'Claim Update'),
      message_body: finalMessage,
      attachments: (params.attachments || []).map((a: any) => ({ name: a.filename, url: a.url })),
      delivery_status: 'Sent',
      subject: params.subject || `Claim ${claimRef} Update`,
      customerId: params.claim.customerId || '',
      vehicleId: params.claim.vehicleId || '',
      sender_user_id: params.userName,
    });
  } catch (histErr) {
    console.warn('Failed to log WhatsApp communication history:', histErr);
  }

  return { url, digits };
}

/**
 * Direct Email Action:
 * Dispatches via sendEmail (EmailJS) with fallback to mailto:
 * Attaches Claim Card PDF and formatted links, and logs to emailHistory
 */
export async function executeClaimEmail(params: {
  email: string;
  recipientName: string;
  subject: string;
  body: string;
  claim: Claim;
  userName?: string;
  templateId?: string;
  recipientType?: ClaimRecipientType;
  attachments?: ClaimAttachment[];
}): Promise<{ mode: 'provider' | 'mailto' }> {
  if (!params.email || !params.email.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  const claimRef = params.claim.claimId || (params.claim.id ? params.claim.id.slice(-8).toUpperCase() : 'N/A');

  // Format message body to cleanly include attachment links if present
  let finalBody = params.body;
  if (params.attachments && params.attachments.length > 0) {
    const attText =
      '\n\n📎 ATTACHED DOCUMENTS & EVIDENCE FILES:\n' +
      params.attachments
        .map((a) => {
          const isImg = Boolean(
            a.filename.match(/\.(jpeg|jpg|png|webp|gif|bmp)$/i) ||
            a.url.match(/\.(jpeg|jpg|png|webp|gif|bmp)/i) ||
            a.filename.toLowerCase().includes('photo') ||
            a.filename.toLowerCase().includes('image')
          );
          const isPdf = a.filename.toLowerCase().endsWith('.pdf') || a.url.toLowerCase().includes('.pdf');
          const prefix = isImg ? '🖼️ Photo' : isPdf ? '📄 Document' : '📎 File';
          return `• ${prefix} (${a.filename})\n  Download / View: ${a.url}`;
        })
        .join('\n\n') +
      '\n\n';

    const sigMarkers = ['Kind regards,', 'Best regards,', 'AIE Claims Team', 'AIE Skyline Limited'];
    let sigIndex = -1;
    for (const marker of sigMarkers) {
      const idx = finalBody.lastIndexOf(marker);
      if (idx !== -1) {
        sigIndex = idx;
        break;
      }
    }

    if (sigIndex !== -1) {
      finalBody = finalBody.substring(0, sigIndex) + attText + finalBody.substring(sigIndex);
    } else {
      finalBody += attText;
    }
  }

  // If EmailJS credentials are configured, send directly
  if (serviceId && templateId && publicKey) {
    try {
      await sendEmail({
        to_email: params.email,
        to_name: params.recipientName,
        subject: params.subject,
        message: finalBody,
        reference: `Claim ${claimRef}`,
        attachments: params.attachments,
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
          skipCommunicationLogs: true,
        });

        await logCommunication({
          communication_channel: 'Email',
          recipient_role: params.recipientType === 'legalHandler' ? 'Legal Handler' : 'Client',
          recipient_name: params.recipientName,
          recipient_contact: params.email,
          source_module: 'Claim',
          record_id: claimRef,
          template_name: params.templateName || (params.templateId ? `Template: ${params.templateId}` : 'Claim Email'),
          message_body: finalBody,
          attachments: (params.attachments || []).map((a: any) => ({ name: a.filename, url: a.url })),
          delivery_status: 'Sent',
          subject: params.subject,
          customerId: params.claim.customerId || '',
          vehicleId: params.claim.vehicleId || '',
          sender_user_id: params.userName,
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
  )}&body=${encodeURIComponent(finalBody)}`;
  window.open(mailtoUrl, '_blank');

  try {
    await logEmailHistory({
      sentBy: params.userName || 'Admin',
      type: 'claim',
      templateId: params.templateId || 'claim_email_mailto',
      recipients: [params.email],
      subject: params.subject,
      timestamp: new Date(),
      skipCommunicationLogs: true,
    });

    await logCommunication({
      communication_channel: 'Email',
      recipient_role: params.recipientType === 'legalHandler' ? 'Legal Handler' : 'Client',
      recipient_name: params.recipientName,
      recipient_contact: params.email,
      source_module: 'Claim',
      record_id: claimRef,
      template_name: params.templateName || (params.templateId ? `Template: ${params.templateId}` : 'Claim Email'),
      message_body: finalBody,
      attachments: (params.attachments || []).map((a: any) => ({ name: a.filename, url: a.url })),
      delivery_status: 'Sent',
      subject: params.subject,
      customerId: params.claim.customerId || '',
      vehicleId: params.claim.vehicleId || '',
      sender_user_id: params.userName,
    });
  } catch (histErr) {
    console.warn('Failed to log email history for mailto:', histErr);
  }

  return { mode: 'mailto' };
}

