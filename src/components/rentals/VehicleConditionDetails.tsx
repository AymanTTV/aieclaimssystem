// src/components/rentals/VehicleConditionDetails.tsx

import React from 'react';
import { VehicleCondition, ReturnCondition } from '../../types/rental';
import { format } from 'date-fns';
import { Car, Fuel, AlertTriangle, Check, X } from 'lucide-react';
import { ensureValidDate } from '../../utils/dateHelpers';

interface VehicleConditionDetailsProps {
  condition: VehicleCondition | ReturnCondition;
  type: 'check-out' | 'return';
}

const VehicleConditionDetails: React.FC<VehicleConditionDetailsProps> = ({
  condition,
  type
}) => {
  const isReturn = 'totalCharges' in condition;

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
          <p className="mt-1">{formatDateTime(condition.date)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Mileage</h3>
          <p className="mt-1">{condition.mileage.toLocaleString()} miles</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Fuel className="w-5 h-5 text-gray-400 mr-2" />
            <span>Fuel Level: {condition.fuelLevel}%</span>
          </div>
          <div className="flex items-center">
            {condition.isClean ? (
              <Check className="w-5 h-5 text-green-500 mr-1" />
            ) : (
              <X className="w-5 h-5 text-red-500 mr-1" />
            )}
            <span>Clean</span>
          </div>
        </div>

        {condition.hasDamage && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Damage Reported</h4>
                <p className="mt-1 text-sm text-red-700">{condition.damageDescription}</p>
              </div>
            </div>
          </div>
        )}

        {isReturn && (condition as ReturnCondition).totalCharges > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Additional Charges</h4>
            {(condition as ReturnCondition).damageCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Damage Cost:</span>
                <span>£{(condition as ReturnCondition).damageCost?.toFixed(2)}</span>
              </div>
            )}
            {(condition as ReturnCondition).fuelCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Fuel Charge:</span>
                <span>£{(condition as ReturnCondition).fuelCharge?.toFixed(2)}</span>
              </div>
            )}
            {(condition as ReturnCondition).cleaningCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span>Cleaning Charge:</span>
                <span>£{(condition as ReturnCondition).cleaningCharge?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium pt-2 border-t">
              <span>Total Additional Charges:</span>
              <span>£{(condition as ReturnCondition).totalCharges.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {condition.images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Vehicle Images</h4>
          <div className="grid grid-cols-2 gap-4">
            {condition.images.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Vehicle condition ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleConditionDetails;
