// src/components/claims/ClaimSummaryCards.tsx
import React from 'react';
import { Claim } from '../../types';
import { Car, Bus, Home, User } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface ClaimSummaryCardsProps {
  claims: Claim[];
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  labelColor: string;
  iconWrapperClass: string;
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  const { can } = usePermissions();
  if (!can('claims', 'cards')) return null;

  const taxiCount = claims.filter((c) => c.claimType === 'Taxi').length;
  const pcoCount = claims.filter((c) => c.claimType === 'PCO').length;
  const domesticCount = claims.filter((c) => c.claimType === 'Domestic').length;
  const piCount = claims.filter((c) => c.claimType === 'PI').length;

  const Card = ({ icon, label, value, labelColor, iconWrapperClass }: CardProps) => (
    <div className="bg-[#16192B] rounded-2xl border border-[#2B314E] shadow-xl hover:shadow-2xl hover:border-[#3D456E] transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-center justify-between z-10">
        <div>
          <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 ${labelColor}`}>{label}</p>
          <h3 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">{value}</h3>
        </div>
        
        {/* Icon Wrapper */}
        <div className={`p-3 rounded-xl border shadow-xs ${iconWrapperClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
      <Card 
        icon={<Car className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="Taxi Claims" 
        value={taxiCount} 
        labelColor="text-amber-300"
        iconWrapperClass="bg-amber-500/15 border-amber-500/30 text-amber-400"
      />
      <Card 
        icon={<Bus className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PCO Claims" 
        value={pcoCount} 
        labelColor="text-blue-300"
        iconWrapperClass="bg-blue-500/15 border-blue-500/30 text-blue-400"
      />
      <Card 
        icon={<Home className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="Domestic Claims" 
        value={domesticCount} 
        labelColor="text-emerald-300"
        iconWrapperClass="bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
      />
      <Card 
        icon={<User className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PI Claims" 
        value={piCount} 
        labelColor="text-indigo-300"
        iconWrapperClass="bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
      />
    </div>
  );
};

export default ClaimSummaryCards;