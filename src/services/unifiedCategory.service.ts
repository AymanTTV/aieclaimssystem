// src/services/unifiedCategory.service.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types/category';

export const UNIFIED_COL = 'systemCategories';
const LEGACY_COLS = ['financeCategories', 'invoiceCategories', 'maintenanceCategories'] as const;

export const ESSENTIAL_CATEGORIES = ['Transfer', 'Loan Received', 'Loan Provided'];

const DEFAULT_FLEET_CATEGORIES = [
  'Transfer',
  'Loan Received',
  'Loan Provided',
  'Vehicle Hire',
  'Rental Payment',
  'Maintenance',
  'Repair',
  'Service & MOT',
  'Tyres & Brakes',
  'Accident Repair',
  'Vehicle Leasing',
  'Insurance Claim',
  'Fuel',
  'Licensing & Road Tax',
  'Car Wash & Valet',
  'Other',
];

let isInitialized = false;

/**
 * Initializes and consolidates categories from all 3 systems (Finance, Invoices, Maintenance)
 * into a single unified 'systemCategories' collection so no existing categories are lost.
 */
async function ensureUnifiedConsolidation(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const unifiedSnap = await getDocs(collection(db, UNIFIED_COL));
    const existingNames = new Set<string>();
    unifiedSnap.forEach((d) => {
      const n = (d.data() as { name?: string }).name?.trim();
      if (n) existingNames.add(n.toLowerCase());
    });

    // If unified collection is brand new or incomplete, collect categories from all 3 legacy systems
    const discoveredCategories = new Map<string, string>(); // lowerKey -> displayName

    // 1. Check legacy collections
    for (const colName of LEGACY_COLS) {
      try {
        const snap = await getDocs(collection(db, colName));
        snap.forEach((d) => {
          const rawName = (d.data() as { name?: string }).name?.trim();
          if (rawName && !existingNames.has(rawName.toLowerCase())) {
            const lower = rawName.toLowerCase();
            if (!discoveredCategories.has(lower)) {
              discoveredCategories.set(lower, rawName);
            }
          }
        });
      } catch (colErr) {
        console.warn(`Could not read legacy collection ${colName}:`, colErr);
      }
    }

    // 2. If completely empty, seed default fleet categories
    if (existingNames.size === 0 && discoveredCategories.size === 0) {
      DEFAULT_FLEET_CATEGORIES.forEach((name) => {
        discoveredCategories.set(name.toLowerCase(), name);
      });
    }

    // 3. Batch insert any missing categories into unified collection
    if (discoveredCategories.size > 0) {
      const batch = writeBatch(db);
      discoveredCategories.forEach((displayName) => {
        const newRef = doc(collection(db, UNIFIED_COL));
        batch.set(newRef, {
          name: displayName,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error consolidating unified categories:', err);
  }
}

/**
 * Real-time subscription to unified categories across the entire system.
 * Changes made in Finance, Invoices, or Maintenance trigger immediate reactive updates.
 */
export function subscribe(callback: (categories: Category[]) => void): () => void {
  // Fire off consolidation check in background
  ensureUnifiedConsolidation();

  const q = query(collection(db, UNIFIED_COL), orderBy('name', 'asc'));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const cats: Category[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { name?: string };
        if (data.name) {
          cats.push({ id: docSnap.id, name: data.name });
        }
      });
      cats.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      callback(cats);
    },
    (err) => {
      console.error('Error in unified category subscription:', err);
    }
  );

  return unsubscribe;
}

/**
 * Fetch all categories across the entire system
 */
export async function getAll(): Promise<Category[]> {
  await ensureUnifiedConsolidation();

  const q = query(collection(db, UNIFIED_COL), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  const cats: Category[] = [];
  snap.forEach((d) => {
    const data = d.data() as { name?: string };
    if (data.name) {
      cats.push({ id: d.id, name: data.name });
    }
  });

  return cats.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Create a new category and synchronize it across the entire system
 */
export async function create(payload: { name: string }): Promise<Category> {
  const trimmed = payload.name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  // Add to primary unified collection
  const ref = await addDoc(collection(db, UNIFIED_COL), {
    name: trimmed,
    createdAt: serverTimestamp(),
  });

  // Sync to legacy collections for full backwards compatibility
  for (const colName of LEGACY_COLS) {
    try {
      await addDoc(collection(db, colName), {
        name: trimmed,
        systemCategoryId: ref.id,
        createdAt: serverTimestamp(),
      });
    } catch {}
  }

  return { id: ref.id, name: trimmed };
}

/**
 * Bulk create categories in a single call, deduplicating against existing entries
 */
export async function createBulk(names: string[]): Promise<Category[]> {
  const existing = await getAll();
  const existingLower = new Set(existing.map((c) => c.name.toLowerCase()));

  const uniqueToCreate: string[] = [];
  names.forEach((n) => {
    const trimmed = n.trim();
    if (trimmed && !existingLower.has(trimmed.toLowerCase())) {
      existingLower.add(trimmed.toLowerCase());
      uniqueToCreate.push(trimmed);
    }
  });

  if (uniqueToCreate.length === 0) return [];

  const batch = writeBatch(db);
  const createdItems: Category[] = [];

  for (const name of uniqueToCreate) {
    const ref = doc(collection(db, UNIFIED_COL));
    batch.set(ref, {
      name,
      createdAt: serverTimestamp(),
    });
    createdItems.push({ id: ref.id, name });

    // Also sync to legacy collections
    for (const colName of LEGACY_COLS) {
      try {
        const legacyRef = doc(collection(db, colName));
        batch.set(legacyRef, {
          name,
          systemCategoryId: ref.id,
          createdAt: serverTimestamp(),
        });
      } catch {}
    }
  }

  await batch.commit();
  return createdItems;
}

/**
 * Update a category name across the entire system
 */
export async function update(id: string, payload: { name: string }): Promise<void> {
  const trimmed = payload.name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  // Update in unified collection
  const ref = doc(db, UNIFIED_COL, id);
  await updateDoc(ref, {
    name: trimmed,
    updatedAt: serverTimestamp(),
  });

  // Also propagate update to legacy collections where matching
  for (const colName of LEGACY_COLS) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(async (d) => {
        const data = d.data();
        if (data.systemCategoryId === id || data.name === trimmed) {
          await updateDoc(doc(db, colName, d.id), { name: trimmed });
        }
      });
    } catch {}
  }
}

/**
 * Delete a category across the entire system
 */
export async function remove(id: string): Promise<void> {
  // Delete from unified collection
  const ref = doc(db, UNIFIED_COL, id);
  await deleteDoc(ref);

  // Propagate deletion to legacy collections
  for (const colName of LEGACY_COLS) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(async (d) => {
        const data = d.data();
        if (data.systemCategoryId === id) {
          await deleteDoc(doc(db, colName, d.id));
        }
      });
    } catch {}
  }
}

export const unifiedCategoryService = {
  getAll,
  create,
  createBulk,
  update,
  delete: remove,
  subscribe,
  ESSENTIAL_CATEGORIES,
};

export default unifiedCategoryService;
