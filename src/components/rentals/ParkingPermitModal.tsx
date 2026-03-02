// src/components/rentals/ParkingPermitModal.tsx
import React from 'react';
import { Rental, Vehicle } from '../../types';
import Modal from '../ui/Modal';
import { Car, FileText, CheckCircle } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';

interface ParkingPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental;
  mainVehicle: Vehicle | undefined;
  onSelect: (vehicleData: { make: string; model: string; registrationNumber: string }, label: string) => void;
}

const ParkingPermitModal: React.FC<ParkingPermitModalProps> = ({
  isOpen,
  onClose,
  rental,
  mainVehicle,
  onSelect,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Parking Permit" size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Please select which vehicle you want to generate the Parking Permit Letter for:
        </p>

        <div className="space-y-3">
          {/* Main Vehicle Option */}
          <button
            onClick={() => {
               if (mainVehicle) {
                 onSelect(mainVehicle, 'Main Vehicle');
               }
            }}
            className="w-full flex items-center justify-between p-4 rounded-lg border bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900">Main Vehicle</div>
                <div className="text-sm text-gray-600">
                  {mainVehicle ? `${mainVehicle.make} ${mainVehicle.model}` : 'Unknown Vehicle'}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">
                  {mainVehicle?.registrationNumber}
                </div>
              </div>
            </div>
            <FileText className="w-5 h-5 text-gray-400" />
          </button>

          {/* Substitute Vehicles */}
          {rental.hireSubstitutionDetails?.map((sub, idx) => (
            <button
              key={idx}
              onClick={() => onSelect({ 
                make: sub.make, 
                model: sub.model, 
                registrationNumber: sub.registration 
              }, `Substitute #${idx + 1}`)}
              className="w-full flex items-center justify-between p-4 rounded-lg border bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Substitute #{idx + 1}</div>
                  <div className="text-sm text-gray-600">
                    {sub.make} {sub.model}
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">
                    {sub.registration}
                  </div>
                  {sub.givenAt && (
                    <div className="text-[10px] text-orange-700 mt-1">
                      Given: {formatDate(sub.givenAt)}
                    </div>
                  )}
                </div>
              </div>
              <FileText className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ParkingPermitModal;