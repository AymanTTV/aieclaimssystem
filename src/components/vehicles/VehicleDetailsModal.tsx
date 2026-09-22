// src/components/vehicles/VehicleDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, MileageUpdate } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import {
  Car, User, MapPin, Calendar, Wallet, Wrench, FileCheck, Pencil, Trash2, Tag
} from 'lucide-react';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Modal from '../ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import MileageUpdateForm from './MileageUpdateForm';
import toast from 'react-hot-toast';

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
  const [activeTab, setActiveTab] = useState<'vehicle' | 'service' | 'license'>('vehicle');

  const [mileageHistory, setMileageHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // ✅ NEW: Edit State
  const [editingMileageRecord, setEditingMileageRecord] = useState<any | null>(null);

  const { can, isCompany } = usePermissions();

  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (vehicle.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', vehicle.createdBy));
          if (userDoc.exists()) setCreatedByName(userDoc.data().name);
          else setCreatedByName('Unknown User');
        } catch (error) { setCreatedByName('Unknown User'); }
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMileageHistory(historyData);
      setIsLoadingHistory(false);
    }, (error) => {
      console.error("Error fetching mileage history:", error);
      setIsLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [vehicle.id]);

  const formatTimeGap = (currentDate: any, previousDate: any) => {
  if (!currentDate || !previousDate) return '-';
  const d1 = toDate(currentDate);
  const d2 = toDate(previousDate);
  if (!d1 || !d2) return '-';
  
  let diffDays = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '-'; // Handled via descending sort
  
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

  // ✅ NEW: Handle robust deletion
  const handleDeleteMileage = async (recordId: string) => {
     if (!window.confirm("Are you sure you want to delete this mileage record? The vehicle's current mileage will be recalculated.")) return;
     
     try {
         await deleteDoc(doc(db, 'mileageHistory', recordId));
         
         // Rebuild vehicle array
         const q = query(collection(db, 'mileageHistory'), where('vehicleId', '==', vehicle.id));
         const snap = await getDocs(q);
         const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
            historyId: h.id
         }));

         const latestMileage = history.length > 0 ? history[history.length - 1].newMileage : 0;

         await updateDoc(doc(db, 'vehicles', vehicle.id), {
            mileageUpdates: newArray,
            mileage: latestMileage,
            updatedAt: new Date()
         });

         toast.success("Mileage record deleted.");
     } catch(e) {
         toast.error("Failed to delete record.");
     }
  };

  const DetailItem = ({ label, value, isDate = false, isExpiring = false }: any) => (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</h3>
      <p className={`mt-1 font-semibold text-sm ${isExpiring ? 'text-rose-400 font-bold' : 'text-white'}`}>
        {isDate ? formatDate(value) : value}
      </p>
    </div>
  );

  const motTestDate = useMemo(() => toDate(vehicle.motTestDate), [vehicle.motTestDate]);
  const motExpirySaved = useMemo(() => toDate((vehicle as any).motExpiry), [(vehicle as any).motExpiry]);
  const nslExpiry = useMemo(() => toDate(vehicle.nslExpiry), [vehicle.nslExpiry]);
  const roadTaxExpiry = useMemo(() => toDate(vehicle.roadTaxExpiry), [vehicle.roadTaxExpiry]);
  const insuranceExpiry = useMemo(() => toDate(vehicle.insuranceExpiry), [vehicle.insuranceExpiry]);
  const lastMaintenance = useMemo(() => toDate(vehicle.lastMaintenance), [vehicle.lastMaintenance]);
  const nextMaintenance = useMemo(() => toDate(vehicle.nextMaintenance), [vehicle.nextMaintenance]);
  const purchasedDate = useMemo(() => toDate((vehicle as any).purchasedDate), [(vehicle as any).purchasedDate]);
  const createdAt = useMemo(() => toDate(vehicle.createdAt), [vehicle.createdAt]);
  const soldDate = useMemo(() => toDate(vehicle.soldDate), [vehicle.soldDate]);
  const firstRegistrationDate = useMemo(() => toDate((vehicle as any).firstRegistrationDate), [(vehicle as any).firstRegistrationDate]);
  const warrantyStartDate = useMemo(() => toDate((vehicle as any).warrantyStartDate), [(vehicle as any).warrantyStartDate]); 
  const warrantyEndDate = useMemo(() => toDate((vehicle as any).warrantyEndDate), [(vehicle as any).warrantyEndDate]);
  
  const vehicleAge = useMemo(() => {
    if (!firstRegistrationDate) return null;
    return Math.floor((Date.now() - firstRegistrationDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [firstRegistrationDate]);

  const money3 = (n: unknown) => typeof n === 'number' ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : '-';

  const motExpiry = useMemo(() => {
    if (motExpirySaved) return motExpirySaved;
    if (!motTestDate) return undefined;
    const e = new Date(motTestDate); e.setMonth(e.getMonth() + 6); return e;
  }, [motExpirySaved, motTestDate]);

  const isWarrantyRed = useMemo(() => {
    const currentMileage = vehicle.mileage || 0;
    if (currentMileage >= 150000) return true;
    if (!warrantyEndDate) return false;
    if (warrantyEndDate.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000) return true;
    return false;
  }, [warrantyEndDate, vehicle.mileage]);

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Vehicle Details"
        size="xl"
        theme="navy"
        contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0"
      >
        <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
          
          <div className="flex border-b border-[#2B314E] px-4 shrink-0 bg-[#121524]">
            <button
              type="button"
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'vehicle'
                  ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
              onClick={() => setActiveTab('vehicle')}
            >
              <Car className="w-4 h-4 pointer-events-none" /><span>Vehicle Details</span>
            </button>
            <button
              type="button"
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'service'
                  ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
              onClick={() => setActiveTab('service')}
            >
              <Wrench className="w-4 h-4 pointer-events-none" /><span>Service Details</span>
            </button>
            <button
              type="button"
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'license'
                  ? 'border-blue-500 text-blue-400 font-bold bg-blue-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
              onClick={() => setActiveTab('license')}
            >
              <FileCheck className="w-4 h-4 pointer-events-none" /><span>License / Compliance</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 no-scrollbar">
            
            {/* TAB 1: VEHICLE */}
            {activeTab === 'vehicle' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-center mb-6">
                  {vehicle.image ? (
                    <img src={vehicle.image} alt="Vehicle" className="h-48 w-auto object-cover rounded-2xl shadow-lg border border-[#2B314E]" />
                  ) : (
                    <div className="h-48 w-96 bg-[#0F111A] rounded-2xl flex items-center justify-center shadow-inner border border-[#2B314E]">
                      <Car className="h-16 w-16 text-slate-600" />
                    </div>
                  )}
                </div>

                {/* Primary Specs Card */}
                <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Core Specifications</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
                    <DetailItem label="Registration Number" value={vehicle.registrationNumber} />
                    <DetailItem label="VIN" value={vehicle.vin} />
                    <DetailItem label="Make" value={vehicle.make} />
                    <DetailItem label="Model" value={vehicle.model} />
                    <DetailItem label="Year" value={vehicle.year} />
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</h3>
                      <div className="mt-1"><StatusBadge status={vehicle.status} /></div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assignment Type</h3>
                      <div className="mt-1 font-semibold text-white text-sm">{vehicle.assignmentType || 'Unassigned'}</div>
                    </div>
                    <DetailItem label="Purchased Date" value={purchasedDate} isDate />
                    <DetailItem label="First Registration Date" value={firstRegistrationDate} isDate />
                    <DetailItem label="Vehicle Age" value={vehicleAge !== null ? `${vehicleAge} Years` : 'N/A'} />
                    <DetailItem label="Warranty Start Date" value={warrantyStartDate} isDate />
                    <DetailItem label="Warranty End Date" value={warrantyEndDate} isDate isExpiring={isWarrantyRed} />
                  </div>
                </div>

                {!isCompany && (
                  <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4" /> Rental Pricing
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4">
                      <DetailItem label="Weekly Rate" value={typeof vehicle.weeklyRentalPrice === 'number' ? `£${money3(vehicle.weeklyRentalPrice)}` : '-'} />
                      <DetailItem label="Daily Rate" value={typeof vehicle.dailyRentalPrice === 'number' ? `£${money3(vehicle.dailyRentalPrice)}` : '-'} />
                      <DetailItem label="Claim Rate" value={typeof vehicle.claimRentalPrice === 'number' ? `£${money3(vehicle.claimRentalPrice)}` : '-'} />
                      <DetailItem label="Weekly Insurance" value={typeof (vehicle as any).weeklyInsuranceAmount === 'number' ? `£${money3((vehicle as any).weeklyInsuranceAmount)}` : '-'} />
                      <DetailItem label="Daily Insurance" value={typeof (vehicle as any).dailyInsuranceAmount === 'number' ? `£${money3((vehicle as any).dailyInsuranceAmount)}` : '-'} />
                      <DetailItem label="Claim Insurance" value={typeof (vehicle as any).claimInsuranceAmount === 'number' ? `£${money3((vehicle as any).claimInsuranceAmount)}` : '-'} />
                    </div>
                  </div>
                )}

                {!isCompany && can('vehicles', 'owner') && (
                  <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-purple-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-2">Owner Information</h3>
                        <p className="text-white font-bold text-base mt-1">{vehicle.owner?.name || 'AIE Skyline'}</p>
                        {vehicle.owner?.address && !vehicle.owner?.isDefault && (
                          <div className="flex items-center mt-1 text-slate-300 text-sm">
                            <MapPin className="w-4 h-4 mr-1 text-slate-400" />{vehicle.owner.address}
                          </div>
                        )}
                        {vehicle.owner?.accountName && (
                          <div className="flex items-center mt-3 text-indigo-300 bg-indigo-950/60 p-2.5 rounded-xl w-fit border border-indigo-700/50">
                            <Wallet className="w-4 h-4 mr-2 text-indigo-400" />
                            <span className="text-sm font-semibold">Linked Account: {vehicle.owner.accountName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isCompany && vehicle.status === 'sold' && (
                  <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-4">Sale Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Sale Date" value={soldDate} isDate />
                      <DetailItem label="Sale Price" value={typeof vehicle.salePrice === 'number' ? `£${vehicle.salePrice.toLocaleString()}` : vehicle.salePrice} />
                    </div>
                  </div>
                )}

                <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 shadow-inner">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailItem label="Created At" value={createdAt} isDate />
                    <DetailItem label="Created By" value={createdByName || vehicle.createdBy || 'Loading...'} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SERVICE */}
            {activeTab === 'service' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-4 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    Service Tracking
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                    <DetailItem label="Service Mileage Required" value={typeof (vehicle as any).serviceInterval === 'number' ? (vehicle as any).serviceInterval.toLocaleString() : '25,000'} />
                    <DetailItem label="Current Mileage" value={typeof vehicle.mileage === 'number' ? vehicle.mileage.toLocaleString() : (vehicle.mileage as any)} />
                    <div className="md:col-span-2">
                      <DetailItem label="Next Service Mileage" value={typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage.toLocaleString() : (((vehicle.mileage as any) || 0) + 25000).toLocaleString?.()} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Last Maintenance Date" value={lastMaintenance} isDate />
                    <DetailItem label="Next Maintenance Date" value={nextMaintenance} isDate isExpiring={isExpiringOrExpired(nextMaintenance)} />
                  </div>
                </div>

                {can('vehicles', 'mileageHistoryView') && (
                  <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Mileage Updates History</h3>
                      </div>
                    </div>

                    {isLoadingHistory ? (
                      <p className="text-sm text-slate-500">Loading history...</p>
                    ) : mileageHistory.length === 0 ? (
                      <div className="bg-slate-50 p-6 rounded-xl text-center border border-slate-200">
                        <p className="text-sm text-slate-500">No mileage updates recorded yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] shadow-xs bg-white">
                        <table className="min-w-full border-collapse text-xs">
                          <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
                            <tr className="border-b-2 border-[#E2E8F0]">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Mileage</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Diff</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Time Gap</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Recorded By</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-[#334155] uppercase tracking-wider select-none">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mileageHistory.map((m: any, index: number) => {
                              const prevRecord = mileageHistory[index + 1];
                              const timeGap = prevRecord ? formatTimeGap(m.date, prevRecord.date) : '-';
                              
                              let mileageDiff = '-';
                              let diffColorClass = 'text-blue-600';

                              if (prevRecord) {
                                const currentMil = typeof m.newMileage === 'number' ? m.newMileage : Number(m.newMileage || m.mileage);
                                const prevMil = typeof prevRecord.newMileage === 'number' ? prevRecord.newMileage : Number(prevRecord.newMileage || prevRecord.mileage);
                                
                                if (!isNaN(currentMil) && !isNaN(prevMil)) {
                                  const diff = currentMil - prevMil;
                                  mileageDiff = diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                                  diffColorClass = diff < 0 ? 'text-rose-600' : 'text-blue-600'; 
                                }
                              }

                              const isEven = index % 2 === 1;
                              const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';

                              return (
                                <tr key={m.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-colors`}>
                                  <td className="px-4 py-3 text-sm text-slate-800 font-medium whitespace-nowrap">{formatDate(toDate(m.date))}</td>
                                  <td className="px-4 py-3 text-sm font-bold text-slate-900 whitespace-nowrap">
                                    {typeof m.newMileage === 'number' ? m.newMileage.toLocaleString() : (m.newMileage || m.mileage)?.toLocaleString()}
                                  </td>
                                  <td className={`px-4 py-3 text-sm font-black whitespace-nowrap ${diffColorClass}`}>
                                    {mileageDiff}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-medium">{timeGap}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{m.recordedBy || '-'}</td>
                                  <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                                    {can('vehicles', 'mileageHistoryEdit') && (
                                      <button 
                                        onClick={() => setEditingMileageRecord(m)} 
                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1.5 rounded-lg transition-colors mr-2 cursor-pointer"
                                        title="Edit Record"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    )}
                                    {can('vehicles', 'mileageHistoryDelete') && (
                                      <button 
                                        onClick={() => handleDeleteMileage(m.id)} 
                                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-100 p-1.5 rounded-lg transition-colors cursor-pointer"
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
            )}

            {/* TAB 3: LICENSE */}
            {activeTab === 'license' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Compliance Dates</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
                    <DetailItem label="MOT Test Date" value={motTestDate} isDate />
                    <DetailItem label="MOT Expiry" value={motExpiry} isDate isExpiring={isExpiringOrExpired(motExpiry)} />
                    <DetailItem label="NSL Expiry" value={nslExpiry} isDate isExpiring={isExpiringOrExpired(nslExpiry)} />
                    <DetailItem label="Road Tax Expiry" value={roadTaxExpiry} isDate isExpiring={isExpiringOrExpired(roadTaxExpiry)} />
                    <DetailItem label="Insurance Expiry" value={insuranceExpiry} isDate isExpiring={isExpiringOrExpired(insuranceExpiry)} />
                  </div>
                </div>

                {!isCompany && vehicle.documents && (
                  <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-5 shadow-inner">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-6">Document Images</h3>
                    {Object.entries(vehicle.documents).map(([key, images]) =>
                      images && images.length > 0 ? (
                        <div className="mb-8 last:mb-0" key={key}>
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                            {key.replace(/([A-Z])/g, ' $1').replace('Image', 'Documents').trim()}
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {images.map((image, index) => (
                              <div key={`${key}-${index}`} className="relative group cursor-pointer" onClick={() => setSelectedImage(image)}>
                                <img src={image} className="h-32 w-full object-cover rounded-xl border border-[#2B314E] shadow-sm transition-transform group-hover:scale-[1.02]" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                  <span className="text-xs font-bold text-white bg-black/60 px-2.5 py-1 rounded-lg">View</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setSelectedImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 cursor-pointer" onClick={() => setSelectedImage(null)}>
              <span className="sr-only">Close</span>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-[#2B314E]" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </Modal>

      {/* Edit Mileage Modal */}
      {editingMileageRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMileageRecord(null)}
          title="Edit Mileage Record"
          theme="navy"
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