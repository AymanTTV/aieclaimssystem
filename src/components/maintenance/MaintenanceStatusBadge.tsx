// src/components/maintenance/MaintenanceStatusBadge.tsx
import React from 'react';
import {
  getMaintenanceStatusLabel,
  getStatusBadgeStyles,
  normalizeMaintenanceStatus,
  isStatusOffRoad,
  isStatusUrgentScheduled,
} from '../../utils/maintenanceStatusConfig';

export interface MaintenanceStatusBadgeProps {
  status?: string;
  date?: Date | string | null;
  isAccident?: boolean;
  isOffRoad?: boolean;
  isScheduledUrgent?: boolean;
  isDarkTheme?: boolean;
  showDot?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const MaintenanceStatusBadge: React.FC<MaintenanceStatusBadgeProps> = ({
  status,
  date,
  isAccident: propIsAccident,
  isOffRoad: propIsOffRoad,
  isScheduledUrgent: propIsUrgent,
  isDarkTheme = false,
  showDot = true,
  className = '',
  size = 'sm',
}) => {
  const isAccident =
    propIsAccident ||
    normalizeMaintenanceStatus(status) === 'accident' ||
    String(status || '').toLowerCase().includes('accident');

  const isOffRoad =
    propIsOffRoad ||
    isStatusOffRoad(status, { isAccident, isOffRoad: propIsOffRoad });

  const isUrgent =
    propIsUrgent ||
    (date ? isStatusUrgentScheduled(status, date, { isAccident, isOffRoad }) : isOffRoad);

  const statusLabel = getMaintenanceStatusLabel(status, {
    isAccident,
    isOffRoad,
  });

  const badgeStyles = getStatusBadgeStyles(status, {
    isScheduledUrgent: isUrgent,
    isDarkTheme,
    isAccident,
    isOffRoad,
  });

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'md'
      ? 'px-3.5 py-1.5 text-xs'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider select-none truncate ${badgeStyles} ${sizeClasses} ${className}`}
    >
      {showDot && (isOffRoad || isUrgent) && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
            isOffRoad
              ? 'bg-rose-400 animate-slow-fade-blink-dot'
              : 'bg-red-400 animate-slow-fade-blink-dot'
          }`}
        />
      )}
      <span className="truncate">{statusLabel}</span>
    </span>
  );
};

export default MaintenanceStatusBadge;
