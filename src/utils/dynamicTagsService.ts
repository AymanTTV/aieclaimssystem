// src/utils/dynamicTagsService.ts
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { DynamicTag } from '../types/dynamicTags';

// Built-in system parameter tags
export const SYSTEM_DYNAMIC_TAGS: DynamicTag[] = [
  {
    id: 'sys_customer_name',
    tag: '{customer_name}',
    label: 'Customer Full Name',
    category: 'global',
    description: 'Full name or company name of the recipient',
    sampleValue: 'John Doe',
    isSystem: true,
  },
  {
    id: 'sys_first_name',
    tag: '{first_name}',
    label: 'Recipient First Name',
    category: 'global',
    description: 'First name derived from recipient name',
    sampleValue: 'John',
    isSystem: true,
  },
  {
    id: 'sys_company_name',
    tag: '{company_name}',
    label: 'Company Name',
    category: 'global',
    description: 'Registered organization or trade name',
    sampleValue: 'Skyline Enterprises Ltd',
    isSystem: true,
  },
  {
    id: 'sys_email',
    tag: '{email}',
    label: 'Email Address',
    category: 'global',
    description: 'Recipient primary email contact',
    sampleValue: 'john.doe@example.com',
    isSystem: true,
  },
  {
    id: 'sys_mobile',
    tag: '{mobile}',
    label: 'Mobile / WhatsApp Phone',
    category: 'global',
    description: 'Mobile telephone number',
    sampleValue: '07552 553441',
    isSystem: true,
  },
  {
    id: 'sys_category',
    tag: '{category}',
    label: 'Recipient Category',
    category: 'global',
    description: 'Target segment (Member, Company, or Claim)',
    sampleValue: 'Member',
    isSystem: true,
  },
  {
    id: 'sys_today',
    tag: '{today}',
    label: "Today's Date",
    category: 'global',
    description: 'Current formatted date (e.g. 24 Sep 2026)',
    sampleValue: format(new Date(), 'dd MMM yyyy'),
    isSystem: true,
  },
  {
    id: 'sys_date',
    tag: '{date}',
    label: 'Current Standard Date',
    category: 'global',
    description: 'Numeric date format (DD/MM/YYYY)',
    sampleValue: format(new Date(), 'dd/MM/yyyy'),
    isSystem: true,
  },
  {
    id: 'sys_vehicle_reg',
    tag: '{vehicle_reg}',
    label: 'Vehicle VRM Reg',
    category: 'vehicle',
    description: 'Vehicle registration plate number',
    sampleValue: 'BD18 XYZ',
    isSystem: true,
  },
  {
    id: 'sys_make_model',
    tag: '{make_model}',
    label: 'Vehicle Make & Model',
    category: 'vehicle',
    description: 'Vehicle manufacturer and specification',
    sampleValue: 'Toyota Prius Hybrid',
    isSystem: true,
  },
  {
    id: 'sys_service_type',
    tag: '{service_type}',
    label: 'Service Type',
    category: 'maintenance',
    description: 'Maintenance or repair description',
    sampleValue: 'Full Service & Brake Inspection',
    isSystem: true,
  },
  {
    id: 'sys_scheduled_date',
    tag: '{scheduled_date}',
    label: 'Scheduled Booking Date',
    category: 'maintenance',
    description: 'Workshop reservation date',
    sampleValue: format(new Date(), 'dd/MM/yyyy'),
    isSystem: true,
  },
];

const LOCAL_STORAGE_CUSTOM_TAGS = 'aie_custom_dynamic_tags_v1';

/**
 * Fetch all dynamic tags (system + Firestore custom tags)
 */
export async function fetchAllDynamicTags(): Promise<DynamicTag[]> {
  const tagsMap = new Map<string, DynamicTag>();

  // 1. Seed system tags
  SYSTEM_DYNAMIC_TAGS.forEach((tag) => tagsMap.set(tag.tag.toLowerCase(), tag));

  // 2. Fetch custom tags from Firestore
  try {
    const snap = await getDocs(collection(db, 'dynamicTags'));
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data && data.tag) {
        const normalizedKey = data.tag.toLowerCase();
        tagsMap.set(normalizedKey, {
          id: d.id,
          tag: data.tag.startsWith('{') ? data.tag : `{${data.tag}}`,
          label: data.label || data.tag,
          category: data.category || 'custom',
          description: data.description || '',
          sampleValue: data.sampleValue || 'Sample',
          isCustom: true,
          isSystem: false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });
  } catch (err) {
    console.warn('[dynamicTagsService] Could not fetch Firestore tags, checking fallback cache:', err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TAGS);
      if (cached) {
        const parsed: DynamicTag[] = JSON.parse(cached);
        parsed.forEach((t) => tagsMap.set(t.tag.toLowerCase(), t));
      }
    } catch {}
  }

  return Array.from(tagsMap.values());
}

/**
 * Real-time listener for dynamic tags
 */
export function subscribeToDynamicTags(onUpdate: (tags: DynamicTag[]) => void): () => void {
  const colRef = collection(db, 'dynamicTags');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const tagsMap = new Map<string, DynamicTag>();
      SYSTEM_DYNAMIC_TAGS.forEach((tag) => tagsMap.set(tag.tag.toLowerCase(), tag));

      const customTagsList: DynamicTag[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data() as any;
        if (data && data.tag) {
          const item: DynamicTag = {
            id: d.id,
            tag: data.tag.startsWith('{') ? data.tag : `{${data.tag}}`,
            label: data.label || data.tag,
            category: data.category || 'custom',
            description: data.description || '',
            sampleValue: data.sampleValue || 'Sample',
            isCustom: true,
            isSystem: false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          tagsMap.set(item.tag.toLowerCase(), item);
          customTagsList.push(item);
        }
      });

      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_TAGS, JSON.stringify(customTagsList));
      } catch {}

      onUpdate(Array.from(tagsMap.values()));
    },
    (err) => {
      console.warn('[dynamicTagsService] Snapshot error:', err);
      // Fallback to fetch
      fetchAllDynamicTags().then(onUpdate);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a dynamic tag in Firestore
 */
export async function saveDynamicTag(tagData: {
  id?: string;
  tag: string;
  label: string;
  category?: string;
  description?: string;
  sampleValue?: string;
}): Promise<DynamicTag> {
  let cleanTag = tagData.tag.trim();
  if (!cleanTag.startsWith('{')) cleanTag = `{${cleanTag}`;
  if (!cleanTag.endsWith('}')) cleanTag = `${cleanTag}}`;

  const docId = tagData.id || `tag_${cleanTag.replace(/[^a-zA-Z0-9_]/g, '')}_${Date.now()}`;

  const payload: DynamicTag = {
    id: docId,
    tag: cleanTag,
    label: tagData.label.trim(),
    category: tagData.category || 'custom',
    description: tagData.description?.trim() || '',
    sampleValue: tagData.sampleValue?.trim() || 'Sample Value',
    isCustom: true,
    isSystem: false,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'dynamicTags', docId), payload, { merge: true });

  // Broadcast window event for instant local sync across components
  window.dispatchEvent(new CustomEvent('dynamic_tags_updated', { detail: payload }));

  return payload;
}

/**
 * Delete a dynamic tag from Firestore
 */
export async function deleteDynamicTag(tagId: string): Promise<void> {
  if (!tagId) return;
  await deleteDoc(doc(db, 'dynamicTags', tagId));
  window.dispatchEvent(new CustomEvent('dynamic_tags_updated', { detail: { id: tagId, deleted: true } }));
}

/**
 * Substitutes dynamic tags in text using recipient data and known tags dictionary
 */
export function substituteDynamicTags(
  text: string,
  recipient?: {
    name?: string;
    firstName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    category?: string;
    [key: string]: any;
  } | null,
  tagsDictionary: DynamicTag[] = SYSTEM_DYNAMIC_TAGS
): string {
  if (!text) return '';

  const now = new Date();
  const todayStr = format(now, 'dd MMM yyyy');
  const dateStr = format(now, 'dd/MM/yyyy');

  const fullName = recipient?.name || 'Valued Customer';
  const firstName = recipient?.firstName || (recipient?.name ? recipient.name.split(' ')[0] : 'Customer');
  const companyName = recipient?.companyName || (recipient?.category === 'companies' ? recipient?.name : 'AIE Partner');
  const email = recipient?.email || 'customer@example.com';
  const mobile = recipient?.phone || '07552 553441';
  const category = recipient?.category 
    ? (recipient.category === 'members' ? 'Member' : recipient.category === 'companies' ? 'Company' : 'Claim')
    : 'Member';

  let rendered = text
    .replace(/\{customer_name\}/gi, fullName)
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{company_name\}/gi, companyName)
    .replace(/\{email\}/gi, email)
    .replace(/\{customer_email\}/gi, email)
    .replace(/\{mobile\}/gi, mobile)
    .replace(/\{phone\}/gi, mobile)
    .replace(/\{customer_phone\}/gi, mobile)
    .replace(/\{category\}/gi, category)
    .replace(/\{today\}/gi, todayStr)
    .replace(/\{today_date\}/gi, todayStr)
    .replace(/\{date\}/gi, dateStr);

  // Substitute any custom dynamic tags found in dictionary
  tagsDictionary.forEach((customTag) => {
    if (customTag.tag) {
      const sample = recipient && recipient[customTag.label] 
        ? String(recipient[customTag.label]) 
        : customTag.sampleValue || 'Sample';
      const escaped = customTag.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rendered = rendered.replace(new RegExp(escaped, 'gi'), sample);
    }
  });

  return rendered;
}
