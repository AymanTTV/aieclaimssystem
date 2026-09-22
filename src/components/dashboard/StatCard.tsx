import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColor = 'text-primary' }) => {
  const getContextualColors = () => {
    const t = title.toLowerCase();
    const c = iconColor.toLowerCase();

    if (t.includes('overdue') || t.includes('critical') || t.includes('expense') || t.includes('alert') || c.includes('red') || c.includes('rose')) {
      return {
        bg: 'bg-[#FEF2F2]',
        border: 'border-[#FECACA]',
        text: 'text-[#DC2626]',
        badge: 'bg-white border-[#FECACA] text-[#DC2626]',
      };
    }
    if (t.includes('completed') || t.includes('on-hire') || t.includes('in service') || t.includes('income') || t.includes('active hire') || c.includes('emerald') || c.includes('green')) {
      return {
        bg: 'bg-[#ECFDF5]',
        border: 'border-[#A7F3D0]',
        text: 'text-[#059669]',
        badge: 'bg-white border-[#A7F3D0] text-[#059669]',
      };
    }
    if (t.includes('progress') || t.includes('attention') || t.includes('warn') || c.includes('amber') || c.includes('yellow')) {
      return {
        bg: 'bg-[#FFFBEB]',
        border: 'border-[#FDE68A]',
        text: 'text-[#D97706]',
        badge: 'bg-white border-[#FDE68A] text-[#D97706]',
      };
    }
    if (t.includes('pending') || t.includes('not started') || t.includes('scheduled') || c.includes('slate') || c.includes('gray')) {
      return {
        bg: 'bg-[#F8FAFC]',
        border: 'border-[#CBD5E1]',
        text: 'text-[#334155]',
        badge: 'bg-white border-[#CBD5E1] text-[#334155]',
      };
    }
    // Default / Total / General Metrics
    return {
      bg: 'bg-[#F0F9FF]',
      border: 'border-[#BAE6FD]',
      text: 'text-[#0284C7]',
      badge: 'bg-white border-[#BAE6FD] text-[#0284C7]',
    };
  };

  const scheme = getContextualColors();

  return (
    <div
      className={`${scheme.bg} ${scheme.border} rounded-2xl shadow-xs p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group`}
      style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className={`text-xs font-bold uppercase tracking-wider ${scheme.text}`}>{title}</p>
        <div className={`rounded-xl p-2.5 border shadow-xs ${scheme.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative z-10 flex items-baseline justify-between">
        <p className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${scheme.text}`}>{value}</p>
      </div>
    </div>
  );
};

export default StatCard;