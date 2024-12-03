import React from 'react';

type StatusType = 'active' | 'maintenance' | 'unavailable' | 
                 'scheduled' | 'in-progress' | 'completed' | 
                 'pending' | 'paid' | 'overdue' |
                 'reported' | 'investigating' | 'processing' | 'resolved';

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: StatusType) => {
    const colors = {
      active: 'bg-secondary-100 text-secondary-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      unavailable: 'bg-red-100 text-red-700',
      scheduled: 'bg-blue-100 text-blue-700',
      'in-progress': 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-orange-100 text-orange-700',
      paid: 'bg-secondary-100 text-secondary-700',
      overdue: 'bg-red-100 text-red-700',
      reported: 'bg-yellow-100 text-yellow-700',
      investigating: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;