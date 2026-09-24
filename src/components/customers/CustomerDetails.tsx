// src/components/customers/CustomerDetails.tsx
import React, { useState, useMemo } from 'react';
import {
  User,
  MapPin,
  ShieldCheck,
  FileText,
  PenTool,
  Layers,
  Phone,
  Mail,
  Calendar,
  Building,
  CreditCard,
  Hash,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  File,
  Eye,
  Clock,
  Sparkles,
  Inbox,
  X,
  MessageSquare,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { Customer } from '../../types/customer';
import { resolveNameFields, resolveAddressFields, combineFullAddress } from '../../utils/nameAddressUtils';
import CommunicationHistoryTimeline from '../common/CommunicationHistoryTimeline';
import { formatSignatureTimestamp } from '../../utils/signatureStamp';
import { CustomerAvatar } from './CustomerAvatar';

export type MemberDetailTab = 'profile' | 'contact' | 'license' | 'documents' | 'signature' | 'communication' | 'all';

interface CustomerDetailsProps {
  customer: Customer;
  onClose?: () => void;
}

// Safe date formatter
const safeFormatDate = (dateVal: any, pattern: string = 'dd MMM yyyy'): string => {
  if (!dateVal) return 'Not Provided';
  try {
    const d = typeof dateVal?.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return 'Not Provided';
    return format(d, pattern);
  } catch {
    return 'Not Provided';
  }
};

// Safe date status evaluator
const getExpiryStatus = (dateVal: any): { isExpired: boolean; isSoon: boolean; daysRemaining: number | null; label: string } => {
  if (!dateVal) return { isExpired: false, isSoon: false, daysRemaining: null, label: 'Not Set' };
  try {
    const d = typeof dateVal?.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
    if (isNaN(d.getTime())) return { isExpired: false, isSoon: false, daysRemaining: null, label: 'Not Set' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const days = differenceInDays(target, today);
    if (days < 0) {
      return { isExpired: true, isSoon: false, daysRemaining: days, label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago` };
    }
    if (days <= 14) {
      return { isExpired: false, isSoon: true, daysRemaining: days, label: days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}` };
    }
    return { isExpired: false, isSoon: false, daysRemaining: days, label: `Valid (${days} days remaining)` };
  } catch {
    return { isExpired: false, isSoon: false, daysRemaining: null, label: 'Not Set' };
  }
};

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, onClose }) => {
  const [activeTab, setActiveTab] = useState<MemberDetailTab>('profile');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const isCompany = customer.type === 'company';
  const nameFields = resolveNameFields(customer);
  const addressFields = resolveAddressFields(customer);
  const fullAddress = combineFullAddress(
    addressFields.buildingFlat,
    addressFields.streetName,
    addressFields.townCity,
    addressFields.postcode,
    addressFields.country
  ) || customer.address || '';

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

  // Expiry states
  const licenseExpiryStatus = getExpiryStatus(customer.licenseExpiry);
  const billExpiryStatus = getExpiryStatus(customer.billExpiry);

  const complianceAlertCount = useMemo(() => {
    let count = 0;
    if (customer.type !== 'company') {
      if (licenseExpiryStatus.isExpired || licenseExpiryStatus.isSoon) count++;
      if (billExpiryStatus.isExpired || billExpiryStatus.isSoon) count++;
    }
    return count;
  }, [customer.type, licenseExpiryStatus, billExpiryStatus]);

  // Document list
  const documentsList = useMemo(() => {
    const list: { id: string; title: string; url?: string; category: string }[] = [];
    if (customer.licenseFrontUrl) {
      list.push({ id: 'licenseFront', title: "Driver's License (Front)", url: customer.licenseFrontUrl, category: 'License' });
    }
    if (customer.licenseBackUrl) {
      list.push({ id: 'licenseBack', title: "Driver's License (Back)", url: customer.licenseBackUrl, category: 'License' });
    }
    if (customer.billDocumentUrl) {
      list.push({ id: 'billDoc', title: 'Proof of Address / Utility Bill', url: customer.billDocumentUrl, category: 'Address Proof' });
    }
    if (customer.documentUrl) {
      list.push({ id: 'generalDoc', title: 'Customer Agreement / General Document', url: customer.documentUrl, category: 'General' });
    }
    return list;
  }, [customer]);

  const totalDocsCount = documentsList.length;

  // Navigation Tabs
  const tabs: {
    id: MemberDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: 'profile', label: 'Profile & Identity', icon: User },
    { id: 'contact', label: 'Contact & Address', icon: MapPin },
    {
      id: 'license',
      label: 'License & KYC',
      icon: ShieldCheck,
      badge: complianceAlertCount > 0 ? `${complianceAlertCount} due` : undefined,
      badgeColor: complianceAlertCount > 0 ? 'bg-rose-100 text-rose-700 border-rose-300' : undefined,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      badge: totalDocsCount > 0 ? `${totalDocsCount} files` : undefined,
    },
    ...(!isCompany
      ? [
          {
            id: 'signature' as MemberDetailTab,
            label: 'Signature',
            icon: PenTool,
            badge: customer.signature ? 'Signed' : 'Pending',
            badgeColor: customer.signature
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
              : 'bg-amber-100 text-amber-700 border-amber-300',
          },
        ]
      : []),
    {
      id: 'communication' as MemberDetailTab,
      label: 'Communication History',
      icon: MessageSquare,
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

  // Initials for avatar
  const initials = useMemo(() => {
    if (isCompany) return 'CO';
    const first = nameFields.firstName?.[0] || customer.name?.[0] || 'M';
    const last = nameFields.lastName?.[0] || '';
    return (first + last).toUpperCase();
  }, [isCompany, nameFields, customer.name]);

  // Open Document in new window
  const handleOpenDoc = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─────────────────────────────────────────────────────────────
  // TAB RENDERERS
  // ─────────────────────────────────────────────────────────────

  // 1. Profile & Identity
  const renderProfileContent = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Identity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Personal Information</h4>
          </div>

          {isCompany ? (
            <div className="space-y-3.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Company Name</span>
                <span className="text-base font-bold text-slate-900 block mt-0.5">{customer.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Account Number</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-mono font-semibold text-slate-800">{customer.accountNumber || 'N/A'}</span>
                    {customer.accountNumber && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.accountNumber!, 'Account Number')}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title="Copy Account Number"
                      >
                        {copiedField === 'Account Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">VAT Number</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-mono font-semibold text-slate-800">{customer.vatNumber || 'N/A'}</span>
                    {customer.vatNumber && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.vatNumber!, 'VAT Number')}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title="Copy VAT Number"
                      >
                        {copiedField === 'VAT Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">First Name</span>
                  <span className="text-sm font-semibold text-slate-900 block mt-0.5">{nameFields.firstName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Middle Name</span>
                  <span className="text-sm font-semibold text-slate-900 block mt-0.5">{nameFields.middleName || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Last Name</span>
                  <span className="text-sm font-semibold text-slate-900 block mt-0.5">{nameFields.lastName || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Gender</span>
                  <span className="text-sm font-semibold text-slate-800 capitalize block mt-0.5">
                    {customer.gender || 'Not Specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Age</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {customer.age ? `${customer.age} years` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Date of Birth</span>
                  <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                    {safeFormatDate(customer.dateOfBirth)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">National Insurance Number</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono font-bold tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {customer.nationalInsuranceNumber || 'Not Provided'}
                  </span>
                  {customer.nationalInsuranceNumber && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(customer.nationalInsuranceNumber!, 'NI Number')}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Copy National Insurance Number"
                    >
                      {copiedField === 'NI Number' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Member Account & Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Membership Details</h4>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Account Status</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      customer.status === 'inactive'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${customer.status === 'inactive' ? 'bg-slate-500' : 'bg-emerald-500'}`} />
                    {customer.status || 'Active'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block text-right">Member Type</span>
                <div className="mt-1 flex justify-end">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    {customer.type || 'Customer'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">System Member ID</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all select-all">
                  {customer.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(customer.id, 'Member ID')}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                  title="Copy Member ID"
                >
                  {copiedField === 'Member ID' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Member Since</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {safeFormatDate(customer.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Last Updated</span>
                <span className="text-sm font-semibold text-slate-800 block mt-0.5">
                  {safeFormatDate(customer.updatedAt)}
                </span>
              </div>
            </div>

            {/* Bill copy physical office tracker */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Office Bill Copy Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    customer.billCopyStatus === 'available'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5 mr-1" />
                  {customer.billCopyStatus === 'available' ? 'Hardcopy Available in Office' : 'Not Recorded in Office'}
                </span>
                {customer.billCopyNote && (
                  <span className="text-xs text-slate-500 italic truncate" title={customer.billCopyNote}>
                    ({customer.billCopyNote})
                  </span>
                )}
              </div>
            </div>

            {/* Customer Profile Picture */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Customer Profile Picture</span>
              <div className="flex items-center justify-between gap-3 mt-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CustomerAvatar
                    name={customer.name}
                    firstName={nameFields.firstName}
                    lastName={nameFields.lastName}
                    isCompany={isCompany}
                    profilePictureUrl={customer.profilePictureUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {customer.profilePictureUrl ? 'Custom Profile Photo Uploaded' : 'Default Initials Avatar'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {customer.profilePictureUrl ? 'Stored on member profile record' : 'No custom photo uploaded'}
                    </span>
                  </div>
                </div>
                {customer.profilePictureUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: customer.profilePictureUrl!, title: `${customer.name} - Profile Photo` })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-blue-200 shadow-2xs transition shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 2. Contact & Address
  const renderContactContent = () => (
    <div className="space-y-5">
      {/* Quick Contact Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Phone Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Mobile Phone</span>
              <a
                href={`tel:${customer.mobile}`}
                className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors mt-0.5 block"
              >
                {customer.mobile || 'No Phone Provided'}
              </a>
            </div>
          </div>
          {customer.mobile && (
            <button
              type="button"
              onClick={() => copyToClipboard(customer.mobile, 'Phone Number')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Copy Phone Number"
            >
              {copiedField === 'Phone Number' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Email Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Email Address</span>
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="text-base font-bold text-slate-900 hover:text-purple-600 transition-colors mt-0.5 block truncate"
                  title={customer.email}
                >
                  {customer.email}
                </a>
              ) : (
                <span className="text-sm font-semibold text-slate-400 mt-0.5 block">No Email Provided</span>
              )}
            </div>
          </div>
          {customer.email && (
            <button
              type="button"
              onClick={() => copyToClipboard(customer.email, 'Email Address')}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
              title="Copy Email Address"
            >
              {copiedField === 'Email Address' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Structured Address Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Residential / Postal Address</h4>
          </div>
          {fullAddress && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(fullAddress, 'Full Address')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {copiedField === 'Full Address' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Full Address
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Map
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Building / Flat Number</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">{addressFields.buildingFlat || '-'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Street Name</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">{addressFields.streetName || '-'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Town / City</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">{addressFields.townCity || '-'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Postcode</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                {addressFields.postcode || 'N/A'}
              </span>
              {addressFields.postcode && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(addressFields.postcode, 'Postcode')}
                  className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title="Copy Postcode"
                >
                  {copiedField === 'Postcode' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Country</span>
            <span className="text-sm font-semibold text-slate-900 block mt-0.5">{addressFields.country || 'United Kingdom'}</span>
          </div>
        </div>

        {/* Combined single-line address preview */}
        {fullAddress && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{fullAddress}</span>
          </div>
        )}
      </div>
    </div>
  );

  // 3. License & KYC Compliance
  const renderLicenseContent = () => (
    <div className="space-y-5">
      {/* Alert banner if anything is expired or expiring soon */}
      {complianceAlertCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-950">Compliance Alert Required</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              One or more KYC documents for this member require renewal or immediate verification.
            </p>
          </div>
        </div>
      )}

      {/* Grid of compliance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Driving License Number */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Driver License No.</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-mono font-black tracking-wide text-slate-950 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 truncate">
              {customer.driverLicenseNumber || 'Not Provided'}
            </span>
            {customer.driverLicenseNumber && (
              <button
                type="button"
                onClick={() => copyToClipboard(customer.driverLicenseNumber!, 'License Number')}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer shrink-0"
                title="Copy License Number"
              >
                {copiedField === 'License Number' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Country: <strong>{customer.countryOfIssue || 'UK'}</strong></span>
          </div>
        </div>

        {/* Issue Number */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Issue Number</span>
            <Hash className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-lg font-black font-mono text-slate-900 block">
            {customer.issueNumber || 'N/A'}
          </span>
          <div className="text-[11px] text-slate-500">
            Valid From: <strong>{safeFormatDate(customer.licenseValidFrom)}</strong>
          </div>
        </div>

        {/* License Expiry Status */}
        <div
          className={`border rounded-2xl p-5 shadow-2xs space-y-2 ${
            licenseExpiryStatus.isExpired
              ? 'bg-rose-50/60 border-rose-300'
              : licenseExpiryStatus.isSoon
              ? 'bg-amber-50/60 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">License Expiry</span>
            <Calendar
              className={`w-4 h-4 ${
                licenseExpiryStatus.isExpired
                  ? 'text-rose-600'
                  : licenseExpiryStatus.isSoon
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            />
          </div>
          <span
            className={`text-lg font-black block ${
              licenseExpiryStatus.isExpired
                ? 'text-rose-700'
                : licenseExpiryStatus.isSoon
                ? 'text-amber-800'
                : 'text-slate-900'
            }`}
          >
            {safeFormatDate(customer.licenseExpiry)}
          </span>
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                licenseExpiryStatus.isExpired
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : licenseExpiryStatus.isSoon
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {licenseExpiryStatus.label}
            </span>
          </div>
        </div>

        {/* Taxi / PCO / Council Badge Number */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taxi / PCO Badge</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-base font-bold font-mono text-slate-900 block">
            {customer.badgeNumber || 'Not Registered'}
          </span>
          <div className="text-[11px] text-slate-500">Official licensing or council badge</div>
        </div>

        {/* Proof of Address / Bill Expiry */}
        <div
          className={`border rounded-2xl p-5 shadow-2xs space-y-2 ${
            billExpiryStatus.isExpired
              ? 'bg-rose-50/60 border-rose-300'
              : billExpiryStatus.isSoon
              ? 'bg-amber-50/60 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Utility Bill Expiry</span>
            <FileText
              className={`w-4 h-4 ${
                billExpiryStatus.isExpired
                  ? 'text-rose-600'
                  : billExpiryStatus.isSoon
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`}
            />
          </div>
          <span
            className={`text-lg font-black block ${
              billExpiryStatus.isExpired
                ? 'text-rose-700'
                : billExpiryStatus.isSoon
                ? 'text-amber-800'
                : 'text-slate-900'
            }`}
          >
            {safeFormatDate(customer.billExpiry)}
          </span>
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                billExpiryStatus.isExpired
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : billExpiryStatus.isSoon
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {billExpiryStatus.label}
            </span>
          </div>
        </div>

        {/* Office Bill Hardcopy Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Office Hardcopy</span>
            <Inbox className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                customer.billCopyStatus === 'available'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {customer.billCopyStatus === 'available' ? 'Available in Office' : 'Not in Office'}
            </span>
          </div>
          {customer.billCopyNote && (
            <p className="text-[11px] text-slate-600 italic">
              Note: {customer.billCopyNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // 4. Documents & KYC Attachments
  const renderDocumentsContent = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Member KYC & Legal Documents</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalDocsCount > 0 ? `${totalDocsCount} document(s) uploaded for this member` : 'No documents currently uploaded.'}
          </p>
        </div>
      </div>

      {totalDocsCount === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No documents on file</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Edit this member from the actions menu to upload their driving license, utility bill proof, or signed agreement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documentsList.map((docItem) => {
            const isPdf = (docItem.url || '').toLowerCase().includes('.pdf');

            return (
              <div
                key={docItem.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {docItem.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {isPdf ? 'PDF' : 'IMAGE'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 mb-3 truncate" title={docItem.title}>
                    {docItem.title}
                  </h5>

                  {/* Thumbnail / Preview container */}
                  <div className="w-full h-36 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center overflow-hidden relative group/thumb">
                    {isPdf ? (
                      <div className="text-center p-3">
                        <File className="w-10 h-10 text-rose-500 mx-auto" />
                        <span className="text-xs font-semibold text-slate-700 mt-2 block">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={docItem.url}
                        alt={docItem.title}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!isPdf && docItem.url && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: docItem.url!, title: docItem.title })}
                          className="p-2 rounded-xl bg-white/95 text-slate-800 hover:bg-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                          title="Preview full size"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      )}
                      {docItem.url && (
                        <button
                          type="button"
                          onClick={() => handleOpenDoc(docItem.url!)}
                          className="p-2 rounded-xl bg-white/95 text-blue-600 hover:bg-white shadow-md transition-transform hover:scale-110 cursor-pointer"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-medium">Click to inspect</span>
                  <div className="flex items-center gap-1.5">
                    {!isPdf && docItem.url && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: docItem.url!, title: docItem.title })}
                        className="text-xs font-semibold text-slate-700 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        Preview
                      </button>
                    )}
                    {docItem.url && (
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(docItem.url!)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 5. Signature & Verification
  const renderSignatureContent = () => (
    <div className="space-y-5">
      {/* Signature Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          customer.signature
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {customer.signature ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-bold">
              {customer.signature ? 'Legally Signed & Verified' : 'Signature Pending'}
            </h4>
            <p className="text-xs opacity-90 mt-0.5">
              {customer.signature
                ? 'Member signature is recorded and legally archived for rental compliance.'
                : 'This member has not yet submitted a digital signature.'}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0 ${
            customer.signature
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-amber-600 text-white border-amber-600'
          }`}
        >
          {customer.signature ? 'Completed' : 'Pending Request'}
        </span>
      </div>

      {/* Signature Display Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Digital Signature Record</h4>
          </div>
          {customer.signature && (
            <button
              type="button"
              onClick={() => setPreviewImage({ url: customer.signature!, title: `${customer.name} - Digital Signature` })}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Enlarge
            </button>
          )}
        </div>

        {customer.signature ? (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              onClick={() => setPreviewImage({ url: customer.signature!, title: `${customer.name} - Digital Signature` })}
              className="w-full sm:w-80 h-36 bg-white border-2 border-slate-200 rounded-xl p-3 flex items-center justify-center shadow-xs cursor-pointer hover:border-blue-400 transition-colors group"
            >
              <img
                src={customer.signature}
                alt="Member Signature"
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 max-w-md">
              <p>
                <strong className="text-slate-900">Signee:</strong> {customer.name}
              </p>
              
              {(customer.signatureTimestamp || customer.signedAt) && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 text-xs text-emerald-950 font-mono">
                  <span className="font-bold block text-emerald-800 text-[11px] mb-0.5">Verified Signature Record:</span>
                  <p className="font-semibold text-emerald-900">
                    {customer.signatureTimestamp || (customer.signedAt ? formatSignatureTimestamp(customer.signedAt) : 'Electronically Signed')}
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-1 font-sans">
                    ✓ Mandatory Terms &amp; Conditions explicitly agreed and verified
                  </p>
                </div>
              )}

              <p>
                <strong className="text-slate-900">Digital Verification:</strong> Cryptographically logged with audit timestamp and verified consent.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This signature serves as binding consent for vehicle lease agreements, deposit acknowledgements, and terms of service.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
            <PenTool className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No signature currently registered</p>
            <p className="text-xs text-slate-500 mt-1">
              You can send a digital signature request link to this member via SMS or email from the members table.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
        {/* ─────────────────────────────────────────────────────────────── */}
        {/* TOP SUMMARY STRIP                                               */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar with Photo & Preview */}
            <div
              className={`relative group shrink-0 ${customer.profilePictureUrl ? 'cursor-pointer' : ''}`}
              onClick={customer.profilePictureUrl ? () => setPreviewImage({ url: customer.profilePictureUrl!, title: `${customer.name} - Profile Photo` }) : undefined}
            >
              <CustomerAvatar
                name={customer.name}
                firstName={nameFields.firstName}
                lastName={nameFields.lastName}
                isCompany={isCompany}
                profilePictureUrl={customer.profilePictureUrl}
                size="lg"
                status={customer.status}
                showStatusDot={true}
                className={customer.profilePictureUrl ? 'ring-2 ring-blue-100 hover:ring-blue-400' : ''}
              />
              {customer.profilePictureUrl && (
                <div
                  className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                  title="Click to view full photo"
                >
                  <Eye className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900 truncate">{customer.name}</h3>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    customer.status === 'inactive'
                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  {customer.status || 'Active'}
                </span>

                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {customer.type || 'Customer'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                {customer.mobile && (
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customer.mobile}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1 font-medium text-slate-600 truncate max-w-[200px] sm:max-w-xs">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {customer.email}
                  </span>
                )}
                {customer.driverLicenseNumber && (
                  <span className="flex items-center gap-1 font-mono font-medium text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded">
                    <CreditCard className="w-3 h-3 text-slate-500" />
                    {customer.driverLicenseNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick ID & Close Header Action */}
          <div className="flex items-center gap-2 text-right">
            <button
              type="button"
              onClick={() => copyToClipboard(customer.id, 'Member ID')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Copy Member ID"
            >
              {copiedField === 'Member ID' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>ID: #{customer.id.slice(0, 8)}</span>
            </button>
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
          {activeTab === 'profile' && renderProfileContent()}
          {activeTab === 'contact' && renderContactContent()}
          {activeTab === 'license' && renderLicenseContent()}
          {activeTab === 'documents' && renderDocumentsContent()}
          {activeTab === 'signature' && renderSignatureContent()}
          {activeTab === 'communication' && (
            <div className="space-y-4">
              <CommunicationHistoryTimeline
                customerId={customer.id}
                recordId={customer.accountNumber || customer.id}
                matchKeys={[
                  customer.id,
                  customer.accountNumber,
                  customer.name,
                  customer.email,
                  customer.mobile,
                  customer.phone,
                  customer.driverLicenseNumber,
                ].filter(Boolean)}
                title={`Communication History & Audit Trail — ${customer.name}`}
                description="Chronological log of all WhatsApp messages, emails, and attachments sent to this customer."
              />
            </div>
          )}

          {activeTab === 'all' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  1. Profile & Personal Details
                </h3>
                {renderProfileContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  2. Contact & Address Details
                </h3>
                {renderContactContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  3. License & KYC Compliance
                </h3>
                {renderLicenseContent()}
              </div>

              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  4. Uploaded Documents
                </h3>
                {renderDocumentsContent()}
              </div>

              {!isCompany && (
                <div className="pb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-indigo-600" />
                    5. Signature & Verification
                  </h3>
                  {renderSignatureContent()}
                </div>
              )}
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
      {/* IMAGE / DOCUMENT LIGHTBOX MODAL                                 */}
      {/* ─────────────────────────────────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
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
                  onClick={() => handleOpenDoc(previewImage.url)}
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

export default CustomerDetails;
