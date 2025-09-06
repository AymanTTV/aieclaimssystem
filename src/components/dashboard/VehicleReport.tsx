// src/components/dashboard/VehicleReport.tsx
import React, { useMemo } from 'react';
import { Car, AlertTriangle, Calendar } from 'lucide-react';
import Card from '../Card';
import { format } from 'date-fns';

import { Vehicle } from '../../types';
import { useVehicles } from '../../hooks/useVehicles';
import { useMaintenanceLogs } from '../../hooks/useMaintenanceLogs';
import { useFleetStatus } from '../../hooks/useFleetStatus';

/**
 * Helper: coerce Date | Firestore Timestamp | string | number -> Date | null
 */
function toDate(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

interface VehicleReportProps {
  /** Optional: if parent passes vehicles, we’ll use them; otherwise we’ll fallback to live vehicles hook */
  vehicles?: Vehicle[];
}

const VehicleReport: React.FC<VehicleReportProps> = ({ vehicles: vehiclesFromProps = [] }) => {
  // Fallback to live vehicles if the prop is empty/undefined
  const { vehicles: liveVehicles } = useVehicles();
  const vehicles = vehiclesFromProps.length ? vehiclesFromProps : liveVehicles;

  // Live maintenance logs (more accurate than vehicle.nextMaintenance)
  const { logs: maintenanceLogs } = useMaintenanceLogs();

  // Fleet status derived from Rentals & Maintenance
  const { counts } = useFleetStatus();

  /**
   * High Mileage Vehicles (top 3)
   */
  const highMileageVehicles = useMemo(() => {
    const list = [...vehicles].filter(v => typeof (v as any).mileage === 'number');
    return list.sort((a, b) => ((b as any).mileage || 0) - ((a as any).mileage || 0)).slice(0, 3);
  }, [vehicles]);

  /**
   * Upcoming Maintenance (top 3 soonest, future-dated)
   * Prefer maintenance logs with status 'pending' and a future date.
   * Fallback to vehicle.nextMaintenance if logs are missing.
   */
  const upcomingMaintenance = useMemo(() => {
    const today = new Date();

    // Build a quick map for vehicle details lookup
    const byId = new Map<string, Vehicle>();
    vehicles.forEach(v => byId.set(v.id, v));

    // 1) Use maintenance logs when possible
    const futurePending = maintenanceLogs
      .map(m => ({ ...m, dateObj: toDate((m as any).date) }))
      .filter(m => m.status === 'pending' && m.vehicleId && m.dateObj && m.dateObj >= today)
      .sort((a, b) => (a.dateObj!.getTime() - b.dateObj!.getTime()));

    const rowsFromLogs = futurePending
      .map(m => {
        const v = byId.get(m.vehicleId!);
        if (!v) return null;
        return {
          id: v.id,
          make: (v as any).make,
          model: (v as any).model,
          registrationNumber: (v as any).registrationNumber,
          nextDate: m.dateObj!,
        };
      })
      .filter(Boolean) as Array<{ id: string; make?: string; model?: string; registrationNumber?: string; nextDate: Date }>;

    if (rowsFromLogs.length >= 3) {
      return rowsFromLogs.slice(0, 3);
    }

    // 2) Fallback to vehicle.nextMaintenance (if present)
    const rowsFromVehicles = vehicles
      .map(v => ({ v, d: toDate((v as any).nextMaintenance) }))
      .filter(x => x.d && x.d >= today)
      .sort((a, b) => a.d!.getTime() - b.d!.getTime())
      .map(x => ({
        id: x.v.id,
        make: (x.v as any).make,
        model: (x.v as any).model,
        registrationNumber: (x.v as any).registrationNumber,
        nextDate: x.d as Date,
      }));

    // Merge (preferring logs first, then vehicle fallback), unique by vehicle
    const seen = new Set<string>();
    const merged: typeof rowsFromLogs = [];
    [...rowsFromLogs, ...rowsFromVehicles].forEach(row => {
      if (row && !seen.has(row.id)) {
        seen.add(row.id);
        merged.push(row);
      }
    });

    return merged.slice(0, 3);
  }, [vehicles, maintenanceLogs]);

  /**
   * Status Overview (3 cards)
   * - Active  -> derived from live rentals: counts.hired
   * - Maintenance -> derived from logs: counts.maintenance
   * - Unavailable -> everything else not deployable (unavailable + claim + sold)
   *   (We keep maintenance separate, so we don't double-count it here.)
   */
  const activeCount = counts.hired || 0;
  const maintenanceCount = counts.maintenance || 0;
  const unavailableCount = (counts.unavailable || 0) + (counts.claim || 0) + (counts.sold || 0);

  return (
    <Card title="Vehicle Report">
      <div className="space-y-6">
        {/* High Mileage Vehicles */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">High Mileage Vehicles</h3>
          <div className="space-y-2">
            {highMileageVehicles.length === 0 ? (
              <p className="text-sm text-gray-500">No mileage data available.</p>
            ) : (
              highMileageVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <Car className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">{(vehicle as any).make} {(vehicle as any).model}</p>
                      <p className="text-sm text-gray-500">{(vehicle as any).registrationNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{Number((vehicle as any).mileage || 0).toLocaleString()} km</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Upcoming Maintenance</h3>
          <div className="space-y-2">
            {upcomingMaintenance.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming maintenance scheduled.</p>
            ) : (
              upcomingMaintenance.map((row) => (
                <div key={row.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">{row.make} {row.model}</p>
                      <p className="text-sm text-gray-500">{row.registrationNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(row.nextDate, 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Overview (derived, accurate) */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Status Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-semibold text-green-700">
                {activeCount}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Maintenance</p>
              <p className="text-2xl font-semibold text-yellow-700">
                {maintenanceCount}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Unavailable</p>
              <p className="text-2xl font-semibold text-red-700">
                {unavailableCount}
              </p>
              <div className="mt-1 text-[11px] text-red-600/70">
                (Unavailable + Claim + Sold)
              </div>
            </div>
          </div>

          {/* Optional hint below cards */}
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Counts are computed from live Rentals & Maintenance, not just the vehicle.status field.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VehicleReport;
