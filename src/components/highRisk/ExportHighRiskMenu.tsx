// src/components/highRisk/ExportHighRiskMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  ChevronDown,
  FileDown,
} from 'lucide-react';
import { HighRiskDriver } from '../../types/highRiskDriver';
import {
  exportHighRiskToCSV,
  exportHighRiskToExcel,
  exportHighRiskToJSON,
  downloadHighRiskTemplate,
} from '../../services/highRiskExportImport';
import toast from 'react-hot-toast';

interface ExportHighRiskMenuProps {
  drivers: HighRiskDriver[];
  filteredDrivers?: HighRiskDriver[];
  compact?: boolean;
}

export const ExportHighRiskMenu: React.FC<ExportHighRiskMenuProps> = ({
  drivers,
  filteredDrivers,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const targetList = filteredDrivers && filteredDrivers.length > 0 ? filteredDrivers : drivers;
  const isFiltered = filteredDrivers && filteredDrivers.length < drivers.length;

  const handleExportCSV = (all = false) => {
    const listToExport = all ? drivers : targetList;
    if (listToExport.length === 0) {
      toast.error('No records available to export.');
      return;
    }
    exportHighRiskToCSV(listToExport);
    toast.success(`Exported ${listToExport.length} high-risk drivers to CSV`);
    setIsOpen(false);
  };

  const handleExportExcel = (all = false) => {
    const listToExport = all ? drivers : targetList;
    if (listToExport.length === 0) {
      toast.error('No records available to export.');
      return;
    }
    exportHighRiskToExcel(listToExport);
    toast.success(`Exported ${listToExport.length} high-risk drivers to Excel (.xlsx)`);
    setIsOpen(false);
  };

  const handleExportJSON = (all = false) => {
    const listToExport = all ? drivers : targetList;
    if (listToExport.length === 0) {
      toast.error('No records available to export.');
      return;
    }
    exportHighRiskToJSON(listToExport);
    toast.success(`Exported ${listToExport.length} high-risk drivers to JSON`);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 font-bold rounded-xl border transition shadow-sm cursor-pointer ${
          compact
            ? 'px-3 py-1.5 text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
            : 'px-4 py-2.5 text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
        }`}
        title="Export High Risk registry records"
      >
        <Download className="w-4 h-4 text-emerald-400" />
        <span>Export Records</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-[#0d1630] border-2 border-slate-700 shadow-2xl ring-1 ring-black/50 z-50 p-2 animate-in fade-in zoom-in-95 duration-100 text-slate-200">
          <div className="px-3 py-2 border-b border-slate-800 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Export Destination
            </span>
            <span className="text-xs font-bold text-white">
              {isFiltered
                ? `Filtered View (${targetList.length} of ${drivers.length} drivers)`
                : `All Drivers (${drivers.length} total)`}
            </span>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition cursor-pointer text-left"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <div className="flex-1">
                <span>Export as CSV (.csv)</span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Universal spreadsheet &amp; CRM format
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition cursor-pointer text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <div className="flex-1">
                <span>Export as Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Formatted workbooks with headers
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleExportJSON(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition cursor-pointer text-left"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              <div className="flex-1">
                <span>Export as JSON (.json)</span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Complete database backup &amp; migration
                </span>
              </div>
            </button>

            {isFiltered && (
              <div className="pt-1 mt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleExportCSV(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer text-left"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export All {drivers.length} Records (Bypass filter)</span>
                </button>
              </div>
            )}

            <div className="pt-1 mt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  downloadHighRiskTemplate('csv');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition cursor-pointer text-left"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
