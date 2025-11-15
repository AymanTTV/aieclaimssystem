// src/utils/vehicleStatusManager.ts
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Vehicle } from '../types';
import toast from 'react-hot-toast';

/** Valid non-empty string guard */
const isValidId = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Status priority helper (higher wins earlier) */
const pickPrimaryStatus = (statuses: Vehicle['status'][]): Vehicle['status'] => {
  // Priority order:
  // maintenance > rented > scheduled-maintenance > scheduled-rental > claim > sold > available
  if (statuses.includes('maintenance')) return 'maintenance';
  if (statuses.includes('rented')) return 'rented';
  if (statuses.includes('scheduled-maintenance')) return 'scheduled-maintenance';
  if (statuses.includes('scheduled-rental')) return 'scheduled-rental';
  if (statuses.includes('claim')) return 'claim';
  if (statuses.includes('sold')) return 'sold';
  return 'available';
};

/**
 * Update a vehicle's status (SAFE: check existence; merge write).
 */
export const updateVehicleStatus = async (
  vehicleId: string,
  newStatus: Vehicle['status'],
  reason?: string
): Promise<boolean> => {
  try {
    if (!isValidId(vehicleId)) {
      console.warn('[vehicleStatusManager] updateVehicleStatus invalid vehicleId:', vehicleId);
      return false;
    }

    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const snap = await getDoc(vehicleRef);
    if (!snap.exists()) {
      console.warn('[vehicleStatusManager] Vehicle does not exist, skipping status update:', vehicleId);
      return false;
    }

    await setDoc(
      vehicleRef,
      {
        status: newStatus,
        statusReason: reason ?? null,
        updatedAt: new Date(),
      } as Partial<Vehicle>,
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

/**
 * Build active statuses from **live** rentals/maintenance.
 * (Called only for non-sold vehicles.)
 */
const deriveActiveStatuses = async (vehicleId: string): Promise<Vehicle['status'][]> => {
  const statuses: Vehicle['status'][] = [];

  // Rentals (active/scheduled)
  const rentalsQ = query(
    collection(db, 'rentals'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['active', 'scheduled'])
  );
  const rentalsSnap = await getDocs(rentalsQ);
  rentalsSnap.forEach(d => {
    const r = d.data() as any;
    if (r.status === 'active') statuses.push('rented');
    else if (r.status === 'scheduled') statuses.push('scheduled-rental');
  });

  // Maintenance (in-progress/scheduled)
  const maintQ = query(
    collection(db, 'maintenanceLogs'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['in-progress', 'scheduled'])
  );
  const maintSnap = await getDocs(maintQ);
  maintSnap.forEach(d => {
    const m = d.data() as any;
    if (m.status === 'in-progress') statuses.push('maintenance');
    else if (m.status === 'scheduled') statuses.push('scheduled-maintenance');
  });

  return statuses;
};

/**
 * Check and update vehicle status based on active rentals and maintenance (SAFE).
 * IMPORTANT: If the vehicle is 'sold', we **do not** recompute or overwrite it.
 */
export const checkVehicleStatus = async (vehicleId: string): Promise<Vehicle['status']> => {
  try {
    if (!isValidId(vehicleId)) {
      console.warn('[vehicleStatusManager] checkVehicleStatus invalid vehicleId:', vehicleId);
      return 'available';
    }

    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleSnap = await getDoc(vehicleRef);
    if (!vehicleSnap.exists()) {
      console.warn('[vehicleStatusManager] Vehicle missing during status check, skipping:', vehicleId);
      return 'available';
    }

    const current = vehicleSnap.data() as Vehicle;

    // 🧷 HARD STOP: Sold vehicles should not be "re-synced" back to available.
    if (current.status === 'sold') {
      // Optional: keep activeStatuses consistent (once) if needed by UI filters
      if (!Array.isArray((current as any).activeStatuses) || !(current as any).activeStatuses.includes('sold')) {
        await setDoc(
          vehicleRef,
          { activeStatuses: ['sold'], updatedAt: new Date() } as Partial<Vehicle>,
          { merge: true }
        );
      }
      return 'sold';
    }

    const activeStatuses = await deriveActiveStatuses(vehicleId);

    // If nothing active/scheduled => available (for non-sold cars).
    const primary = activeStatuses.length === 0
      ? 'available'
      : pickPrimaryStatus(activeStatuses);

    await setDoc(
      vehicleRef,
      {
        status: primary,
        activeStatuses,
        updatedAt: new Date(),
      } as Partial<Vehicle>,
      { merge: true }
    );

    return primary;
  } catch (error) {
    // Silent error for single check, sync function will show one main error
    console.error('Error checking vehicle status:', error);
    return 'available';
  }
};

/**
 * Sync statuses for ALL **existing** vehicles.
 * We explicitly **skip sold** vehicles to avoid changing them.
 */
export const syncVehicleStatuses = async (): Promise<void> => {
  const toastId = toast.loading('Syncing vehicle statuses...');
  try {
    const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
    if (vehiclesSnap.empty) {
      toast.success('No vehicles to sync.', { id: toastId });
      return;
    }

    const nonSoldIds = vehiclesSnap.docs
      .filter(d => {
        const data = d.data() as Partial<Vehicle>;
        return data?.status !== 'sold';
      })
      .map(d => d.id)
      .filter(isValidId);

    await Promise.all(nonSoldIds.map(id => checkVehicleStatus(id)));

    toast.success(`Synced ${nonSoldIds.length} vehicle statuses.`, { id: toastId });
  } catch (error) {
    console.error('Error during vehicle status sync:', error);
    toast.error('Failed to sync vehicle statuses.', { id: toastId });
  }
};

/**
 * Bulk recompute for a set of vehicles (used from UI).
 * We **skip sold** vehicles here too.
 */
export const resetAllVehicleStatuses = async (vehicles: Vehicle[]) => {
  try {
    const ids = (vehicles || [])
      .filter(v => v && v.status !== 'sold')
      .map(v => v.id)
      .filter(isValidId);

    await Promise.all(ids.map(id => checkVehicleStatus(id)));
    toast.success('Vehicle statuses updated successfully');
  } catch (error) {
    console.error('Error resetting vehicle statuses:', error);
    toast.error('Failed to reset vehicle statuses');
  }
};

/**
 * Add one status to activeStatuses and recompute primary (SAFE).
 * If current vehicle is sold, do nothing.
 */
export const addVehicleStatus = async (
  vehicleId: string,
  status: Vehicle['status'],
  currentStatuses: Vehicle['status'][] = []
) => {
  try {
    if (!isValidId(vehicleId)) {
      console.warn('[vehicleStatusManager] addVehicleStatus invalid vehicleId:', vehicleId);
      return;
    }
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const snap = await getDoc(vehicleRef);
    if (!snap.exists()) {
      console.warn('[vehicleStatusManager] addVehicleStatus vehicle missing, skipping:', vehicleId);
      return;
    }
    const cur = snap.data() as Vehicle;
    if (cur.status === 'sold') {
      // Sold is terminal; do not mutate.
      return;
    }

    const updated = Array.from(new Set([...(currentStatuses ?? []), status]));
    const primary = pickPrimaryStatus(updated);

    await setDoc(
      vehicleRef,
      {
        status: primary,
        activeStatuses: updated,
        updatedAt: new Date(),
      } as Partial<Vehicle>,
      { merge: true }
    );
  } catch (error) {
    console.error('Error adding vehicle status:', error);
    toast.error('Failed to update vehicle status');
  }
};

/**
 * Remove one status from activeStatuses and recompute primary (SAFE).
 * If current vehicle is sold, do nothing.
 */
export const removeVehicleStatus = async (
  vehicleId: string,
  status: Vehicle['status'],
  currentStatuses: Vehicle['status'][] = []
) => {
  try {
    if (!isValidId(vehicleId)) {
      console.warn('[vehicleStatusManager] removeVehicleStatus invalid vehicleId:', vehicleId);
      return;
    }
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const snap = await getDoc(vehicleRef);
    if (!snap.exists()) {
      console.warn('[vehicleStatusManager] removeVehicleStatus vehicle missing, skipping:', vehicleId);
      return;
    }
    const cur = snap.data() as Vehicle;
    if (cur.status === 'sold') {
      // Sold is terminal; do not mutate.
      return;
    }

    const updated = (currentStatuses ?? []).filter(s => s !== status);
    const primary = updated.length > 0 ? pickPrimaryStatus(updated) : 'available';


    await setDoc(
      vehicleRef,
      {
        status: primary,
        activeStatuses: updated,
        updatedAt: new Date(),
      } as Partial<Vehicle>,
      { merge: true }
    );
  } catch (error) {
    console.error('Error removing vehicle status:', error);
    toast.error('Failed to update vehicle status');
  }
};

/**
 * Reset a single vehicle to available (SAFE).
 * If current vehicle is sold, do nothing (explicitly controlled via Undo Sold flow).
 */
export const resetVehicleStatus = async (vehicleId: string): Promise<void> => {
  try {
    if (!isValidId(vehicleId)) {
      console.warn('[vehicleStatusManager] resetVehicleStatus invalid vehicleId:', vehicleId);
      return;
    }
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const snap = await getDoc(vehicleRef);
    if (!snap.exists()) {
      console.warn('[vehicleStatusManager] resetVehicleStatus vehicle missing, skipping:', vehicleId);
      return;
    }
    const cur = snap.data() as Vehicle;
    if (cur.status === 'sold') {
      // Leave to Undo Sold modal.
      return;
    }

    await setDoc(
      vehicleRef,
      {
        status: 'available',
        activeStatuses: [],
        updatedAt: new Date(),
      } as Partial<Vehicle>,
      { merge: true }
    );
  } catch (error) {
    console.error('Error resetting vehicle status:', error);
    toast.error('Failed to reset vehicle status');
  }
};

/**
 * Optional admin helper to clean dangling refs after deleting a vehicle.
 */
export const clearDanglingVehicleRefs = async (deletedVehicleId: string) => {
  try {
    if (!isValidId(deletedVehicleId)) return;
    const batch = writeBatch(db);

    const maintQ = query(collection(db, 'maintenanceLogs'), where('vehicleId', '==', deletedVehicleId));
    const maintSnap = await getDocs(maintQ);
    maintSnap.forEach(s => batch.update(s.ref, { vehicleId: null }));

    const rentQ = query(collection(db, 'rentals'), where('vehicleId', '==', deletedVehicleId));
    const rentSnap = await getDocs(rentQ);
    rentSnap.forEach(s => batch.update(s.ref, { vehicleId: null }));

    await batch.commit();
    console.info('[vehicleStatusManager] Cleared dangling refs for', deletedVehicleId);
  } catch (error) {
    console.error('Error clearing dangling vehicle refs:', error);
  }
};
