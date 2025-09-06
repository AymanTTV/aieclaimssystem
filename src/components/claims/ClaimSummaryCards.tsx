// src/components/claims/ClaimSummaryCards.tsx
import React from 'react';
import { Claim } from '../../types';
import { Car, Bus, Home, User } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface ClaimSummaryCardsProps {
  claims: Claim[];
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  const { can } = usePermissions();
  if (!can('claims', 'cards')) return null;

  const taxiCount     = claims.filter(c => c.claimType === 'Taxi').length;
  const pcoCount      = claims.filter(c => c.claimType === 'PCO').length;
  const domesticCount = claims.filter(c => c.claimType === 'Domestic').length;
  const piCount       = claims.filter(c => c.claimType === 'PI').length;

  const Card = ({
    icon,
    label,
    value,
  }: { icon: React.ReactNode; label: string; value: number }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex items-center">
      {icon}
      <div className="ml-3 sm:ml-4">
        <p className="text-xs sm:text-sm font-medium text-gray-700">{label}</p>
        <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <Card icon={<Car className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-500" />} label="Taxi" value={taxiCount} />
      <Card icon={<Bus className="h-7 w-7 sm:h-8 sm:w-8 text-blue-500" />} label="PCO" value={pcoCount} />
      <Card icon={<Home className="h-7 w-7 sm:h-8 sm:w-8 text-green-500" />} label="Domestic" value={domesticCount} />
      <Card icon={<User className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-500" />} label="PI" value={piCount} />
    </div>
  );
};

export default ClaimSummaryCards;
