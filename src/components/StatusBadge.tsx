import React from 'react';
import clsx from 'clsx';

type StatusType = 
  | 'active' 
  | 'maintenance'
  | 'scheduled-maintenance'
  | 'rented'
  | 'scheduled-rental'
  | 'claim'
  | 'unavailable'
  | 'sold';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  if (!status) return null; // or display a default badge

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled-maintenance':
        return 'bg-yellow-50 text-yellow-600';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled-rental':
        return 'bg-blue-50 text-blue-600';
      case 'claim':
        return 'bg-purple-100 text-purple-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'sold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        getStatusColor(status),
        className
      )}
    >
      {status.replace('-', ' ')}
    </span>
  );
};

export default StatusBadge;