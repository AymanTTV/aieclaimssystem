// src/components/ui/StatsCard.tsx
import React from 'react';
import type { ReactNode } from 'react';
import { Users } from 'lucide-react';

type Color = 'green' | 'orange' | 'blue' | 'indigo' | 'red' | 'gray' | 'purple';
const COLOR_BG: Record<Color, string> = {
  green: 'bg-green-50',
  orange: 'bg-orange-50',
  blue: 'bg-blue-50',
  indigo: 'bg-indigo-50',
  red: 'bg-red-50',
  gray: 'bg-gray-50',
  purple: 'bg-purple-50',
};
const COLOR_TEXT: Record<Color, string> = {
  green: 'text-green-600',
  orange: 'text-orange-600',
  blue: 'text-blue-600',
  indigo: 'text-indigo-600',
  red: 'text-red-600',
  gray: 'text-gray-600',
  purple: 'text-purple-600',
};

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: Color;
  hint?: string;
  right?: ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon = Users,
  color = 'blue',
  hint,
  right
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between space-x-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`p-3 rounded-full ${COLOR_BG[color]}`}>
        <Icon className={`h-6 w-6 ${COLOR_TEXT[color]}`} />
      </div>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-semibold text-gray-900">{value}</div>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
};

export default StatsCard;
