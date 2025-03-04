import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  if (!status) return null;

  const getStatusColor = (status: string): string => {
    // Convert status to lowercase string for comparison
    const statusLower = String(status).toLowerCase();

    switch (statusLower) {
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
      case 'partially paid':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';

      // Claim statuses
      case 'your claim has started':
        return 'bg-blue-100 text-blue-800';
      case 'reported to legal team':
        return 'bg-indigo-100 text-indigo-800';
      case 'engineer report pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'awaiting tpi':
        return 'bg-orange-100 text-orange-800';
      case 'claim in progress':
        return 'bg-purple-100 text-purple-800';
      case 'claim complete':
        return 'bg-green-100 text-green-800';
      
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
      {String(status).replace(/[_-]/g, ' ')}
    </span>
  );
};

export default StatusBadge;