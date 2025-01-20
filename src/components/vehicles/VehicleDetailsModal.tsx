import React from 'react';
import { Vehicle, DEFAULT_RENTAL_PRICES } from '../../types/vehicle';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { Car, User, MapPin, Calendar, Clock, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { useMileageHistory } from '../../hooks/useMileageHistory';
import Modal from '../ui/Modal';

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({ vehicle, onClose }) => {
  const { history, loading: historyLoading } = useMileageHistory(vehicle.id);

  const DetailItem = ({ label, value, isDate = false, isExpiring = false }: { 
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

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Vehicle Details"
      size="lg"
    >
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
          <DetailItem label="Mileage" value={`${vehicle.mileage.toLocaleString()} km`} />
        </div>

        {/* Rental Pricing */}
<div className="border-b border-gray-200 pb-4">
  <div className="flex items-center mb-4">
    <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
    <h3 className="text-lg font-medium text-gray-900">Rental Pricing</h3>
  </div>
  <div className="grid grid-cols-3 gap-4">
    <div>
      <h4 className="text-sm font-medium text-gray-500">Weekly Rate</h4>
      <p className="mt-1 text-lg font-medium">
        £{Math.round(vehicle.weeklyRentalPrice || DEFAULT_RENTAL_PRICES.weekly)}
      </p>
    </div>
    <div>
      <h4 className="text-sm font-medium text-gray-500">Daily Rate</h4>
      <p className="mt-1 text-lg font-medium">
        £{Math.round(vehicle.dailyRentalPrice || DEFAULT_RENTAL_PRICES.daily)}
      </p>
    </div>
    <div>
      <h4 className="text-sm font-medium text-gray-500">Claim Rate</h4>
      <p className="mt-1 text-lg font-medium">
        £{Math.round(vehicle.claimRentalPrice || DEFAULT_RENTAL_PRICES.claim)}
      </p>
    </div>
  </div>
</div>


        {/* Document Expiry Dates */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem 
            label="MOT Expiry" 
            value={vehicle.motExpiry} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.motExpiry)} 
          />
          <DetailItem 
            label="NSL Expiry" 
            value={vehicle.nslExpiry} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.nslExpiry)} 
          />
          <DetailItem 
            label="Road Tax Expiry" 
            value={vehicle.roadTaxExpiry} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.roadTaxExpiry)} 
          />
          <DetailItem 
            label="Insurance Expiry" 
            value={vehicle.insuranceExpiry} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.insuranceExpiry)} 
          />
        </div>

        {/* Maintenance Information */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem 
            label="Last Maintenance" 
            value={vehicle.lastMaintenance} 
            isDate 
          />
          <DetailItem 
            label="Next Maintenance" 
            value={vehicle.nextMaintenance} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.nextMaintenance)} 
          />
        </div>

        {/* Mileage History */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Mileage History</h3>
          </div>
          {historyLoading ? (
            <div className="text-center py-4">Loading history...</div>
          ) : (
            <div className="space-y-2">
              <div className="font-medium">
                Current Mileage: {vehicle.mileage.toLocaleString()} km
              </div>
              {history.map((record) => (
                <div key={record.id} className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-600">{formatDate(record.date)}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {record.previousMileage.toLocaleString()} → {record.newMileage.toLocaleString()} km
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {record.recordedBy}
                    {record.notes && (
                      <span className="ml-2 text-xs italic">({record.notes})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Owner Information */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Owner Information</h3>
              <p className="text-gray-900 font-medium mt-2">{vehicle.owner?.name || 'AIE Skyline'}</p>
              {vehicle.owner?.address && !vehicle.owner?.isDefault && (
                <div className="flex items-center mt-1 text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {vehicle.owner.address}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sale Information (if sold) */}
        {vehicle.status === 'sold' && (
          <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
            <DetailItem 
              label="Sale Date" 
              value={vehicle.soldDate} 
              isDate 
            />
            <DetailItem 
              label="Sale Price" 
              value={`£${vehicle.salePrice?.toLocaleString()}`} 
            />
          </div>
        )}

        {/* Creation Information */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
          <DetailItem 
            label="Created At" 
            value={vehicle.createdAt} 
            isDate 
          />
          <DetailItem 
            label="Created By" 
            value={vehicle.createdBy} 
          />
        </div>
      </div>
    </Modal>
  );
};

export default VehicleDetailsModal;