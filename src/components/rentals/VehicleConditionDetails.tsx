// src/components/rentals/VehicleConditionDetails.tsx

import React from 'react';
import { VehicleCondition, ReturnCondition } from '../../types/rental';
import { format } from 'date-fns';
import { Fuel, AlertTriangle, Check, X, Calendar, Gauge } from 'lucide-react';
import { ensureValidDate } from '../../utils/dateHelpers';

interface VehicleConditionDetailsProps {
  condition: VehicleCondition | ReturnCondition;
  type: 'check-out' | 'return';
}

const VehicleConditionDetails: React.FC<VehicleConditionDetailsProps> = ({
  condition,
  type
}) => {
  const isReturn = 'totalCharges' in condition;

  const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  return (
    <div className="space-y-4 text-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#121524] border border-[#2B314E] p-3.5 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date & Time
          </h3>
          <p className="mt-1 text-sm font-bold text-white font-mono">{formatDateTime(condition.date)}</p>
        </div>
        <div className="bg-[#121524] border border-[#2B314E] p-3.5 rounded-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-blue-400" /> Mileage
          </h3>
          <p className="mt-1 text-sm font-bold text-white font-mono">{condition.mileage.toLocaleString()} miles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#121524] border border-[#2B314E] p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fuel Level</span>
          </div>
          <span className="text-sm font-black font-mono text-white bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
            {condition.fuelLevel}%
          </span>
        </div>
        <div className="bg-[#121524] border border-[#2B314E] p-3.5 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cleanliness</span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
            condition.isClean 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {condition.isClean ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            {condition.isClean ? 'Clean' : 'Not Clean'}
          </span>
        </div>
      </div>

      {condition.hasDamage && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-4 text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">Damage Reported</h4>
              <p className="mt-1 text-sm text-rose-100 font-medium">{condition.damageDescription || 'Damage was reported during inspection.'}</p>
            </div>
          </div>
        </div>
      )}

      {isReturn && (condition as ReturnCondition).totalCharges > 0 && (
        <div className="bg-[#121524] border border-amber-500/40 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Return Additional Charges</h4>
          {(condition as ReturnCondition).damageCost > 0 && (
            <div className="flex justify-between text-xs text-slate-300">
              <span>Damage Cost:</span>
              <span className="font-mono font-bold text-white">£{(condition as ReturnCondition).damageCost?.toFixed(2)}</span>
            </div>
          )}
          {(condition as ReturnCondition).fuelCharge > 0 && (
            <div className="flex justify-between text-xs text-slate-300">
              <span>Fuel Charge:</span>
              <span className="font-mono font-bold text-white">£{(condition as ReturnCondition).fuelCharge?.toFixed(2)}</span>
            </div>
          )}
          {(condition as ReturnCondition).cleaningCharge > 0 && (
            <div className="flex justify-between text-xs text-slate-300">
              <span>Cleaning Charge:</span>
              <span className="font-mono font-bold text-white">£{(condition as ReturnCondition).cleaningCharge?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black pt-2 border-t border-[#2B314E] text-amber-300">
            <span>Total Return Charges:</span>
            <span className="font-mono">£{(condition as ReturnCondition).totalCharges.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleConditionDetails;
