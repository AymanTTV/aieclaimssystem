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
      // Vehicle & Rental statuses
      case 'available':
        return 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-semibold';
      case 'hired':
      case 'active':
      case 'active on hire':
        return 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-semibold';
      case 'scheduled for hire':
      case 'scheduled-rental':
      case 'scheduled':
        return 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold';
      case 'scheduled-maintenance':
        return 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-semibold';
      case 'in-progress':
      case 'maintenance':
        return 'bg-orange-100 text-orange-950 border border-orange-300 font-semibold';
      case 'completed':
        return 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] font-semibold';
      case 'claim':
        return 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold';
      case 'unavailable':
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border border-slate-300 font-medium';
      case 'sold':
        return 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold';
      
      // Payment statuses
      case 'paid':
        return 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-semibold';
      case 'unpaid':
        return 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] font-bold';
      case 'partially_paid':
      case 'partially paid':
        return 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-semibold';
      case 'pending':
        return 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-medium';
      case 'overdue':
        return 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] font-bold';

      // Claim statuses
      case 'your claim has started':
        return 'bg-blue-100 text-blue-900 border border-blue-300 font-semibold';
      case 'reported to legal team':
        return 'bg-indigo-100 text-indigo-900 border border-indigo-300 font-semibold';
      case 'engineer report pending':
        return 'bg-yellow-100 text-yellow-950 border border-yellow-300 font-semibold';
      case 'awaiting tpi':
        return 'bg-orange-100 text-orange-950 border border-orange-300 font-semibold';
      case 'claim in progress':
        return 'bg-purple-100 text-purple-900 border border-purple-300 font-semibold';
      case 'claim complete':
        return 'bg-green-100 text-green-950 border border-green-300 font-semibold';
      
      // Claim Types & Reasons (PI, VD, Hire, Recovery, Storage)
      case 'pi':
        return 'bg-white text-black border border-gray-300 font-bold';
      case 'vd':
        return 'bg-white text-black border border-gray-300 font-bold';
      case 'credit hire':
      case 'hire':
        return 'bg-white text-black border border-gray-300 font-bold';
      case 'recovery':
        return 'bg-white text-black border border-gray-300 font-bold';
      case 'storage':
        return 'bg-white text-black border border-gray-300 font-bold';
      
      default:
        return 'bg-white text-black border border-gray-300 font-bold';
    }
  };

  const colorClass = getStatusColor(status);
  const isWhite = colorClass.includes('bg-white') || colorClass.includes('bg-gray-100');

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize status-badge-pill',
        isWhite ? 'bg-white text-black font-bold border border-gray-300' : colorClass,
        className
      )}
    >
      {String(status).replace(/[_-]/g, ' ')}
    </span>
  );
};

export default StatusBadge;