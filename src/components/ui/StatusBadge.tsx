import React from 'react';
import clsx from 'clsx';

type StatusType = 
  | 'active' 
  | 'maintenance' 
  | 'rented'
  | 'claim'
  | 'unavailable'
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'fault'
  | 'non-fault'
  | 'settled'
  | 'won'
  | 'lost';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'claim':
        return 'bg-purple-100 text-purple-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'fault':
        return 'bg-red-100 text-red-800';
      case 'non-fault':
        return 'bg-blue-100 text-blue-800';
      case 'settled':
        return 'bg-green-100 text-green-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
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