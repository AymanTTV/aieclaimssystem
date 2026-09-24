// src/components/accidents/AccidentClaimView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Accident } from '../../types';
import { format } from 'date-fns';
import StatusBadge from '../StatusBadge';
import {
  Car,
  Calendar,
  MapPin,
  User,
  Phone,
  Shield,
  AlertTriangle,
  PoundSterling,
  Clock,
  CheckCircle2,
  Users,
  Camera,
  Layers,
  ExternalLink,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileText,
  X,
  Building,
  CreditCard,
  Hash,
  HeartPulse,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { calculateReportingTiming, parseDateSafe } from '../../utils/accidentCalculations';
import toast from 'react-hot-toast';

export type AccidentDetailTab = 'overview' | 'driver_vehicle' | 'parties' | 'finance' | 'evidence' | 'all';

interface AccidentClaimViewProps {
  accident: Accident;
  onClose?: () => void;
}

// Safe Date Formatter
const safeFormatDate = (dateVal: any, pattern: string = 'dd/MM/yyyy'): string => {
  if (!dateVal) return 'Not Provided';
  try {
    const d = parseDateSafe(dateVal);
    if (!d || isNaN(d.getTime())) return typeof dateVal === 'string' ? dateVal : 'Not Provided';
    return format(d, pattern);
  } catch {
    return typeof dateVal === 'string' ? dateVal : 'Not Provided';
  }
};

const AccidentClaimView: React.FC<AccidentClaimViewProps> = ({ accident, onClose }) => {
  const [activeTab, setActiveTab] = useState<AccidentDetailTab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedByName, setSubmittedByName] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const fetchSubmittedByName = async () => {
      if (accident.submittedBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', accident.submittedBy));
          if (userDoc.exists()) {
            setSubmittedByName(userDoc.data().name);
          } else {
            setSubmittedByName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          setSubmittedByName('Unknown User');
        }
      }
    };

    fetchSubmittedByName();
  }, [accident.submittedBy]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied!`, { id: `copy-${label}` });
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Reporting Timing Calculation
  const timing = useMemo(() => {
    return calculateReportingTiming({
      accidentDate: accident.accidentDate,
      accidentTime: accident.accidentTime,
      reportedDate: accident.reportedDate,
      reportedTime: accident.reportedTime,
      submittedAt: accident.submittedAt,
      existingPenalty: accident.lateReportingPenalty || accident.penaltyPayment || 0,
    });
  }, [
    accident.accidentDate,
    accident.accidentTime,
    accident.reportedDate,
    accident.reportedTime,
    accident.submittedAt,
    accident.lateReportingPenalty,
    accident.penaltyPayment,
  ]);

  const imagesCount = accident.images?.length || 0;
  const passengersCount = accident.passengers?.length || 0;
  const witnessesCount = accident.witnesses?.length || 0;
  const hasEmergencyServices = !!(accident.policeOfficerName || accident.paramedicNames);
  const hasFaultParty = !!(accident.faultPartyName || accident.faultPartyVRN);

  const partiesCount = (hasFaultParty ? 1 : 0) + passengersCount + witnessesCount;

  // Tabs Definition
  const tabs: {
    id: AccidentDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: 'overview', label: 'Overview & Incident', icon: AlertTriangle },
    {
      id: 'driver_vehicle',
      label: 'Driver & Vehicle',
      icon: Car,
      badge: accident.vehicleVRN || undefined,
      badgeColor: 'bg-amber-300 text-slate-950 font-mono border-amber-400',
    },
    {
      id: 'parties',
      label: 'Parties & Witnesses',
      icon: Users,
      badge: partiesCount > 0 ? `${partiesCount} parties` : undefined,
    },
    {
      id: 'finance',
      label: 'Insurance & Finance',
      icon: PoundSterling,
      badge: timing.isLate && timing.penaltyPayment > 0 ? `£${timing.penaltyPayment.toFixed(0)} Late` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-300',
    },
    {
      id: 'evidence',
      label: 'Photos & Evidence',
      icon: Camera,
      badge: imagesCount > 0 ? `${imagesCount} photos` : undefined,
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

  const faultDetermination = accident.fault || accident.faultType || 'Fault';

  // ─────────────────────────────────────────────────────────────
  // TAB RENDERERS
  // ─────────────────────────────────────────────────────────────

  // 1. Overview & Incident
  const renderOverviewContent = () => (
    <div className="space-y-5">
      {/* Top Banner with Timing & Fault summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Fault determination card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Fault Assessment</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                faultDetermination === 'Non-Fault'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : faultDetermination === 'Split'
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {faultDetermination}
            </span>
            {accident.type && accident.type !== 'pending' && (
              <span className="text-xs text-slate-500 capitalize">({accident.type})</span>
            )}
          </div>
        </div>

        {/* 24-Hour Late Rule */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Reporting Rule (24h)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                timing.isLate
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              {timing.isLate ? 'Late Reporting (> 24h)' : 'Compliant (≤ 24h)'}
            </span>
          </div>
        </div>

        {/* Claim Amount */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Claim Amount</span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-slate-900">
              £{typeof accident.amount === 'number' ? accident.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : (accident.amount || '0.00')}
            </span>
          </div>
        </div>
      </div>

      {/* Incident Details Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Incident Details & Timing</h4>
          </div>
          <span className="text-xs text-slate-500">
            Submitted: {safeFormatDate(accident.submittedAt, 'dd/MM/yyyy HH:mm')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Reference No</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-mono font-bold text-slate-900">
                #{accident.refNo || accident.referenceNo || 'N/A'}
              </span>
              {(accident.refNo || accident.referenceNo) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(accident.refNo || accident.referenceNo), 'Reference No')}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title="Copy Ref No"
                >
                  {copiedField === 'Reference No' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Reference Name</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">{accident.referenceName || 'N/A'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Accident Date</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-slate-900">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{accident.accidentDate || 'Not provided'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Accident Time</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-slate-900">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{accident.accidentTime || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Location with Map Link */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Location of Incident</span>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm font-semibold text-slate-900">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{accident.accidentLocation || 'Not provided'}</span>
            </div>
          </div>
          {accident.accidentLocation && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accident.accidentLocation)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Location Map
            </a>
          )}
        </div>

        {/* Description & Narrative */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Circumstances / Description</span>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {accident.description || 'No description recorded.'}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Damage Description</span>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {accident.damageDetails || 'No damage details recorded.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. Driver & Vehicle
  const renderDriverVehicleContent = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Driver Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Driver Details</h4>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Fleet Driver
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Driver Name</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">{accident.driverName || 'Not Provided'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Mobile Phone</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {accident.driverMobile ? (
                    <a href={`tel:${accident.driverMobile}`} className="text-sm font-semibold text-blue-600 hover:underline">
                      {accident.driverMobile}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">N/A</span>
                  )}
                  {accident.driverMobile && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(accident.driverMobile, 'Driver Mobile')}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      title="Copy Mobile"
                    >
                      {copiedField === 'Driver Mobile' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Landline Phone</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.driverPhone || 'N/A'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Date of Birth</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.driverDOB || 'N/A'}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">National Insurance (NIN)</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-mono font-bold text-slate-900">{accident.driverNIN || 'N/A'}</span>
                  {accident.driverNIN && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(accident.driverNIN, 'Driver NIN')}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      title="Copy NIN"
                    >
                      {copiedField === 'Driver NIN' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Driver Address</span>
              <div className="flex items-start gap-1.5 mt-0.5 text-xs text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{accident.driverAddress || 'Not Provided'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Details Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Vehicle & Insurance</h4>
            </div>

            {/* UK Registration Badge */}
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-0.5 bg-amber-300 text-slate-950 font-mono font-black text-xs rounded border border-amber-400 shadow-2xs tracking-wider uppercase">
                {accident.vehicleVRN || 'NO VRN'}
              </span>
              {accident.vehicleVRN && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(accident.vehicleVRN, 'VRN')}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title="Copy VRN"
                >
                  {copiedField === 'VRN' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Make & Model</span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                {accident.vehicleMake || ''} {accident.vehicleModel || ''}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Insurance Company</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.insuranceCompany || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Policy Number</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-mono font-semibold text-slate-900">{accident.policyNumber || 'N/A'}</span>
                  {accident.policyNumber && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(accident.policyNumber, 'Policy Number')}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      title="Copy Policy"
                    >
                      {copiedField === 'Policy Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Policy Excess</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {accident.policyExcess ? `£${accident.policyExcess}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Registered Keeper</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.registeredKeeperName || 'N/A'}</span>
              </div>
            </div>

            {accident.registeredKeeperAddress && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Keeper Address</span>
                <span className="text-xs text-slate-700 block mt-0.5">{accident.registeredKeeperAddress}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 3. Third Party & Witnesses
  const renderPartiesContent = () => (
    <div className="space-y-5">
      {/* Fault Party Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Third Party / Fault Party Information</h4>
          </div>
          {accident.faultPartyVRN && (
            <span className="px-2 py-0.5 bg-amber-300 text-slate-950 font-mono font-bold text-xs rounded border border-amber-400">
              {accident.faultPartyVRN}
            </span>
          )}
        </div>

        {hasFaultParty ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Party Name</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">{accident.faultPartyName || 'Not Provided'}</span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Contact Phone</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {accident.faultPartyPhone ? (
                  <a href={`tel:${accident.faultPartyPhone}`} className="text-sm font-semibold text-blue-600 hover:underline">
                    {accident.faultPartyPhone}
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">Not Provided</span>
                )}
                {accident.faultPartyPhone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(accident.faultPartyPhone!, 'Third Party Phone')}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === 'Third Party Phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Third Party Vehicle</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.faultPartyVehicle || 'N/A'}</span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Insurance Provider</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.faultPartyInsurance || 'Not Provided'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Address</span>
              <span className="text-xs text-slate-700 block mt-0.5">{accident.faultPartyAddress || 'Not Provided'}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No third-party details recorded for this incident.</p>
        )}
      </div>

      {/* Passengers Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Passengers Involved</h4>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {passengersCount} Passenger{passengersCount === 1 ? '' : 's'}
          </span>
        </div>

        {passengersCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accident.passengers!.map((passenger, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Passenger #{index + 1}: {passenger.name}</span>
                  {passenger.dob && <span className="text-[11px] text-slate-500">DOB: {passenger.dob}</span>}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {passenger.contactNumber && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a href={`tel:${passenger.contactNumber}`} className="text-blue-600 hover:underline">{passenger.contactNumber}</a>
                    </div>
                  )}
                  {passenger.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{passenger.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No passengers were reported in the vehicle.</p>
        )}
      </div>

      {/* Witnesses Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Witnesses</h4>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            {witnessesCount} Witness{witnessesCount === 1 ? '' : 'es'}
          </span>
        </div>

        {witnessesCount > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accident.witnesses!.map((witness, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Witness #{index + 1}: {witness.name}</span>
                  {witness.dob && <span className="text-[11px] text-slate-500">DOB: {witness.dob}</span>}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  {witness.contactNumber && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a href={`tel:${witness.contactNumber}`} className="text-blue-600 hover:underline">{witness.contactNumber}</a>
                    </div>
                  )}
                  {witness.address && (
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{witness.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No independent witnesses recorded.</p>
        )}
      </div>

      {/* Emergency Services (Police & Paramedics) */}
      {hasEmergencyServices && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accident.policeOfficerName && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Shield className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Police Service</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Officer Name</span>
                  <span className="font-bold text-slate-900">{accident.policeOfficerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Badge Number</span>
                  <span className="font-mono font-bold text-slate-900">{accident.policeBadgeNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Police Station</span>
                  <span className="font-semibold text-slate-800">{accident.policeStation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Incident Ref</span>
                  <span className="font-mono font-bold text-slate-900">{accident.policeIncidentNumber || 'N/A'}</span>
                </div>
              </div>
              {accident.policeContactInfo && (
                <p className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                  {accident.policeContactInfo}
                </p>
              )}
            </div>
          )}

          {accident.paramedicNames && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Paramedic & Ambulance</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Paramedic Names</span>
                  <span className="font-bold text-slate-900">{accident.paramedicNames}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ambulance Ref</span>
                  <span className="font-mono font-bold text-slate-900">{accident.ambulanceReference || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Ambulance Service</span>
                  <span className="font-semibold text-slate-800">{accident.ambulanceService || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 4. Insurance & Financials
  const renderFinanceContent = () => (
    <div className="space-y-5">
      {/* Insurance Response & Timing Rule */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Insurance Claim Processing</h4>
          </div>
          <span className="text-xs font-bold capitalize text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {accident.insuranceClaimStatus?.replace('_', ' ') || 'Pending'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Claim No</span>
            <span className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
              {accident.claimNo || accident.refNo || accident.referenceNo || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Insurance Ref No</span>
            <span className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
              {accident.insuranceRefNo || 'Not Assigned'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Accident Code (Acc Cd)</span>
            <span className="text-sm font-mono font-bold text-slate-900 block mt-0.5">{accident.accCd || 'N/A'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Reported By</span>
            <span className="text-sm font-semibold text-slate-800 block mt-0.5">{accident.claimReportedBy || 'N/A'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Time to Report (Locked)</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-base text-slate-900">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{timing.timeToReportDisplay}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {accident.reportedDate ? `Reported: ${format(new Date(accident.reportedDate), 'dd/MM/yyyy')}` : 'No report date'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${timing.isLate ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">24-Hour Late Rule</span>
            <div className={`font-bold text-base mt-1 ${timing.isLate ? 'text-rose-700' : 'text-emerald-700'}`}>
              {timing.lateReporting} {timing.isLate ? '(> 24 hours)' : '(≤ 24 hours)'}
            </div>
            <span className="text-[11px] opacity-80 mt-0.5 block">
              {timing.isLate ? 'Late penalty applied' : 'Compliant notification'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Penalty Payment</span>
            <div className={`font-black font-mono text-lg mt-1 ${timing.isLate && timing.penaltyPayment > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              £{timing.penaltyPayment.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Automated rule evaluation</span>
          </div>
        </div>
      </div>

      {/* Outside Insurance Settlement */}
      {(accident.settledOutsideInsurance !== undefined || accident.outsideSettlementAmount || accident.settlementNotes) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Outside Settlement</h4>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                accident.settledOutsideInsurance
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {accident.settledOutsideInsurance ? 'Settled Outside Insurance' : 'Through Insurer'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {accident.outsideSettlementAmount !== undefined && (
              <div>
                <span className="text-slate-500 block">Settlement Amount Paid Out</span>
                <span className="text-base font-black font-mono text-slate-900">
                  £{accident.outsideSettlementAmount.toFixed(2)}
                </span>
              </div>
            )}
            {accident.settlementNotes && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 block mb-1">Settlement Notes</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                  {accident.settlementNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Estimates & Recovery Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PoundSterling className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Cost Estimates & Recovery Matrix</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Excess: <strong>{accident.excessApplies ? 'Applies' : 'None'}</strong>
            </span>
            {accident.excessApplies && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${accident.excessRecovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {accident.excessRecovered ? 'Recovered' : 'Unrecovered'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">AD Est</span>
            <span className="text-sm font-black font-mono text-slate-900 block mt-1">
              {accident.adEst !== undefined ? `£${accident.adEst.toFixed(2)}` : '£0.00'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">AD Paid</span>
            <span className="text-sm font-black font-mono text-slate-900 block mt-1">
              {accident.adPaid !== undefined ? `£${accident.adPaid.toFixed(2)}` : '£0.00'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">TP Paid</span>
            <span className="text-sm font-black font-mono text-slate-900 block mt-1">
              {accident.tpPaid !== undefined ? `£${accident.tpPaid.toFixed(2)}` : '£0.00'}
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Incurred (AD + TP)</span>
            <span className="text-sm font-black font-mono text-blue-900 block mt-1">
              {accident.incurred !== undefined ? `£${accident.incurred.toFixed(2)}` : '£0.00'}
            </span>
          </div>
        </div>

        {/* Third Party Breakdown Estimates */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Third Party (TP) Estimates</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">TP PI Est</span>
              <span className="font-mono font-bold text-slate-800">{accident.tpPiEst !== undefined ? `£${accident.tpPiEst.toFixed(2)}` : '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">TP Damage Est</span>
              <span className="font-mono font-bold text-slate-800">{accident.tpDamageEst !== undefined ? `£${accident.tpDamageEst.toFixed(2)}` : '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">TP Hire Est</span>
              <span className="font-mono font-bold text-slate-800">{accident.tpHireEst !== undefined ? `£${accident.tpHireEst.toFixed(2)}` : '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total TP Est</span>
              <span className="font-mono font-black text-slate-900">{accident.totalTpEst !== undefined ? `£${accident.totalTpEst.toFixed(2)}` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Recoveries */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Actual Recovery</span>
            <span className="text-base font-black font-mono text-emerald-600 block mt-0.5">
              {accident.actRecovery !== undefined ? `£${accident.actRecovery.toFixed(2)}` : '£0.00'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Outstanding Recovery</span>
            <span className="text-base font-black font-mono text-rose-600 block mt-0.5">
              {accident.outstandingRecovery !== undefined ? `£${accident.outstandingRecovery.toFixed(2)}` : '£0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // 5. Photos & Evidence
  const renderEvidenceContent = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Incident Scene & Damage Photos</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {imagesCount > 0 ? `${imagesCount} photo(s) captured for this claim` : 'No photos uploaded.'}
          </p>
        </div>
      </div>

      {imagesCount === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
          <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No damage photos attached</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You can upload accident photos and damage evidence by editing this claim from the actions menu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {accident.images!.map((image, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="relative w-full h-44 bg-slate-100 rounded-xl overflow-hidden group/thumb border border-slate-200">
                <img
                  src={image}
                  alt={`Accident evidence ${index + 1}`}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setPreviewImage({ url: image, title: `Damage Photo #${index + 1} - ${accident.vehicleVRN}` })}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: image, title: `Damage Photo #${index + 1} - ${accident.vehicleVRN}` })}
                    className="p-2 rounded-xl bg-white/95 text-slate-800 hover:bg-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Enlarge Photo"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(image, '_blank', 'noopener,noreferrer')}
                    className="p-2 rounded-xl bg-white/95 text-blue-600 hover:bg-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2.5 px-1">
                <span className="text-xs font-bold text-slate-800">Photo #{index + 1}</span>
                <button
                  type="button"
                  onClick={() => setPreviewImage({ url: image, title: `Damage Photo #${index + 1} - ${accident.vehicleVRN}` })}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  View Enlarge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
        {/* ─────────────────────────────────────────────────────────────── */}
        {/* TOP SUMMARY STRIP                                               */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* UK Registration Badge */}
            <span className="px-3 py-1 bg-amber-300 text-slate-950 font-mono font-black text-sm rounded border border-amber-400 shadow-2xs tracking-wider uppercase shrink-0">
              {accident.vehicleVRN || 'NO REG'}
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {accident.driverName || 'Driver Not Stated'}
                </h3>
                <StatusBadge status={accident.status} />
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    faultDetermination === 'Non-Fault'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : faultDetermination === 'Split'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  {faultDetermination}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="font-mono font-medium text-slate-700">
                  Ref: #{accident.refNo || accident.referenceNo || 'N/A'}
                </span>
                <span>•</span>
                <span>{accident.vehicleMake || ''} {accident.vehicleModel || ''}</span>
                <span>•</span>
                <span>{accident.accidentDate || 'Date N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick timing pill */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Time to Report
              </span>
              <span className="text-base font-black font-mono text-slate-900 flex items-center justify-end gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {timing.timeToReportDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* 1. PINNED NAVIGATION BAR AT TOP                                 */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-6 w-full border-b border-slate-200 shrink-0 bg-slate-100/80 select-none divide-x divide-slate-200 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                className={`group min-w-[130px] sm:min-w-0 flex-1 flex flex-col items-center justify-center py-2.5 px-1.5 sm:px-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-700 font-extrabold bg-white shadow-xs'
                    : 'border-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'}`} />
                  <span className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">
                    {tab.label}
                  </span>
                </div>
                {tab.badge !== undefined && (
                  <div className="mt-1 flex items-center justify-center w-full px-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full tracking-wide border transition-colors ${
                        tab.badgeColor
                          ? tab.badgeColor
                          : isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-200 text-slate-700 border-slate-300 group-hover:bg-slate-300/80'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </div>
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
          {activeTab === 'driver_vehicle' && renderDriverVehicleContent()}
          {activeTab === 'parties' && renderPartiesContent()}
          {activeTab === 'finance' && renderFinanceContent()}
          {activeTab === 'evidence' && renderEvidenceContent()}

          {activeTab === 'all' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  1. Overview & Incident Circumstances
                </h3>
                {renderOverviewContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-600" />
                  2. Driver & Vehicle Information
                </h3>
                {renderDriverVehicleContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  3. Third Parties, Passengers & Witnesses
                </h3>
                {renderPartiesContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <PoundSterling className="w-4 h-4 text-emerald-600" />
                  4. Insurance & Financial Reporting
                </h3>
                {renderFinanceContent()}
              </div>

              <div className="pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-600" />
                  5. Incident Photos & Evidence
                </h3>
                {renderEvidenceContent()}
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

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* PHOTO LIGHTBOX MODAL                                            */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h4 className="text-sm font-bold text-slate-900">{previewImage.title}</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(previewImage.url, '_blank', 'noopener,noreferrer')}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccidentClaimView;
