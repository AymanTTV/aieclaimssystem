// src/components/dashboard/UrgentAlerts.tsx
import React from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import { AlertTriangle } from 'lucide-react';
import Card from '../Card';
import {
  format,
  addDays,
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
  const sevenDays = addDays(today, 7);
  const thirtyDays = addDays(today, 30);

  const isDateBetween = (
    date: Date | null | undefined,
    start: Date,
    end: Date
  ) => !!date && isValid(date) && date > start && date <= end;

  const daysLeftLabel = (date: Date) => {
    const d = differenceInCalendarDays(date, today);
    if (d <= 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    return `in ${d} days`;
    // (Keeps copy short. You can localize if needed.)
  };

  // 1) Expiring within 7 days (new red section)
  const expiringIn7Days = vehicles.filter((v) => {
    if (v.status === 'sold') return false;
    return (
      isDateBetween(v.motExpiry, today, sevenDays) ||
      isDateBetween(v.insuranceExpiry, today, sevenDays) ||
      isDateBetween(v.roadTaxExpiry, today, sevenDays) ||
      isDateBetween(v.nslExpiry, today, sevenDays)
    );
  });

  // 2) Expiring within 30 days (exclude the 7-day set to avoid duplicates)
  const in7Ids = new Set(expiringIn7Days.map((v) => v.id));
  const urgentExpirations = vehicles.filter((v) => {
    if (v.status === 'sold') return false;
    if (in7Ids.has(v.id)) return false; // prevent duplication

    return (
      isDateBetween(v.motExpiry, today, thirtyDays) ||
      isDateBetween(v.insuranceExpiry, today, thirtyDays) ||
      isDateBetween(v.roadTaxExpiry, today, thirtyDays) ||
      isDateBetween(v.nslExpiry, today, thirtyDays)
    );
  });

  // Helper to render the list of approaching expiries for a single vehicle
  const renderApproaching = (v: Vehicle, colorClass: string) => {
    const rows: Array<{ label: string; date?: Date | null }> = [
      { label: 'MOT', date: v.motExpiry },
      { label: 'Insurance', date: v.insuranceExpiry },
      { label: 'NSL', date: v.nslExpiry },
      { label: 'Road Tax', date: v.roadTaxExpiry },
    ];

    return (
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {v.make} {v.model}
            </p>
            <p className="text-sm text-gray-600">{v.registrationNumber}</p>
          </div>
          <div className="text-right text-sm space-y-0.5">
            {rows.map(
              (r) =>
                r.date &&
                isValid(r.date) &&
                r.date > today && (
                  <p key={r.label}>
                    {r.label}:{' '}
                    <span className="font-medium">{format(r.date, 'dd/MM/yyyy')}</span>{' '}
                    <span className="text-xs text-gray-500">({daysLeftLabel(r.date)})</span>
                  </p>
                )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card title="Urgent Alerts">
      <div className="space-y-4">
        {/* NEW: Expiring within 7 days (red section replacing the old 'Expired') */}
        {expiringIn7Days.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Documents Expiring Within 7 Days ({expiringIn7Days.length} vehicles)
            </h4>
            {expiringIn7Days.map((v) =>
              renderApproaching(v, 'bg-red-100')
            )}
          </div>
        )}

        {/* KEEP: Documents Expiring Within 30 Days (style unchanged) */}
        {urgentExpirations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-amber-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Documents Expiring Within 30 Days ({urgentExpirations.length} vehicles)
            </h4>
            {urgentExpirations.map((v) =>
              renderApproaching(v, 'bg-amber-50')
            )}
          </div>
        )}

        {expiringIn7Days.length === 0 && urgentExpirations.length === 0 && (
          <p className="text-center text-gray-500 py-4">No urgent alerts at this time</p>
        )}
      </div>
    </Card>
  );
};

export default UrgentAlerts;
