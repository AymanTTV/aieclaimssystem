// src/utils/templateManager.ts
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { emailTemplates, EmailType } from '../constants/emailTemplates';

export interface AppMessageTemplate {
  id: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
  channel?: 'all' | 'whatsapp' | 'email';
  isDeleted?: boolean;
  isSystem?: boolean;
  requiredFields?: string[];
  updatedAt?: any;
  createdAt?: any;
}

const LOCAL_STORAGE_DELETED_KEY = 'aie_deleted_template_ids_v1';
const TEMPLATE_CONFIG_DOC = 'template_config';

/**
 * In-memory cache of deleted template IDs for fast synchronous lookups
 */
let cachedDeletedIds: Set<string> | null = null;

/**
 * Get the set of deleted template IDs from localStorage and Firestore
 */
export async function getDeletedTemplateIds(): Promise<Set<string>> {
  if (cachedDeletedIds) {
    return cachedDeletedIds;
  }

  const ids = new Set<string>();

  // 1. Read from localStorage for instant offline/fast availability
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => ids.add(id));
      }
    }
  } catch (err) {
    console.warn('[templateManager] Error reading deleted IDs from localStorage:', err);
  }

  // 2. Read from Firestore system_settings/template_config
  try {
    const configSnap = await getDoc(doc(db, 'system_settings', TEMPLATE_CONFIG_DOC));
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (Array.isArray(data?.deletedIds)) {
        data.deletedIds.forEach((id: string) => ids.add(id));
      }
    }
  } catch (err) {
    console.warn('[templateManager] Error reading deleted IDs from Firestore:', err);
  }

  cachedDeletedIds = ids;
  return ids;
}

/**
 * Synchronous check if a template ID is known to be deleted
 */
export function isTemplateDeletedSync(id: string): boolean {
  if (!id) return false;
  if (cachedDeletedIds && cachedDeletedIds.has(id)) {
    return true;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.includes(id)) {
        if (!cachedDeletedIds) cachedDeletedIds = new Set(parsed);
        else cachedDeletedIds.add(id);
        return true;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return false;
}

/**
 * Persist a template ID as deleted permanently across Firestore and localStorage
 */
export async function markTemplateAsDeleted(templateId: string, category?: string): Promise<void> {
  if (!templateId) return;

  const deletedIds = await getDeletedTemplateIds();
  deletedIds.add(templateId);
  cachedDeletedIds = deletedIds;

  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(deletedIds)));
  } catch (e) {
    console.warn('[templateManager] localStorage save error:', e);
  }

  // 2. Mark as isDeleted: true in Firestore `messageTemplates/{templateId}`
  try {
    await setDoc(
      doc(db, 'messageTemplates', templateId),
      {
        id: templateId,
        category: category || 'custom',
        isDeleted: true,
        deleted: true,
        deletedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[templateManager] Error marking doc as deleted in Firestore:', err);
  }

  // 3. Save to `system_settings/template_config`
  try {
    await setDoc(
      doc(db, 'system_settings', TEMPLATE_CONFIG_DOC),
      {
        deletedIds: Array.from(deletedIds),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[templateManager] Error updating deletedIds in system_settings:', err);
  }

  // 4. Dispatch a custom window event so all open pages/modals refresh instantly
  window.dispatchEvent(new CustomEvent('template_deleted', { detail: { templateId, category } }));
}

/**
 * Save or update a template into Firestore `messageTemplates`
 */
export async function saveAppTemplate(template: {
  id?: string;
  name: string;
  category: string;
  subjectTemplate: string;
  bodyTemplate: string;
  channel?: 'all' | 'whatsapp' | 'email';
  requiredFields?: string[];
}): Promise<AppMessageTemplate> {
  const finalId = template.id || `${template.category || 'custom'}_custom_${Date.now()}`;

  const payload: AppMessageTemplate = {
    id: finalId,
    name: template.name.trim() || 'Untitled Template',
    category: template.category || 'custom',
    subjectTemplate: template.subjectTemplate || '',
    bodyTemplate: template.bodyTemplate || '',
    channel: template.channel || 'all',
    requiredFields: template.requiredFields || [],
    isDeleted: false,
    updatedAt: new Date().toISOString(),
  };

  // 1. If it was previously marked deleted, unmark it
  const deletedIds = await getDeletedTemplateIds();
  if (deletedIds.has(finalId)) {
    deletedIds.delete(finalId);
    cachedDeletedIds = deletedIds;
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(deletedIds)));
      await setDoc(
        doc(db, 'system_settings', TEMPLATE_CONFIG_DOC),
        {
          deletedIds: Array.from(deletedIds),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[templateManager] Error removing from deletedIds:', err);
    }
  }

  // 2. Save document to Firestore
  await setDoc(
    doc(db, 'messageTemplates', finalId),
    {
      ...payload,
      isDeleted: false,
      deleted: false,
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 3. Dispatch window event
  window.dispatchEvent(new CustomEvent('template_saved', { detail: payload }));

  return payload;
}

/**
 * Fetch all active templates for a given category (or all categories),
 * cleanly merging Firestore customizations with default templates,
 * and strictly omitting any deleted templates.
 */
export async function loadTemplatesForCategory(category?: string): Promise<AppMessageTemplate[]> {
  const deletedIds = await getDeletedTemplateIds();
  const templatesMap = new Map<string, AppMessageTemplate>();

  // 1. First, seed in built-in default templates from constants/emailTemplates (unless marked deleted)
  const categoriesToCheck = category && category !== 'all' 
    ? [category as EmailType] 
    : (Object.keys(emailTemplates) as EmailType[]);

  for (const cat of categoriesToCheck) {
    const list = emailTemplates[cat] || [];
    for (const tpl of list) {
      if (!deletedIds.has(tpl.id)) {
        templatesMap.set(tpl.id, {
          id: tpl.id,
          name: tpl.name,
          category: cat,
          subjectTemplate: tpl.subjectTemplate,
          bodyTemplate: tpl.bodyTemplate,
          channel: 'all',
          isSystem: true,
          isDeleted: false,
          requiredFields: tpl.requiredFields || [],
        });
      }
    }
  }

  // 2. Fetch live templates from Firestore `messageTemplates`
  try {
    const snap = await getDocs(collection(db, 'messageTemplates'));
    if (!snap.empty) {
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const id = d.id;

        // Skip if explicitly marked deleted in Firestore or deletedIds
        if (data.isDeleted === true || data.deleted === true || deletedIds.has(id)) {
          templatesMap.delete(id);
          return;
        }

        const tCategory = (data.category || 'custom').trim();
        // If category filter applied, check match (case-insensitive)
        if (category && category !== 'all' && tCategory.toLowerCase() !== category.toLowerCase()) {
          return;
        }

        // Overwrite or add live version from Firestore
        templatesMap.set(id, {
          id,
          name: data.name || 'Untitled Template',
          category: tCategory,
          subjectTemplate: data.subjectTemplate || data.subject || '',
          bodyTemplate: data.bodyTemplate || data.body || '',
          channel: data.channel || 'all',
          isSystem: false,
          isDeleted: false,
          requiredFields: data.requiredFields || [],
          updatedAt: data.updatedAt,
        });
      });
    }
  } catch (err) {
    console.error('[templateManager] Error loading messageTemplates from Firestore:', err);
  }

  return Array.from(templatesMap.values());
}

/**
 * Categorized template placeholder tags definition for easy insertion & user reference
 */
export interface TemplatePlaceholderTag {
  tag: string;
  label: string;
  description: string;
  sample: string;
  category: 'recipient' | 'vehicle' | 'finance' | 'rental' | 'maintenance' | 'claim' | 'invoice' | 'general';
}

export const TEMPLATE_AVAILABLE_TAGS: TemplatePlaceholderTag[] = [
  // Recipient / Customer
  { tag: '[Recipient Name]', label: 'Recipient Name', description: 'Full customer or driver name', sample: 'John Doe', category: 'recipient' },
  { tag: '[Customer Name]', label: 'Customer Name', description: 'Name of the hiring client or company', sample: 'Acme Corp / John Doe', category: 'recipient' },
  { tag: '[Driver Name]', label: 'Driver Name', description: 'Assigned driver full name', sample: 'John Doe', category: 'recipient' },
  { tag: '[Phone]', label: 'Phone Number', description: 'Customer or contact telephone', sample: '07123 456789', category: 'recipient' },
  { tag: '[Email]', label: 'Email Address', description: 'Customer email address', sample: 'customer@example.com', category: 'recipient' },

  // Vehicle
  { tag: '[Vehicle Reg]', label: 'Vehicle Reg (VRM)', description: 'License plate registration number', sample: 'BD18 XYZ', category: 'vehicle' },
  { tag: '[Vehicle Make]', label: 'Vehicle Make', description: 'Vehicle manufacturer', sample: 'Toyota', category: 'vehicle' },
  { tag: '[Vehicle Model]', label: 'Vehicle Model', description: 'Model specification', sample: 'Prius Hybrid', category: 'vehicle' },
  { tag: '[Vehicle Year]', label: 'Vehicle Year', description: 'Year of registration', sample: '2023', category: 'vehicle' },
  { tag: '[Mileage]', label: 'Current Mileage', description: 'Odometer mileage reading', sample: '45,200', category: 'vehicle' },

  // Finance / Payments
  { tag: '[Amount Paid]', label: 'Amount Paid', description: 'Payment amount received', sample: '£150.00', category: 'finance' },
  { tag: '[Amount]', label: 'General Amount', description: 'Transaction or outstanding value', sample: '£250.00', category: 'finance' },
  { tag: '[New Balance]', label: 'Remaining Balance', description: 'Outstanding balance owing on account', sample: '£100.00', category: 'finance' },
  { tag: '[Total Amount]', label: 'Total Amount', description: 'Total charge or invoice sum', sample: '£450.00', category: 'finance' },
  { tag: '[Date Received]', label: 'Date Received', description: 'Date transaction was booked', sample: '23/09/2026', category: 'finance' },
  { tag: '[Bank Reference]', label: 'Payment Reference', description: 'Bank transfer payment reference', sample: 'BD18XYZ', category: 'finance' },
  { tag: '[Due Date]', label: 'Due Date', description: 'Payment due deadline date', sample: '30/09/2026', category: 'finance' },

  // Rental
  { tag: '[Rental Agreement Number]', label: 'Agreement Number', description: 'Rental contract reference code', sample: 'AGR-7821', category: 'rental' },
  { tag: '[Rental Start Date]', label: 'Start Date', description: 'Hire agreement start date', sample: '01/09/2026', category: 'rental' },
  { tag: '[Rental End Date]', label: 'End / Return Date', description: 'Agreed rental conclusion date', sample: '30/09/2026', category: 'rental' },
  { tag: '[Rental Rate]', label: 'Weekly / Daily Rate', description: 'Rental tariff rate', sample: '£200 / week', category: 'rental' },

  // Maintenance
  { tag: '[Job Number]', label: 'Job Number', description: 'Workshop service job reference', sample: 'JOB-9402', category: 'maintenance' },
  { tag: '[Maintenance Type]', label: 'Service Type', description: 'Type of repair or MOT', sample: 'Full Service & Brake Pads', category: 'maintenance' },
  { tag: '[Service Provider]', label: 'Garage / Workshop', description: 'Name of the service workshop', sample: 'Apex Auto Centre', category: 'maintenance' },
  { tag: '[Scheduled Date]', label: 'Scheduled Date', description: 'Workshop booking date & time', sample: '25/09/2026 10:00', category: 'maintenance' },

  // Invoice
  { tag: '[Invoice Number]', label: 'Invoice Number', description: 'Tax or rental invoice ID', sample: 'INV-2026-081', category: 'invoice' },
  { tag: '[Invoice Date]', label: 'Invoice Date', description: 'Date invoice was issued', sample: '20/09/2026', category: 'invoice' },

  // Claims
  { tag: '[Claim Reference]', label: 'Claim Reference', description: 'Insurance claim reference ID', sample: 'CLM-5591', category: 'claim' },
  { tag: '[Accident Date]', label: 'Accident Date', description: 'Date incident occurred', sample: '15/09/2026', category: 'claim' },

  // General
  { tag: "[Today's Date]", label: "Today's Date", description: 'Current calendar date', sample: '23/09/2026', category: 'general' },
];
