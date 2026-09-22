import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColor = 'text-primary' }) => {
  const getPalette = (colorStr: string) => {
    if (colorStr.includes('emerald') || colorStr.includes('green')) {
      return {
        label: 'text-emerald-300',
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      };
    }
    if (colorStr.includes('blue') || colorStr.includes('primary')) {
      return {
        label: 'text-blue-300',
        badge: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      };
    }
    if (colorStr.includes('indigo')) {
      return {
        label: 'text-indigo-300',
        badge: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
      };
    }
    if (colorStr.includes('amber') || colorStr.includes('yellow')) {
      return {
        label: 'text-amber-300',
        badge: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      };
    }
    if (colorStr.includes('purple')) {
      return {
        label: 'text-purple-300',
        badge: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      };
    }
    if (colorStr.includes('teal')) {
      return {
        label: 'text-teal-300',
        badge: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
      };
    }
    if (colorStr.includes('rose') || colorStr.includes('red')) {
      return {
        label: 'text-rose-300',
        badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      };
    }
    return {
      label: 'text-slate-300',
      badge: 'bg-slate-800/80 border-slate-700/60 text-slate-200',
    };
  };

  const palette = getPalette(iconColor);

  return (
    <div className="bg-[#16192B] rounded-2xl shadow-xl border border-[#2B314E] p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#3D456E] hover:shadow-2xl relative overflow-hidden group">
      {/* Subtle watermark icon in corner */}
      <Icon className="absolute -right-3 -bottom-3 w-24 h-24 text-white/[0.04] pointer-events-none select-none transition-transform group-hover:scale-110" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className={`text-xs font-bold uppercase tracking-wider ${palette.label}`}>{title}</p>
        <div className={`rounded-xl p-2.5 border shadow-xs ${palette.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative z-10 flex items-baseline justify-between">
        <p className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;