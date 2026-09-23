// src/components/claims/ClaimDetailsModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Claim } from '../../types';
import { format, differenceInDays } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import {
  FileText,
  Download,
  Car,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  MessageCircle,
  Scale,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Paperclip,
  Users,
  Camera,
  Film,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { isLegacyClaimProgress, deriveDisplayStatus } from '../../utils/claimProgress';
import clsx from 'clsx';
import { resolveNameFields, resolveAddressFields } from '../../utils/nameAddressUtils';
import { resolveLegalHandlerDetails } from '../../utils/claimCommunication';
import ClaimCommunicationModal from './ClaimCommunicationModal';

interface ClaimDetailsProps {
  claim: Claim;
  onDownloadDocument?: (url: string) => void;
  onWhatsApp?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
  onEmail?: (claim: Claim, recipient?: 'client' | 'legalHandler') => void;
}

const ClaimDetailsModal: React.FC<ClaimDetailsProps> = ({
  claim,
  onDownloadDocument,
  onWhatsApp,
  onEmail,
}) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commChannel, setCommChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [commCategory, setCommCategory] = useState<'general' | 'progress' | 'legal_handler' | 'custom'>('general');
  const [commRecipient, setCommRecipient] = useState<'client' | 'legalHandler'>('client');
  const [activeTab, setActiveTab] = useState<
    'client_vehicle' | 'vehicle_docs' | 'incident' | 'third_party' | 'evidence' | 'progress'
  >('client_vehicle');

  const [activeCommDropdown, setActiveCommDropdown] = useState<'whatsapp' | 'email' | null>(null);
  const commDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (commDropdownRef.current && !commDropdownRef.current.contains(e.target as Node)) {
        setActiveCommDropdown(null);
      }
    };
    if (activeCommDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeCommDropdown]);

  const legalDetails = useMemo(() => resolveLegalHandlerDetails(claim), [claim]);

  const handleOpenComm = (
    channel: 'whatsapp' | 'email',
    category: 'general' | 'progress' | 'legal_handler' | 'custom' = 'general',
    recipient: 'client' | 'legalHandler' = 'client'
  ) => {
    setActiveCommDropdown(null);
    if (channel === 'whatsapp' && onWhatsApp) {
      onWhatsApp(claim, recipient);
      return;
    }
    if (channel === 'email' && onEmail) {
      onEmail(claim, recipient);
      return;
    }
    setCommChannel(channel);
    setCommCategory(category);
    setCommRecipient(recipient);
    setCommModalOpen(true);
  };

  const { formatCurrency } = useFormattedDisplay();
  const legacy = useMemo(() => isLegacyClaimProgress(claim), [claim]);
  const displayStatus = useMemo(() => deriveDisplayStatus(claim) ?? 'N/A', [claim]);
  const [serverHistory, setServerHistory] = useState(claim.progressHistory || []);
  const historyToShow = serverHistory?.length ? serverHistory : (claim.progressHistory || []);

  const tabs = useMemo(() => [
    {
      id: 'client_vehicle' as const,
      title: 'Client & Vehicle',
      icon: User,
      badge: (claim as any).clientVehicle?.registration
        ? String((claim as any).clientVehicle.registration).toUpperCase()
        : 'Details',
    },
    {
      id: 'vehicle_docs' as const,
      title: 'Vehicle Docs',
      icon: FileText,
      badge: `${Object.keys(claim.clientVehicle?.documents || {}).length} Docs`,
    },
    {
      id: 'incident' as const,
      title: 'Incident Details',
      icon: Calendar,
      badge: formatDate((claim as any).incidentDetails?.date),
    },
    {
      id: 'third_party' as const,
      title: 'Third Party',
      icon: Users,
      badge: (claim as any).thirdParty?.name || 'Third Party',
    },
    {
      id: 'evidence' as const,
      title: 'Evidence',
      icon: Camera,
      badge: `${
        ((claim as any).evidence?.images?.length || 0) +
        ((claim as any).evidence?.videos?.length || 0) +
        ((claim as any).evidence?.clientVehiclePhotos?.length || 0) +
        ((claim as any).evidence?.engineerReport?.length || 0) +
        ((claim as any).evidence?.bankStatement?.length || 0) +
        ((claim as any).evidence?.adminDocuments?.length || 0)
      } Items`,
    },
    {
      id: 'progress' as const,
      title: 'Progress History',
      icon: Activity,
      badge: `${historyToShow.length} Updates`,
    },
  ], [claim, historyToShow.length]);

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

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', claim.id));
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const hist = (data.progressHistory || []).map((h: any) => ({
          ...h,
          date: h?.date?.toDate ? h.date.toDate() : new Date(h.date),
        }));
        setServerHistory(hist);
      } catch (e) {
        console.warn('Failed to refresh progress history:', e);
      }
    })();
  }, [claim.id]);

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (claim.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', claim.createdBy));
          if (userDoc.exists()) setCreatedByName(userDoc.data().name);
          else setCreatedByName('Unknown User');
        } catch (error) {
          setCreatedByName('Unknown User');
        }
      } else {
        setCreatedByName(null);
      }
    };
    fetchCreatedByName();
  }, [claim.createdBy]);

  function toJsDate(v?: Date | { toDate(): Date } | null): Date | null {
    if (!v) return null;
    if (typeof (v as any).toDate === 'function') {
      try {
        return (v as any).toDate();
      } catch (e) {
        return null;
      }
    }
    if (v instanceof Date && !isNaN(v.getTime())) return v;
    const date = new Date(v as any);
    if (!isNaN(date.getTime())) return date;
    return null;
  }

  const formatDate = (date: Date | null | undefined): string => {
    const jsDate = toJsDate(date);
    if (!jsDate) return 'N/A';
    return format(jsDate, 'dd/MM/yyyy');
  };

  const formatDateTime = (date: Date | null | undefined): string => {
    const jsDate = toJsDate(date);
    if (!jsDate) return 'N/A';
    return format(jsDate, 'dd/MM/yyyy HH:mm');
  };

  const checkIsExpiring = (dateVal: any) => {
    const d = toJsDate(dateVal);
    if (!d) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return differenceInDays(d, now) <= 7;
  };

  // Formal Visual Card Section Component
  const FormalSectionCard: React.FC<{
    sectionId?: string;
    sectionNumber?: string;
    title: string;
    icon: React.ElementType;
    badge?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }> = ({
    sectionId,
    sectionNumber,
    title,
    icon: Icon,
    badge,
    action,
    children,
    className = '',
  }) => (
    <div
      id={sectionId}
      className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs ${className}`}
    >
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-2">
            {sectionNumber && (
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {sectionNumber}
              </span>
            )}
            <h3
              className="text-base font-bold text-slate-900 tracking-wide"
            >
              {title}
            </h3>
          </div>
          {badge}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 space-y-6 text-slate-800">{children}</div>
    </div>
  );

  // Sub-section divider within cards
  const SubSection = ({
    title,
    icon: SubIcon,
    children,
  }: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
  }) => (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
        {SubIcon && <SubIcon className="w-4 h-4 text-sky-600" />}
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );

  const Field = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | React.ReactNode | null | undefined;
  }) => (
    <div className="mb-2">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">
        {value ?? 'N/A'}
      </dd>
    </div>
  );

  const DocumentLink = ({ url, label }: { url?: string; label: string }) =>
    url ? (
      <button
        type="button"
        onClick={() => (onDownloadDocument ? onDownloadDocument(url) : window.open(url, '_blank'))}
        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sky-600 transition-colors text-left group w-full shadow-xs cursor-pointer"
        title={`View ${label}`}
      >
        <FileText className="w-4 h-4 flex-shrink-0 text-sky-600 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold truncate capitalize text-slate-800 group-hover:text-slate-900">
          {label}
        </span>
      </button>
    ) : (
      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
        <FileText className="w-4 h-4 text-slate-400" />
        <span>No {label}</span>
      </div>
    );

  return (
    <div className="space-y-6 text-slate-900 claim-details-modal">
      {/* Top Header Bar with Claim Reference & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-wide">
              Claim #{claim.id.slice(-8).toUpperCase()}
            </h2>
            <div className="flex items-center gap-2 relative" ref={commDropdownRef}>
              {/* WhatsApp Button with Recipient Selector */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCommDropdown(activeCommDropdown === 'whatsapp' ? null : 'whatsapp')
                  }
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs gap-1 cursor-pointer"
                  title="Send WhatsApp message"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                  <ChevronDown className="w-3 h-3 text-emerald-600" />
                </button>

                {activeCommDropdown === 'whatsapp' && (
                  <div className="absolute left-0 mt-1 w-56 rounded-xl shadow-xl bg-white border-[1.5px] border-[#CBD5E1] z-50 py-1 text-xs divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-50">
                      Send WhatsApp To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-emerald-50 transition-colors text-slate-700 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900">Send to Client</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.phone || 'No phone'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 transition-colors text-slate-700 cursor-pointer"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-purple-700">
                          Send to Legal Handler
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {legalDetails.legal_handler_name ||
                            legalDetails.legal_handler_firm ||
                            'Legal Handler'}{' '}
                          {legalDetails.legal_handler_phone
                            ? `(${legalDetails.legal_handler_phone})`
                            : '(Directory / Manual)'}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Email Button with Recipient Selector */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCommDropdown(activeCommDropdown === 'email' ? null : 'email')
                  }
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs gap-1 cursor-pointer"
                  title="Send email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                  <ChevronDown className="w-3 h-3 text-indigo-600" />
                </button>

                {activeCommDropdown === 'email' && (
                  <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-xl bg-white border-[1.5px] border-[#CBD5E1] z-50 py-1 text-xs divide-y divide-slate-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-50">
                      Send Email To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-indigo-50 transition-colors text-slate-700 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-900">Send to Client</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.email || 'No email'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 transition-colors text-slate-700 cursor-pointer"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-1 font-semibold text-purple-700">
                          <span>Send to Legal Handler</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-normal">
                            + Claim Card
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {legalDetails.legal_handler_name ||
                            legalDetails.legal_handler_firm ||
                            'Legal Handler'}{' '}
                          {legalDetails.legal_handler_email
                            ? `(${legalDetails.legal_handler_email})`
                            : '(Directory / Manual)'}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-1 space-y-1">
            {claim.clientRef && (
              <p className="text-sm text-slate-500">
                Client Ref: <span className="text-slate-900 font-semibold">{claim.clientRef}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <StatusBadge status={claim.claimType} />
          {Array.isArray(claim.claimReason) &&
            claim.claimReason.map((reason) => <StatusBadge key={reason} status={reason} />)}
          <StatusBadge status={claim.caseProgress} />
          <div className="flex items-center gap-1.5">
            <StatusBadge status={displayStatus} />
            {legacy && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                Legacy
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL NAVIGATION BAR (PINNED AT THE TOP)                               */}
      {/* ========================================================================= */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-6 w-full border border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200 rounded-xl overflow-hidden no-scrollbar shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`claim-tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-extrabold bg-white shadow-xs'
                  : 'border-transparent text-slate-600 font-semibold hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="truncate">{tab.title}</span>
              {tab.badge && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* Client Information & Vehicle Details */}
      {/* ========================================================================= */}
      {activeTab === 'client_vehicle' && (
      <FormalSectionCard
        sectionId="section-client-vehicle"
        title="Client & Vehicle Details"
        icon={User}
      >
        {/* Subsection: Client Information */}
        <SubSection title="Client Information" icon={User}>
          {(() => {
            const clientName = resolveNameFields((claim as any).clientInfo);
            const clientAddress = resolveAddressFields((claim as any).clientInfo);
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="First Name" value={clientName.firstName || 'N/A'} />
                <Field label="Middle Name" value={clientName.middleName || 'N/A'} />
                <Field label="Last Name" value={clientName.lastName || 'N/A'} />
                <Field
                  label="Date of Birth"
                  value={formatDate((claim as any).clientInfo?.dateOfBirth)}
                />
                <div>
                  <dt className="text-xs font-medium text-slate-300">Phone</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {(claim as any).clientInfo?.phone ? (
                      <a
                        href={`tel:${(claim as any).clientInfo?.phone}`}
                        className="text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        {(claim as any).clientInfo?.phone}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-300">Email</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {(claim as any).clientInfo?.email ? (
                      <a
                        href={`mailto:${(claim as any).clientInfo?.email}`}
                        className="text-sky-400 hover:text-sky-300 hover:underline"
                      >
                        {(claim as any).clientInfo?.email}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <Field
                  label="Building Name / Flat Number"
                  value={clientAddress.buildingFlat || 'N/A'}
                />
                <Field label="Street Name" value={clientAddress.streetName || 'N/A'} />
                <Field label="Town / City" value={clientAddress.townCity || 'N/A'} />
                <Field label="Postcode" value={clientAddress.postcode || 'N/A'} />
                <Field label="Country" value={clientAddress.country || 'N/A'} />
                <Field
                  label="Driving License"
                  value={(claim as any).clientInfo?.driverLicenseNumber ?? 'N/A'}
                />
                <Field
                  label="License Expiry"
                  value={formatDate((claim as any).clientInfo?.licenseExpiry)}
                />
                {Array.isArray(claim.claimReason) && claim.claimReason.includes('PI') && (
                  <>
                    <div className="col-span-2 md:col-span-3">
                      <Field
                        label="Occupation"
                        value={(claim as any).clientInfo?.occupation ?? 'N/A'}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <dt className="text-xs font-medium text-slate-500">
                        Injury Details
                      </dt>
                      <dd className="mt-1 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {(claim as any).clientInfo?.injuryDetails ?? 'N/A'}
                      </dd>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </SubSection>

        {/* Subsection: Vehicle Details */}
        {Array.isArray(claim.claimReason) && claim.claimReason.includes('VD') && (
          <SubSection title="Vehicle Details" icon={Car}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-300">Registration</p>
                <p className="font-semibold text-base text-white mt-1">
                  {claim.clientVehicle?.registration ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">MOT Expiry</p>
                <p
                  className={`font-semibold text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.motExpiry)
                      ? 'text-red-400 font-bold'
                      : 'text-white'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.motExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Road Tax Expiry</p>
                <p
                  className={`font-semibold text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.roadTaxExpiry)
                      ? 'text-red-400 font-bold'
                      : 'text-white'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.roadTaxExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">
                  Vehicle License (NSL)
                </p>
                <p
                  className={`font-semibold text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.nslExpiry)
                      ? 'text-red-400 font-bold'
                      : 'text-white'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.nslExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Insurance Expiry</p>
                <p
                  className={`font-semibold text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.insuranceExpiry)
                      ? 'text-red-400 font-bold'
                      : 'text-white'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.insuranceExpiry)}
                </p>
              </div>
            </div>
          </SubSection>
        )}

        {/* Subsection: Registered Keeper (if enabled) */}
        {(claim as any).registerKeeper?.enabled && (
          <SubSection title="Registered Keeper" icon={Shield}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={(claim as any).registerKeeper.name} />
              <Field label="Address" value={(claim as any).registerKeeper.address} />
              <div>
                <dt className="text-xs font-medium text-slate-300">Phone</dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {(claim as any).registerKeeper.phone ? (
                    <a
                      href={`tel:${(claim as any).registerKeeper.phone}`}
                      className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                    >
                      {(claim as any).registerKeeper.phone}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-300">Email</dt>
                <dd className="mt-1 text-sm font-semibold text-white">
                  {(claim as any).registerKeeper.email ? (
                    <a
                      href={`mailto:${(claim as any).registerKeeper.email}`}
                      className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                    >
                      {(claim as any).registerKeeper.email}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>
              <Field
                label="DOB / Est. Date"
                value={formatDate((claim as any).registerKeeper.dateOfBirth)}
              />
            </div>
            {(claim as any).registerKeeper.signature && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Signature
                </p>
                <img
                  src={(claim as any).registerKeeper.signature}
                  alt="Signature"
                  className="h-20 object-contain bg-white rounded-lg border border-slate-200 p-1.5"
                />
              </div>
            )}
          </SubSection>
        )}

        {/* Hire Details (if enabled) */}
        {claim.hireDetails?.enabled &&
          Array.isArray(claim.claimReason) &&
          claim.claimReason.includes('H') && (
            <SubSection title="Hire Details" icon={Clock}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">Start Date & Time</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {formatDate(claim.hireDetails.startDate)}{' '}
                    {(claim.hireDetails as any).startTime ?? 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">End Date & Time</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {formatDate(claim.hireDetails.endDate)}{' '}
                    {(claim.hireDetails as any).endTime ?? 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Days of Hire</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {(claim.hireDetails as any).daysOfHire || 0} days
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Claim Rate</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {formatCurrency(claim.hireDetails.claimRate || 0)}/day
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Total Cost</div>
                  <div className="text-sm font-semibold text-blue-700 mt-1">
                    {formatCurrency(claim.hireDetails.totalCost || 0)}
                  </div>
                </div>
                {claim.hireDetails.vehicle && (
                  <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-slate-800 mb-2">
                      Vehicle on Hire
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>
                        <span className="text-slate-500">Make:</span> <span className="text-slate-800 font-medium">{claim.hireDetails.vehicle.make}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Model:</span> <span className="text-slate-800 font-medium">{claim.hireDetails.vehicle.model}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Registration:</span>{' '}
                        <span className="text-slate-900 font-semibold">{claim.hireDetails.vehicle.registration}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Claim Rate:</span>{' '}
                        <span className="text-blue-700 font-semibold">{formatCurrency(claim.hireDetails.vehicle.claimRate)}/day</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SubSection>
          )}

        {/* Recovery Details (if enabled) */}
        {claim.recovery?.enabled &&
          Array.isArray(claim.claimReason) &&
          (claim.claimReason.includes('S') || claim.claimReason.includes('VD')) && (
            <SubSection title="Recovery Details" icon={Car}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-300">Date</div>
                  <div className="font-semibold text-white text-sm mt-1">
                    {formatDate(claim.recovery.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Cost</div>
                  <div className="font-semibold text-cyan-300 text-sm mt-1">
                    {formatCurrency(claim.recovery.cost || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Pickup Location</div>
                  <div className="text-sm font-semibold text-white mt-1">{claim.recovery.locationPickup ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Dropoff Location</div>
                  <div className="text-sm font-semibold text-white mt-1">{claim.recovery.locationDropoff ?? 'N/A'}</div>
                </div>
              </div>
            </SubSection>
          )}

        {/* Storage Details (if enabled) */}
        {claim.storage?.enabled &&
          Array.isArray(claim.claimReason) &&
          claim.claimReason.includes('S') && (
            <SubSection title="Storage Details" icon={Building}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-300">Start Date</div>
                  <div className="font-semibold text-white text-sm mt-1">
                    {formatDate(claim.storage.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">End Date</div>
                  <div className="font-semibold text-white text-sm mt-1">
                    {formatDate(claim.storage.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Cost per Day</div>
                  <div className="font-semibold text-white text-sm mt-1">
                    {formatCurrency(claim.storage.costPerDay || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-300">Total Cost</div>
                  <div className="font-semibold text-cyan-300 text-sm mt-1">
                    {formatCurrency(claim.storage.totalCost || 0)}
                  </div>
                </div>
              </div>
            </SubSection>
          )}
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: Vehicle Documents */}
      {/* ========================================================================= */}
      {activeTab === 'vehicle_docs' && (
      <FormalSectionCard
        sectionId="section-vehicle-documents"
        title="Vehicle Documents"
        icon={FileText}
      >
        {Object.entries(claim.clientVehicle?.documents || {}).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(claim.clientVehicle?.documents || {}).map(([key, url]) => (
              <DocumentLink
                key={key}
                url={typeof url === 'string' ? url : undefined}
                label={key}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <p className="text-sm font-medium text-slate-500">
              No vehicle documents uploaded
            </p>
          </div>
        )}
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: Incident Details */}
      {/* ========================================================================= */}
      {activeTab === 'incident' && (
      <FormalSectionCard
        sectionId="section-incident-details"
        title="Incident Details"
        icon={Calendar}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500">Date & Time</p>
              <p className="font-semibold text-sm text-slate-900 mt-0.5">
                {formatDate(claim.incidentDetails?.date)}{' '}
                {claim.incidentDetails?.time ? `at ${claim.incidentDetails?.time}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500">Location</p>
              <p className="font-semibold text-sm text-slate-900 mt-0.5">
                {claim.incidentDetails?.location ?? 'N/A'}
              </p>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 pt-2 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">
              Description
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {claim.incidentDetails?.description ?? 'N/A'}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">
              Damage Details
            </p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {claim.incidentDetails?.damageDetails ?? 'N/A'}
            </p>
          </div>
        </div>

        {/* Police Information (if present) */}
        {(claim.policeOfficerName ||
          claim.policeBadgeNumber ||
          claim.policeStation ||
          claim.policeIncidentNumber ||
          claim.policeContactInfo) && (
          <SubSection title="Police Information" icon={Shield}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Officer Name" value={claim.policeOfficerName} />
              <Field label="Badge Number" value={claim.policeBadgeNumber} />
              <Field label="Police Station" value={claim.policeStation} />
              <Field label="Incident Number" value={claim.policeIncidentNumber} />
              {claim.policeContactInfo && (
                <div className="col-span-2 md:col-span-4">
                  <Field label="Additional Contact Info" value={claim.policeContactInfo} />
                </div>
              )}
            </div>
          </SubSection>
        )}

        {/* Paramedic Information (if present) */}
        {(claim.paramedicNames || claim.ambulanceReference || claim.ambulanceService) && (
          <SubSection title="Paramedic Information" icon={Activity}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Paramedic Names" value={claim.paramedicNames} />
              <Field label="Ambulance Reference" value={claim.ambulanceReference} />
              <Field label="Ambulance Service" value={claim.ambulanceService} />
            </div>
          </SubSection>
        )}

        {/* GP Information (if PI reason) */}
        {claim.gpInformation &&
          Array.isArray(claim.claimReason) &&
          claim.claimReason.includes('PI') && (
            <SubSection title="GP Information" icon={Activity}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      claim.gpInformation.visited
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {claim.gpInformation.visited ? 'GP Visited' : 'No GP Visit'}
                  </span>
                </div>
                {claim.gpInformation.visited && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {claim.gpInformation.gpName && (
                      <Field label="GP Practice" value={claim.gpInformation.gpName} />
                    )}
                    {claim.gpInformation.gpDoctorName && (
                      <Field label="Doctor Name" value={claim.gpInformation.gpDoctorName} />
                    )}
                    {claim.gpInformation.gpDate && (
                      <Field
                        label="Visit Date"
                        value={formatDate(claim.gpInformation.gpDate)}
                      />
                    )}
                    {claim.gpInformation.gpContactNumber && (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Contact Number
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          <a
                            href={`tel:${claim.gpInformation.gpContactNumber}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                          >
                            {claim.gpInformation.gpContactNumber}
                          </a>
                        </dd>
                      </div>
                    )}
                    {claim.gpInformation.gpAddress && (
                      <div className="col-span-2">
                        <Field label="Address" value={claim.gpInformation.gpAddress} />
                      </div>
                    )}
                    {(claim.gpInformation as any).gpNotes && (
                      <div className="col-span-2 md:col-span-3">
                        <Field
                          label="Notes"
                          value={(claim.gpInformation as any).gpNotes}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SubSection>
          )}

        {/* Hospital Information (if PI reason) */}
        {claim.hospitalInformation &&
          Array.isArray(claim.claimReason) &&
          claim.claimReason.includes('PI') && (
            <SubSection title="Hospital Information" icon={Building}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      claim.hospitalInformation.visited
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {claim.hospitalInformation.visited
                      ? 'Hospital Visited'
                      : 'No Hospital Visit'}
                  </span>
                </div>
                {claim.hospitalInformation.visited && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {claim.hospitalInformation.hospitalName && (
                      <Field
                        label="Hospital Name"
                        value={claim.hospitalInformation.hospitalName}
                      />
                    )}
                    {claim.hospitalInformation.hospitalDoctorName && (
                      <Field
                        label="Doctor Name"
                        value={claim.hospitalInformation.hospitalDoctorName}
                      />
                    )}
                    {claim.hospitalInformation.hospitalDate && (
                      <Field
                        label="Visit Date"
                        value={formatDate(claim.hospitalInformation.hospitalDate)}
                      />
                    )}
                    {claim.hospitalInformation.hospitalContactNumber && (
                      <div>
                        <dt className="text-xs font-medium text-slate-500">
                          Contact Number
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                          <a
                            href={`tel:${claim.hospitalInformation.hospitalContactNumber}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                          >
                            {claim.hospitalInformation.hospitalContactNumber}
                          </a>
                        </dd>
                      </div>
                    )}
                    {claim.hospitalInformation.hospitalAddress && (
                      <div className="col-span-2">
                        <Field
                          label="Address"
                          value={claim.hospitalInformation.hospitalAddress}
                        />
                      </div>
                    )}
                    {(claim.hospitalInformation as any).hospitalNotes && (
                      <div className="col-span-2 md:col-span-3">
                        <Field
                          label="Notes"
                          value={(claim.hospitalInformation as any).hospitalNotes}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SubSection>
          )}
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: Third Party Details */}
      {/* ========================================================================= */}
      {activeTab === 'third_party' && (
      <FormalSectionCard
        sectionId="section-third-party"
        title="Third Party Details"
        icon={Users}
      >
        <SubSection title="Third Party Information" icon={User}>
          {(() => {
            const tpName = resolveNameFields((claim as any).thirdParty);
            const tpAddress = resolveAddressFields((claim as any).thirdParty);
            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="First Name" value={tpName.firstName || 'N/A'} />
                <Field label="Middle Name" value={tpName.middleName || 'N/A'} />
                <Field label="Last Name" value={tpName.lastName || 'N/A'} />
                <div>
                  <dt className="text-xs font-medium text-slate-300">Phone</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {claim.thirdParty?.phone ? (
                      <a
                        href={`tel:${claim.thirdParty.phone}`}
                        className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                      >
                        {claim.thirdParty.phone}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-300">Email</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {claim.thirdParty?.email ? (
                      <a
                        href={`mailto:${claim.thirdParty.email}`}
                        className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                      >
                        {claim.thirdParty.email}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <Field
                  label="Registration"
                  value={claim.thirdParty?.registration ?? 'N/A'}
                />
                <Field
                  label="Building Name / Flat Number"
                  value={tpAddress.buildingFlat || 'N/A'}
                />
                <Field label="Street Name" value={tpAddress.streetName || 'N/A'} />
                <Field label="Town / City" value={tpAddress.townCity || 'N/A'} />
                <Field label="Postcode" value={tpAddress.postcode || 'N/A'} />
                <Field label="Country" value={tpAddress.country || 'N/A'} />
              </div>
            );
          })()}
        </SubSection>

        {/* Passenger Details (if present) */}
        {claim.passengers && claim.passengers.length > 0 && (
          <SubSection title="Passenger Details" icon={Users}>
            <div className="space-y-3">
              {claim.passengers.map((passenger, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200"
                >
                  <h4 className="font-semibold text-sm mb-2 text-slate-800">
                    Passenger {index + 1}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field label="Name" value={passenger.fullName} />
                    <Field label="Contact" value={passenger.contactNumber} />
                    <Field label="Address" value={(passenger as any).address} />
                    <Field label="Post Code" value={(passenger as any).postCode} />
                    <Field label="Date of Birth" value={(passenger as any).dob} />
                  </div>
                </div>
              ))}
            </div>
          </SubSection>
        )}

        {/* Witness Details (if present) */}
        {claim.witnesses && claim.witnesses.length > 0 && (
          <SubSection title="Witness Details" icon={Users}>
            <div className="space-y-3">
              {claim.witnesses.map((witness, index) => {
                const wName = resolveNameFields(witness);
                const wAddress = resolveAddressFields(witness);
                return (
                  <div
                    key={index}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200"
                  >
                    <h4 className="font-semibold text-sm mb-2 text-slate-800">
                      Witness {index + 1}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Field label="First Name" value={wName.firstName || 'N/A'} />
                      <Field label="Middle Name" value={wName.middleName || 'N/A'} />
                      <Field label="Last Name" value={wName.lastName || 'N/A'} />
                      <Field label="Contact" value={witness.contactNumber || 'N/A'} />
                      <Field label="Date of Birth" value={(witness as any).dob || 'N/A'} />
                      <Field
                        label="Building Name / Flat Number"
                        value={wAddress.buildingFlat || 'N/A'}
                      />
                      <Field label="Street Name" value={wAddress.streetName || 'N/A'} />
                      <Field label="Town / City" value={wAddress.townCity || 'N/A'} />
                      <Field
                        label="Postcode"
                        value={wAddress.postcode || (witness as any).postCode || 'N/A'}
                      />
                      <Field label="Country" value={wAddress.country || 'N/A'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SubSection>
        )}
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: Evidence */}
      {/* ========================================================================= */}
      {activeTab === 'evidence' && (
      <FormalSectionCard
        sectionId="section-evidence"
        title="Evidence"
        icon={Camera}
      >
        {/* Images */}
        {(claim as any).evidence?.images?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Images ({(claim as any).evidence.images.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(claim as any).evidence.images.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video cursor-pointer"
                  onClick={() => onDownloadDocument?.(url)}
                >
                  <img
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {(claim as any).evidence?.videos?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Videos ({(claim as any).evidence.videos.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(claim as any).evidence.videos.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200"
                >
                  <video src={url} className="w-full h-full object-cover" controls />
                  <button
                    type="button"
                    onClick={() => onDownloadDocument?.(url)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                    title="Download video"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-700" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Photos */}
        {(claim as any).evidence?.clientVehiclePhotos?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Vehicle Photos ({(claim as any).evidence.clientVehiclePhotos.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(claim as any).evidence.clientVehiclePhotos.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video cursor-pointer"
                  onClick={() => onDownloadDocument?.(url)}
                >
                  <img
                    src={url}
                    alt={`Vehicle photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Document Reports */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
            Document Reports & Certificates
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {(claim as any).evidence?.engineerReport?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sky-600 text-left transition-colors shadow-xs group cursor-pointer"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-sky-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate text-slate-800">
                  Engineer Report {index + 1}
                </span>
              </button>
            ))}
            {(claim as any).evidence?.bankStatement?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sky-600 text-left transition-colors shadow-xs group cursor-pointer"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-sky-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate text-slate-800">
                  Bank Statement {index + 1}
                </span>
              </button>
            ))}
            {(claim as any).evidence?.adminDocuments?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sky-600 text-left transition-colors shadow-xs group cursor-pointer"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-sky-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate text-slate-800">
                  Admin Document {index + 1}
                </span>
              </button>
            ))}
          </div>

          {!((claim as any).evidence?.engineerReport?.length > 0 ||
            (claim as any).evidence?.bankStatement?.length > 0 ||
            (claim as any).evidence?.adminDocuments?.length > 0 ||
            (claim as any).evidence?.images?.length > 0 ||
            (claim as any).evidence?.videos?.length > 0 ||
            (claim as any).evidence?.clientVehiclePhotos?.length > 0) && (
            <div className="py-6 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
              <p className="text-sm font-medium text-slate-500">
                No evidence files or photos uploaded
              </p>
            </div>
          )}
        </div>
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: Claim Progress History */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
      <FormalSectionCard
        sectionId="section-progress-history"
        title={legacy ? 'Legacy Progress History' : 'Claim Progress History'}
        icon={Activity}
        badge={
          legacy ? (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              Read-only
            </span>
          ) : undefined
        }
        action={
          (claim as any).progressDocumentUrl ? (
            <button
              type="button"
              onClick={() => onDownloadDocument?.((claim as any).progressDocumentUrl)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Progress Record</span>
            </button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {historyToShow.length > 0 ? (
            historyToShow.map((h: any, i: number) => {
              const historyDate = toJsDate(h.date);
              if (!historyDate) return null;
              return (
                <div
                  key={i}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-slate-500 font-medium">
                      {formatDateTime(historyDate)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {h.note ?? 'N/A'}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 text-right font-medium">
                    — {h.author ?? 'N/A'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
              <p className="text-sm font-medium text-slate-500">
                No progress updates recorded yet.
              </p>
            </div>
          )}
        </div>
      </FormalSectionCard>
      )}

      {/* ========================================================================= */}
      {/* POSITIONING REQUIREMENT: Always fix and position the "File Handler" and   */}
      {/* "Legal Handler" sections at the absolute bottom of the Claim Details page. */}
      {/* ========================================================================= */}
      <FormalSectionCard
        sectionId="section-file-handlers"
        title="File Handler & Legal Handler"
        icon={Scale}
        className="border-sky-500/30 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AIE File Handler */}
          <div className="p-4 rounded-xl border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-semibold text-[#334155] uppercase tracking-wider">
                AIE File Handler
              </h4>
            </div>
            <div className="font-bold text-[1.125rem] text-[#0F172A] leading-snug">
              {claim.fileHandlers.aieHandler ?? 'Unassigned'}
            </div>
            <p className="text-xs text-[#475569] mt-1">
              Responsible internal claims officer
            </p>
          </div>

          {/* Legal Handler */}
          <div className="p-4 rounded-xl border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-semibold text-[#334155] uppercase tracking-wider">
                Legal Handler
              </h4>
            </div>
            {claim.fileHandlers.legalHandler ? (
              <div className="space-y-1.5">
                <div className="font-bold text-[1.125rem] text-[#0F172A] leading-snug">
                  {claim.fileHandlers.legalHandler.name}
                </div>
                <div className="text-xs text-[#475569]">
                  <span className="font-medium text-[#475569]">Email: </span>
                  {claim.fileHandlers.legalHandler.email ? (
                    <a
                      href={`mailto:${claim.fileHandlers.legalHandler.email}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                    >
                      {claim.fileHandlers.legalHandler.email}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </div>
                <div className="text-xs text-[#475569]">
                  <span className="font-medium text-[#475569]">Phone: </span>
                  {claim.fileHandlers.legalHandler.phone ? (
                    <a
                      href={`tel:${claim.fileHandlers.legalHandler.phone}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                    >
                      {claim.fileHandlers.legalHandler.phone}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </div>
                {claim.fileHandlers.legalHandler.address && (
                  <div className="text-xs text-[#475569]">
                    <span className="font-medium text-[#475569]">Address: </span>
                    <span className="text-[#0F172A] font-medium">{claim.fileHandlers.legalHandler.address}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenComm('whatsapp', 'legal_handler', 'legalHandler')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] hover:bg-[#bbf7d0] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Send WhatsApp to Legal Handler"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#15803D]" />
                    <span>WhatsApp Handler</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenComm('email', 'legal_handler', 'legalHandler')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:bg-[#bfdbfe] bg-[#DBEAFE] border border-[#93C5FD] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                    title="Send Email to Legal Handler (with Claim Card attached)"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#1D4ED8]" />
                    <span>Email Handler (+ Claim Card)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-[#64748B] py-1">
                No legal handler assigned yet
              </div>
            )}
          </div>
        </div>

        {/* File Handler Internal Notes (if present) */}
        {claim.notes && claim.notes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#334155] uppercase tracking-wider mb-2.5">
              File Handler Internal Notes ({claim.notes.length})
            </h4>
            <div className="space-y-3">
              {(claim.notes as any)
                .sort((a: any, b: any) => {
                  const dateA = toJsDate(a.createdAt);
                  const dateB = toJsDate(b.createdAt);
                  if (!dateA || !dateB) return 0;
                  return dateB.getTime() - dateA.getTime();
                })
                .map((n: any) => {
                  const created = toJsDate(n.createdAt);
                  const dueDate = toJsDate(n.dueDate);
                  if (!created || !dueDate) return null;
                  const isOverdue = dueDate < new Date();

                  return (
                    <div
                      key={n.id}
                      className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#F8FAFC] flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-grow mr-4">
                          <p className="text-xs text-[#64748B]">
                            <span className="font-semibold text-[#334155]">
                              Author:
                            </span>{' '}
                            {n.author}
                          </p>
                          {n.noteTitle && (
                            <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                              {n.noteTitle}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B] font-medium">
                          {format(created, 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="text-xs text-[#334155] whitespace-pre-wrap mb-2 leading-relaxed">
                        {n.text}
                      </div>
                      <div className="flex items-center text-xs">
                        <Calendar className="h-3.5 w-3.5 text-[#64748B] mr-1" />
                        <span className="font-medium mr-1 text-[#64748B]">Due:</span>
                        <span
                          className={clsx(
                            'ml-1 font-medium',
                            dueDate < new Date()
                              ? 'text-red-600 font-bold'
                              : 'text-[#334155]'
                          )}
                        >
                          {format(dueDate, 'dd/MM/yyyy')}
                        </span>
                        {isOverdue && (
                          <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-semibold border border-red-300">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </FormalSectionCard>

      {/* Tab Navigation Footer */}
      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={handlePrevTab}
          disabled={currentTabIndex === 0}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-semibold text-slate-500">
          Tab {currentTabIndex + 1} of {tabs.length}
        </span>

        <button
          type="button"
          onClick={handleNextTab}
          disabled={currentTabIndex === tabs.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata & Audit Footer */}
      <div className="text-xs text-[#64748B] border-t border-[#E2E8F0] pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <div>Created by: <span className="text-[#334155] font-semibold">{createdByName ?? claim.updatedBy ?? 'N/A'}</span></div>
        <div>Last Updated: <span className="text-[#334155] font-semibold">{formatDateTime(claim.updatedAt)}</span></div>
      </div>

      {/* Communication Modal Integration */}
      <ClaimCommunicationModal
        isOpen={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        claim={claim}
        initialChannel={commChannel}
        initialCategory={commCategory}
        initialRecipient={commRecipient}
      />
    </div>
  );
};

export default ClaimDetailsModal;
