// src/components/vehicles/VehicleDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, MileageUpdate } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import {
  Car, User, MapPin, Calendar, Wallet, Wrench, FileCheck, Pencil, Trash2
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
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      <p className={`mt-1 ${isExpiring ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
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
      <Modal isOpen={true} onClose={onClose} title="Vehicle Details" size="xl">
        <div className="flex flex-col h-full max-h-[85vh]">
          
          <div className="flex border-b border-gray-200 px-4 shrink-0">
            <button
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'vehicle' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('vehicle')}
            >
              <Car className="w-4 h-4" /><span>Vehicle Details</span>
            </button>
            <button
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'service' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('service')}
            >
              <Wrench className="w-4 h-4" /><span>Service Details</span>
            </button>
            <button
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'license' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveTab('license')}
            >
              <FileCheck className="w-4 h-4" /><span>License / Compliance</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TAB 1: VEHICLE */}
            {activeTab === 'vehicle' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-center mb-6">
                  {vehicle.image ? (
                    <img src={vehicle.image} alt="Vehicle" className="h-48 w-auto object-cover rounded-lg shadow-md border border-gray-200" />
                  ) : (
                    <div className="h-48 w-96 bg-gray-100 rounded-lg flex items-center justify-center shadow-inner border border-gray-200">
                      <Car className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-b border-gray-200 pb-6">
                  <DetailItem label="Registration Number" value={vehicle.registrationNumber} />
                  <DetailItem label="VIN" value={vehicle.vin} />
                  <DetailItem label="Make" value={vehicle.make} />
                  <DetailItem label="Model" value={vehicle.model} />
                  <DetailItem label="Year" value={vehicle.year} />
                  <div><h3 className="text-sm font-medium text-gray-500">Status</h3><div className="mt-1"><StatusBadge status={vehicle.status} /></div></div>
                  <div><h3 className="text-sm font-medium text-gray-500">Assignment Type</h3><div className="mt-1 font-medium text-gray-900">{vehicle.assignmentType || 'Unassigned'}</div></div>
                  <DetailItem label="Purchased Date" value={purchasedDate} isDate />
                  <DetailItem label="First Registration Date" value={firstRegistrationDate} isDate />
                  <DetailItem label="Vehicle Age" value={vehicleAge !== null ? `${vehicleAge} Years` : 'N/A'} />
                  <DetailItem label="Warranty Start Date" value={warrantyStartDate} isDate />
                  <DetailItem label="Warranty End Date" value={warrantyEndDate} isDate isExpiring={isWarrantyRed} />
                </div>

                {!isCompany && (
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Pricing</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
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
                  <div className="border-b border-gray-200 pb-6">
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">Owner Information</h3>
                        <p className="text-gray-900 font-medium mt-2">{vehicle.owner?.name || 'AIE Skyline'}</p>
                        {vehicle.owner?.address && !vehicle.owner?.isDefault && (
                          <div className="flex items-center mt-1 text-gray-500"><MapPin className="w-4 h-4 mr-1" />{vehicle.owner.address}</div>
                        )}
                        {vehicle.owner?.accountName && (
                          <div className="flex items-center mt-2 text-indigo-600 bg-indigo-50 p-2 rounded-md w-fit border border-indigo-100">
                            <Wallet className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">Linked Account: {vehicle.owner.accountName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isCompany && vehicle.status === 'sold' && (
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sale Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Sale Date" value={soldDate} isDate />
                      <DetailItem label="Sale Price" value={typeof vehicle.salePrice === 'number' ? `£${vehicle.salePrice.toLocaleString()}` : vehicle.salePrice} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                  <DetailItem label="Created At" value={createdAt} isDate />
                  <DetailItem label="Created By" value={createdByName || vehicle.createdBy || 'Loading...'} />
                </div>
              </div>
            )}

            {/* TAB 2: SERVICE */}
            {activeTab === 'service' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100/50 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                    <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                    Service Tracking
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <DetailItem label="Service Mileage Required" value={typeof (vehicle as any).serviceInterval === 'number' ? (vehicle as any).serviceInterval.toLocaleString() : '25,000'} />
                    <DetailItem label="Current Mileage" value={typeof vehicle.mileage === 'number' ? vehicle.mileage.toLocaleString() : (vehicle.mileage as any)} />
                    <div className="md:col-span-2">
                      <DetailItem label="Next Service Mileage" value={typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage.toLocaleString() : (((vehicle.mileage as any) || 0) + 25000).toLocaleString?.()} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-6">
                  <DetailItem label="Last Maintenance Date" value={lastMaintenance} isDate />
                  <DetailItem label="Next Maintenance Date" value={nextMaintenance} isDate isExpiring={isExpiringOrExpired(nextMaintenance)} />
                </div>

                {can('vehicles', 'mileageHistoryView') && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-medium text-gray-900">Mileage Updates History</h3>
                      </div>
                    </div>

                    {isLoadingHistory ? (
                      <p className="text-sm text-gray-500">Loading history...</p>
                    ) : mileageHistory.length === 0 ? (
                      <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-100">
                        <p className="text-sm text-gray-500">No mileage updates recorded yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mileage</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diff</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Gap</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recorded By</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {mileageHistory.map((m: any, index: number) => {
                              // Since array is descending (newest first), the previous chronological record is index + 1
                              const prevRecord = mileageHistory[index + 1];
                              const timeGap = prevRecord ? formatTimeGap(m.date, prevRecord.date) : '-';
                              
                              // UPDATED: Robust diff calculation handling positive, negative, and fallback field names
                              let mileageDiff = '-';
                              let diffColorClass = 'text-blue-600'; // Default color for diff

                              if (prevRecord) {
                                // Check both newMileage and mileage in case of legacy records
                                const currentMil = typeof m.newMileage === 'number' ? m.newMileage : Number(m.newMileage || m.mileage);
                                const prevMil = typeof prevRecord.newMileage === 'number' ? prevRecord.newMileage : Number(prevRecord.newMileage || prevRecord.mileage);
                                
                                if (!isNaN(currentMil) && !isNaN(prevMil)) {
                                  const diff = currentMil - prevMil;
                                  mileageDiff = diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
                                  
                                  // Make negative diffs red so they stand out as potential corrections/errors
                                  diffColorClass = diff < 0 ? 'text-red-600' : 'text-blue-600'; 
                                }
                              }

                              return (
                                <tr key={m.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(toDate(m.date))}</td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                    {/* UPDATED: Fallback to m.mileage for display if newMileage is missing */}
                                    {typeof m.newMileage === 'number' ? m.newMileage.toLocaleString() : (m.newMileage || m.mileage)?.toLocaleString()}
                                  </td>
                                  {/* UPDATED: Apply dynamic color class so negative diffs are red */}
                                  <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${diffColorClass}`}>
                                    {mileageDiff}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{timeGap}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{m.recordedBy || '-'}</td>
                                  <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                                    {can('vehicles', 'mileageHistoryEdit') && (
                                      <button 
                                        onClick={() => setEditingMileageRecord(m)} 
                                        className="text-blue-600 hover:text-blue-900 hover:bg-blue-100 p-1.5 rounded-md transition-colors mr-2"
                                        title="Edit Record"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    )}
                                    {can('vehicles', 'mileageHistoryDelete') && (
                                      <button 
                                        onClick={() => handleDeleteMileage(m.id)} 
                                        className="text-red-600 hover:text-red-900 hover:bg-red-100 p-1.5 rounded-md transition-colors"
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
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-b border-gray-200 pb-6">
                  <DetailItem label="MOT Test Date" value={motTestDate} isDate />
                  <DetailItem label="MOT Expiry" value={motExpiry} isDate isExpiring={isExpiringOrExpired(motExpiry)} />
                  <DetailItem label="NSL Expiry" value={nslExpiry} isDate isExpiring={isExpiringOrExpired(nslExpiry)} />
                  <DetailItem label="Road Tax Expiry" value={roadTaxExpiry} isDate isExpiring={isExpiringOrExpired(roadTaxExpiry)} />
                  <DetailItem label="Insurance Expiry" value={insuranceExpiry} isDate isExpiring={isExpiringOrExpired(insuranceExpiry)} />
                </div>
                {!isCompany && vehicle.documents && (
                  <div className="pt-2">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">Document Images</h3>
                    {Object.entries(vehicle.documents).map(([key, images]) =>
                      images && images.length > 0 ? (
                        <div className="mb-8" key={key}>
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                            {key.replace(/([A-Z])/g, ' $1').replace('Image', 'Documents').trim()}
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {images.map((image, index) => (
                              <div key={`${key}-${index}`} className="relative group cursor-pointer" onClick={() => setSelectedImage(image)}>
                                <img src={image} className="h-32 w-full object-cover rounded-lg border border-gray-200 shadow-sm transition-transform group-hover:scale-[1.02]" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
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
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2" onClick={() => setSelectedImage(null)}>
              <span className="sr-only">Close</span>
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </Modal>

      {/* ✅ NEW: Edit Mileage Modal */}
      {editingMileageRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMileageRecord(null)}
          title="Edit Mileage Record"
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