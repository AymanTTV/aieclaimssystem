import React, { useState, useEffect } from 'react';
import { Vehicle } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import StatusBadge from '../ui/StatusBadge';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { Car, User, MapPin, Calendar, Clock, AlertTriangle, FileText, DollarSign } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Modal from '../ui/Modal';

interface VehicleDetailsModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({ vehicle, onClose }) => {
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  // Calculate MOT expiry (6 months after test date)
  const motExpiry = new Date(vehicle.motTestDate);
  motExpiry.setMonth(motExpiry.getMonth() + 6);

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
          <DetailItem label="Current Mileage" value={vehicle.mileage.toLocaleString()} />
          <DetailItem label="Next Service Mileage" value={(vehicle.mileage + 25000).toLocaleString()} />
        </div>

        {/* Document Expiry Dates */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
          <DetailItem 
            label="MOT Test Date" 
            value={vehicle.motTestDate} 
            isDate 
            isExpiring={isExpiringOrExpired(vehicle.motTestDate)} 
          />
          <DetailItem 
            label="MOT Expiry" 
            value={motExpiry} 
            isDate 
            isExpiring={isExpiringOrExpired(motExpiry)} 
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

        {/* Document Images */}
        {vehicle.documents && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Document Images</h3>
            
            {/* NSL Images */}
            {vehicle.documents.nslImage && vehicle.documents.nslImage.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">NSL Documents</h4>
                <div className="grid grid-cols-3 gap-2">
                  {vehicle.documents.nslImage.map((image, index) => (
                    <img 
                      key={`nsl-${index}`}
                      src={image} 
                      alt={`NSL document ${index + 1}`}
                      className="h-24 w-full object-cover rounded-md cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* MOT Images */}
            {vehicle.documents.motImage && vehicle.documents.motImage.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">MOT Documents</h4>
                <div className="grid grid-cols-3 gap-2">
                  {vehicle.documents.motImage.map((image, index) => (
                    <img 
                      key={`mot-${index}`}
                      src={image} 
                      alt={`MOT document ${index + 1}`}
                      className="h-24 w-full object-cover rounded-md cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* V5 Images */}
            {vehicle.documents.v5Image && vehicle.documents.v5Image.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">V5 Documents</h4>
                <div className="grid grid-cols-3 gap-2">
                  {vehicle.documents.v5Image.map((image, index) => (
                    <img 
                      key={`v5-${index}`}
                      src={image} 
                      alt={`V5 document ${index + 1}`}
                      className="h-24 w-full object-cover rounded-md cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              </div>
            )}

{vehicle.documents.MeterCertificateImage && vehicle.documents.MeterCertificateImage.length > 0 && (
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-2">Meter Certificate Documents</h4>
        <div className="grid grid-cols-3 gap-2">
          {vehicle.documents.MeterCertificateImage.map((image, index) => (
            <img 
              key={`meter-certificate-${index}`}
              src={image} 
              alt={`Meter Certificate document ${index + 1}`}
              className="h-24 w-full object-cover rounded-md cursor-pointer"
              onClick={() => setSelectedImage(image)}
            />
          ))}
        </div>
      </div>
    )}
            
            {/* Insurance Images */}
            {vehicle.documents.insuranceImage && vehicle.documents.insuranceImage.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-2">Insurance Documents</h4>
                <div className="grid grid-cols-3 gap-2">
                  {vehicle.documents.insuranceImage.map((image, index) => (
                    <img 
                      key={`insurance-${index}`}
                      src={image} 
                      alt={`Insurance document ${index + 1}`}
                      className="h-24 w-full object-cover rounded-md cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            value={createdByName || vehicle.createdBy || 'Loading...'}
          />
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setSelectedImage(null)}>
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