// src/components/vehicles/ServiceDueSummary.tsx
import React from 'react';
import { Vehicle } from '../../types';
import { isServiceOverdue, isServiceDueSoon } from '../../utils/vehicleUtils';
import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

interface ServiceDueSummaryProps {
  vehicles: Vehicle[];
}

const ServiceDueSummary: React.FC<ServiceDueSummaryProps> = ({ vehicles }) => {
  const serviceOverdueCount = vehicles.filter(isServiceOverdue).length;
  const serviceDueSoonCount = vehicles.filter(v => isServiceDueSoon(v) && !isServiceOverdue(v)).length;
  const allGoodCount = vehicles.length - serviceOverdueCount - serviceDueSoonCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Overdue Card */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center shadow-sm">
        <div className="flex-shrink-0 bg-red-100 p-3 rounded-full">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-red-800">Service Overdue</h3>
          <p className="text-2xl font-bold text-red-900">{serviceOverdueCount}</p>
        </div>
      </div>

      {/* Due Soon Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center shadow-sm">
        <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-full">
          <Wrench className="h-6 w-6 text-yellow-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-yellow-800">Service Due Soon</h3>
          <p className="text-2xl font-bold text-yellow-900">{serviceDueSoonCount}</p>
        </div>
      </div>

      {/* All Good Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center shadow-sm">
        <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-green-800">Service OK</h3>
          <p className="text-2xl font-bold text-green-900">{allGoodCount}</p>
        </div>
      </div>
    </div>
  );
};

export default ServiceDueSummary;
