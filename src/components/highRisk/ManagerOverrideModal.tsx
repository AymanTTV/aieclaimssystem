// src/components/highRisk/ManagerOverrideModal.tsx
import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, KeyRound, UserCheck } from 'lucide-react';
import { HighRiskDriver, OverridePayload } from '../../types/highRiskDriver';

interface ManagerOverrideModalProps {
  isOpen: boolean;
  driver: HighRiskDriver | null;
  onClose: () => void;
  onConfirmOverride: (driverId: string, payload: OverridePayload) => void;
}

export const ManagerOverrideModal: React.FC<ManagerOverrideModalProps> = ({
  isOpen,
  driver,
  onClose,
  onConfirmOverride,
}) => {
  const [managerName, setManagerName] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [reason, setReason] = useState('Senior Management Authorization - Additional security deposit collected');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !driver) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName.trim()) {
      setError('Manager full name is required for audit trail.');
      return;
    }
    if (!managerPin.trim()) {
      setError('Manager PIN or Authorization Code is required.');
      return;
    }
    if (!reason.trim()) {
      setError('A formal justification reason is required for high-risk override.');
      return;
    }

    onConfirmOverride(driver.id, {
      managerName: managerName.trim(),
      managerPin: managerPin.trim(),
      reason: reason.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#111a33] border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-[#0b132b] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-950 flex-shrink-0">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Manager Override Authorization</h3>
              <p className="text-xs text-red-300 font-medium">Security Escalation Protocol</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Warning Banner */}
            <div className="p-3.5 bg-amber-950/70 border border-amber-800/90 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-1">
                <p className="font-bold">
                  Overriding flag for: <span className="underline font-black text-white">{driver.fullName}</span> {driver.badgeNumber && <span className="font-mono text-amber-300 font-black">[{driver.badgeNumber}]</span>} (Risk: {driver.riskLevel} - {driver.category})
                </p>
                <p className="text-amber-200/90 font-medium">
                  This action permits customer rental checkout despite active adverse history. A mandatory audit log entry with your credentials and reason will be permanently stored.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                1. Authorizing Manager Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => {
                    setManagerName(e.target.value);
                    setError(null);
                  }}
                  data-light-input="true"
                  placeholder="e.g. Alex Morgan (Branch Manager)"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                2. Manager Security PIN / Authorization Code <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => {
                    setManagerPin(e.target.value);
                    setError(null);
                  }}
                  data-light-input="true"
                  placeholder="Enter 4-6 digit manager PIN..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                  required
                />
              </div>
            </div>

            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                3. Justification / Clearance Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                data-light-input="true"
                placeholder="State legitimate reason: e.g. Arrears settled in full, double security deposit paid, corporate guarantor provided..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                required
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 sm:py-4 bg-[#0b132b] border-t-2 border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-xl shadow-red-950/60 border border-red-500 transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-500/40"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
              <span>Approve &amp; Clear Handover</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
