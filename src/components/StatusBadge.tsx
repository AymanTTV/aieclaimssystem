import React from 'react';
import clsx from 'clsx';

type StatusType = 
  | 'available' 
  | 'hired'
  | 'scheduled-rental'
  | 'maintenance'
  | 'scheduled-maintenance'
  | 'claim'
  | 'unavailable'
  | 'sold'
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'completed'
  | 'cancelled'
  | string; // Allow any string to prevent type errors

interface StatusBadgeProps {
  status: StatusType | StatusType[];
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  if (!status) return null; // Return null if status is undefined

  // If status is an array, join the values
  const statusText = Array.isArray(status) ? status.join(', ') : status;

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    
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
      
      // Claim reasons
      case 'vd':
        return 'bg-blue-100 text-blue-800';
      case 'h':
        return 'bg-green-100 text-green-800';
      case 's':
        return 'bg-yellow-100 text-yellow-800';
      case 'pi':
        return 'bg-purple-100 text-purple-800';
      
      // Claim types
      case 'domestic':
        return 'bg-indigo-100 text-indigo-800';
      case 'taxi':
        return 'bg-orange-100 text-orange-800';
      case 'pco':
        return 'bg-teal-100 text-teal-800';
      
      // Case progress
      case 'win':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'awaiting':
        return 'bg-yellow-100 text-yellow-800';
      case '50/50':
        return 'bg-orange-100 text-orange-800';
      
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        getStatusColor(statusText),
        className
      )}
    >
      {statusText.replace(/[_-]/g, ' ')}
    </span>
  );
};

export default StatusBadge;