// src/utils/dynamicTermsService.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  DynamicTermTemplate,
  TermTemplateVersion,
  DEFAULT_DYNAMIC_TERMS_TEMPLATES,
} from './documentTemplateTerms';
import { removeUndefined } from './firestoreSanitize';

/**
 * Fetches the latest dynamic T&C templates from Firestore with fallback to presets
 */
export async function fetchLatestDynamicTermTemplates(): Promise<DynamicTermTemplate[]> {
  try {
    const docRef = doc(db, 'companySettings', 'details');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data?.dynamicTermsTemplates)) {
        return data.dynamicTermsTemplates;
      }
    }
  } catch (err) {
    console.error('[dynamicTermsService] Error fetching templates:', err);
  }
  return DEFAULT_DYNAMIC_TERMS_TEMPLATES;
}

/**
 * Saves a new or updated dynamic T&C template to Firestore with version tracking,
 * dispatches a local event for instant live refresh, and returns the updated template list.
 */
export async function saveOrUpdateTermTemplate(
  template: Partial<DynamicTermTemplate> & { name: string; title: string; content: string },
  changeNote?: string,
  user?: any
): Promise<{ updatedTemplates: DynamicTermTemplate[]; savedTemplate: DynamicTermTemplate; isNew: boolean }> {
  // 1. Fetch current list
  const currentTemplates = await fetchLatestDynamicTermTemplates();
  const existingIndex = currentTemplates.findIndex((t) => t.id === template.id);
  const existing = existingIndex >= 0 ? currentTemplates[existingIndex] : null;
  const isNew = !existing;

  const authorName = user?.displayName || user?.name || user?.email || 'Manager';
  const authorEmail = user?.email || '';
  const now = new Date().toISOString();

  let targetVersion = existing?.version || 1;
  let targetHistory: TermTemplateVersion[] = Array.isArray(existing?.versionHistory)
    ? [...existing.versionHistory]
    : [];

  if (existing) {
    // Check if content, title, or routing parameters changed
    const hasChanges =
      existing.content !== template.content ||
      existing.title !== template.title ||
      existing.name !== template.name ||
      existing.documentScope !== template.documentScope ||
      existing.specificDocType !== template.specificDocType ||
      existing.hireType !== template.hireType ||
      existing.targetPagePosition !== template.targetPagePosition ||
      existing.statusTrigger !== template.statusTrigger;

    if (hasChanges) {
      // Archive current version into history
      targetHistory.unshift({
        versionId: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        versionNumber: existing.version || 1,
        timestamp: existing.updatedAt || now,
        authorName: existing.updatedBy || authorName,
        authorEmail: authorEmail,
        changeNote: changeNote?.trim() || `Revision v${(existing.version || 1) + 1} updated from document editor`,
        name: existing.name,
        title: existing.title,
        content: existing.content,
        documentScope: existing.documentScope,
        specificDocType: existing.specificDocType || 'all_page_docs',
        hireType: existing.hireType,
        targetPagePosition: existing.targetPagePosition,
        customPageNumber: existing.customPageNumber,
        statusTrigger: existing.statusTrigger,
        isActive: existing.isActive,
      });

      targetVersion = (existing.version || 1) + 1;
    }
  } else {
    // Initial version
    targetVersion = 1;
    targetHistory = [
      {
        versionId: `ver_init_${Date.now()}`,
        versionNumber: 1,
        timestamp: now,
        authorName,
        authorEmail,
        changeNote: changeNote?.trim() || 'Initial creation via Document Contextual T&C Manager',
        name: template.name,
        title: template.title,
        content: template.content,
        documentScope: template.documentScope || 'all',
        specificDocType: template.specificDocType || 'all_page_docs',
        hireType: template.hireType || 'all',
        targetPagePosition: template.targetPagePosition || 'page_3_terms',
        customPageNumber: template.customPageNumber,
        statusTrigger: template.statusTrigger || 'any',
        isActive: template.isActive ?? true,
      },
    ];
  }

  const finalSavedTemplate: DynamicTermTemplate = {
    id: template.id || `dtmpl_custom_${Date.now()}`,
    name: template.name.trim(),
    title: template.title.trim(),
    documentScope: template.documentScope || 'all',
    specificDocType: template.specificDocType || 'all_page_docs',
    hireType: template.hireType || 'all',
    targetPagePosition: template.targetPagePosition || 'page_3_terms',
    customPageNumber: template.customPageNumber,
    statusTrigger: template.statusTrigger || 'any',
    content: template.content.trim(),
    isActive: template.isActive ?? true,
    priority: template.priority ?? 10,
    category: template.category || 'Contextual Terms',
    version: targetVersion,
    versionHistory: targetHistory,
    updatedAt: now,
    updatedBy: authorName,
  };

  let updatedTemplates: DynamicTermTemplate[];
  if (existingIndex >= 0) {
    updatedTemplates = [...currentTemplates];
    updatedTemplates[existingIndex] = finalSavedTemplate;
  } else {
    updatedTemplates = [finalSavedTemplate, ...currentTemplates];
  }

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'companySettings', 'details');
    const cleanedTemplates = removeUndefined(updatedTemplates);
    const cleanedData = removeUndefined({
      dynamicTermsTemplates: cleanedTemplates,
      updatedAt: new Date(),
      updatedBy: user?.id || user?.email || 'manager',
    });
    await setDoc(docRef, cleanedData, { merge: true });
  } catch (err) {
    console.error('[dynamicTermsService] Firestore write failed:', err);
    throw err;
  }

  // 3. Dispatch synchronous local event for instant live refresh across all tabs/modals
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('company-terms-updated', {
        detail: {
          templates: updatedTemplates,
          savedTemplate: finalSavedTemplate,
        },
      })
    );
  }

  return { updatedTemplates, savedTemplate: finalSavedTemplate, isNew };
}
