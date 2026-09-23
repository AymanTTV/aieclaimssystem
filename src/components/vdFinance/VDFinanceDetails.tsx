// src/components/vdFinance/VDFinanceDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { VDFinanceRecord } from '../../types/vdFinance';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import {
  FileText,
  PoundSterling,
  Wrench,
  Clock,
  Building,
  Layers,
  Calendar,
  Car,
  User,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle2,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';

export type VDFinanceDetailTab = 'overview' | 'financials' | 'parts' | 'labor' | 'classification' | 'all';

interface VDFinanceDetailsProps {
  record: VDFinanceRecord;
  onClose?: () => void;
}

// Safe Date Formatter
const safeFormatDate = (dateVal: any, pattern: string = 'dd/MM/yyyy'): string => {
  if (!dateVal) return 'Not Provided';
  try {
    const d = typeof dateVal?.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : 'Not Provided';
    return format(d, pattern);
  } catch {
    return typeof dateVal === 'string' ? dateVal : 'Not Provided';
  }
};

const REASON_LABELS: Record<'VD' | 'H' | 'S' | 'PI', { title: string; color: string }> = {
  VD: { title: 'Vehicle Damage', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  H: { title: 'Hire', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  S: { title: 'Storage', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PI: { title: 'Personal Injury', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const VDFinanceDetails: React.FC<VDFinanceDetailsProps> = ({ record, onClose }) => {
  const [activeTab, setActiveTab] = useState<VDFinanceDetailTab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const { formatCurrency } = useFormattedDisplay();

  const regNo = record.reg || (record as any).registration || 'UNKNOWN';
  const refNo = record.ref || (record as any).reference || 'N/A';
  const partsCount = record.parts?.length || 0;
  const isProfitPaid = record.originalProfit !== undefined;
  const effectiveProfit = isProfitPaid ? record.originalProfit : record.profit;

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (record.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', record.createdBy));
          if (userDoc.exists()) {
            setCreatedByName(userDoc.data().name);
          } else {
            setCreatedByName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setCreatedByName('Unknown User');
        }
      }
    };

    fetchCreatedByName();
  }, [record.createdBy]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied!`, { id: `copy-${label}` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Tabs definition
  const tabs: {
    id: VDFinanceDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    {
      id: 'financials',
      label: 'Financials & VAT',
      icon: PoundSterling,
      badge: formatCurrency(record.totalAmount || 0),
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    },
    {
      id: 'parts',
      label: 'Parts & Materials',
      icon: Wrench,
      badge: partsCount > 0 ? `${partsCount} parts` : undefined,
    },
    {
      id: 'labor',
      label: 'Labor & Workshop',
      icon: Clock,
      badge: record.laborHours ? `${record.laborHours} hrs` : undefined,
    },
    {
      id: 'classification',
      label: 'Classification & Audit',
      icon: Building,
    },
    { id: 'all', label: 'All Details', icon: Layers },
  ];

  const currentTabIndex = tabs.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  // Total Parts Cost calculation
  const totalPartsCost = useMemo(() => {
    if (!record.parts || record.parts.length === 0) return 0;
    return record.parts.reduce((acc, part) => acc + (part.price || 0) * (part.quantity || 1), 0);
  }, [record.parts]);

  // ─────────────────────────────────────────────────────────────
  // TAB RENDERERS
  // ─────────────────────────────────────────────────────────────

  // 1. Overview & Basic Info
  const renderOverviewContent = () => (
    <div className="space-y-5">
      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Amount</span>
          <span className="text-lg font-black font-mono text-slate-900 block mt-1">
            {formatCurrency(record.totalAmount || 0)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Net Amount</span>
          <span className="text-lg font-black font-mono text-slate-900 block mt-1">
            {formatCurrency(record.netAmount || 0)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Profit Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                isProfitPaid
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : (effectiveProfit || 0) > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isProfitPaid ? 'Paid to Share' : formatCurrency(effectiveProfit || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">VAT Rate</span>
          <span className="text-lg font-black font-mono text-slate-900 block mt-1">
            {record.vatPercentage !== undefined ? `${record.vatPercentage}%` : `${(record as any).vatRate || 20}%`}
          </span>
        </div>
      </div>

      {/* Core Details Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Record Information</h4>
          </div>
          <span className="text-xs text-slate-500">
            Record Date: {safeFormatDate(record.date, 'dd/MM/yyyy HH:mm')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Client / Party Name</span>
            <span className="text-base font-bold text-slate-900 block mt-0.5">{record.name || 'Not Stated'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Vehicle Registration</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 bg-amber-300 text-slate-950 font-mono font-black text-xs rounded border border-amber-400 shadow-2xs uppercase">
                {regNo}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(regNo, 'VRN')}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Copy Registration"
              >
                {copiedField === 'VRN' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Reference Number</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-mono font-bold text-slate-900">#{refNo}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(refNo, 'Reference')}
                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="Copy Reference"
              >
                {copiedField === 'Reference' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Incident Date</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{safeFormatDate(record.incidentDate)}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Incident Time</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-slate-800">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{record.incidentTime || 'Not Provided'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Service Workshop</span>
            <span className="text-sm font-semibold text-slate-800 block mt-0.5">{record.serviceCenter || 'Not Assigned'}</span>
          </div>
        </div>

        {/* Claim Reasons */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Claim Reasons Covered
          </span>
          <div className="flex flex-wrap gap-2">
            {record.claimReasons && record.claimReasons.length > 0 ? (
              record.claimReasons.map((code) => {
                const info = REASON_LABELS[code] || { title: code, color: 'bg-slate-100 text-slate-800 border-slate-200' };
                return (
                  <span
                    key={code}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${info.color}`}
                  >
                    <span className="font-mono">{code}</span>
                    <span>•</span>
                    <span>{info.title}</span>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">No specific claim reasons recorded.</span>
            )}
          </div>
        </div>

        {/* Description */}
        {record.description && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Case Narrative & Notes
            </span>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {record.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 2. Financials & VAT
  const renderFinancialsContent = () => (
    <div className="space-y-5">
      {/* Primary Financial Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PoundSterling className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial Ledger Breakdown</h4>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700">
            VAT Rate: {record.vatPercentage || (record as any).vatRate || 20}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Amount</span>
            <span className="text-xl font-black font-mono text-slate-950 block mt-1">
              {formatCurrency(record.totalAmount || 0)}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Net Amount</span>
            <span className="text-xl font-black font-mono text-slate-900 block mt-1">
              {formatCurrency(record.netAmount || 0)}
            </span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">Profit</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black font-mono text-emerald-700">
                {formatCurrency(effectiveProfit || 0)}
              </span>
              {isProfitPaid && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  Paid
                </span>
              )}
            </div>
          </div>
        </div>

        {/* VAT Section */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">VAT IN</span>
                <span className="text-xs text-slate-500">Input VAT receivable</span>
              </div>
            </div>
            <span className="text-base font-black font-mono text-blue-700">
              {formatCurrency(record.vatIn || 0)}
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">VAT OUT</span>
                <span className="text-xs text-slate-500">Output VAT payable</span>
              </div>
            </div>
            <span className="text-base font-black font-mono text-rose-700">
              {formatCurrency(record.vatOut || 0)}
            </span>
          </div>
        </div>

        {/* Ancillary Costs & Deductions */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
            Ancillary Costs & Legal Deductions
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Solicitor Fee</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.solicitorFee || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Purchased Items</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.purchasedItems || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Client Repair</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.clientRepair || (record as any).clientRepairAmount || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Salvage</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.salvage || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Client Referral Fee</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.clientReferralFee || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Labor Charge</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(record.laborCharge || 0)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Parts Total</span>
              <span className="font-mono font-bold text-slate-900 block mt-1">
                {formatCurrency(totalPartsCost)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Share Linked Status</span>
              <span className="font-semibold text-slate-800 block mt-1">
                {record.linkedShareId ? 'Mirrored in Share' : 'Not Linked'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 3. Parts & Materials
  const renderPartsContent = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Parts & Replacement Items</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {partsCount > 0 ? `${partsCount} part(s) invoiced for this vehicle` : 'No parts recorded.'}
          </p>
        </div>
        {partsCount > 0 && (
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Total Parts Cost</span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(totalPartsCost)}
            </span>
          </div>
        )}
      </div>

      {partsCount === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No parts on file</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            This VD Finance record has no parts or material costs attached.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {record.parts.map((part, index) => {
            const itemTotal = (part.price || 0) * (part.quantity || 1);
            return (
              <div
                key={part.id || index}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    #{index + 1}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{part.name}</h5>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Qty: <strong>{part.quantity}</strong></span>
                      <span>•</span>
                      <span>Unit Price: <strong>{formatCurrency(part.price)}</strong></span>
                      {part.includeVat && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-semibold">Inc. VAT</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Subtotal</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatCurrency(itemTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 4. Labor & Workshop
  const renderLaborContent = () => (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Workshop Labor Details</h4>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
            {record.serviceCenter || 'Service Workshop'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Service Center</span>
            <span className="text-sm font-bold text-slate-900 block mt-0.5">{record.serviceCenter || 'Not Provided'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Labor Hourly Rate</span>
            <span className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
              {(record as any).laborRate ? `£${(record as any).laborRate}/hr` : 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Labor Hours Billed</span>
            <span className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
              {(record as any).laborHours ? `${(record as any).laborHours} hours` : 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Labor Charge</span>
            <span className="text-base font-black font-mono text-indigo-700 block mt-0.5">
              {formatCurrency(record.laborCharge || ((record as any).laborRate * (record as any).laborHours) || 0)}
            </span>
          </div>
        </div>

        {record.vatDetails && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-600">Workshop Labor VAT Applied:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                record.vatDetails.laborVAT
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {record.vatDetails.laborVAT ? 'VAT Included' : 'No VAT'}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // 5. Classification & Audit
  const renderClassificationContent = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Classification & Groupings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Tag className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Classification & Department</h4>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Department</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">
                {record.departmentName || 'General / Unassigned'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Category</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {record.categoryName || 'Uncategorized'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Group</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {record.groupName || 'Unassigned Group'}
                </span>
              </div>
            </div>

            {record.linkedShareId && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Linked Share Record ID</span>
                <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded block mt-1 break-all">
                  {record.linkedShareId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audit Trail Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">System Audit Trail</h4>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Record ID</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all select-all">
                  {record.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(record.id, 'Record ID')}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                  title="Copy ID"
                >
                  {copiedField === 'Record ID' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Created By</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {createdByName || record.createdBy || 'System'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Created At</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {safeFormatDate(record.createdAt, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Last Updated</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                {safeFormatDate(record.updatedAt, 'dd/MM/yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
      {/* ─────────────────────────────────────────────────────────────── */}
      {/* TOP SUMMARY STRIP                                               */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* UK Registration Badge */}
          <span className="px-3 py-1 bg-amber-300 text-slate-950 font-mono font-black text-sm rounded border border-amber-400 shadow-2xs tracking-wider uppercase shrink-0">
            {regNo}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {record.name || 'VD Finance Record'}
              </h3>

              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Ref: #{refNo}
              </span>

              {isProfitPaid ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  Profit Paid
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Profit: {formatCurrency(effectiveProfit || 0)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>Date: {safeFormatDate(record.date)}</span>
              {record.serviceCenter && (
                <>
                  <span>•</span>
                  <span>Workshop: {record.serviceCenter}</span>
                </>
              )}
              {record.departmentName && (
                <>
                  <span>•</span>
                  <span>Dept: {record.departmentName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Total Pill */}
        <div className="flex items-center gap-3 text-right">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Invoiced
            </span>
            <span className="text-base font-black font-mono text-slate-900 block">
              {formatCurrency(record.totalAmount || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* 1. PINNED NAVIGATION BAR AT TOP                                 */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-6 w-full border-b border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-[130px] sm:min-w-0 flex-1 flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-extrabold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 border ${
                    tab.badgeColor
                      ? tab.badgeColor
                      : isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* 2. SCROLLABLE TAB BODY CONTENT                                  */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-6 bg-slate-50/50">
        {activeTab === 'overview' && renderOverviewContent()}
        {activeTab === 'financials' && renderFinancialsContent()}
        {activeTab === 'parts' && renderPartsContent()}
        {activeTab === 'labor' && renderLaborContent()}
        {activeTab === 'classification' && renderClassificationContent()}

        {activeTab === 'all' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                1. Overview & Record Information
              </h3>
              {renderOverviewContent()}
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <PoundSterling className="w-4 h-4 text-emerald-600" />
                2. Financials & VAT Breakdown
              </h3>
              {renderFinancialsContent()}
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-600" />
                3. Parts & Replacement Materials
              </h3>
              {renderPartsContent()}
            </div>

            <div className="border-b border-slate-200 pb-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                4. Workshop Labor Details
              </h3>
              {renderLaborContent()}
            </div>

            <div className="pb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-purple-600" />
                5. Classification & System Audit
              </h3>
              {renderClassificationContent()}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* 3. PINNED BOTTOM FOOTER NAVIGATION CONTROLS                     */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevTab}
            disabled={currentTabIndex <= 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
            Tab {currentTabIndex + 1} of {tabs.length}:{' '}
            <strong className="text-slate-800">{tabs[currentTabIndex]?.label}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNextTab}
            disabled={currentTabIndex >= tabs.length - 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shadow-2xs ml-1"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VDFinanceDetails;
