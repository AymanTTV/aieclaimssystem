import React from 'react';
import { VehicleStatus } from '../../types';
import StatusBadge from '../StatusBadge';

interface VehicleStatusDisplayProps {
  activeStatuses: VehicleStatus[];
}

export const VehicleStatusDisplay: React.FC<VehicleStatusDisplayProps> = ({ activeStatuses = [] }) => {
  // If no active statuses, show as available
  if (!activeStatuses?.length) {
    return <StatusBadge status="available" />;
  }

  return (
    <div className="space-y-1">
      {activeStatuses.map((status, index) => (
        <StatusBadge key={`${status}-${index}`} status={status} />
      ))}
    </div>
  );
};