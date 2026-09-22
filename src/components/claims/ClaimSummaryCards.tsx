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
  bgClass: string;
  borderClass: string;
  accentClass: string;
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  const { can } = usePermissions();
  if (!can('claims', 'cards')) return null;

  const taxiCount = claims.filter((c) => c.claimType === 'Taxi').length;
  const pcoCount = claims.filter((c) => c.claimType === 'PCO').length;
  const domesticCount = claims.filter((c) => c.claimType === 'Domestic').length;
  const piCount = claims.filter((c) => c.claimType === 'PI').length;

  const Card = ({ icon, label, value, bgClass, borderClass, accentClass }: CardProps) => (
    <div
      className={`${bgClass} ${borderClass} rounded-2xl shadow-xs transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden`}
      style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
    >
      <div className="flex items-center justify-between z-10">
        <div>
          <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 ${accentClass}`}>{label}</p>
          <h3 className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${accentClass}`}>{value}</h3>
        </div>
        
        {/* Icon Wrapper */}
        <div className={`p-3 rounded-xl border ${borderClass} bg-white shadow-xs ${accentClass}`}>
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
        bgClass="bg-[#FFFBEB]"
        borderClass="border-[#FDE68A]"
        accentClass="text-[#D97706]"
      />
      <Card 
        icon={<Bus className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PCO Claims" 
        value={pcoCount} 
        bgClass="bg-[#F0F9FF]"
        borderClass="border-[#BAE6FD]"
        accentClass="text-[#0284C7]"
      />
      <Card 
        icon={<Home className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="Domestic Claims" 
        value={domesticCount} 
        bgClass="bg-[#ECFDF5]"
        borderClass="border-[#A7F3D0]"
        accentClass="text-[#059669]"
      />
      <Card 
        icon={<User className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PI Claims" 
        value={piCount} 
        bgClass="bg-[#FEF2F2]"
        borderClass="border-[#FECACA]"
        accentClass="text-[#DC2626]"
      />
    </div>
  );
};

export default ClaimSummaryCards;