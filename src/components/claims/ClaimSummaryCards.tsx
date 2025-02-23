// src/components/claims/ClaimSummaryCards.tsx

import React from 'react';
import { Claim } from '../../types';
import { Car, Warehouse, Wrench } from 'lucide-react';

interface ClaimSummaryCardsProps {
  claims: Claim[];
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  // Calculate total hire costs
  const totalHireCost = claims.reduce((total, claim) => {
    if (claim.hireDetails?.totalCost) {
      return total + claim.hireDetails.totalCost;
    }
    return total;
  }, 0);

  // Calculate total storage costs
  const totalStorageCost = claims.reduce((total, claim) => {
    if (claim.storage?.totalCost) {
      return total + claim.storage.totalCost;
    }
    return total;
  }, 0);

  // Calculate total recovery costs
  const totalRecoveryCost = claims.reduce((total, claim) => {
    if (claim.recovery?.cost) {
      return total + claim.recovery.cost;
    }
    return total;
  }, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Hire Cost Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Car className="h-8 w-8 text-primary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Hire Total Cost</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{totalHireCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Cost Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Warehouse className="h-8 w-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Storage Cost</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{totalStorageCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Recovery Cost Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Wrench className="h-8 w-8 text-green-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Recovery Cost</p>
            <p className="text-2xl font-semibold text-gray-900">
              £{totalRecoveryCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimSummaryCards;
