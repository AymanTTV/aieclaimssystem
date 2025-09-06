// src/components/dashboard/VehicleMetrics.tsx
import React from 'react';
import StatCard from './StatCard';
import { Car, Wrench, CalendarClock, FileWarning } from 'lucide-react';
import { useFleetStatus } from '../../hooks/useFleetStatus';
import { useVehicles } from '../../hooks/useVehicles';

function isWithinDays(date: Date | null | undefined, days: number) {
  if (!date) return false;
  const now = new Date();
  const inDays = new Date(now);
  inDays.setDate(now.getDate() + days);
  return date <= inDays;
}

const VehicleMetrics: React.FC = () => {
  const { counts, total, loading } = useFleetStatus();
  const { vehicles } = useVehicles(); // to inspect expiries for "Need Attention"

  // Derive clean KPI buckets
  const inService = total - (counts.sold + counts.unavailable); // everything we can actually deploy
  const activeHires = counts.hired;
  const inMaintenance = counts.maintenance;
  const scheduledNext = counts['scheduled-rental'] + counts['scheduled-maintenance'];

  // Compliance “need attention” = any vehicle with an expiry within 30 days
  const needAttention = vehicles.filter((v) =>
    isWithinDays((v as any).insuranceExpiry as Date, 30) ||
    isWithinDays((v as any).motExpiry as Date, 30) ||
    isWithinDays((v as any).roadTaxExpiry as Date, 30) ||
    isWithinDays((v as any).nslExpiry as Date, 30)
  ).length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="In Service"
        value={loading ? '—' : inService}
        icon={Car}
        iconColor="text-emerald-500"
      />
      <StatCard
        title="Active Hires"
        value={loading ? '—' : activeHires}
        icon={Car}
        iconColor="text-blue-500"
      />
      <StatCard
        title="In Maintenance"
        value={loading ? '—' : inMaintenance}
        icon={Wrench}
        iconColor="text-amber-500"
      />
      <StatCard
        title="Scheduled Next"
        value={loading ? '—' : scheduledNext}
        icon={CalendarClock}
        iconColor="text-purple-500"
      />
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
