// src/components/vehicles/VehicleDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, MileageUpdate } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import {
  Car,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Modal from '../ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}



// Normalize Firestore Timestamp | string | Date -> Date | undefined
const toDate = (v: any): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }
  // Firestore Timestamp support
  if (typeof v === 'object' && typeof v.toDate === 'function') {
    const d = v.toDate();
    return isNaN(d.getTime()) ? undefined : d;
  }
  // seconds/nanoseconds shape
  if (typeof v === 'object' && typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
};

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({ vehicle, onClose }) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // NEW: State to hold mileage history fetched from the separate collection
  const [mileageHistory, setMileageHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { can } = usePermissions();
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (vehicle.createdBy) {
        try {
          const userDoc = await getDoc(doc(db, 'users', vehicle.createdBy));
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
  }, [vehicle.createdBy]);

  // NEW: useEffect to fetch mileage history from the 'mileageHistory' collection
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [vehicle.id]);


  const DetailItem = ({
    label,
    value,
    isDate = false,
    isExpiring = false,
  }: {
    label: string;
    value: any;
    isDate?: boolean;
    isExpiring?: boolean;
  }) => (
    <div>
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      <p className={`mt-1 ${isExpiring ? 'text-red-600 font-medium' : ''}`}>
        {isDate ? formatDate(value) : value}
      </p>
    </div>
  );

  // Normalized dates
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

  const money3 = (n: unknown) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })
    : '-';

  // Prefer saved motExpiry if present; else compute 6 months from motTestDate
  const motExpiry = useMemo(() => {
    if (motExpirySaved) return motExpirySaved;
    if (!motTestDate) return undefined;
    const e = new Date(motTestDate);
    e.setMonth(e.getMonth() + 6);
    return e;
  }, [motExpirySaved, motTestDate]);

  // REMOVED: Old useMemo that was looking at vehicle.mileageUpdates, as it was always empty.

  return (
    <Modal isOpen={true} onClose={onClose} title="Vehicle Details" size="lg">
      <div className="space-y-6">
        {/* Vehicle Image */}
        <div className="flex justify-center">
          {vehicle.image ? (
            <img
              src={vehicle.image}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="h-48 w-auto object-cover rounded-lg shadow-md"
            />
          ) : (
            <div className="h-48 w-96 bg-gray-100 rounded-lg flex items-center justify-center shadow-md">
              <Car className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem label="Registration Number" value={vehicle.registrationNumber} />
          <DetailItem label="VIN" value={vehicle.vin} />
          <DetailItem label="Make" value={vehicle.make} />
          <DetailItem label="Model" value={vehicle.model} />
          <DetailItem label="Year" value={vehicle.year} />
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <div className="mt-1">
              <StatusBadge status={vehicle.status} />
            </div>
          </div>
          <DetailItem
            label="Current Mileage"
            value={
              typeof vehicle.mileage === 'number'
                ? vehicle.mileage.toLocaleString()
                : (vehicle.mileage as any)
            }
          />
          <DetailItem
            label="Next Service Mileage"
            value={
              typeof vehicle.nextServiceMileage === 'number'
                ? vehicle.nextServiceMileage.toLocaleString()
                : (((vehicle.mileage as any) || 0) + 25000).toLocaleString?.()
            }
          />
          <DetailItem label="Purchased Date" value={purchasedDate} isDate />
        </div>

        {/* Document Expiry Dates */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem
            label="MOT Test Date"
            value={motTestDate}
            isDate
          />
          <DetailItem
            label="MOT Expiry"
            value={motExpiry}
            isDate
            isExpiring={isExpiringOrExpired(motExpiry)}
          />
          <DetailItem
            label="NSL Expiry"
            value={nslExpiry}
            isDate
            isExpiring={isExpiringOrExpired(nslExpiry)}
          />
          <DetailItem
            label="Road Tax Expiry"
            value={roadTaxExpiry}
            isDate
            isExpiring={isExpiringOrExpired(roadTaxExpiry)}
          />
          <DetailItem
            label="Insurance Expiry"
            value={insuranceExpiry}
            isDate
            isExpiring={isExpiringOrExpired(insuranceExpiry)}
          />
        </div>

        {/* Maintenance Information */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem label="Last Maintenance" value={lastMaintenance} isDate />
          <DetailItem
            label="Next Maintenance"
            value={nextMaintenance}
            isDate
            isExpiring={isExpiringOrExpired(nextMaintenance)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
  <DetailItem
    label="Weekly Rate"
    value={
      typeof vehicle.weeklyRentalPrice === 'number'
        ? `£${money3(vehicle.weeklyRentalPrice)}`
        : '-'
    }
  />
  <DetailItem
    label="Weekly Insurance"
    value={
      typeof (vehicle as any).weeklyInsuranceAmount === 'number'
        ? `£${money3((vehicle as any).weeklyInsuranceAmount)}`
        : '-'
    }
  />

  <DetailItem
    label="Daily Rate"
    value={
      typeof vehicle.dailyRentalPrice === 'number'
        ? `£${money3(vehicle.dailyRentalPrice)}`
        : '-'
    }
  />
  <DetailItem
    label="Daily Insurance"
    value={
      typeof (vehicle as any).dailyInsuranceAmount === 'number'
        ? `£${money3((vehicle as any).dailyInsuranceAmount)}`
        : '-'
    }
  />

  <DetailItem
    label="Claim Rate"
    value={
      typeof vehicle.claimRentalPrice === 'number'
        ? `£${money3(vehicle.claimRentalPrice)}`
        : '-'
    }
  />
  <DetailItem
    label="Claim Insurance"
    value={
      typeof (vehicle as any).claimInsuranceAmount === 'number'
        ? `£${money3((vehicle as any).claimInsuranceAmount)}`
        : '-'
    }
  />
</div>


        {/* UPDATED: Mileage Updates History Section */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Mileage Updates History</h3>
          </div>

          {isLoadingHistory ? (
            <p className="text-sm text-gray-500">Loading history...</p>
          ) : mileageHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No mileage updates recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Mileage
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Recorded By
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mileageHistory.map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {formatDate(toDate(m.date))}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {typeof m.newMileage === 'number' ? m.newMileage.toLocaleString() : m.newMileage}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">{m.recordedBy || '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Owner Information */}
        {can('vehicles', 'owner') && (
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Owner Information</h3>
              <p className="text-gray-900 font-medium mt-2">
                {vehicle.owner?.name || 'AIE Skyline'}
              </p>
              {vehicle.owner?.address && !vehicle.owner?.isDefault && (
                <div className="flex items-center mt-1 text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {vehicle.owner.address}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Document Images */}
        {vehicle.documents && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Document Images</h3>
            {Object.entries(vehicle.documents).map(([key, images]) =>
              images && images.length > 0 ? (
                <div className="mb-4" key={key}>
                  <h4 className="text-md font-medium text-gray-700 mb-2">
                    {key.replace(/([A-Z])/g, ' $1').replace('Image', 'Documents').trim()}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((image, index) => (
                      <img
                        key={`${key}-${index}`}
                        src={image}
                        alt={`${key} document ${index + 1}`}
                        className="h-24 w-full object-cover rounded-md cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Sale Information (if sold) */}
        {vehicle.status === 'sold' && (
          <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
            <DetailItem label="Sale Date" value={soldDate} isDate />
            <DetailItem
              label="Sale Price"
              value={
                typeof vehicle.salePrice === 'number'
                  ? `£${vehicle.salePrice.toLocaleString()}`
                  : vehicle.salePrice
              }
            />
          </div>
        )}

        {/* Creation Information */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
          <DetailItem label="Created At" value={createdAt} isDate />
          <DetailItem
            label="Created By"
            value={createdByName || vehicle.createdBy || 'Loading...'}
          />
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-screen p-4">
            <img
              src={selectedImage}
              alt="Document preview"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VehicleDetailsModal;