// src/components/highRisk/AddHighRiskDriverForm.tsx
import React, { useState } from 'react';
import { UserPlus, ShieldAlert, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { NewDriverInput, RiskLevel, IncidentCategory } from '../../types/highRiskDriver';

interface AddHighRiskDriverFormProps {
  onAddDriver: (input: NewDriverInput) => void;
  onSuccessQuickSearch?: (name: string) => void;
}

export const AddHighRiskDriverForm: React.FC<AddHighRiskDriverFormProps> = ({
  onAddDriver,
  onSuccessQuickSearch,
}) => {
  const [fullName, setFullName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('High Risk');
  const [category, setCategory] = useState<IncidentCategory>('Damage');
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = fullName.trim();

    if (!trimmed) {
      setError('Please provide the Driver Full Name.');
      return;
    }
    if (trimmed.length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }

    onAddDriver({
      fullName: trimmed,
      badgeNumber: badgeNumber.trim() || undefined,
      riskLevel,
      category,
    });

    const addedName = trimmed;
    setFullName('');
    setBadgeNumber('');
    setNotification(`Successfully added "${addedName}" to the High Risk database.`);

    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
            <UserPlus className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Add To High Risk List
            </h3>
            <p className="text-xs text-slate-400">
              Only 3 compliance fields required • Strict Zero-PII adherence
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>No License #, DOB, Phone or Address Stored</span>
        </div>
      </div>

      {notification && (
        <div className="mt-4 p-3 bg-emerald-900/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          {onSuccessQuickSearch && (
            <button
              type="button"
              onClick={() => {
                const match = notification.match(/"([^"]+)"/);
                if (match?.[1]) onSuccessQuickSearch(match[1]);
              }}
              className="text-[11px] font-bold text-emerald-400 underline hover:text-emerald-300 ml-2"
            >
              Test Search Now
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Field 1: Full Name */}
          <div>
            <label
              style={{ color: '#ffffff' }}
              className="block text-xs font-black text-white mb-1 uppercase tracking-wide"
            >
              1. Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError(null);
              }}
              data-light-input="true"
              placeholder="e.g. David Miller"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm search-input-white high-risk-input"
              style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
              required
            />
            <p className="text-[10px] text-slate-300 mt-1 font-medium">First &amp; Last name</p>
          </div>

          {/* Field 2: Badge Number */}
          <div>
            <label
              style={{ color: '#ffffff' }}
              className="block text-xs font-black text-white mb-1 uppercase tracking-wide flex items-center justify-between"
            >
              <span>2. Badge Number</span>
              <span className="text-[10px] text-slate-300 font-normal">PCO / Fleet badge ID</span>
            </label>
            <input
              type="text"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              data-light-input="true"
              placeholder="e.g. BDG-7492"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-slate-300 text-black placeholder:text-gray-500 font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm uppercase search-input-white high-risk-input"
              style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
            />
            <p className="text-[10px] text-slate-300 mt-1 font-medium">PCO / Fleet badge ID</p>
          </div>

          {/* Field 3: Risk Level */}
          <div>
            <label
              style={{ color: '#ffffff' }}
              className="block text-xs font-black text-white mb-1 uppercase tracking-wide"
            >
              3. Risk Level <span className="text-red-400">*</span>
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
              data-light-input="true"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
              style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
            >
              <option value="High Risk" className="bg-white text-black font-bold">High Risk (Do Not Rent)</option>
              <option value="Caution" className="bg-white text-black font-bold">Caution (Supervisor Review)</option>
            </select>
            <p className="text-[10px] text-slate-300 mt-1 font-medium">Severity tier</p>
          </div>

          {/* Field 4: Category */}
          <div>
            <label
              style={{ color: '#ffffff' }}
              className="block text-xs font-black text-white mb-1 uppercase tracking-wide"
            >
              4. Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory)}
              data-light-input="true"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border-2 border-slate-300 text-black font-bold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm cursor-pointer search-input-white high-risk-input"
              style={{ backgroundColor: '#ffffff', color: '#000000', WebkitTextFillColor: '#000000' }}
            >
              <option value="Damage" className="bg-white text-black font-bold">Damage</option>
              <option value="Non-Payment" className="bg-white text-black font-bold">Non-Payment</option>
              <option value="Breach of Terms" className="bg-white text-black font-bold">Breach of Terms</option>
            </select>
            <p className="text-[10px] text-slate-300 mt-1 font-medium">Incident classification</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Updates live database instantly across all internal desks.</span>
          </div>

          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/40 transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add To High Risk Database</span>
          </button>
        </div>
      </form>
    </div>
  );
};
