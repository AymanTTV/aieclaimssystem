import React from 'react';
import clsx from 'clsx';

type StatusType = 
  // Vehicle statuses
  | 'available' 
  | 'hired'
  | 'scheduled-rental'
  | 'maintenance'
  | 'scheduled-maintenance'
  | 'claim'
  | 'unavailable'
  | 'sold'
  // Maintenance statuses
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  // Payment statuses
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  // Claim statuses
  | 'fault'
  | 'non-fault'
  | 'settled'
  | 'won'
  | 'lost'
  // Rental statuses
  | 'active'
  | 'scheduled';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      // Vehicle statuses
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'hired':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled for hire':
      case 'scheduled-rental':
      case 'scheduled':
        return 'bg-sky-100 text-sky-800';
      case 'maintenance':
      case 'in-progress':
        return 'bg-red-100 text-red-800';
      case 'scheduled-maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'claim':
        return 'bg-purple-100 text-purple-800';
      case 'unavailable':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'sold':
        return 'bg-yellow-100 text-yellow-800';
      
      // Payment statuses
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partially_paid':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      
      // Claim statuses
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
      {status.replace(/[_-]/g, ' ')}
    </span>
  );
};

export default StatusBadge;