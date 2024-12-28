import React from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useRentals } from '../../hooks/useRentals';
import StatCard from './StatCard';
import { Car, AlertTriangle, Clock, FileText } from 'lucide-react';

const VehicleMetrics = () => {
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();

  // Count active rentals (status is 'rented' or 'active')
  const activeRentals = rentals.filter(r => 
    r.status === 'rented' || r.status === 'active'
  ).length;

  // Count claim rentals
  const claimRentals = rentals.filter(r => 
    (r.status === 'rented' || r.status === 'active') && 
    r.type === 'claim'
  ).length;

  // Count vehicles needing attention (expired or soon expiring documents)
  const needingAttention = vehicles.filter(v => {
    const today = new Date();
    return (
      v.motExpiry <= today ||
      v.nslExpiry <= today ||
      v.roadTaxExpiry <= today ||
      v.insuranceExpiry <= today
    );
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Vehicles"
        value={vehicles.length}
        icon={Car}
        iconColor="text-primary"
      />
      <StatCard
        title="Active Rentals"
        value={activeRentals}
        icon={Clock}
        iconColor="text-green-500"
      />
      <StatCard
        title="Claim Rentals"
        value={claimRentals}
        icon={FileText}
        iconColor="text-blue-500"
      />
      <StatCard
        title="Need Attention"
        value={needingAttention}
        icon={AlertTriangle}
        iconColor="text-amber-500"
      />
    </div>
  );
};

export default VehicleMetrics;