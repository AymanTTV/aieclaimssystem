// src/components/dashboard/VehicleReport.tsx
import React, { useMemo } from 'react';
import { Car, AlertTriangle, Calendar, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

import { Vehicle } from '../../types';
import { useVehicles } from '../../hooks/useVehicles';
import { useMaintenanceLogs } from '../../hooks/useMaintenanceLogs';
import { useFleetStatus } from '../../hooks/useFleetStatus';

function toDate(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

interface VehicleReportProps {
  vehicles?: Vehicle[];
}

const VehicleReport: React.FC<VehicleReportProps> = ({ vehicles: vehiclesFromProps = [] }) => {
  const { vehicles: liveVehicles } = useVehicles();
  const vehicles = vehiclesFromProps.length ? vehiclesFromProps : liveVehicles;
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { counts } = useFleetStatus();

  const highMileageVehicles = useMemo(() => {
    const list = [...vehicles].filter(v => typeof (v as any).mileage === 'number');
    return list.sort((a, b) => ((b as any).mileage || 0) - ((a as any).mileage || 0)).slice(0, 3);
  }, [vehicles]);

  const upcomingMaintenance = useMemo(() => {
    const today = new Date();
    const byId = new Map<string, Vehicle>();
    vehicles.forEach(v => byId.set(v.id, v));

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

    if (rowsFromLogs.length >= 3) return rowsFromLogs.slice(0, 3);

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

  const activeCount = counts.hired || 0;
  const maintenanceCount = counts.maintenance || 0;
  const unavailableCount = (counts.unavailable || 0) + (counts.claim || 0) + (counts.sold || 0);

  return (
    // Removed <Card> wrapper, using flat space-y container
    <div className="space-y-8">
      
      {/* High Mileage & Maintenance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* High Mileage Vehicles */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">High Mileage</h3>
          <div className="space-y-3">
            {highMileageVehicles.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No mileage data.</p>
            ) : (
              highMileageVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between border border-gray-100 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <div className="bg-gray-100 p-2 rounded-md mr-3">
                      <Car className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{(vehicle as any).make} {(vehicle as any).model}</p>
                      <p className="text-xs text-gray-500">{(vehicle as any).registrationNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{Number((vehicle as any).mileage || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">km</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Upcoming Service</h3>
          <div className="space-y-3">
            {upcomingMaintenance.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No upcoming services.</p>
            ) : (
              upcomingMaintenance.map((row) => (
                <div key={row.id} className="flex items-center justify-between border border-gray-100 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <div className="bg-blue-50 p-2 rounded-md mr-3">
                      <Settings2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{row.make} {row.model}</p>
                      <p className="text-xs text-gray-500">{row.registrationNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">
                      {format(row.nextDate, 'dd MMM')}
                    </p>
                    <p className="text-[10px] text-gray-400">{format(row.nextDate, 'yyyy')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Status Overview */}
      <div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl text-center hover:bg-green-50 transition-colors">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Active Hires</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{activeCount}</p>
          </div>
          <div className="bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl text-center hover:bg-yellow-50 transition-colors">
            <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">In Workshop</p>
            <p className="text-3xl font-bold text-yellow-700 mt-1">{maintenanceCount}</p>
          </div>
          <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl text-center hover:bg-red-50 transition-colors relative group">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Unavailable</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{unavailableCount}</p>
            {/* Tooltip for unavailable details */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Unavailable + Claims + Sold
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-center text-xs text-gray-400">
          <AlertTriangle className="w-3 h-3 mr-1.5" />
          Live data computed directly from active Rentals & Maintenance logs.
        </div>
      </div>
    </div>
  );
};

export default VehicleReport;