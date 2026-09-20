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
      className={`rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-white dark:bg-[#1E1E2D] overflow-hidden shadow-xs ${className}`}
    >
      <div className="px-5 py-3.5 bg-gray-50/90 dark:bg-[#161622] border-b border-gray-200 dark:border-[#2B2B40] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            {sectionNumber && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md">
                {sectionNumber}
              </span>
            )}
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          {badge}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 space-y-6">{children}</div>
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
      <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-gray-100 dark:border-[#2B2B40]/70">
        {SubIcon && <SubIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
        <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
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
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
        {value ?? 'N/A'}
      </dd>
    </div>
  );

  const DocumentLink = ({ url, label }: { url?: string; label: string }) =>
    url ? (
      <button
        type="button"
        onClick={() => (onDownloadDocument ? onDownloadDocument(url) : window.open(url, '_blank'))}
        className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] hover:bg-gray-100 dark:hover:bg-[#252538] text-primary dark:text-primary-400 transition-colors text-left group w-full shadow-xs"
        title={`View ${label}`}
      >
        <FileText className="w-4 h-4 flex-shrink-0 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold truncate capitalize text-gray-800 dark:text-gray-200">
          {label}
        </span>
      </button>
    ) : (
      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-gray-200 dark:border-[#2B2B40] bg-gray-50/40 dark:bg-[#13131A]/40 text-gray-400 text-xs">
        <FileText className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        <span>No {label}</span>
      </div>
    );

  return (
    <div className="space-y-6 text-gray-800 dark:text-gray-200">
      {/* Top Header Bar with Claim Reference & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#2B2B40]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-xs gap-1"
                  title="Send WhatsApp message"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                  <ChevronDown className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </button>

                {activeCommDropdown === 'whatsapp' && (
                  <div className="absolute left-0 mt-1 w-56 rounded-xl shadow-xl bg-white dark:bg-[#1E1E2D] border border-gray-200 dark:border-[#2B2B40] z-50 py-1 text-xs divide-y divide-gray-100 dark:divide-[#2B2B40]">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#161622]">
                      Send WhatsApp To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-gray-800 dark:text-gray-200"
                    >
                      <User className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Send to Client</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.phone || 'No phone'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('whatsapp', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-gray-800 dark:text-gray-200"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-purple-900 dark:text-purple-300">
                          Send to Legal Handler
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
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
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-xs gap-1"
                  title="Send email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                  <ChevronDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                </button>

                {activeCommDropdown === 'email' && (
                  <div className="absolute left-0 mt-1 w-64 rounded-xl shadow-xl bg-white dark:bg-[#1E1E2D] border border-gray-200 dark:border-[#2B2B40] z-50 py-1 text-xs divide-y divide-gray-100 dark:divide-[#2B2B40]">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#161622]">
                      Send Email To:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'general', 'client')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-gray-800 dark:text-gray-200"
                    >
                      <User className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">Send to Client</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {claim.clientInfo?.name || 'Client'} ({claim.clientInfo?.email || 'No email'})
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenComm('email', 'legal_handler', 'legalHandler')}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors text-gray-800 dark:text-gray-200"
                    >
                      <Scale className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <div className="flex items-center gap-1 font-semibold text-purple-900 dark:text-purple-300">
                          <span>Send to Legal Handler</span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                            + Claim Card
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Client Ref: {claim.clientRef}</p>
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
              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                Legacy
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP SELECTABLE CARDS / TABS */}
      {/* ========================================================================= */}
      <div className="bg-gray-50/80 dark:bg-[#0D0E1A]/90 p-2 sm:p-2.5 rounded-2xl border border-gray-200 dark:border-[#212136]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {[
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
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`claim-tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'relative text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-150 flex flex-col justify-between min-h-[92px] group cursor-pointer',
                  isActive
                    ? 'bg-primary/10 dark:bg-[#181938] border-primary shadow-xs ring-2 ring-primary/40'
                    : 'bg-white dark:bg-[#151628] border-gray-200 dark:border-[#24253F] hover:border-gray-300 dark:hover:border-[#383A61] hover:bg-gray-50/70 dark:hover:bg-[#1A1C33]'
                )}
              >
                <div className="flex items-center justify-end w-full mb-3">
                  <div
                    className={clsx(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-transparent text-gray-400 dark:text-gray-400 group-hover:text-primary group-hover:bg-primary/10'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h4
                    className={clsx(
                      'text-xs sm:text-sm font-bold leading-tight truncate',
                      isActive
                        ? 'text-primary dark:text-primary-300'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {tab.title}
                  </h4>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1">
                    {tab.badge}
                  </span>
                </div>

                {isActive && (
                  <div className="absolute -bottom-[1px] left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
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
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {(claim as any).clientInfo?.phone ? (
                      <a
                        href={`tel:${(claim as any).clientInfo?.phone}`}
                        className="text-primary hover:underline"
                      >
                        {(claim as any).clientInfo?.phone}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {(claim as any).clientInfo?.email ? (
                      <a
                        href={`mailto:${(claim as any).clientInfo?.email}`}
                        className="text-primary hover:underline"
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
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Injury Details
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
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
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Registration</p>
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100 mt-1">
                  {claim.clientVehicle?.registration ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">MOT Expiry</p>
                <p
                  className={`font-medium text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.motExpiry)
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.motExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Road Tax Expiry</p>
                <p
                  className={`font-medium text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.roadTaxExpiry)
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.roadTaxExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Vehicle License (NSL)
                </p>
                <p
                  className={`font-medium text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.nslExpiry)
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {formatDate(claim.clientVehicle?.nslExpiry)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Insurance Expiry</p>
                <p
                  className={`font-medium text-sm mt-1 ${
                    checkIsExpiring(claim.clientVehicle?.insuranceExpiry)
                      ? 'text-red-600 dark:text-red-400 font-bold'
                      : 'text-gray-900 dark:text-gray-100'
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
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {(claim as any).registerKeeper.phone ? (
                    <a
                      href={`tel:${(claim as any).registerKeeper.phone}`}
                      className="text-primary hover:underline"
                    >
                      {(claim as any).registerKeeper.phone}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {(claim as any).registerKeeper.email ? (
                    <a
                      href={`mailto:${(claim as any).registerKeeper.email}`}
                      className="text-primary hover:underline"
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
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Signature
                </p>
                <img
                  src={(claim as any).registerKeeper.signature}
                  alt="Signature"
                  className="h-20 object-contain bg-white rounded-lg border border-gray-200 dark:border-[#2B2B40] p-1.5"
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Start Date & Time</div>
                  <div className="text-sm font-medium mt-0.5">
                    {formatDate(claim.hireDetails.startDate)}{' '}
                    {(claim.hireDetails as any).startTime ?? 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">End Date & Time</div>
                  <div className="text-sm font-medium mt-0.5">
                    {formatDate(claim.hireDetails.endDate)}{' '}
                    {(claim.hireDetails as any).endTime ?? 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Days of Hire</div>
                  <div className="text-sm font-medium mt-0.5">
                    {(claim.hireDetails as any).daysOfHire || 0} days
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Claim Rate</div>
                  <div className="text-sm font-medium mt-0.5">
                    {formatCurrency(claim.hireDetails.claimRate || 0)}/day
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
                  <div className="text-sm font-semibold text-primary mt-0.5">
                    {formatCurrency(claim.hireDetails.totalCost || 0)}
                  </div>
                </div>
                {claim.hireDetails.vehicle && (
                  <div className="col-span-2 sm:col-span-3 bg-gray-50 dark:bg-[#13131A] p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40]">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Vehicle on Hire
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>
                        <span className="text-gray-500">Make:</span> {claim.hireDetails.vehicle.make}
                      </p>
                      <p>
                        <span className="text-gray-500">Model:</span> {claim.hireDetails.vehicle.model}
                      </p>
                      <p>
                        <span className="text-gray-500">Registration:</span>{' '}
                        {claim.hireDetails.vehicle.registration}
                      </p>
                      <p>
                        <span className="text-gray-500">Claim Rate:</span>{' '}
                        {formatCurrency(claim.hireDetails.vehicle.claimRate)}/day
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                  <div className="font-medium text-sm mt-0.5">
                    {formatDate(claim.recovery.date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cost</div>
                  <div className="font-semibold text-primary text-sm mt-0.5">
                    {formatCurrency(claim.recovery.cost || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Pickup Location</div>
                  <div className="text-sm mt-0.5">{claim.recovery.locationPickup ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Dropoff Location</div>
                  <div className="text-sm mt-0.5">{claim.recovery.locationDropoff ?? 'N/A'}</div>
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
                  <div className="text-xs text-gray-500 dark:text-gray-400">Start Date</div>
                  <div className="font-medium text-sm mt-0.5">
                    {formatDate(claim.storage.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">End Date</div>
                  <div className="font-medium text-sm mt-0.5">
                    {formatDate(claim.storage.endDate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cost per Day</div>
                  <div className="font-medium text-sm mt-0.5">
                    {formatCurrency(claim.storage.costPerDay || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
                  <div className="font-semibold text-primary text-sm mt-0.5">
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
          <div className="py-6 px-4 text-center border border-dashed border-gray-200 dark:border-[#2B2B40] rounded-xl">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Date & Time</p>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                {formatDate(claim.incidentDetails?.date)}{' '}
                {claim.incidentDetails?.time ? `at ${claim.incidentDetails?.time}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Location</p>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                {claim.incidentDetails?.location ?? 'N/A'}
              </p>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 pt-2 border-t border-gray-100 dark:border-[#2B2B40]/60">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              Description
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-[#13131A] p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40]">
              {claim.incidentDetails?.description ?? 'N/A'}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
              Damage Details
            </p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-[#13131A] p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40]">
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
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Contact Number
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          <a
                            href={`tel:${claim.gpInformation.gpContactNumber}`}
                            className="text-primary hover:underline"
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
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Contact Number
                        </dt>
                        <dd className="mt-1 text-sm font-medium">
                          <a
                            href={`tel:${claim.hospitalInformation.hospitalContactNumber}`}
                            className="text-primary hover:underline"
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
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {claim.thirdParty?.phone ? (
                      <a
                        href={`tel:${claim.thirdParty.phone}`}
                        className="text-primary hover:underline"
                      >
                        {claim.thirdParty.phone}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {claim.thirdParty?.email ? (
                      <a
                        href={`mailto:${claim.thirdParty.email}`}
                        className="text-primary hover:underline"
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
                  className="bg-gray-50 dark:bg-[#13131A] p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40]"
                >
                  <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
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
                    className="bg-gray-50 dark:bg-[#13131A] p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40]"
                  >
                    <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
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
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
              Images ({(claim as any).evidence.images.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(claim as any).evidence.images.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] aspect-video cursor-pointer"
                  onClick={() => onDownloadDocument?.(url)}
                >
                  <img
                    src={url}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
              Videos ({(claim as any).evidence.videos.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(claim as any).evidence.videos.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-video bg-gray-100 dark:bg-[#13131A] rounded-xl overflow-hidden border border-gray-200 dark:border-[#2B2B40]"
                >
                  <video src={url} className="w-full h-full object-cover" controls />
                  <button
                    type="button"
                    onClick={() => onDownloadDocument?.(url)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-[#1E1E2D]/90 rounded-full shadow hover:bg-white dark:hover:bg-[#252538] transition-colors"
                    title="Download video"
                  >
                    <Download className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Photos */}
        {(claim as any).evidence?.clientVehiclePhotos?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
              Vehicle Photos ({(claim as any).evidence.clientVehiclePhotos.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(claim as any).evidence.clientVehiclePhotos.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] aspect-video cursor-pointer"
                  onClick={() => onDownloadDocument?.(url)}
                >
                  <img
                    src={url}
                    alt={`Vehicle photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Document Reports */}
        <div>
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
            Document Reports & Certificates
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {(claim as any).evidence?.engineerReport?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] hover:bg-gray-100 dark:hover:bg-[#252538] text-primary dark:text-primary-400 text-left transition-colors shadow-xs group"
              >
                <FileText className="h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate">
                  Engineer Report {index + 1}
                </span>
              </button>
            ))}
            {(claim as any).evidence?.bankStatement?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] hover:bg-gray-100 dark:hover:bg-[#252538] text-primary dark:text-primary-400 text-left transition-colors shadow-xs group"
              >
                <FileText className="h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate">
                  Bank Statement {index + 1}
                </span>
              </button>
            ))}
            {(claim as any).evidence?.adminDocuments?.map((url: string, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => onDownloadDocument?.(url)}
                className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50 dark:bg-[#13131A] hover:bg-gray-100 dark:hover:bg-[#252538] text-primary dark:text-primary-400 text-left transition-colors shadow-xs group"
              >
                <FileText className="h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold truncate">
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
            <div className="py-6 px-4 text-center border border-dashed border-gray-200 dark:border-[#2B2B40] rounded-xl">
              <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
            <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              Read-only
            </span>
          ) : undefined
        }
        action={
          (claim as any).progressDocumentUrl ? (
            <button
              type="button"
              onClick={() => onDownloadDocument?.((claim as any).progressDocumentUrl)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-primary-400 hover:underline bg-primary/5 dark:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20"
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
                  className="bg-gray-50 dark:bg-[#13131A] p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40] shadow-2xs"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-[#2B2B40]/60">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {formatDateTime(historyDate)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {h.note ?? 'N/A'}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
                    — {h.author ?? 'N/A'}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 px-4 text-center border border-dashed border-gray-200 dark:border-[#2B2B40] rounded-xl">
              <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
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
        className="border-primary/40 dark:border-primary/40 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AIE File Handler */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50/70 dark:bg-[#13131A]">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                AIE File Handler
              </h4>
            </div>
            <div className="font-semibold text-base text-gray-900 dark:text-gray-100">
              {claim.fileHandlers.aieHandler ?? 'Unassigned'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Responsible internal claims officer
            </p>
          </div>

          {/* Legal Handler */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-[#2B2B40] bg-gray-50/70 dark:bg-[#13131A]">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Legal Handler
              </h4>
            </div>
            {claim.fileHandlers.legalHandler ? (
              <div className="space-y-1.5">
                <div className="font-semibold text-base text-gray-900 dark:text-gray-100">
                  {claim.fileHandlers.legalHandler.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-500">Email: </span>
                  {claim.fileHandlers.legalHandler.email ? (
                    <a
                      href={`mailto:${claim.fileHandlers.legalHandler.email}`}
                      className="text-primary hover:underline"
                    >
                      {claim.fileHandlers.legalHandler.email}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-500">Phone: </span>
                  {claim.fileHandlers.legalHandler.phone ? (
                    <a
                      href={`tel:${claim.fileHandlers.legalHandler.phone}`}
                      className="text-primary hover:underline"
                    >
                      {claim.fileHandlers.legalHandler.phone}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </div>
                {claim.fileHandlers.legalHandler.address && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-medium text-gray-500">Address: </span>
                    {claim.fileHandlers.legalHandler.address}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenComm('whatsapp', 'legal_handler', 'legalHandler')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Send WhatsApp to Legal Handler"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp Handler</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenComm('email', 'legal_handler', 'legalHandler')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Send Email to Legal Handler (with Claim Card attached)"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email Handler (+ Claim Card)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-400 py-1">
                No legal handler assigned yet
              </div>
            )}
          </div>
        </div>

        {/* File Handler Internal Notes (if present) */}
        {claim.notes && claim.notes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2B2B40]/70">
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
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
                      className="border border-gray-200 dark:border-[#2B2B40] rounded-xl p-3.5 bg-gray-50 dark:bg-[#13131A] flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-grow mr-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              Author:
                            </span>{' '}
                            {n.author}
                          </p>
                          {n.noteTitle && (
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                              {n.noteTitle}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {format(created, 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap mb-2">
                        {n.text}
                      </div>
                      <div className="flex items-center text-xs">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 mr-1" />
                        <span className="font-medium mr-1 text-gray-500">Due:</span>
                        <span
                          className={clsx(
                            'ml-1',
                            dueDate < new Date()
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {format(dueDate, 'dd/MM/yyyy')}
                        </span>
                        {isOverdue && (
                          <span className="ml-2 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-[10px] px-2 py-0.5 rounded font-semibold border border-red-200 dark:border-red-900">
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

      {/* Metadata & Audit Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#2B2B40] pt-4 flex flex-col sm:flex-row justify-between gap-2">
        <div>Created by: {createdByName ?? claim.updatedBy ?? 'N/A'}</div>
        <div>Last Updated: {formatDateTime(claim.updatedAt)}</div>
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
