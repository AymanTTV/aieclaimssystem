// src/components/dashboard/UrgentAlerts.tsx
import React from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import { AlertTriangle, Clock } from 'lucide-react';
import {
  format,
  isValid,
  differenceInCalendarDays,
  startOfDay,
} from 'date-fns';

interface UrgentAlertsProps {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
}

const UrgentAlerts: React.FC<UrgentAlertsProps> = ({ vehicles }) => {
  const today = startOfDay(new Date());

  // Enhanced label logic to clearly show if something is already expired
  const daysLeftLabel = (date: Date) => {
    const d = differenceInCalendarDays(date, today);
    if (d < 0) return `Expired by ${Math.abs(d)} days`;
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return `in ${d} days`;
  };

  interface AlertVehicle {
    vehicle: Vehicle;
    docs: { label: string; date: Date }[];
  }

  const criticalAlerts: AlertVehicle[] = [];
  const warningAlerts: AlertVehicle[] = [];

  vehicles.forEach((v) => {
    if (v.status === 'sold') return;

    // 1. Gather all valid documents for the vehicle
    const docs = [
      { label: 'MOT', date: v.motExpiry },
      { label: 'Ins', date: v.insuranceExpiry },
      { label: 'NSL', date: v.nslExpiry },
      { label: 'Tax', date: v.roadTaxExpiry },
    ].filter((d) => d.date && isValid(d.date)) as { label: string; date: Date }[];

    // 2. Filter SPECIFIC documents by timeframe
    // Critical: Expired or <= 7 days
    const criticalDocs = docs.filter((d) => differenceInCalendarDays(d.date, today) <= 7);
    
    // Warning: 8 to 30 days
    const warningDocs = docs.filter((d) => {
      const diff = differenceInCalendarDays(d.date, today);
      return diff > 7 && diff <= 30;
    });

    // 3. Push to respective arrays ONLY the documents that matched
    if (criticalDocs.length > 0) criticalAlerts.push({ vehicle: v, docs: criticalDocs });
    if (warningDocs.length > 0) warningAlerts.push({ vehicle: v, docs: warningDocs });
  });

  const renderApproaching = (
    item: AlertVehicle,
    borderColorClass: string,
    textAccentClass: string
  ) => {
    const { vehicle: v, docs } = item;

    return (
      <div
        key={v.id}
        className={`bg-white border border-gray-100 border-l-4 ${borderColorClass} p-3 mb-2 rounded-r-md shadow-sm hover:shadow transition-shadow`}
      >
        <div className="flex items-start justify-between">
          <div className="pr-2">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              {v.make} {v.model}
            </p>
            <p className="text-[11px] text-gray-500 tracking-wide font-medium mt-0.5">
              {v.registrationNumber}
            </p>
          </div>
          <div className="text-right space-y-1 mt-0.5">
            {/* Render ONLY the filtered docs */}
            {docs.map((r) => (
              <div key={r.label} className="flex items-center justify-end space-x-2.5">
                
                {/* INCREASED FONT SIZE FOR DOCUMENT NAME */}
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide">
                  {r.label}:
                </span>
                
                <span className={`text-xs font-bold ${textAccentClass}`}>
                  {format(r.date, 'dd/MM/yyyy')}
                </span>
                
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    differenceInCalendarDays(r.date, today) < 0
                      ? 'bg-red-50 text-red-700 border-red-200' // Highlight if already expired
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}
                >
                  {daysLeftLabel(r.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 bg-gray-50/30 max-h-[calc(100vh-16rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
      <div className="space-y-5 pr-1">
        
        {/* CRITICAL ALERTS */}
        {criticalAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                Critical (7 Days)
              </h4>
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                {criticalAlerts.length}
              </span>
            </div>
            {criticalAlerts.map((item) => renderApproaching(item, 'border-red-500', 'text-red-700'))}
          </div>
        )}

        {/* WARNING ALERTS */}
        {warningAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                Warning (30 Days)
              </h4>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                {warningAlerts.length}
              </span>
            </div>
            {warningAlerts.map((item) => renderApproaching(item, 'border-amber-400', 'text-amber-700'))}
          </div>
        )}

        {criticalAlerts.length === 0 && warningAlerts.length === 0 && (
          <div className="text-center py-6">
            <div className="bg-green-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">All clear</p>
            <p className="text-xs text-gray-500 mt-1">No upcoming expirations.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrgentAlerts;