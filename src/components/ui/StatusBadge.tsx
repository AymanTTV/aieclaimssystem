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
      // Vehicle & Maintenance statuses
      case 'available':
        return 'bg-emerald-100 text-emerald-900 border border-emerald-300';
      case 'hired':
      case 'active':
        return 'bg-blue-100 text-blue-900 border border-blue-300';
      case 'scheduled for hire':
      case 'scheduled-rental':
      case 'scheduled':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'scheduled-maintenance':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'in-progress':
      case 'maintenance':
        return 'bg-orange-100 text-orange-950 border border-orange-300 font-semibold';
      case 'completed':
        return 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-semibold';
      case 'claim':
        return 'bg-purple-100 text-purple-900 border border-purple-300';
      case 'unavailable':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border border-gray-300';
      case 'sold':
        return 'bg-yellow-100 text-yellow-900 border border-yellow-300';
      
      // Payment statuses
      case 'paid':
        return 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-semibold';
      case 'unpaid':
        return 'bg-purple-100 text-purple-950 border border-purple-300 font-bold';
      case 'partially_paid':
      case 'partially paid':
        return 'bg-blue-100 text-blue-950 border border-blue-300 font-semibold';
      case 'pending':
        return 'bg-amber-100 text-amber-950 border border-amber-300 font-medium';
      case 'overdue':
        return 'bg-rose-100 text-rose-950 border border-rose-300 font-bold';

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