// src/components/highRisk/DeleteConfirmationModal.tsx
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { HighRiskDriver } from '../../types/highRiskDriver';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  driver: HighRiskDriver | null;
  onClose: () => void;
  onConfirm: (driverId: string) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  driver,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !driver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111a33] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-950/80 text-red-400 border border-red-800/80 flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight">Delete Driver Record?</h3>
              <p className="text-xs text-red-300 font-medium">This action will remove the adverse risk flag.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0c1427] border border-slate-800 text-xs text-slate-200 space-y-1.5 shadow-inner">
            <p>
              Driver: <strong className="text-white font-black text-sm">{driver.fullName}</strong>
              {driver.badgeNumber && <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-bold">[{driver.badgeNumber}]</span>}
            </p>
            <p>
              Risk Level: <strong className="text-red-400 font-bold">{driver.riskLevel}</strong> | Category:{' '}
              <strong className="text-slate-200 font-bold">{driver.category}</strong>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Reported by: <span className="text-slate-300 font-semibold">{driver.reportingFleet}</span> ({driver.reportedYear})
            </p>
          </div>

          <p className="text-xs text-slate-300 font-medium">
            Are you sure you want to permanently remove this driver from the High Risk registry? Future searches for this driver will return as &ldquo;Cleared&rdquo;.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(driver.id);
                onClose();
              }}
              className="px-4 py-2 text-xs font-black rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
