// src/components/vehicles/VehicleDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import {
  Car,
  User,
  MapPin,
  Calendar,
  Wallet,
  Wrench,
  FileCheck,
  Pencil,
  Trash2,
  Tag,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  DollarSign,
  Gauge,
  Eye,
  X
} from 'lucide-react';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Modal from '../ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import MileageUpdateForm from './MileageUpdateForm';
import toast from 'react-hot-toast';

export type VehicleDetailTab =
  | 'specs'
  | 'service'
  | 'compliance'
  | 'pricing'
  | 'owner_docs'
  | 'all';

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const toDate = (v: any): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === 'object' && typeof v.toDate === 'function') {
    const d = v.toDate();
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === 'object' && typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({ vehicle, onClose }) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VehicleDetailTab>('specs');
  const [copiedVin, setCopiedVin] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [mileageHistory, setMileageHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [editingMileageRecord, setEditingMileageRecord] = useState<any | null>(null);

  const { can, isCompany } = usePermissions();

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (vehicle.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', vehicle.createdBy));
          if (userDoc.exists()) setCreatedByName(userDoc.data().name);
          else setCreatedByName('Unknown User');
        } catch {
          setCreatedByName('Unknown User');
        }
      }
    };
    fetchCreatedByName();
  }, [vehicle.createdBy]);

  useEffect(() => {
    if (!vehicle.id) return;
    setIsLoadingHistory(true);
    const q = query(
      collection(db, 'mileageHistory'),
      where('vehicleId', '==', vehicle.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const historyData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMileageHistory(historyData);
        setIsLoadingHistory(false);
      },
      (error) => {
        console.error('Error fetching mileage history:', error);
        setIsLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [vehicle.id]);

  const formatTimeGap = (currentDate: any, previousDate: any) => {
    if (!currentDate || !previousDate) return '-';
    const d1 = toDate(currentDate);
    const d2 = toDate(previousDate);
    if (!d1 || !d2) return '-';

    let diffDays = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '-';

    const months = Math.floor(diffDays / 30);
    diffDays %= 30;
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;

    const res = [];
    if (months > 0) res.push(`${months}m`);
    if (weeks > 0) res.push(`${weeks}w`);
    if (days > 0 || res.length === 0) res.push(`${days}d`);
    return res.join(' ');
  };

  const handleDeleteMileage = async (recordId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this mileage record? The vehicle's current mileage will be recalculated."
      )
    )
      return;

    try {
      await deleteDoc(doc(db, 'mileageHistory', recordId));

      const q = query(collection(db, 'mileageHistory'), where('vehicleId', '==', vehicle.id));
      const snap = await getDocs(q);
      const history = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      history.sort((a: any, b: any) => {
        const d1 = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const d2 = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return d1 - d2;
      });

      const newArray = history.map((h: any) => ({
        date: h.date,
        mileage: h.newMileage,
        note: h.notes || '',
        updatedBy: h.recordedBy || 'System',
        source: h.source || 'form',
        historyId: h.id,
      }));

      const latestMileage = history.length > 0 ? history[history.length - 1].newMileage : 0;

      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        mileageUpdates: newArray,
        mileage: latestMileage,
        updatedAt: new Date(),
      });

      toast.success('Mileage record deleted.');
    } catch {
      toast.error('Failed to delete record.');
    }
  };

  const handleCopyVin = () => {
    if (!vehicle.vin) return;
    navigator.clipboard.writeText(vehicle.vin);
    setCopiedVin(true);
    toast.success('VIN copied to clipboard');
    setTimeout(() => setCopiedVin(false), 2000);
  };

  const handleCopyId = () => {
    if (!vehicle.id) return;
    navigator.clipboard.writeText(vehicle.id);
    setCopiedId(true);
    toast.success('Vehicle ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Date Parsing
  const motTestDate = useMemo(() => toDate(vehicle.motTestDate), [vehicle.motTestDate]);
  const motExpirySaved = useMemo(
    () => toDate((vehicle as any).motExpiry),
    [(vehicle as any).motExpiry]
  );
  const nslExpiry = useMemo(() => toDate(vehicle.nslExpiry), [vehicle.nslExpiry]);
  const roadTaxExpiry = useMemo(() => toDate(vehicle.roadTaxExpiry), [vehicle.roadTaxExpiry]);
  const insuranceExpiry = useMemo(() => toDate(vehicle.insuranceExpiry), [vehicle.insuranceExpiry]);
  const lastMaintenance = useMemo(() => toDate(vehicle.lastMaintenance), [vehicle.lastMaintenance]);
  const nextMaintenance = useMemo(() => toDate(vehicle.nextMaintenance), [vehicle.nextMaintenance]);
  const purchasedDate = useMemo(
    () => toDate((vehicle as any).purchasedDate),
    [(vehicle as any).purchasedDate]
  );
  const createdAt = useMemo(() => toDate(vehicle.createdAt), [vehicle.createdAt]);
  const soldDate = useMemo(() => toDate(vehicle.soldDate), [vehicle.soldDate]);
  const firstRegistrationDate = useMemo(
    () => toDate((vehicle as any).firstRegistrationDate),
    [(vehicle as any).firstRegistrationDate]
  );
  const warrantyStartDate = useMemo(
    () => toDate((vehicle as any).warrantyStartDate),
    [(vehicle as any).warrantyStartDate]
  );
  const warrantyEndDate = useMemo(
    () => toDate((vehicle as any).warrantyEndDate),
    [(vehicle as any).warrantyEndDate]
  );

  const vehicleAge = useMemo(() => {
    if (!firstRegistrationDate) return null;
    return Math.floor(
      (Date.now() - firstRegistrationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
  }, [firstRegistrationDate]);

  const money3 = (n: unknown) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-';

  const motExpiry = useMemo(() => {
    if (motExpirySaved) return motExpirySaved;
    if (!motTestDate) return undefined;
    const e = new Date(motTestDate);
    e.setMonth(e.getMonth() + 6);
    return e;
  }, [motExpirySaved, motTestDate]);

  const isWarrantyRed = useMemo(() => {
    const currentMileage = vehicle.mileage || 0;
    if (currentMileage >= 150000) return true;
    if (!warrantyEndDate) return false;
    if (warrantyEndDate.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000) return true;
    return false;
  }, [warrantyEndDate, vehicle.mileage]);

  // Expiry counter for badge
  const expiringAlertCount = useMemo(() => {
    let count = 0;
    const items = [
      motExpiry,
      nslExpiry,
      roadTaxExpiry,
      insuranceExpiry,
      nextMaintenance,
      warrantyEndDate,
    ];
    items.forEach((d) => {
      if (d) {
        const diffMs = d.getTime() - Date.now();
        if (diffMs <= 14 * 24 * 60 * 60 * 1000) {
          count++;
        }
      }
    });
    return count;
  }, [motExpiry, nslExpiry, roadTaxExpiry, insuranceExpiry, nextMaintenance, warrantyEndDate]);

  // Count total documents
  const totalDocsCount = useMemo(() => {
    if (!vehicle.documents) return 0;
    return Object.values(vehicle.documents).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }, [vehicle.documents]);

  // Next service calculation
  const currentMileageNum = typeof vehicle.mileage === 'number' ? vehicle.mileage : 0;
  const serviceIntervalNum =
    typeof (vehicle as any).serviceInterval === 'number'
      ? (vehicle as any).serviceInterval
      : 25000;
  const nextServiceMileageNum =
    typeof vehicle.nextServiceMileage === 'number'
      ? vehicle.nextServiceMileage
      : currentMileageNum + serviceIntervalNum;
  const milesUntilNextService = nextServiceMileageNum - currentMileageNum;

  // Tabs Definition
  const tabs: {
    id: VehicleDetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    { id: 'specs', label: 'Overview & Specs', icon: Car },
    {
      id: 'service',
      label: 'Service & Mileage',
      icon: Wrench,
      badge: `${currentMileageNum.toLocaleString()} mi`,
    },
    {
      id: 'compliance',
      label: 'License & Compliance',
      icon: FileCheck,
      badge: expiringAlertCount > 0 ? `${expiringAlertCount} due` : undefined,
      badgeColor: expiringAlertCount > 0 ? 'bg-rose-100 text-rose-700 border-rose-300' : undefined,
    },
    ...(!isCompany
      ? [
          {
            id: 'pricing' as VehicleDetailTab,
            label: 'Rental & Pricing',
            icon: Tag,
            badge:
              typeof vehicle.weeklyRentalPrice === 'number'
                ? `£${vehicle.weeklyRentalPrice}/wk`
                : undefined,
          },
        ]
      : []),
    {
      id: 'owner_docs',
      label: 'Owner & Documents',
      icon: FileText,
      badge: totalDocsCount > 0 ? `${totalDocsCount} files` : undefined,
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

  // Helper for compliance date badges
  const renderDateWithStatus = (date: Date | undefined, label: string) => {
    if (!date) {
      return (
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
          <span className="text-sm font-semibold text-slate-400 mt-1 block">Not Set</span>
        </div>
      );
    }

    const isPast = date.getTime() < Date.now();
    const isDueSoon = !isPast && date.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000;

    return (
      <div>
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
          {isPast ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              Expired
            </span>
          ) : isDueSoon ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase">
              Expiring
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Valid
            </span>
          )}
        </div>
        <p
          className={`text-sm font-bold font-mono ${
            isPast ? 'text-rose-600 font-black' : isDueSoon ? 'text-amber-700 font-black' : 'text-slate-900'
          }`}
        >
          {formatDate(date)}
        </p>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SUB-SECTION RENDERERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderSpecsContent = () => (
    <div className="space-y-5">
      {/* Vehicle Image + Core Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {vehicle.image ? (
            <div
              className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-xs"
              onClick={() => setSelectedImage(vehicle.image || null)}
            >
              <img
                src={vehicle.image}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-44 w-72 object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                <Eye className="w-4 h-4" /> Click to enlarge
              </div>
            </div>
          ) : (
            <div className="h-44 w-72 bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl border border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0 shadow-inner">
              <Car className="h-14 w-14 text-slate-400 mb-2 stroke-[1.5]" />
              <span className="text-xs font-semibold text-slate-500">No Image Available</span>
            </div>
          )}

          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-amber-300 text-slate-950 font-mono font-black text-sm rounded-md border border-amber-400 shadow-2xs tracking-widest uppercase">
                  {vehicle.registrationNumber}
                </span>
                <StatusBadge status={vehicle.status} />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {vehicle.assignmentType || 'Unassigned'}
                </span>
              </div>

              {vehicle.vin && (
                <button
                  type="button"
                  onClick={handleCopyVin}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Copy VIN"
                >
                  {copiedVin ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span className="font-mono text-[11px] font-bold">
                    VIN: {vehicle.vin}
                  </span>
                </button>
              )}
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Model Year: <span className="text-slate-800 font-bold">{vehicle.year}</span>
                {vehicleAge !== null && (
                  <span className="ml-2 font-medium">· Age: <strong className="text-slate-800">{vehicleAge} Years</strong></span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Current Mileage
                </span>
                <span className="text-sm font-black font-mono text-slate-900 mt-0.5 block">
                  {currentMileageNum.toLocaleString()} mi
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Next Service Due
                </span>
                <span className="text-sm font-black font-mono text-blue-600 mt-0.5 block">
                  {nextServiceMileageNum.toLocaleString()} mi
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Owner
                </span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                  {vehicle.owner?.name || 'AIE Skyline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Specifications Grid Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Car className="w-4 h-4 text-indigo-600" />
          Core Specifications & Registration Details
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Registration</span>
            <span className="text-sm font-black font-mono text-slate-900 mt-1 block">
              {vehicle.registrationNumber}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">VIN Number</span>
            <span className="text-xs font-bold font-mono text-slate-800 mt-1 block truncate" title={vehicle.vin}>
              {vehicle.vin || 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Manufacturer Make</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {vehicle.make}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Model Variant</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
              {vehicle.model}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Year of Manufacture</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {vehicle.year}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Current Status</span>
            <div className="mt-1">
              <StatusBadge status={vehicle.status} />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Assignment Type</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {vehicle.assignmentType || 'Unassigned'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Calculated Age</span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {vehicleAge !== null ? `${vehicleAge} Years` : 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Purchased Date</span>
            <span className="text-sm font-bold font-mono text-slate-800 mt-1 block">
              {purchasedDate ? formatDate(purchasedDate) : 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">First Registration</span>
            <span className="text-sm font-bold font-mono text-slate-800 mt-1 block">
              {firstRegistrationDate ? formatDate(firstRegistrationDate) : 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider block">Warranty Start</span>
            <span className="text-sm font-bold font-mono text-slate-800 mt-1 block">
              {warrantyStartDate ? formatDate(warrantyStartDate) : 'N/A'}
            </span>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              isWarrantyRed ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span
              className={`font-bold uppercase tracking-wider block ${
                isWarrantyRed ? 'text-rose-700' : 'text-slate-500'
              }`}
            >
              Warranty Expiry
            </span>
            <span
              className={`text-sm font-black font-mono mt-1 block ${
                isWarrantyRed ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {warrantyEndDate ? formatDate(warrantyEndDate) : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Sale Info (if vehicle marked as sold) */}
      {!isCompany && vehicle.status === 'sold' && (
        <div className="bg-amber-50/80 rounded-xl border border-amber-300 p-4 sm:p-5 shadow-2xs">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            Vehicle Sale Record
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <span className="font-bold text-slate-500 uppercase block">Sale Date</span>
              <span className="text-sm font-black text-slate-900 mt-1 block">
                {soldDate ? formatDate(soldDate) : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-amber-200">
              <span className="font-bold text-slate-500 uppercase block">Sale Price</span>
              <span className="text-base font-black font-mono text-emerald-700 mt-1 block">
                {typeof vehicle.salePrice === 'number'
                  ? `£${vehicle.salePrice.toLocaleString()}`
                  : vehicle.salePrice || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Record Metadata Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Created At</span>
              <span className="font-semibold text-slate-800">{createdAt ? formatDate(createdAt) : 'N/A'}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="font-bold text-slate-500 uppercase block text-[10px]">Created By</span>
              <span className="font-semibold text-slate-800">{createdByName || vehicle.createdBy || 'System'}</span>
            </div>
            {vehicle.id && (
              <div className="border-l border-slate-200 pl-4">
                <span className="font-bold text-slate-500 uppercase block text-[10px]">Record ID</span>
                <span className="font-mono text-slate-700 text-[11px]">{vehicle.id}</span>
              </div>
            )}
          </div>

          {vehicle.id && (
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderServiceContent = () => (
    <div className="space-y-5">
      {/* Service Milestones Metric Strip */}
      <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 rounded-xl border border-blue-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Service Mileage Status
            </h4>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              milesUntilNextService <= 0
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : milesUntilNextService <= 2500
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {milesUntilNextService <= 0
              ? 'Service Overdue!'
              : milesUntilNextService <= 2500
              ? `${milesUntilNextService.toLocaleString()} mi left (Due Soon)`
              : `${milesUntilNextService.toLocaleString()} mi until next service`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Current Mileage
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-1">
              {currentMileageNum.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1">mi</span>
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Required Service Interval
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-700 mt-1">
              {serviceIntervalNum.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1">mi</span>
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Next Service Mileage
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-blue-600 mt-1">
              {nextServiceMileageNum.toLocaleString()}
              <span className="text-xs font-bold text-slate-500 ml-1">mi</span>
            </p>
          </div>
        </div>
      </div>

      {/* Maintenance Dates Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          Scheduled Maintenance Dates
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(lastMaintenance, 'Last Maintenance Date')}
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(nextMaintenance, 'Next Maintenance Date')}
          </div>
        </div>
      </div>

      {/* Mileage Updates History Table */}
      {can('vehicles', 'mileageHistoryView') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Mileage Updates History ({mileageHistory.length})
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Chronological log of all recorded readings
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading history...</div>
          ) : mileageHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No mileage updates recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Mileage</th>
                    <th className="px-4 py-3 text-left">Diff</th>
                    <th className="px-4 py-3 text-left">Time Gap</th>
                    <th className="px-4 py-3 text-left">Recorded By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mileageHistory.map((m: any, index: number) => {
                    const prevRecord = mileageHistory[index + 1];
                    const timeGap = prevRecord ? formatTimeGap(m.date, prevRecord.date) : '-';

                    let mileageDiff = '-';
                    let diffColorClass = 'text-blue-600';

                    if (prevRecord) {
                      const currentMil =
                        typeof m.newMileage === 'number'
                          ? m.newMileage
                          : Number(m.newMileage || m.mileage);
                      const prevMil =
                        typeof prevRecord.newMileage === 'number'
                          ? prevRecord.newMileage
                          : Number(prevRecord.newMileage || prevRecord.mileage);

                      if (!isNaN(currentMil) && !isNaN(prevMil)) {
                        const diff = currentMil - prevMil;
                        mileageDiff = diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                        diffColorClass = diff < 0 ? 'text-rose-600' : 'text-blue-600';
                      }
                    }

                    const isEven = index % 2 === 1;
                    const rowBg = isEven ? 'bg-slate-50/60' : 'bg-white';

                    return (
                      <tr key={m.id} className={`${rowBg} hover:bg-blue-50/50 transition-colors`}>
                        <td className="px-4 py-3 text-sm text-slate-800 font-medium whitespace-nowrap">
                          {formatDate(toDate(m.date))}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 font-mono whitespace-nowrap">
                          {(typeof m.newMileage === 'number'
                            ? m.newMileage
                            : m.newMileage || m.mileage
                          )?.toLocaleString()}{' '}
                          mi
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-black font-mono whitespace-nowrap ${diffColorClass}`}
                        >
                          {mileageDiff}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-medium">
                          {timeGap}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {m.recordedBy || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                          {can('vehicles', 'mileageHistoryEdit') && (
                            <button
                              type="button"
                              onClick={() => setEditingMileageRecord(m)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors mr-1 cursor-pointer"
                              title="Edit Record"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {can('vehicles', 'mileageHistoryDelete') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMileage(m.id)}
                              className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderComplianceContent = () => (
    <div className="space-y-5">
      {/* Compliance Dates Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Mandatory Compliance & Inspection Dates
          </h4>
          {expiringAlertCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {expiringAlertCount} item(s) need attention
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(motTestDate, 'MOT Test Date')}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(motExpiry, 'MOT Expiry Date')}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(nslExpiry, 'NSL Expiry Date')}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(roadTaxExpiry, 'Road Tax Expiry')}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(insuranceExpiry, 'Insurance Expiry')}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            {renderDateWithStatus(warrantyEndDate, 'Warranty Expiry')}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPricingContent = () => (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-600" />
          Rental Rate Tiers
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              Weekly Rental Rate
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof vehicle.weeklyRentalPrice === 'number'
                ? `£${money3(vehicle.weeklyRentalPrice)}`
                : '-'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Daily Rental Rate
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof vehicle.dailyRentalPrice === 'number'
                ? `£${money3(vehicle.dailyRentalPrice)}`
                : '-'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Claim Rental Rate
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof vehicle.claimRentalPrice === 'number'
                ? `£${money3(vehicle.claimRentalPrice)}`
                : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Insurance Premium Add-ons
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
              Weekly Insurance
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof (vehicle as any).weeklyInsuranceAmount === 'number'
                ? `£${money3((vehicle as any).weeklyInsuranceAmount)}`
                : '-'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Daily Insurance
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof (vehicle as any).dailyInsuranceAmount === 'number'
                ? `£${money3((vehicle as any).dailyInsuranceAmount)}`
                : '-'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Claim Insurance
            </span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">
              {typeof (vehicle as any).claimInsuranceAmount === 'number'
                ? `£${money3((vehicle as any).claimInsuranceAmount)}`
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOwnerDocsContent = () => (
    <div className="space-y-5">
      {/* Owner Information Card */}
      {!isCompany && can('vehicles', 'owner') && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Registered Owner Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase block">Owner Name</span>
              <span className="text-base font-bold text-slate-900 block">
                {vehicle.owner?.name || 'AIE Skyline'}
              </span>
              {vehicle.owner?.isDefault && (
                <span className="inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mt-1">
                  Default System Fleet
                </span>
              )}
            </div>

            {vehicle.owner?.address && !vehicle.owner?.isDefault && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase block">Owner Address</span>
                <div className="flex items-start gap-1.5 text-sm font-semibold text-slate-800 mt-1">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{vehicle.owner.address}</span>
                </div>
              </div>
            )}

            {vehicle.owner?.accountName && (
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 sm:col-span-2 flex items-center gap-3">
                <Wallet className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-indigo-900 uppercase block">
                    Linked Finance Account
                  </span>
                  <span className="text-sm font-black text-indigo-950 mt-0.5 block">
                    {vehicle.owner.accountName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Documents & Certificates */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Uploaded Documents & Verification Certificates
          </h4>
          <span className="text-xs text-slate-500 font-semibold">
            {totalDocsCount} file(s) available
          </span>
        </div>

        {vehicle.documents && Object.keys(vehicle.documents).length > 0 && totalDocsCount > 0 ? (
          <div className="space-y-6">
            {Object.entries(vehicle.documents).map(([key, images]) =>
              images && images.length > 0 ? (
                <div key={key} className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1').replace('Image', 'Documents').trim()}
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={`${key}-${idx}`}
                        className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:border-blue-400 transition-all aspect-4/3 bg-slate-50 flex items-center justify-center"
                        onClick={() => setSelectedImage(imgUrl)}
                      >
                        <img
                          src={imgUrl}
                          alt="Document thumbnail"
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> View
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            No document files uploaded for this vehicle.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Vehicle Details"
        size="3xl"
        contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0 bg-white"
      >
        <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden text-slate-900 bg-white">
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* TOP SUMMARY STRIP                                               */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl border shadow-2xs bg-blue-50 border-blue-200 text-blue-700">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-amber-300 text-slate-950 font-mono font-black text-xs rounded border border-amber-400 shadow-2xs tracking-wider uppercase">
                    {vehicle.registrationNumber}
                  </span>
                  <StatusBadge status={vehicle.status} />
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {vehicle.assignmentType || 'Unassigned'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {vehicle.make} {vehicle.model} ({vehicle.year})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mileage
                </span>
                <span className="text-lg font-black font-mono text-slate-900">
                  {currentMileageNum.toLocaleString()}{' '}
                  <span className="text-xs font-semibold text-slate-500">mi</span>
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4 hidden sm:block">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Next Service
                </span>
                <span className="text-lg font-black font-mono text-blue-600">
                  {nextServiceMileageNum.toLocaleString()}{' '}
                  <span className="text-xs font-semibold text-slate-500">mi</span>
                </span>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* 1. PINNED NAVIGATION BAR AT TOP                                 */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 sm:grid-cols-6 w-full border-b border-slate-200 shrink-0 bg-slate-100/70 select-none divide-x divide-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 py-3 px-2 border-b-2 text-xs sm:text-sm transition-all cursor-pointer truncate ${
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
            {activeTab === 'specs' && renderSpecsContent()}
            {activeTab === 'service' && renderServiceContent()}
            {activeTab === 'compliance' && renderComplianceContent()}
            {activeTab === 'pricing' && renderPricingContent()}
            {activeTab === 'owner_docs' && renderOwnerDocsContent()}

            {activeTab === 'all' && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                    1. Overview & Specifications
                  </h3>
                  {renderSpecsContent()}
                </div>
                <div className="border-b border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                    2. Service & Mileage Tracking
                  </h3>
                  {renderServiceContent()}
                </div>
                <div className="border-b border-slate-200 pb-5">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                    3. License & Compliance
                  </h3>
                  {renderComplianceContent()}
                </div>
                {!isCompany && (
                  <div className="border-b border-slate-200 pb-5">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                      4. Rental & Pricing Tiers
                    </h3>
                    {renderPricingContent()}
                  </div>
                )}
                <div className="pb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                    {!isCompany ? '5. Owner & Documents' : '4. Owner & Documents'}
                  </h3>
                  {renderOwnerDocsContent()}
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* 3. MODAL FOOTER CONTROLS                                        */}
          {/* ─────────────────────────────────────────────────────────────── */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
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
        </div>

        {/* Full Image Preview Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              onClick={() => setSelectedImage(null)}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </Modal>

      {/* Edit Mileage Modal */}
      {editingMileageRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMileageRecord(null)}
          title="Edit Mileage Record"
          size="md"
        >
          <MileageUpdateForm
            vehicle={vehicle}
            onClose={() => setEditingMileageRecord(null)}
            editingRecord={editingMileageRecord}
          />
        </Modal>
      )}
    </>
  );
};

export default VehicleDetailsModal;
