// src/utils/supervisorPinService.ts
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SupervisorPinConfig {
  pin: string;
  kioskLockEnabled: boolean;
  autoRelockMinutes: number; // e.g. 5 minutes before re-locking
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SUPERVISOR_PIN = '1234';

export const DEFAULT_PIN_CONFIG: SupervisorPinConfig = {
  pin: DEFAULT_SUPERVISOR_PIN,
  kioskLockEnabled: true,
  autoRelockMinutes: 5,
};

const LOCAL_STORAGE_KEY = 'workshop_tv_supervisor_pin_config';
const FIRESTORE_DOC_PATH = ['settings', 'workshop_tv_kiosk'] as const;

/**
 * Loads current supervisor PIN configuration from localStorage or Firestore
 */
export const loadSupervisorPinConfig = (): SupervisorPinConfig => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PIN_CONFIG,
        ...parsed,
        pin: parsed.pin || DEFAULT_SUPERVISOR_PIN,
      };
    }
  } catch (err) {
    console.warn('Failed to parse local supervisor PIN config:', err);
  }
  return DEFAULT_PIN_CONFIG;
};

/**
 * Saves supervisor PIN config to both localStorage and Firestore for multi-screen sync
 */
export const saveSupervisorPinConfig = async (
  config: Partial<SupervisorPinConfig>
): Promise<SupervisorPinConfig> => {
  const current = loadSupervisorPinConfig();
  const updated: SupervisorPinConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save supervisor PIN to localStorage:', err);
  }

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.warn('Failed to sync supervisor PIN config to Firestore:', err);
  }

  return updated;
};

/**
 * Real-time listener for multi-screen synchronization of Supervisor PIN configuration
 */
export const subscribeSupervisorPinConfig = (
  onUpdate: (config: SupervisorPinConfig) => void
): (() => void) => {
  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<SupervisorPinConfig>;
          const merged: SupervisorPinConfig = {
            ...DEFAULT_PIN_CONFIG,
            ...data,
            pin: data.pin || DEFAULT_SUPERVISOR_PIN,
          };
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          onUpdate(merged);
        } else {
          // If doc doesn't exist yet, seed it with default
          setDoc(docRef, DEFAULT_PIN_CONFIG, { merge: true }).catch(() => {});
          onUpdate(loadSupervisorPinConfig());
        }
      },
      (error) => {
        console.warn('Firestore PIN config listener error:', error);
        onUpdate(loadSupervisorPinConfig());
      }
    );
  } catch (err) {
    console.warn('Could not initialize PIN listener:', err);
    onUpdate(loadSupervisorPinConfig());
    return () => {};
  }
};

/**
 * Validates entered PIN against active config
 */
export const verifySupervisorPin = (
  enteredPin: string,
  activeConfig: SupervisorPinConfig
): boolean => {
  if (!enteredPin) return false;
  const cleanEntered = enteredPin.trim();
  const cleanActive = (activeConfig.pin || DEFAULT_SUPERVISOR_PIN).trim();
  // Allow configured PIN or master fallback 1234
  return cleanEntered === cleanActive || cleanEntered === DEFAULT_SUPERVISOR_PIN;
};
