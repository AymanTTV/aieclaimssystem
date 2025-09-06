// src/hooks/useFleetStatus.ts
import { useMemo } from 'react';
import { Vehicle, VehicleStatus, Rental, MaintenanceLog } from '../types';
import { useVehicles } from './useVehicles';
import { useRentals } from './useRentals';
import { useMaintenanceLogs } from './useMaintenanceLogs';

// Normalized order and palette for charts
export const STATUS_ORDER: VehicleStatus[] = [
  'available',
  'hired',
  'scheduled-rental',
  'maintenance',
  'scheduled-maintenance',
  'claim',
  'unavailable',
  'sold',
];

export function useFleetStatus() {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { logs: maintenanceLogs, loading: maintLoading } = useMaintenanceLogs();

  const today = new Date();

  const computed = useMemo(() => {
    // Map lookups to avoid O(n^2)
    const activeRentalsByVehicle = new Map<string, Rental[]>();
    const scheduledRentalsByVehicle = new Map<string, Rental[]>();

    rentals.forEach((r) => {
      if (!r.vehicleId) return;
      if (r.status === 'active') {
        const arr = activeRentalsByVehicle.get(r.vehicleId) || [];
        arr.push(r);
        activeRentalsByVehicle.set(r.vehicleId, arr);
      } else if (r.status === 'scheduled') {
        const arr = scheduledRentalsByVehicle.get(r.vehicleId) || [];
        arr.push(r);
        scheduledRentalsByVehicle.set(r.vehicleId, arr);
      }
    });

    const maintInProgressByVehicle = new Map<string, MaintenanceLog[]>();
    const maintPendingFutureByVehicle = new Map<string, MaintenanceLog[]>();

    maintenanceLogs.forEach((m) => {
      if (!m.vehicleId) return;
      const date = (m.date as Date) || null;
      const status = m.status; // 'pending' | 'in-progress' | 'completed' | 'cancelled'
      if (status === 'in-progress') {
        const arr = maintInProgressByVehicle.get(m.vehicleId) || [];
        arr.push(m);
        maintInProgressByVehicle.set(m.vehicleId, arr);
      } else if (status === 'pending' && date && date >= today) {
        const arr = maintPendingFutureByVehicle.get(m.vehicleId) || [];
        arr.push(m);
        maintPendingFutureByVehicle.set(m.vehicleId, arr);
      }
    });

    // Final tally with safe defaults
    const counts: Record<VehicleStatus, number> = {
      available: 0,
      hired: 0,
      'scheduled-rental': 0,
      maintenance: 0,
      'scheduled-maintenance': 0,
      claim: 0,
      sold: 0,
      unavailable: 0,
    };

    // Decide a computed status for each vehicle
    const perVehicle: Array<{ vehicle: Vehicle; status: VehicleStatus }> = [];

    vehicles.forEach((v) => {
      // Hard stops first:
      if (v.status === 'sold') {
        counts.sold += 1;
        perVehicle.push({ vehicle: v, status: 'sold' });
        return;
      }
      if (v.status === 'unavailable') {
        counts.unavailable += 1;
        perVehicle.push({ vehicle: v, status: 'unavailable' });
        return;
      }
      if (v.status === 'claim') {
        counts.claim += 1;
        perVehicle.push({ vehicle: v, status: 'claim' });
        return;
      }

      // Dynamic truth based on live data:
      if (activeRentalsByVehicle.has(v.id)) {
        counts.hired += 1;
        perVehicle.push({ vehicle: v, status: 'hired' });
        return;
      }
      if (maintInProgressByVehicle.has(v.id)) {
        counts.maintenance += 1;
        perVehicle.push({ vehicle: v, status: 'maintenance' });
        return;
      }
      if (scheduledRentalsByVehicle.has(v.id)) {
        counts['scheduled-rental'] += 1;
        perVehicle.push({ vehicle: v, status: 'scheduled-rental' });
        return;
      }
      if (maintPendingFutureByVehicle.has(v.id)) {
        counts['scheduled-maintenance'] += 1;
        perVehicle.push({ vehicle: v, status: 'scheduled-maintenance' });
        return;
      }

      // Fallback to vehicle.status if it’s one of our recognized statuses
      if (
        v.status &&
        ['available', 'hired', 'scheduled-rental', 'maintenance', 'scheduled-maintenance', 'claim', 'sold', 'unavailable'].includes(
          v.status
        )
      ) {
        counts[v.status as VehicleStatus] += 1;
        perVehicle.push({ vehicle: v, status: v.status as VehicleStatus });
        return;
      }

      // Last resort: assume available
      counts.available += 1;
      perVehicle.push({ vehicle: v, status: 'available' });
    });

    const total = vehicles.length;

    return {
      counts,
      total,
      perVehicle, // if you want to render a per-vehicle table/badges
    };
  }, [vehicles, rentals, maintenanceLogs]);

  return {
    loading: vehiclesLoading || rentalsLoading || maintLoading,
    ...computed,
  };
}
