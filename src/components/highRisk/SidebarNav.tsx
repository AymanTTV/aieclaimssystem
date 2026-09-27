// src/components/highRisk/SidebarNav.tsx
import React from 'react';
import {
  LayoutDashboard,
  Car,
  Users,
  ShieldAlert,
  Key,
  Settings,
  ShieldCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';

export type NavItemKey = 'dashboard' | 'rentals' | 'customers' | 'high_risk' | 'vehicles' | 'settings';

interface SidebarNavProps {
  activeNav: NavItemKey;
  onSelectNav: (nav: NavItemKey) => void;
  highRiskCount: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeNav,
  onSelectNav,
  highRiskCount,
}) => {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'rentals', label: 'Rentals', icon: Car },
    { key: 'customers', label: 'Customers', icon: Users },
    {
      key: 'high_risk',
      label: 'High Risk Registry',
      icon: ShieldAlert,
      badge: highRiskCount > 0 ? `${highRiskCount}` : undefined,
      isPrimary: true,
    },
    { key: 'vehicles', label: 'Vehicles', icon: Key },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-950/50 ring-2 ring-red-500/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Fleet Systems
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">Risk &amp; Verification</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.key;
          const isRegistry = item.key === 'high_risk';

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectNav(item.key as NavItemKey)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/50 ring-1 ring-red-400/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : isRegistry ? 'text-red-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                    isActive
                      ? 'bg-white text-red-700'
                      : 'bg-red-950 text-red-300 border border-red-800/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Security Seal */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Zero-PII Architecture</span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            Strict data protection: only Full Name and adverse fleet reports are processed.
          </p>
        </div>
      </div>
    </aside>
  );
};
