// src/components/claims/ClaimSummaryCards.tsx

import React from 'react';
import { Claim } from '../../types';
import { Car, Warehouse, Wrench, DollarSign } from 'lucide-react'; // Import DollarSign icon
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface ClaimSummaryCardsProps {
  claims: Claim[];
}

const ClaimSummaryCards: React.FC<ClaimSummaryCardsProps> = ({ claims }) => {
  const { formatCurrency } = useFormattedDisplay();

  // Calculate total costs
  const totalHireCost = claims.reduce((total, claim) => claim.hireDetails?.totalCost ? total + claim.hireDetails.totalCost : total, 0);
  const totalStorageCost = claims.reduce((total, claim) => claim.storage?.totalCost ? total + claim.storage.totalCost : total, 0);
  const totalRecoveryCost = claims.reduce((total, claim) => claim.recovery?.cost ? total + claim.recovery.cost : total, 0);

  // Calculate grand total cost
  const grandTotalCost = totalHireCost + totalStorageCost + totalRecoveryCost;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6"> {/* Updated grid-cols-4 */}
      {/* Hire Cost Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Car className="h-8 w-8 text-primary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Hire Total Cost</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totalHireCost)}
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
              {formatCurrency(totalStorageCost)}
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
              {formatCurrency(totalRecoveryCost)}
            </p>
          </div>
        </div>
      </div>

      {/* Grand Total Cost Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <DollarSign className="h-8 w-8 text-indigo-500" /> {/* Use DollarSign icon */}
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Claim Cost</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatCurrency(grandTotalCost)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimSummaryCards;