// src/utils/groupMessaging.ts

import { Customer } from '../types/customer';
import { Claim } from '../types/claim';
import {
  GlobalMessageTemplate,
  MessagingRecipient,
  RecipientCategory,
  MessagingAttachment,
} from '../types/groupMessaging';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { formatWhatsAppNumber, buildWaMeLink } from './whatsapp';
import { sendEmail } from './emailService';
import { logEmailHistory } from '../hooks/useEmailHistory';
import { logWhatsappHistory } from '../hooks/useWhatsappHistory';
import { format } from 'date-fns';

export const COMPANY_SIGNATURE = `
Kind regards,
AIE Skyline Operations Team
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

export const DEFAULT_TEMPLATES: GlobalMessageTemplate[] = [
  {
    id: 'default_news_flash',
    name: 'Important News Flash / Announcement',
    category: 'Group Messaging',
    subjectTemplate: '📢 Important Update for {customer_name} - AIE Skyline Announcement',
    bodyTemplate: `Dear {customer_name},

We are writing to share an important announcement with you.

[Insert details of announcement here. For example: service updates, new features, or key operational news.]

Key Highlights:
• Effective Date: {today}
• Details: Please review our latest notices or contact the operations desk for clarification.
• Support: Our team is available 24/7 to assist with any questions.

Thank you for your continued partnership with AIE Skyline.

${COMPANY_SIGNATURE}`,
    channel: 'both',
  },
  {
    id: 'default_holiday_hours',
    name: 'Holiday Operating Hours & Service Schedule',
    category: 'Group Messaging',
    subjectTemplate: 'Office & Fleet Services Schedule - {today}',
    bodyTemplate: `Dear {customer_name},

Please take note of our upcoming adjusted opening hours and emergency contact schedule:

📅 Operations Schedule:
• Monday – Friday: Standard operating hours (09:00 - 18:00)
• Weekends & Bank Holidays: Emergency & recovery breakdown services remain operational 24/7.

📞 In Case of Urgent Breakdown or Assistance:
• 24/7 Hotline: 020 8050 5337
• WhatsApp Duty Manager: 07552 553441

We appreciate your cooperation.

${COMPANY_SIGNATURE}`,
    channel: 'both',
  },
  {
    id: 'default_policy_update',
    name: 'Fleet Safety & Document Compliance Notice',
    category: 'Group Messaging',
    subjectTemplate: 'Important Compliance & Safety Notice for {customer_name}',
    bodyTemplate: `Dear {customer_name},

This is a mandatory safety and compliance reminder from AIE Skyline Operations.

Please ensure all driver documents, valid permits, and vehicle safety checks are up-to-date. If you have recently renewed your driving licence, private hire badge, or insurance certificates, please upload or email a copy to our administrative desk.

Required checks:
1. Valid Driving Licence & Badge
2. Proof of Address / Bill copy
3. Vehicle MOT & Safety checklist

Failure to maintain updated documentation may affect vehicle allocation and insurance status.

${COMPANY_SIGNATURE}`,
    channel: 'both',
  },
  {
    id: 'default_claims_update',
    name: 'Claims Department Bulletin',
    category: 'Group Messaging',
    subjectTemplate: 'AIE Claims Advisory & Important Information',
    bodyTemplate: `Dear {customer_name},

This is an informative update from the AIE Claims Department regarding your claim representation and current accident reporting protocols.

If you have experienced an incident or have pending evidence (photos, dashcam footage, engineer reports, or witness details), please forward them to our claims handlers at claims@aieclaims.co.uk.

For ongoing claims, our legal and file handlers continue to actively pursue recovery on your behalf.

${COMPANY_SIGNATURE}`,
    channel: 'both',
  },
  {
    id: 'default_general_broadcast',
    name: 'General Broadcast Notice',
    category: 'Group Messaging',
    subjectTemplate: 'Notice from AIE Skyline to {company_name}',
    bodyTemplate: `Dear {customer_name},

We hope this message finds you well.

This is a general advisory for all account holders and partners.

[Please enter your message text here...]

If you have any questions or require support, please do not hesitate to reply directly to this message or contact our office.

${COMPANY_SIGNATURE}`,
    channel: 'both',
  },
];

export const AVAILABLE_PLACEHOLDERS = [
  { tag: '{customer_name}', desc: 'Full name or company name' },
  { tag: '{first_name}', desc: 'Recipient first name' },
  { tag: '{company_name}', desc: 'Company or account name' },
  { tag: '{email}', desc: 'Recipient email address' },
  { tag: '{mobile}', desc: 'Recipient mobile phone' },
  { tag: '{category}', desc: 'Recipient group (Member / Company / Claim)' },
  { tag: '{today}', desc: 'Today’s date (e.g. 20 Sep 2026)' },
  { tag: '{date}', desc: 'Formatted current date' },
];

/**
 * Replace placeholders in template text using recipient info
 */
export function replaceGroupPlaceholders(
  text: string,
  recipient: Partial<MessagingRecipient>,
  attachment?: MessagingAttachment | null
): string {
  if (!text) return '';

  const todayStr = format(new Date(), 'dd MMM yyyy');
  const firstName =
    recipient.firstName ||
    (recipient.name ? recipient.name.split(' ')[0] : 'Valued Customer');
  const companyOrName = recipient.companyName || recipient.name || 'Account';

  let resolved = text
    .replace(/\{customer_name\}/gi, recipient.name || 'Valued Customer')
    .replace(/\{name\}/gi, recipient.name || 'Valued Customer')
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{company_name\}/gi, companyOrName)
    .replace(/\{email\}/gi, recipient.email || '')
    .replace(/\{mobile\}/gi, recipient.phone || '')
    .replace(/\{phone\}/gi, recipient.phone || '')
    .replace(/\{category\}/gi, recipient.category || 'Member')
    .replace(/\{today\}/gi, todayStr)
    .replace(/\{date\}/gi, todayStr);

  // If there is an attachment and it is not already in text, append nicely
  if (attachment?.url && !resolved.includes(attachment.url)) {
    resolved += `\n\n📎 Attached Document / Media:\n${attachment.name} (${attachment.url})`;
  }

  return resolved;
}

/**
 * Extract distinct recipients from customer records and claim records
 */
export function extractRecipients(
  customers: Customer[],
  claims: Claim[] = []
): MessagingRecipient[] {
  const result: MessagingRecipient[] = [];
  const seenKeys = new Set<string>();

  // Process Customers
  customers.forEach((c) => {
    let cat: 'members' | 'companies' | 'claims' = 'members';
    if (c.type === 'company') {
      cat = 'companies';
    } else if (c.type === 'claim') {
      cat = 'claims';
    } else {
      cat = 'members';
    }

    const name = c.name?.trim() || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Valued Customer';
    const email = (c.email || '').trim().toLowerCase();
    const phone = (c.mobile || '').trim();

    const dedupeKey = `${cat}_${email}_${formatWhatsAppNumber(phone)}_${name.toLowerCase()}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      result.push({
        id: c.id,
        name,
        firstName: c.firstName || name.split(' ')[0],
        email,
        phone,
        category: cat,
        companyName: c.type === 'company' ? name : undefined,
        source: 'customer',
        accountStatus: c.status || 'active',
      });
    }
  });

  // Also include distinct submitters / claimants from Claims
  claims.forEach((cl) => {
    const submitter = cl.submitter;
    if (submitter?.fullName) {
      const email = (submitter.email || '').trim().toLowerCase();
      const phone = (submitter.contactNumber || '').trim();
      const name = submitter.fullName.trim();
      const cat = submitter.type === 'company' ? 'companies' : 'claims';
      const dedupeKey = `${cat}_${email}_${formatWhatsAppNumber(phone)}_${name.toLowerCase()}`;

      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        result.push({
          id: `claim_${cl.id}_sub`,
          name,
          firstName: name.split(' ')[0],
          email,
          phone,
          category: cat,
          companyName: submitter.companyName || (cat === 'companies' ? name : undefined),
          source: 'claim',
          accountStatus: 'active',
        });
      }
    }
  });

  return result;
}

/**
 * Filter recipients by selected category
 */
export function filterRecipientsByCategory(
  recipients: MessagingRecipient[],
  category: RecipientCategory
): MessagingRecipient[] {
  if (category === 'all') return recipients;
  return recipients.filter((r) => r.category === category);
}

/**
 * Fetch all templates from Firestore and merge with defaults
 */
export async function fetchGlobalTemplates(): Promise<GlobalMessageTemplate[]> {
  const list: GlobalMessageTemplate[] = [...DEFAULT_TEMPLATES];
  const seenIds = new Set(list.map((t) => t.id));

  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const cat = data.category || 'Group Messaging';
      // Include any template under Group Messaging, News Flash, Bulk Email, or custom
      const isRelevant =
        cat.toLowerCase().includes('group') ||
        cat.toLowerCase().includes('news') ||
        cat.toLowerCase().includes('customer') ||
        cat.toLowerCase().includes('broadcast') ||
        cat === 'Bulk Email' ||
        cat === 'custom' ||
        data.isGlobalTemplate === true;

      if (isRelevant && !seenIds.has(docSnap.id)) {
        seenIds.add(docSnap.id);
        list.push({
          id: docSnap.id,
          name: data.name || 'Untitled Template',
          subjectTemplate: data.subjectTemplate || data.subject || '',
          bodyTemplate: data.bodyTemplate || data.body || '',
          category: data.category || 'Group Messaging',
          channel: data.channel || 'both',
          isCustom: true,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        });
      }
    });
  } catch (err) {
    console.error('Failed to fetch message templates from Firestore:', err);
  }

  return list;
}

/**
 * Save or update a template into Firestore 'messageTemplates'
 */
export async function saveGlobalTemplate(params: {
  id?: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  category?: string;
  saveAsNew?: boolean;
}): Promise<string> {
  const category = params.category || 'Group Messaging';
  const data = {
    name: params.name.trim(),
    subjectTemplate: params.subjectTemplate.trim(),
    bodyTemplate: params.bodyTemplate.trim(),
    category,
    isGlobalTemplate: true,
    isCustom: true,
    updatedAt: serverTimestamp(),
  };

  if (params.id && !params.saveAsNew && !params.id.startsWith('default_')) {
    await setDoc(doc(db, 'messageTemplates', params.id), data, { merge: true });
    return params.id;
  } else {
    const docRef = await addDoc(collection(db, 'messageTemplates'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
}

/**
 * Upload a media or document file to Firebase Storage
 */
export async function uploadMessagingAttachment(file: File): Promise<MessagingAttachment> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `group_messaging/attachments/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const url = await getDownloadURL(snapshot.ref);

  return {
    id: `att_${Date.now()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    url,
    storagePath: path,
    uploadedAt: new Date(),
  };
}

/**
 * Execute Bulk Email Dispatch
 */
export async function dispatchBulkEmail(params: {
  recipients: MessagingRecipient[];
  subjectTemplate: string;
  bodyTemplate: string;
  attachment?: MessagingAttachment | null;
  templateId?: string;
  onProgress?: (completed: number, successful: number, failed: number) => void;
}): Promise<{ successful: number; failed: number; errors: Array<{ recipientName: string; error: string }> }> {
  let successful = 0;
  let failed = 0;
  const errors: Array<{ recipientName: string; error: string }> = [];

  for (let i = 0; i < params.recipients.length; i++) {
    const recipient = params.recipients[i];
    if (!recipient.email || !recipient.email.includes('@')) {
      failed++;
      errors.push({ recipientName: recipient.name, error: 'No valid email address' });
      params.onProgress?.(i + 1, successful, failed);
      continue;
    }

    try {
      const personalizedSubject = replaceGroupPlaceholders(params.subjectTemplate, recipient, params.attachment);
      const personalizedBody = replaceGroupPlaceholders(params.bodyTemplate, recipient, params.attachment);

      await sendEmail({
        to_email: recipient.email,
        to_name: recipient.name,
        subject: personalizedSubject,
        message: personalizedBody,
        reply_to: 'admin@aieskyline.co.uk',
        from_email: 'admin@aieskyline.co.uk',
        from_name: 'AIE Skyline Fleet System',
        source_page: 'group_messaging',
        attachments: params.attachment?.url ? [params.attachment.url] : undefined,
      });

      successful++;
    } catch (err: any) {
      console.error(`Email dispatch error for ${recipient.email}:`, err);
      failed++;
      errors.push({ recipientName: recipient.name, error: err.message || 'Send error' });
    }

    params.onProgress?.(i + 1, successful, failed);

    // Prevent aggressive burst rate limiting
    if (i < params.recipients.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // Log summary to email history
  try {
    await logEmailHistory({
      sentBy: 'System Admin (Group Messaging)',
      type: 'Bulk Email',
      templateId: params.templateId || 'group_news_flash',
      recipients: params.recipients.map((r) => r.id),
      timestamp: new Date(),
      subject: params.subjectTemplate,
    });
  } catch (logErr) {
    console.warn('Failed to log email history:', logErr);
  }

  return { successful, failed, errors };
}

/**
 * Open single WhatsApp chat with prepared text and attachment link
 */
export function openWhatsAppChat(params: {
  recipient: MessagingRecipient;
  subjectTemplate: string;
  bodyTemplate: string;
  attachment?: MessagingAttachment | null;
  templateId?: string;
}): boolean {
  const digits = formatWhatsAppNumber(params.recipient.phone);
  if (!digits) {
    return false;
  }

  const personalizedSubject = replaceGroupPlaceholders(params.subjectTemplate, params.recipient);
  let personalizedBody = replaceGroupPlaceholders(params.bodyTemplate, params.recipient);

  // If attachment exists, include prominent download/media link in WhatsApp message
  if (params.attachment?.url && !personalizedBody.includes(params.attachment.url)) {
    const isImage = params.attachment.type.startsWith('image/');
    const icon = isImage ? '🖼️' : '📄';
    personalizedBody += `\n\n${icon} *Attachment (${params.attachment.name}):*\n${params.attachment.url}`;
  }

  const fullMessage = personalizedSubject
    ? `*${personalizedSubject}*\n\n${personalizedBody}`
    : personalizedBody;

  const url = buildWaMeLink(digits, fullMessage);
  window.open(url, '_blank', 'noopener,noreferrer');

  // Log single dispatch
  logWhatsappHistory({
    sentBy: 'Admin (Group Messaging)',
    type: 'custom',
    templateId: params.templateId || 'group_news_flash',
    recipients: [params.recipient.id],
    subject: personalizedSubject || 'Group WhatsApp Message',
    body: fullMessage,
    timestamp: new Date(),
  }).catch((err) => console.warn('Failed to log whatsapp history:', err));

  return true;
}
