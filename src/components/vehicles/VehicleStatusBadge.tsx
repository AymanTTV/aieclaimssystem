import React from 'react';
import { VehicleStatus } from '../../types';
import clsx from 'clsx';

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

const VehicleStatusBadge: React.FC<VehicleStatusBadgeProps> = ({ status, className }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'test-scheduled': return 'bg-purple-100 text-purple-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'sold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      getStatusColor(),
      className
    )}>
      {status.replace('-', ' ')}
    </span>
  );
};

export default VehicleStatusBadge;