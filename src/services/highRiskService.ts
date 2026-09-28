// src/services/highRiskService.ts
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  HighRiskDriver,
  NewDriverInput,
  EditDriverInput,
  OverridePayload,
  RiskLevel,
} from '../types/highRiskDriver';

const STORAGE_KEY = 'high_risk_driver_records_v2';
const EVENT_NAME = 'high_risk_drivers_changed';
const CHANNEL_NAME = 'skyline_high_risk_channel';

export const INITIAL_HIGH_RISK_DRIVERS: HighRiskDriver[] = [
  {
    id: 'hrd-1',
    fullName: 'John Smith',
    badgeNumber: 'BDG-8821',
    riskLevel: 'High Risk',
    category: 'Damage',
    categoryDetails: 'Unpaid Vehicle Damage ($3,400 repair default)',
    reportingFleet: 'Apex Rentals',
    reportedYear: 2025,
    createdAt: '2025-04-12T10:30:00.000Z',
  },
  {
    id: 'hrd-2',
    fullName: 'Robert Johnson',
    badgeNumber: 'BDG-4409',
    riskLevel: 'Caution',
    category: 'Non-Payment',
    categoryDetails: 'Outstanding Rental Balance & Unsettled Invoices',
    reportingFleet: 'Metro Hire',
    reportedYear: 2025,
    createdAt: '2025-08-20T14:15:00.000Z',
  },
  {
    id: 'hrd-3',
    fullName: 'Michael Brown',
    badgeNumber: 'BDG-1904',
    riskLevel: 'High Risk',
    category: 'Breach of Terms',
    categoryDetails: 'Vehicle Abandonment & Unauthorized Commercial Subletting',
    reportingFleet: 'City Fleet',
    reportedYear: 2024,
    createdAt: '2024-11-05T09:45:00.000Z',
  },
];

// BroadcastChannel instance for cross-tab instantaneous syncing
let crossTabChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    crossTabChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  crossTabChannel = null;
}

function notifySubscribers(drivers: HighRiskDriver[]) {
  if (typeof window !== 'undefined') {
    // 1. Dispatch custom DOM event
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: drivers }));
    } catch (e) {
      console.warn('Could not dispatch custom event:', e);
    }

    // 2. Post to cross-tab channel
    try {
      if (crossTabChannel) {
        crossTabChannel.postMessage({ type: 'SYNC_DRIVERS', drivers });
      }
    } catch (e) {
      console.warn('Could not broadcast drivers:', e);
    }
  }
}

export function getStoredHighRiskDrivers(): HighRiskDriver[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HIGH_RISK_DRIVERS));
      }
      return INITIAL_HIGH_RISK_DRIVERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        ...item,
        reportingFleet:
          item.reportingFleet ||
          (idx === 0 ? 'Apex Rentals' : idx === 1 ? 'Metro Hire' : 'City Fleet'),
        badgeNumber:
          item.badgeNumber ||
          (idx === 0
            ? 'BDG-8821'
            : idx === 1
            ? 'BDG-4409'
            : idx === 2
            ? 'BDG-1904'
            : `BDG-${7000 + idx}`),
      }));
    }
    return INITIAL_HIGH_RISK_DRIVERS;
  } catch (err) {
    console.error('Error loading high risk drivers from localStorage:', err);
    return INITIAL_HIGH_RISK_DRIVERS;
  }
}

export function saveHighRiskDrivers(drivers: HighRiskDriver[], syncToFirestore = true): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drivers));
    }
    notifySubscribers(drivers);

    // Sync to Firestore in background
    if (syncToFirestore) {
      drivers.forEach((driver) => {
        try {
          const docRef = doc(db, 'high_risk_drivers', driver.id);
          setDoc(docRef, driver, { merge: true }).catch((err) => {
            // Silently handle if offline or Firestore rule is pending
            console.debug('Firestore driver setDoc notice:', err?.message);
          });
        } catch {
          // ignore
        }
      });
    }
  } catch (err) {
    console.error('Error saving high risk drivers to localStorage:', err);
  }
}

export function resetToSampleDrivers(): HighRiskDriver[] {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HIGH_RISK_DRIVERS));
    }
    notifySubscribers(INITIAL_HIGH_RISK_DRIVERS);
    saveHighRiskDrivers(INITIAL_HIGH_RISK_DRIVERS, true);
  } catch (err) {
    console.error('Error resetting drivers:', err);
  }
  return INITIAL_HIGH_RISK_DRIVERS;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

export interface SearchMatchResult {
  isMatch: boolean;
  match?: HighRiskDriver;
  searchQuery: string;
}

export function queryHighRiskDriver(
  nameOrBadge: string,
  driversList?: HighRiskDriver[]
): SearchMatchResult {
  const query = nameOrBadge.trim();
  if (!query) {
    return { isMatch: false, searchQuery: '' };
  }

  const drivers = driversList || getStoredHighRiskDrivers();
  const normalizedQuery = normalizeName(query);

  // 1. Exact match by Name or Badge
  let match = drivers.find((d) => {
    const normName = normalizeName(d.fullName);
    const normBadge = d.badgeNumber ? normalizeName(d.badgeNumber) : '';
    return normName === normalizedQuery || (normBadge && normBadge === normalizedQuery);
  });

  // 2. Partial / word boundary match if query has at least 3 characters
  if (!match && normalizedQuery.length >= 3) {
    match = drivers.find((d) => {
      const normalizedDriver = normalizeName(d.fullName);
      const normalizedBadge = d.badgeNumber ? normalizeName(d.badgeNumber) : '';
      return (
        normalizedDriver === normalizedQuery ||
        normalizedDriver.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedDriver) ||
        (normalizedBadge &&
          (normalizedBadge.includes(normalizedQuery) || normalizedQuery.includes(normalizedBadge)))
      );
    });
  }

  return {
    isMatch: !!match,
    match,
    searchQuery: query,
  };
}

export function addHighRiskDriver(input: NewDriverInput): HighRiskDriver {
  const drivers = getStoredHighRiskDrivers();
  const trimmedName = input.fullName.trim();

  let defaultDetails = input.categoryDetails || '';
  if (!defaultDetails) {
    switch (input.category) {
      case 'Damage':
        defaultDetails = 'Unpaid Vehicle Damage';
        break;
      case 'Non-Payment':
        defaultDetails = 'Outstanding Payment & Rental Arrears';
        break;
      case 'Breach of Terms':
        defaultDetails = 'Breach of Fleet Terms & Conditions';
        break;
      default:
        defaultDetails = `${input.category} Default`;
    }
  }

  const newDriver: HighRiskDriver = {
    id: `hrd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fullName: trimmedName,
    badgeNumber: input.badgeNumber?.trim() || `BDG-${Math.floor(1000 + Math.random() * 9000)}`,
    riskLevel: input.riskLevel,
    category: input.category,
    categoryDetails: defaultDetails,
    reportingFleet: input.reportingFleet?.trim() || 'Apex Rentals',
    reportedYear: new Date().getFullYear(),
    createdAt: new Date().toISOString(),
  };

  const updated = [newDriver, ...drivers];
  saveHighRiskDrivers(updated, true);
  return newDriver;
}

export function updateHighRiskDriver(driverId: string, input: EditDriverInput): HighRiskDriver[] {
  const drivers = getStoredHighRiskDrivers();
  const updated = drivers.map((d) => {
    if (d.id === driverId) {
      return {
        ...d,
        fullName: input.fullName.trim(),
        badgeNumber: input.badgeNumber !== undefined ? input.badgeNumber.trim() : d.badgeNumber,
        riskLevel: input.riskLevel,
        category: input.category,
        categoryDetails: input.categoryDetails?.trim() || d.categoryDetails,
        reportingFleet: input.reportingFleet.trim() || d.reportingFleet,
      };
    }
    return d;
  });
  saveHighRiskDrivers(updated, true);
  return updated;
}

export function updateDriverStatus(driverId: string, status: RiskLevel): HighRiskDriver[] {
  const drivers = getStoredHighRiskDrivers();
  const updated = drivers.map((d) => {
    if (d.id === driverId) {
      return {
        ...d,
        riskLevel: status,
      };
    }
    return d;
  });
  saveHighRiskDrivers(updated, true);
  return updated;
}

export function overrideHighRiskDriver(
  driverId: string,
  payload: OverridePayload
): HighRiskDriver[] {
  const drivers = getStoredHighRiskDrivers();
  const updated = drivers.map((d) => {
    if (d.id === driverId) {
      return {
        ...d,
        isOverridden: true,
        overriddenBy: payload.managerName.trim(),
        overrideReason: payload.reason.trim(),
        overrideTimestamp: new Date().toISOString(),
      };
    }
    return d;
  });
  saveHighRiskDrivers(updated, true);
  return updated;
}

export function removeHighRiskDriver(driverId: string): HighRiskDriver[] {
  const drivers = getStoredHighRiskDrivers();
  const updated = drivers.filter((d) => d.id !== driverId);
  saveHighRiskDrivers(updated, false);

  // Remove from Firestore
  try {
    deleteDoc(doc(db, 'high_risk_drivers', driverId)).catch(() => {});
  } catch {
    // Ignore
  }

  notifySubscribers(updated);
  return updated;
}

/**
 * REST API client functions for High Risk Registry backend
 * These endpoints enforce server-side matrix authorization middleware (401/403)
 */
export async function apiFetchHighRiskDrivers(userMatrix?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userMatrix) {
    headers['x-user-permissions'] = typeof userMatrix === 'string' ? userMatrix : JSON.stringify(userMatrix);
  }
  const res = await fetch('/api/high-risk-drivers', { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function apiCreateHighRiskDriver(input: NewDriverInput, userMatrix?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userMatrix) {
    headers['x-user-permissions'] = typeof userMatrix === 'string' ? userMatrix : JSON.stringify(userMatrix);
  }
  const res = await fetch('/api/high-risk-drivers', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function apiUpdateHighRiskDriver(id: string, input: Partial<EditDriverInput>, userMatrix?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userMatrix) {
    headers['x-user-permissions'] = typeof userMatrix === 'string' ? userMatrix : JSON.stringify(userMatrix);
  }
  const res = await fetch(`/api/high-risk-drivers/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function apiDeleteHighRiskDriver(id: string, userMatrix?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userMatrix) {
    headers['x-user-permissions'] = typeof userMatrix === 'string' ? userMatrix : JSON.stringify(userMatrix);
  }
  const res = await fetch(`/api/high-risk-drivers/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Real-time subscription to High Risk drivers across all pages,
 * tabs, windows, and Firestore updates.
 */
export function subscribeToHighRiskDrivers(
  callback: (drivers: HighRiskDriver[]) => void
): () => void {
  // Immediately supply current state
  const current = getStoredHighRiskDrivers();
  callback(current);

  // 1. Listen for local custom events (same window)
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<HighRiskDriver[]>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getStoredHighRiskDrivers());
    }
  };
  window.addEventListener(EVENT_NAME, handleCustomEvent);

  // 2. Listen for window storage events (cross-tab via localStorage)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. Listen for BroadcastChannel (cross-tab instant)
  let channelHandler: ((e: MessageEvent) => void) | null = null;
  if (crossTabChannel) {
    channelHandler = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_DRIVERS' && Array.isArray(e.data?.drivers)) {
        callback(e.data.drivers);
      }
    };
    crossTabChannel.addEventListener('message', channelHandler);
  }

  // 4. Listen for Firestore onSnapshot updates (cross-device & persistent)
  let unsubscribeFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'high_risk_drivers');
    unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: HighRiskDriver[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as HighRiskDriver;
            remoteList.push({
              ...data,
              id: docSnap.id,
            });
          });

          // Merge remote records with local records to ensure none are lost
          const localList = getStoredHighRiskDrivers();
          const mergedMap = new Map<string, HighRiskDriver>();

          // Remote takes precedence for existing keys, local ensures newly added
          localList.forEach((d) => mergedMap.set(d.id, d));
          remoteList.forEach((d) => mergedMap.set(d.id, d));

          const merged = Array.from(mergedMap.values());
          // Save to local storage without re-triggering recursive firestore sets
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      },
      (err) => {
        console.debug('Firestore high_risk_drivers snapshot notice:', err?.message);
      }
    );
  } catch (err) {
    console.debug('Firestore subscription initialized locally only:', err);
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (crossTabChannel && channelHandler) {
      crossTabChannel.removeEventListener('message', channelHandler);
    }
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

export {
  exportHighRiskToCSV,
  exportHighRiskToExcel,
  exportHighRiskToJSON,
  downloadHighRiskTemplate,
  parseHighRiskImportFile,
} from './highRiskExportImport';

export interface BulkImportResult {
  addedCount: number;
  updatedCount: number;
  totalCount: number;
  drivers: HighRiskDriver[];
}

export function bulkImportHighRiskDrivers(
  importedDrivers: HighRiskDriver[],
  mode: 'merge' | 'replace' = 'merge'
): BulkImportResult {
  const currentDrivers = getStoredHighRiskDrivers();

  if (mode === 'replace') {
    saveHighRiskDrivers(importedDrivers, true);
    return {
      addedCount: importedDrivers.length,
      updatedCount: 0,
      totalCount: importedDrivers.length,
      drivers: importedDrivers,
    };
  }

  // Merge mode:
  let addedCount = 0;
  let updatedCount = 0;
  const mergedMap = new Map<string, HighRiskDriver>();

  // Map existing by ID and normalized name
  currentDrivers.forEach((d) => {
    mergedMap.set(d.id, d);
  });

  const nameToId = new Map<string, string>();
  currentDrivers.forEach((d) => {
    nameToId.set(normalizeName(d.fullName), d.id);
  });

  importedDrivers.forEach((newD) => {
    const norm = normalizeName(newD.fullName);
    const existingId = nameToId.get(norm);

    if (existingId && mergedMap.has(existingId)) {
      // Update existing
      const existing = mergedMap.get(existingId)!;
      mergedMap.set(existingId, {
        ...existing,
        riskLevel: newD.riskLevel || existing.riskLevel,
        category: newD.category || existing.category,
        categoryDetails: newD.categoryDetails || existing.categoryDetails,
        reportingFleet: newD.reportingFleet || existing.reportingFleet,
        reportedYear: newD.reportedYear || existing.reportedYear,
        badgeNumber: newD.badgeNumber || existing.badgeNumber,
      });
      updatedCount++;
    } else {
      // Add as new
      mergedMap.set(newD.id, newD);
      nameToId.set(norm, newD.id);
      addedCount++;
    }
  });

  const resultDrivers = Array.from(mergedMap.values());
  saveHighRiskDrivers(resultDrivers, true);

  return {
    addedCount,
    updatedCount,
    totalCount: resultDrivers.length,
    drivers: resultDrivers,
  };
}
