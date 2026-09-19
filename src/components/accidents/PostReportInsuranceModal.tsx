// src/components/accidents/PostReportInsuranceModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Accident } from '../../types';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import { 
  ShieldCheck, 
  PoundSterling, 
  Calendar, 
  Save, 
  Calculator, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Banknote,
  Lock
} from 'lucide-react';
import { calculateReportingTiming } from '../../utils/accidentCalculations';

interface PostReportInsuranceModalProps {
  accident: Accident;
  onClose: () => void;
}

export const PostReportInsuranceModal: React.FC<PostReportInsuranceModalProps> = ({ accident, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Initial reported date fallback
  const initialReportedDate = accident.reportedDate || (accident.submittedAt ? new Date(accident.submittedAt).toISOString().split('T')[0] : '');
  const initialReportedTime = accident.reportedTime || (accident.submittedAt ? new Date(accident.submittedAt).toTimeString().substring(0, 5) : '');

  const [formData, setFormData] = useState({
    claimNo: accident.claimNo || accident.refNo || accident.referenceNo || '',
    insuranceRefNo: accident.insuranceRefNo || '',
    accCd: accident.accCd || '',
    status: accident.status || 'pending',
    insuranceClaimStatus: accident.insuranceClaimStatus || 'pending',
    
    // Timeline & Reporting Fields
    accidentDate: accident.accidentDate || '',
    accidentTime: accident.accidentTime || '',
    reportedDate: initialReportedDate,
    reportedTime: initialReportedTime,
    claimReportedBy: accident.claimReportedBy || accident.submittedByName || '',
    driverName: accident.driverName || '',
    regNo: accident.regNo || accident.vehicleVRN || '',
    dateFormReceivedFromInsurance: accident.dateFormReceivedFromInsurance || '',

    // 24-Hour Late Reporting & Penalty State
    lateReportingPenalty: accident.lateReportingPenalty !== undefined ? accident.lateReportingPenalty : (accident.penaltyPayment || 0),

    // Classifications & Fault
    fault: accident.fault || accident.faultType || (accident.type === 'fault' ? 'Fault' : accident.type === 'non-fault' ? 'Non-Fault' : 'Fault'),
    excessApplies: accident.excessApplies || false,
    excessRecovered: accident.excessRecovered || false,

    // Financials & Estimates (Insurer Table Format)
    adPaid: accident.adPaid !== undefined ? accident.adPaid : 0,
    tpPaid: accident.tpPaid !== undefined ? accident.tpPaid : 0,
    incurred: accident.incurred !== undefined ? accident.incurred : 0,
    adEst: accident.adEst !== undefined ? accident.adEst : 0,
    tpPiEst: accident.tpPiEst !== undefined ? accident.tpPiEst : 0,
    tpDamageEst: accident.tpDamageEst !== undefined ? accident.tpDamageEst : 0,
    tpHireEst: accident.tpHireEst !== undefined ? accident.tpHireEst : 0,
    totalTpEst: accident.totalTpEst !== undefined ? accident.totalTpEst : 0,
    actRecovery: accident.actRecovery !== undefined ? accident.actRecovery : 0,
    outstandingRecovery: accident.outstandingRecovery !== undefined ? accident.outstandingRecovery : 0,

    // Outside Settlement / Notes
    settledOutsideInsurance: accident.settledOutsideInsurance || false,
    outsideSettlementAmount: accident.outsideSettlementAmount !== undefined ? accident.outsideSettlementAmount : 0,
    settlementNotes: accident.settlementNotes || '',
  });

  // Calculate 24-hour rule live
  const reportingTiming = useMemo(() => {
    return calculateReportingTiming({
      accidentDate: formData.accidentDate,
      accidentTime: formData.accidentTime,
      reportedDate: formData.reportedDate,
      reportedTime: formData.reportedTime,
      submittedAt: accident.submittedAt,
      existingPenalty: formData.lateReportingPenalty,
    });
  }, [
    formData.accidentDate,
    formData.accidentTime,
    formData.reportedDate,
    formData.reportedTime,
    formData.lateReportingPenalty,
    accident.submittedAt,
  ]);

  // Recalculate incurred: AD Paid + TP Paid
  const calculateIncurred = () => {
    const total = Number(((formData.adPaid || 0) + (formData.tpPaid || 0)).toFixed(2));
    setFormData(prev => ({ ...prev, incurred: total }));
  };

  // Recalculate Total TP Est: TP PI Est + TP Damage Est + TP Hire Est
  const calculateTotalTpEst = () => {
    const total = Number(((formData.tpPiEst || 0) + (formData.tpDamageEst || 0) + (formData.tpHireEst || 0)).toFixed(2));
    const outRecovery = Number(Math.max(0, total - (formData.actRecovery || 0)).toFixed(2));
    setFormData(prev => ({
      ...prev,
      totalTpEst: total,
      outstandingRecovery: outRecovery
    }));
  };

  // Recalculate Outstanding Recovery: Total TP Est - Act Recovery
  const calculateOutstandingRecovery = () => {
    const outRecovery = Number(Math.max(0, (formData.totalTpEst || 0) - (formData.actRecovery || 0)).toFixed(2));
    setFormData(prev => ({ ...prev, outstandingRecovery: outRecovery }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accident.id) return;

    setLoading(true);
    try {
      const accidentRef = doc(db, 'accidents', accident.id);

      // Apply late reporting rules to payload
      const isLate = reportingTiming.isLate;
      const finalLateReporting = isLate ? 'Yes' : 'No';
      const finalPenalty = isLate ? Number(formData.lateReportingPenalty || 0) : 0;

      const updatedPayload = {
        // Core Spreadsheet Columns
        claimNo: formData.claimNo,
        insuranceRefNo: formData.insuranceRefNo,
        accCd: formData.accCd,
        status: formData.status,
        insuranceClaimStatus: formData.insuranceClaimStatus,
        accidentDate: formData.accidentDate,
        accidentTime: formData.accidentTime,
        reportedDate: formData.reportedDate,
        reportedTime: formData.reportedTime,
        daysTakenToReport: reportingTiming.diffDays,
        timeToReportHours: reportingTiming.diffHours,
        timeToReportDisplay: reportingTiming.timeToReportDisplay,
        claimReportedBy: formData.claimReportedBy,
        driverName: formData.driverName,
        regNo: formData.regNo,
        vehicleVRN: formData.regNo || accident.vehicleVRN,
        dateFormReceivedFromInsurance: formData.dateFormReceivedFromInsurance,

        // 24-Hour Late Reporting & Penalty Rule Fields
        lateReporting: finalLateReporting,
        lateReportingPenalty: finalPenalty,
        penaltyPayment: finalPenalty,

        // Classifications & Fault
        fault: formData.fault,
        faultType: formData.fault,
        type: formData.fault === 'Fault' ? 'fault' : formData.fault === 'Non-Fault' ? 'non-fault' : (accident.type || 'pending'),
        excessApplies: formData.excessApplies,
        excessRecovered: formData.excessRecovered,

        // Financials & Estimates
        adPaid: Number(formData.adPaid) || 0,
        tpPaid: Number(formData.tpPaid) || 0,
        incurred: Number(formData.incurred) || 0,
        adEst: Number(formData.adEst) || 0,
        tpPiEst: Number(formData.tpPiEst) || 0,
        tpDamageEst: Number(formData.tpDamageEst) || 0,
        tpHireEst: Number(formData.tpHireEst) || 0,
        totalTpEst: Number(formData.totalTpEst) || 0,
        actRecovery: Number(formData.actRecovery) || 0,
        outstandingRecovery: Number(formData.outstandingRecovery) || 0,

        // Outside Settlement
        settledOutsideInsurance: formData.settledOutsideInsurance,
        outsideSettlementAmount: Number(formData.outsideSettlementAmount) || 0,
        settlementNotes: formData.settlementNotes,

        // Amount field compatibility
        amount: Number(formData.incurred) || Number(formData.adPaid) || accident.amount || 0,

        updatedAt: new Date(),
        updatedBy: user?.id || 'system',
      };

      await updateDoc(accidentRef, updatedPayload);
      toast.success('Insurance details and reporting rules synced successfully');
      onClose();
    } catch (err) {
      console.error('Error updating insurance data:', err);
      toast.error('Failed to update insurance details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[82vh] overflow-y-auto px-1 pr-2">
      {/* Header Banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start space-x-3">
        <FileSpreadsheet className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm text-indigo-900">
          <p className="font-semibold text-base text-indigo-950">Post-Report Insurance Data</p>
          <p className="text-indigo-700 mt-0.5">
            Record verified insurer feedback, 24-hour reporting compliance, settlement financials, accident codes, and outside settlements.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/90 border border-indigo-200 px-2 py-0.5 rounded font-medium text-indigo-950">
              Claim No: {formData.claimNo || 'N/A'}
            </span>
            <span className="bg-white/90 border border-indigo-200 px-2 py-0.5 rounded font-medium text-indigo-950">
              Driver: {formData.driverName || 'N/A'}
            </span>
            <span className="bg-white/90 border border-indigo-200 px-2 py-0.5 rounded font-medium text-indigo-950">
              VRN: {formData.regNo || 'N/A'}
            </span>
            <span className="bg-white/90 border border-indigo-200 px-2 py-0.5 rounded font-medium text-indigo-950">
              Accident: {reportingTiming.accidentDateTimeStr}
            </span>
          </div>
        </div>
      </div>

      {/* 1. 24-Hour Late Reporting & Timeline Engine */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Timeline & 24-Hour Reporting Rule Engine
            </h4>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">Auto-Calculates Late Reporting & Penalties</span>
        </div>

        {/* Date & Time Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <FormField
            type="date"
            label="Accident Date"
            value={formData.accidentDate}
            onChange={(e) => setFormData({ ...formData, accidentDate: e.target.value })}
          />
          <FormField
            type="time"
            label="Accident Time"
            value={formData.accidentTime}
            onChange={(e) => setFormData({ ...formData, accidentTime: e.target.value })}
          />
          <FormField
            type="date"
            label="Reported Date"
            value={formData.reportedDate}
            onChange={(e) => setFormData({ ...formData, reportedDate: e.target.value })}
          />
          <FormField
            type="time"
            label="Reported Time"
            value={formData.reportedTime}
            onChange={(e) => setFormData({ ...formData, reportedTime: e.target.value })}
          />
        </div>

        {/* Live 24-Hour Calculation Result Banner */}
        <div className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
          reportingTiming.isLate 
            ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-start space-x-3">
            {reportingTiming.isLate ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Late Reporting Status:
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                  reportingTiming.isLate 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-emerald-600 text-white'
                }`}>
                  {reportingTiming.lateReporting} {reportingTiming.isLate ? '(> 24 Hours)' : '(≤ 24 Hours)'}
                </span>
              </div>
              <p className="text-xs mt-1 text-gray-700">
                {reportingTiming.isLate 
                  ? `Claim was reported after 24 hours (${reportingTiming.timeToReportDisplay}). Late reporting penalty applies.`
                  : `Claim was reported within the 24-hour compliance window (${reportingTiming.timeToReportDisplay}). No penalty applies (£0.00).`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Locked Read-Only Time Taken */}
            <div className="bg-white/80 border border-gray-300 rounded px-3 py-1 text-center shadow-xs">
              <span className="block text-[10px] text-gray-500 font-medium uppercase flex items-center justify-center space-x-1">
                <Lock className="w-2.5 h-2.5 inline mr-0.5" />
                Time to Report
              </span>
              <span className="text-xs font-bold text-gray-900">{reportingTiming.timeToReportDisplay}</span>
            </div>

            {/* Penalty Payment Display / Editable when late */}
            <div className="bg-white border rounded px-3 py-1 text-center shadow-xs min-w-[130px]">
              <span className="block text-[10px] text-gray-500 font-medium uppercase">Penalty Payment</span>
              <span className={`text-sm font-bold ${reportingTiming.isLate ? 'text-rose-700' : 'text-emerald-700'}`}>
                £{reportingTiming.isLate ? (Number(formData.lateReportingPenalty) || 0).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Late Reporting Penalty if Late */}
        {reportingTiming.isLate && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-900">Late Reporting Penalty (£ Amount)</span>
              <p className="text-[11px] text-amber-700">Because reporting took &gt; 24 hours, enter the applicable late penalty fee.</p>
            </div>
            <div className="w-full sm:w-48">
              <FormField
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50.00"
                value={formData.lateReportingPenalty || ''}
                onChange={(e) => setFormData({ ...formData, lateReportingPenalty: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Identification & Insurance Metadata */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b pb-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Claim Identification & Response Details
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <FormField
            label="Claim No"
            placeholder="e.g. CLM-84920"
            value={formData.claimNo}
            onChange={(e) => setFormData({ ...formData, claimNo: e.target.value })}
          />
          <FormField
            label="Insurer Ref No"
            placeholder="e.g. INS-48201"
            value={formData.insuranceRefNo}
            onChange={(e) => setFormData({ ...formData, insuranceRefNo: e.target.value })}
          />
          <FormField
            label="Acc Cd (Accident Code)"
            placeholder="e.g. ACC-01 / REAR"
            value={formData.accCd}
            onChange={(e) => setFormData({ ...formData, accCd: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Claim Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full text-xs sm:text-sm rounded-md border-gray-300 shadow-xs focus:border-primary focus:ring-primary py-2"
            >
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="processing">Processing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <FormField
            label="Claim Reported By"
            placeholder="e.g. John Doe (Driver)"
            value={formData.claimReportedBy}
            onChange={(e) => setFormData({ ...formData, claimReportedBy: e.target.value })}
          />
          <FormField
            label="Driver Name"
            value={formData.driverName}
            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
          />
          <FormField
            label="Reg No (VRN)"
            placeholder="e.g. AB21 CDE"
            value={formData.regNo}
            onChange={(e) => setFormData({ ...formData, regNo: e.target.value.toUpperCase() })}
          />
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Insurance Claim Status</label>
            <select
              value={formData.insuranceClaimStatus}
              onChange={(e) => setFormData({ ...formData, insuranceClaimStatus: e.target.value })}
              className="w-full text-xs sm:text-sm rounded-md border-gray-300 shadow-xs focus:border-primary focus:ring-primary py-2"
            >
              <option value="pending">Pending</option>
              <option value="submitted">Submitted to Insurer</option>
              <option value="under_review">Under Review / Investigation</option>
              <option value="accepted">Liability Accepted</option>
              <option value="disputed">Liability Disputed</option>
              <option value="settled">Settled</option>
              <option value="closed">Closed / Repudiated</option>
            </select>
          </div>
          <FormField
            type="date"
            label="Date Form Rec'd from Ins."
            value={formData.dateFormReceivedFromInsurance}
            onChange={(e) => setFormData({ ...formData, dateFormReceivedFromInsurance: e.target.value })}
          />
        </div>
      </div>

      {/* 3. Classifications & Excess */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b pb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Classifications & Excess
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fault Designation</label>
            <div className="flex rounded-md shadow-xs">
              {(['Fault', 'Non-Fault', 'Split'] as const).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFormData({ ...formData, fault: ft })}
                  className={`flex-1 py-2 text-xs font-semibold border first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 transition-colors ${
                    formData.fault === ft
                      ? ft === 'Fault'
                        ? 'bg-rose-600 text-white border-rose-600 z-10'
                        : ft === 'Non-Fault'
                        ? 'bg-emerald-600 text-white border-emerald-600 z-10'
                        : 'bg-amber-600 text-white border-amber-600 z-10'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Excess Applies?</label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessApplies: false })}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-colors ${
                  !formData.excessApplies
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessApplies: true })}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-colors ${
                  formData.excessApplies
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Excess Recovered?</label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessRecovered: false })}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-colors ${
                  !formData.excessRecovered
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, excessRecovered: true })}
                className={`flex-1 py-2 text-xs font-semibold rounded-md border transition-colors ${
                  formData.excessRecovered
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Financials & Estimates (Exact Insurer Spreadsheet Layout) */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center space-x-2">
            <PoundSterling className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Financials & Estimates (Exact Insurer Table Layout)
            </h4>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">All figures in GBP (£)</span>
        </div>

        {/* Paid & Incurred Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="AD Paid (£)"
            placeholder="0.00"
            value={formData.adPaid || ''}
            onChange={(e) => setFormData({ ...formData, adPaid: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Paid (£)"
            placeholder="0.00"
            value={formData.tpPaid || ''}
            onChange={(e) => setFormData({ ...formData, tpPaid: parseFloat(e.target.value) || 0 })}
          />
          <div className="relative">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Incurred (£)"
              placeholder="0.00"
              value={formData.incurred || ''}
              onChange={(e) => setFormData({ ...formData, incurred: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={calculateIncurred}
              className="absolute right-0 top-0 text-[10px] text-indigo-600 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <Calculator className="w-3 h-3" />
              <span>Sum (AD+TP Paid)</span>
            </button>
          </div>
        </div>

        {/* Estimates Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="AD Est (£)"
            placeholder="0.00"
            value={formData.adEst || ''}
            onChange={(e) => setFormData({ ...formData, adEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP PI Est (£)"
            placeholder="0.00"
            value={formData.tpPiEst || ''}
            onChange={(e) => setFormData({ ...formData, tpPiEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Damage Est (£)"
            placeholder="0.00"
            value={formData.tpDamageEst || ''}
            onChange={(e) => setFormData({ ...formData, tpDamageEst: parseFloat(e.target.value) || 0 })}
          />
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="TP Hire Est (£)"
            placeholder="0.00"
            value={formData.tpHireEst || ''}
            onChange={(e) => setFormData({ ...formData, tpHireEst: parseFloat(e.target.value) || 0 })}
          />
        </div>

        {/* Totals & Recoveries Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
          <div className="relative">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Total TP Est (£)"
              placeholder="0.00"
              value={formData.totalTpEst || ''}
              onChange={(e) => setFormData({ ...formData, totalTpEst: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={calculateTotalTpEst}
              className="absolute right-0 top-0 text-[10px] text-emerald-700 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <Calculator className="w-3 h-3" />
              <span>Sum (PI+Dmg+Hire)</span>
            </button>
          </div>
          <FormField
            type="number"
            step="0.01"
            min="0"
            label="Act Recovery (£)"
            placeholder="0.00"
            value={formData.actRecovery || ''}
            onChange={(e) => setFormData({ ...formData, actRecovery: parseFloat(e.target.value) || 0 })}
          />
          <div className="relative">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Outstanding Recovery (£)"
              placeholder="0.00"
              value={formData.outstandingRecovery || ''}
              onChange={(e) => setFormData({ ...formData, outstandingRecovery: parseFloat(e.target.value) || 0 })}
            />
            <button
              type="button"
              onClick={calculateOutstandingRecovery}
              className="absolute right-0 top-0 text-[10px] text-emerald-700 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <Calculator className="w-3 h-3" />
              <span>Total TP - Act Rec</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Outside Settlement (Direct / Private) */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Outside Settlement / Direct Agreement
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Settled Outside Insurer?</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, settledOutsideInsurance: !formData.settledOutsideInsurance })}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                formData.settledOutsideInsurance
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {formData.settledOutsideInsurance ? 'Yes' : 'No'}
            </button>
          </div>
        </div>
        {formData.settledOutsideInsurance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <FormField
              type="number"
              step="0.01"
              min="0"
              label="Outside Settlement Paid (£)"
              value={formData.outsideSettlementAmount || ''}
              onChange={(e) => setFormData({ ...formData, outsideSettlementAmount: parseFloat(e.target.value) || 0 })}
            />
            <div className="sm:col-span-2">
              <TextArea
                label="Settlement / Insurer Notes"
                rows={2}
                value={formData.settlementNotes}
                onChange={(e) => setFormData({ ...formData, settlementNotes: e.target.value })}
                placeholder="Details of agreement, reference communications, or insurer responses..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-3 border-t">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving & Syncing...' : 'Save & Sync Insurance Info'}</span>
        </button>
      </div>
    </form>
  );
};

export default PostReportInsuranceModal;
