import React from 'react';
import Modal from '../../../components/ui/Modal';
import { Vehicle } from '../../../types';
import { formatDate } from '../../../utils/dateHelpers';
import StatusBadge from '../../../components/ui/StatusBadge';
import { isExpiringOrExpired } from '../../../utils/vehicleUtils';
import { Car } from 'lucide-react';

interface VehicleDetailsModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  isOpen,
  vehicle,
  onClose,
}) => {
  if (!vehicle) return null;

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
      isOpen={isOpen}
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
          <DetailItem label="Mileage" value={vehicle.mileage.toLocaleString()} />
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