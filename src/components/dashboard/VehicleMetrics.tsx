import React from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useRentals } from '../../hooks/useRentals';
import StatCard from './StatCard';
import { Car, AlertTriangle, Clock, FileText } from 'lucide-react';

const VehicleMetrics = () => {
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();

  const activeRentals = rentals.filter(r => r.status === 'active');
  const claimRentals = activeRentals.filter(r => r.type === 'claim');
  const generalRentals = activeRentals.filter(r => r.type === 'general');

  const metrics = {
    totalVehicles: vehicles.length,
    activeRentals: generalRentals.length,
    claimRentals: claimRentals.length,
    needingAttention: vehicles.filter(v => {
      const today = new Date();
      return (
        v.motExpiry <= today ||
        v.nslExpiry <= today ||
        v.roadTaxExpiry <= today ||
        v.insuranceExpiry <= today
      );
    }).length
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Vehicles"
        value={metrics.totalVehicles}
        icon={Car}
        iconColor="text-primary"
      />
      <StatCard
        title="Active Rentals"
        value={metrics.activeRentals}
        icon={Clock}
        iconColor="text-green-500"
      />
      <StatCard
        title="Claim Rentals"
        value={metrics.claimRentals}
        icon={FileText}
        iconColor="text-blue-500"
      />
      <StatCard
        title="Need Attention"
        value={metrics.needingAttention}
        icon={AlertTriangle}
        iconColor="text-amber-500"
      />
    </div>
  );
};

export default VehicleMetrics;