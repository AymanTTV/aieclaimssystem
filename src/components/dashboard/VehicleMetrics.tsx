import React from 'react';
import StatCard from './StatCard';
import {
  Car,
  Wrench,
  FileWarning,
  CalendarCheck,
  CheckCircle2,
  Activity
} from 'lucide-react';

import { useFleetStatus } from '../../hooks/useFleetStatus';
import { useVehicles } from '../../hooks/useVehicles';
import { useRentals } from '../../hooks/useRentals';
import { useMaintenanceLogs } from '../../hooks/useMaintenanceLogs';
import { usePermissions } from '../../hooks/usePermissions';

function isWithinDays(date: Date | null | undefined, days: number) {
  if (!date) return false;
  const now = new Date();
  const inDays = new Date(now);
  inDays.setDate(now.getDate() + days);
  return date <= inDays;
}

// Normalize statuses like "in-progress", "IN_PROGRESS", "in progress" → "in-progress"
function normStatus(v: unknown): string {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-') as string;
}

const VehicleMetrics: React.FC = () => {
  // Sources
  const { counts, total, loading: fleetLoading } = useFleetStatus();
  const { vehicles } = useVehicles();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { logs: maintenanceLogs, loading: maintLoading } = useMaintenanceLogs();
  
  // Permissions Hook
  const { isCompany } = usePermissions();

  const loading = fleetLoading || rentalsLoading || maintLoading;

  // Fleet counts
  const inService = total - (counts.sold + counts.unavailable);
  const activeHires = counts.hired;

  // Compliance attention from vehicles
  const needAttention =
    vehicles.filter((v) =>
      isWithinDays((v as any).insuranceExpiry as Date, 30) ||
      isWithinDays((v as any).motExpiry as Date, 30) ||
      isWithinDays((v as any).roadTaxExpiry as Date, 30) ||
      isWithinDays((v as any).nslExpiry as Date, 30)
    ).length;

  // Rentals KPIs 
  const scheduledHires =
    rentals?.filter((r) => normStatus((r as any).status) === 'scheduled').length || 0;

  const hiresCompleted =
    rentals?.filter((r) => normStatus((r as any).status) === 'completed').length || 0;

  // Maintenance KPIs 
  const maintScheduled =
    maintenanceLogs?.filter((m) => normStatus((m as any).status) === 'scheduled').length || 0;

  const maintActive =
    maintenanceLogs?.filter((m) => normStatus((m as any).status) === 'in-progress').length || 0;

  const maintCompleted =
    maintenanceLogs?.filter((m) => normStatus((m as any).status) === 'completed').length || 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="In Service"
        value={loading ? '—' : inService}
        icon={Car}
        iconColor="text-emerald-500"
      />
      
      {/* Hide Hired vehicle metrics if user is a company */}
      {!isCompany && (
        <>
          <StatCard
            title="Scheduled Hires"
            value={loading ? '—' : scheduledHires}
            icon={CalendarCheck}
            iconColor="text-indigo-500"
          />
          <StatCard
            title="Active Hires"
            value={loading ? '—' : activeHires}
            icon={Car}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Hires Completed"
            value={loading ? '—' : hiresCompleted}
            icon={CheckCircle2}
            iconColor="text-green-600"
          />
        </>
      )}

      {/* Maintenance from logs */}
      <StatCard
        title="Scheduled Maintenances"
        value={loading ? '—' : maintScheduled}
        icon={CalendarCheck}
        iconColor="text-purple-600"
      />
      <StatCard
        title="Active Maintenances"
        value={loading ? '—' : maintActive}
        icon={Activity}
        iconColor="text-amber-500"
      />
      
      {/* Hide Completed maintenance if user is a company */}
      {!isCompany && (
        <StatCard
          title="Maintenances Completed"
          value={loading ? '—' : maintCompleted}
          icon={CheckCircle2}
          iconColor="text-teal-600"
        />
      )}

      <StatCard
        title="Need Attention"
        value={loading ? '—' : needAttention}
        icon={FileWarning}
        iconColor="text-rose-500"
      />
    </div>
  );
};

export default VehicleMetrics;