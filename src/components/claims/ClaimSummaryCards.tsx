import React from 'react';
import { Claim } from '../../types';
import { Car , Bus, Home, User } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
interface ClaimSummaryCardsProps {
  claims: Claim[];
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  // Count claims by type
  const taxiCount = claims.filter(c => c.claimType === 'Taxi').length;
  const pcoCount = claims.filter(c => c.claimType === 'PCO').length;
  const domesticCount = claims.filter(c => c.claimType === 'Domestic').length;
  const piCount = claims.filter(c => c.claimType === 'PI').length;


  const { can } = usePermissions();

  // Don't even render the cards if the user lacks the 'cards' permission
  if (!can('claims', 'cards')) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {/* Taxi Claims */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
        <Car className="h-8 w-8 text-yellow-500" />
        <div className="ml-4">
          <p className="text-lg font-medium text-gray-700">Taxi</p>
          <p className="text-2xl font-semibold text-gray-900">{taxiCount}</p>
        </div>
      </div>

      {/* PCO Claims */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
        <Bus className="h-8 w-8 text-blue-500" />
        <div className="ml-4">
          <p className="text-lg font-medium text-gray-700">PCO</p>
          <p className="text-2xl font-semibold text-gray-900">{pcoCount}</p>
        </div>
      </div>

      {/* Domestic Claims */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
        <Home className="h-8 w-8 text-green-500" />
        <div className="ml-4">
          <p className="text-lg font-medium text-gray-700">Domestic</p>
          <p className="text-2xl font-semibold text-gray-900">{domesticCount}</p>
        </div>
      </div>

      {/* PI Claims */}
      <div className="bg-white rounded-lg shadow-sm p-6 flex items-center">
        <User className="h-8 w-8 text-indigo-500" />
        <div className="ml-4">
          <p className="text-lg font-medium text-gray-700">PI</p>
          <p className="text-2xl font-semibold text-gray-900">{piCount}</p>
        </div>
      </div>
    </div>
  );
};

export default ClaimSummaryCards;
