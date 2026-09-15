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
  colorClass: string;
  bgClass: string;
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  const { can } = usePermissions();
  if (!can('claims', 'cards')) return null;

  const taxiCount = claims.filter((c) => c.claimType === 'Taxi').length;
  const pcoCount = claims.filter((c) => c.claimType === 'PCO').length;
  const domesticCount = claims.filter((c) => c.claimType === 'Domestic').length;
  const piCount = claims.filter((c) => c.claimType === 'PI').length;

  const Card = ({ icon, label, value, colorClass, bgClass }: CardProps) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 p-5 sm:p-6 flex flex-col relative overflow-hidden group cursor-default">
      {/* Subtle decorative background blob that expands on hover */}
      <div 
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-[2.5] ${bgClass}`} 
      />
      
      <div className="flex items-center justify-between z-10">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</h3>
        </div>
        
        {/* Icon Wrapper */}
        <div className={`p-3 rounded-xl shadow-sm ${bgClass} ${colorClass}`}>
          {icon}
        </div>
      </div>

      {/* Optional: Add a subtle progress bar or highlight strip at the bottom */}
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${bgClass.replace('bg-', 'bg-').replace('50', '400')}`} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
      <Card 
        icon={<Car className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="Taxi Claims" 
        value={taxiCount} 
        colorClass="text-amber-600"
        bgClass="bg-amber-50"
      />
      <Card 
        icon={<Bus className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PCO Claims" 
        value={pcoCount} 
        colorClass="text-blue-600"
        bgClass="bg-blue-50"
      />
      <Card 
        icon={<Home className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="Domestic Claims" 
        value={domesticCount} 
        colorClass="text-emerald-600"
        bgClass="bg-emerald-50"
      />
      <Card 
        icon={<User className="h-6 w-6 sm:h-7 sm:w-7" />} 
        label="PI Claims" 
        value={piCount} 
        colorClass="text-indigo-600"
        bgClass="bg-indigo-50"
      />
    </div>
  );
};

export default ClaimSummaryCards;