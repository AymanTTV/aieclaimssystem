// src/components/dashboard/VehicleMetrics.tsx

import React from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useRentals } from '../../hooks/useRentals';
import StatCard from './StatCard';
import { Car, AlertTriangle, Clock, FileText } from 'lucide-react';

const VehicleMetrics = () => {
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();

  // Count active vehicles (excluding sold)
  const activeVehicles = vehicles.filter(v => v.status !== 'sold');

  // Count active rentals
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
    if (v.status === 'sold') return false; // Exclude sold vehicles
    const today = new Date();
    const fifteenDays = new Date(today.setDate(today.getDate() + 15));
    return (
      v.motExpiry <= fifteenDays ||
      v.nslExpiry <= fifteenDays ||
      v.roadTaxExpiry <= fifteenDays ||
      v.insuranceExpiry <= fifteenDays
    );
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Vehicles"
        value={activeVehicles.length}
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
