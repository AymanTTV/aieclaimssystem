// src/components/highRisk/HighRiskHeader.tsx
import React from 'react';
import {
  ShieldAlert,
  Lock,
  Share2,
  Users,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { HighRiskDriver } from '../../types/highRiskDriver';
import { ExportHighRiskMenu } from './ExportHighRiskMenu';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface HighRiskHeaderProps {
  activeTab: 'internal' | 'external';
  onTabChange: (tab: 'internal' | 'external') => void;
  databaseCount: number;
  onCopyPartnerLink: () => void;
  copied: boolean;
  onOpenImport?: () => void;
  drivers?: HighRiskDriver[];
}

export const HighRiskHeader: React.FC<HighRiskHeaderProps> = ({
  activeTab,
  onTabChange,
  databaseCount: _databaseCount,
  onCopyPartnerLink,
  copied,
  onOpenImport,
  drivers,
}) => {
  const { user } = useAuth();
  const { can } = usePermissions();

  const canCreate = can('highRisk', 'create');
  const canUpdate = can('highRisk', 'update');
  const canDelete = can('highRisk', 'delete');
  const canExport = can('highRisk', 'export');
  const canImport = can('highRisk', 'import');

  return (
    <header className="bg-[#0b132b] border-b border-slate-800 text-white shadow-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between py-4 gap-4">
          {/* Brand Title & Data Protection Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-950/50 ring-2 ring-red-500/20 flex-shrink-0 text-white">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                  High Risk Registry
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-red-950/80 text-red-300 border border-red-800/80">
                  Dual-Portal Protocol
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold text-emerald-300">
                  Data Protection Compliant: Full Name Verification Only • Zero Sensitive PII Stored
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Import & Export only (Guarded by matrix permissions) */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {/* Import Records Button (Strict Matrix Guard: import === true) */}
            {onOpenImport && canImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition cursor-pointer"
                title="Bulk import high risk drivers from CSV, Excel, or JSON"
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>Import</span>
              </button>
            )}

            {/* Export Records Menu (Strict Matrix Guard: export === true) */}
            {drivers && canExport && (
              <ExportHighRiskMenu
                drivers={drivers}
                compact={true}
              />
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 -mb-px overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onTabChange('internal')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'internal'
                ? 'border-red-500 text-red-400 bg-red-950/30'
                : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4 text-red-400" />
            <span className="font-extrabold">TAB 1: Internal High Risk Check</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              activeTab === 'internal'
                ? 'bg-red-950/80 text-red-200 border-red-700'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              Staff Desk View
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('external')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'external'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                : 'border-transparent text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Search className="w-4 h-4 text-indigo-400" />
            <span className="font-extrabold">TAB 2: External Partner Fleet Search</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              activeTab === 'external'
                ? 'bg-indigo-950/80 text-indigo-200 border-indigo-700'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              Shared Partner Link View
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
