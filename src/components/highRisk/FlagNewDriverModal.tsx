// src/components/highRisk/FlagNewDriverModal.tsx
import React, { useState } from 'react';
import { X, UserPlus, ShieldAlert, Lock, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { NewDriverInput, RiskLevel, IncidentCategory } from '../../types/highRiskDriver';

interface FlagNewDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewDriverInput) => void;
  initialData?: { fullName?: string; badgeNumber?: string };
}

export const FlagNewDriverModal: React.FC<FlagNewDriverModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [badgeNumber, setBadgeNumber] = useState(initialData?.badgeNumber || '');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('High Risk');
  const [category, setCategory] = useState<IncidentCategory>('Damage');
  const [reportingFleet, setReportingFleet] = useState('Apex Rentals');
  const [categoryDetails, setCategoryDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialData?.fullName) {
      setFullName(initialData.fullName);
    }
    if (initialData?.badgeNumber) {
      setBadgeNumber(initialData.badgeNumber);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Please provide the Driver Full Name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!reportingFleet.trim()) {
      setError('Reporting fleet company is required.');
      return;
    }

    onSubmit({
      fullName: trimmed,
      badgeNumber: badgeNumber.trim() || undefined,
      riskLevel,
      category,
      categoryDetails: categoryDetails.trim() || undefined,
      reportingFleet: reportingFleet.trim(),
    });

    setFullName('');
    setBadgeNumber('');
    setCategoryDetails('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      {/* Modal Dialog Container with responsive height and sticky header/footer to ensure submit button is always visible */}
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#111a33] border-2 border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Pinned Modal Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-[#0b132b] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md shadow-red-950 flex-shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Add High Risk Driver</h3>
              <p className="text-xs text-red-300 font-medium">Authorized Manager Registration Form</p>
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
            
            {/* Zero-PII Compliance Notice */}
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/90 text-xs text-emerald-200 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong className="text-white">Zero-PII Compliance Active</strong>: Storing Legal Full Name, Risk Level, Category, and Reporting Fleet only.
              </span>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Field 1: Full Name */}
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
                placeholder="e.g. John Doe, Sarah Smith..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-300 mt-1 font-medium">
                Data minimization: Enter legal full name only. Zero driver license # or address collected.
              </p>
            </div>

            {/* 2-Column Responsive Row: Badge Number & Risk Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 2: Badge Number */}
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5 flex items-center justify-between"
                >
                  <span>2. Badge Number</span>
                  <span className="text-[10px] text-slate-300 font-normal">PCO / Fleet ID</span>
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

              {/* Field 3: Risk Level */}
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  3. Risk Level <span className="text-red-400">*</span>
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="High Risk" className="font-bold text-red-600 bg-white">
                    High Risk - Do Not Rent
                  </option>
                  <option value="Caution" className="font-bold text-amber-700 bg-white">
                    Caution - Enhanced Deposit
                  </option>
                </select>
              </div>
            </div>

            {/* 2-Column Responsive Row: Category & Reporting Fleet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 4: Incident Category */}
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  4. Incident Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                  data-light-input="true"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
                  style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                >
                  <option value="Damage" className="bg-white text-black font-bold">Damage (Unpaid Damage / Arrears)</option>
                  <option value="Non-Payment" className="bg-white text-black font-bold">Non-Payment (Defaulted Balance)</option>
                  <option value="Breach of Terms" className="bg-white text-black font-bold">Breach of Terms (Speeding / Terms)</option>
                  <option value="Fraud Attempt" className="bg-white text-black font-bold">Fraud Attempt (False Identity)</option>
                  <option value="Reckless Driving" className="bg-white text-black font-bold">Reckless Driving (Impoundment)</option>
                </select>
              </div>

              {/* Field 5: Reporting Fleet Company */}
              <div>
                <label
                  style={{ color: '#ffffff' }}
                  className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
                >
                  5. Reporting Fleet <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="w-4 h-4 text-gray-600" />
                  </div>
                  <input
                    type="text"
                    value={reportingFleet}
                    onChange={(e) => setReportingFleet(e.target.value)}
                    data-light-input="true"
                    placeholder="e.g. Apex Rentals, Skyline Fleet..."
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                    style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Field 6: Incident Details / Notes */}
            <div>
              <label
                style={{ color: '#ffffff' }}
                className="block text-xs font-black text-white uppercase tracking-wider mb-1.5"
              >
                6. Incident Notes / Reason Summary
              </label>
              <input
                type="text"
                value={categoryDetails}
                onChange={(e) => setCategoryDetails(e.target.value)}
                data-light-input="true"
                placeholder="e.g. Unpaid Damages £3,400, vehicle returned late with front bumper damage..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
                style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
              />
            </div>
          </div>

          {/* PINNED MODAL FOOTER WITH PROMINENT SUBMIT BUTTON (ALWAYS VISIBLE & PRESSABLE) */}
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
              title="Click to submit and save this high risk driver to registry"
            >
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
              <span>Submit &amp; Flag Driver</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
