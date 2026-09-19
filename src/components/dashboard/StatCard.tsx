import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColor = 'text-primary' }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <div className={`rounded-xl p-2.5 ${iconColor.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${iconColor} bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 font-display">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;