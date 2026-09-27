// src/components/highRisk/EditDriverModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Edit3, ShieldAlert, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { HighRiskDriver, EditDriverInput, RiskLevel, IncidentCategory } from '../../types/highRiskDriver';

interface EditDriverModalProps {
  isOpen: boolean;
  driver: HighRiskDriver | null;
  onClose: () => void;
  onSave: (driverId: string, input: EditDriverInput) => void;
}

export const EditDriverModal: React.FC<EditDriverModalProps> = ({
  isOpen,
  driver,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('High Risk');
  const [category, setCategory] = useState<IncidentCategory>('Damage');
  const [reportingFleet, setReportingFleet] = useState('');
  const [categoryDetails, setCategoryDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setFullName(driver.fullName);
      setBadgeNumber(driver.badgeNumber || '');
      setRiskLevel(driver.riskLevel);
      setCategory(driver.category);
      setReportingFleet(driver.reportingFleet || 'Apex Rentals');
      setCategoryDetails(driver.categoryDetails || '');
      setError(null);
    }
  }, [driver]);

  if (!isOpen || !driver) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Driver full name is required.');
      return;
    }
    if (!reportingFleet.trim()) {
      setError('Reporting fleet company is required.');
      return;
    }

    onSave(driver.id, {
      fullName: trimmed,
      badgeNumber: badgeNumber.trim() || undefined,
      riskLevel,
      category,
      reportingFleet: reportingFleet.trim(),
      categoryDetails: categoryDetails.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      {/* Modal Dialog Container with responsive height and sticky header/footer */}
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#111a33] border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Pinned Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-[#0b132b] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-950 flex-shrink-0">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Edit High Risk Driver</h3>
              <p className="text-xs text-red-300 font-medium">Authorized Manager Permissions Active</p>
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
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/90 text-xs text-emerald-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong className="text-white">Zero-PII Compliance</strong>: Update only permitted registry fields. No license number, address, or DOB stored.
              </span>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                1. Driver Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError(null);
                }}
                data-light-input="true"
                placeholder="e.g. John Smith"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                required
              />
            </div>

            {/* Badge Number */}
            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5 flex items-center justify-between"
              >
                <span>2. Driver Badge Number</span>
                <span className="text-[10px] text-slate-300 font-normal">PCO / Fleet Badge ID</span>
              </label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                data-light-input="true"
                placeholder="e.g. BDG-8821, TX-4091..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm uppercase search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
              />
            </div>

            {/* Risk Level & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  3. Risk Status <span className="text-red-400">*</span>
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="High Risk" className="bg-white text-black font-bold">High Risk</option>
                  <option value="Caution" className="bg-white text-black font-bold">Caution</option>
                  <option value="Cleared" className="bg-white text-black font-bold">Cleared</option>
                </select>
              </div>

              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  4. Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="Damage" className="bg-white text-black font-bold">Damage</option>
                  <option value="Non-Payment" className="bg-white text-black font-bold">Non-Payment</option>
                  <option value="Breach of Terms" className="bg-white text-black font-bold">Breach of Terms</option>
                  <option value="Fraud Attempt" className="bg-white text-black font-bold">Fraud Attempt</option>
                  <option value="Reckless Driving" className="bg-white text-black font-bold">Reckless Driving</option>
                </select>
              </div>
            </div>

            {/* Reporting Fleet Company */}
            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                5. Reporting Fleet Company <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={reportingFleet}
                onChange={(e) => setReportingFleet(e.target.value)}
                data-light-input="true"
                placeholder="e.g. Apex Rentals"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                required
              />
            </div>

            {/* Category Details */}
            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                6. Incident Details / Reason Summary
              </label>
              <textarea
                rows={2}
                value={categoryDetails}
                onChange={(e) => setCategoryDetails(e.target.value)}
                data-light-input="true"
                placeholder="e.g. Unpaid vehicle damage arrears of £3,400..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
              />
            </div>
          </div>

          {/* Pinned Footer */}
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
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
              <span>Save Record Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
