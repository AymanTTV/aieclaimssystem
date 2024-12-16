import React from 'react';
import Modal from '../../../components/ui/Modal';
import VehicleSaleForm from '../../../components/vehicles/VehicleSaleModal';
import { Vehicle } from '../../../types';

interface VehicleSaleModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleSaleModal: React.FC<VehicleSaleModalProps> = ({
  vehicle,
  onClose,
}) => {
  if (!vehicle) return null;

  return (
    <Modal
      isOpen={!!vehicle}
      onClose={onClose}
      title="Mark Vehicle as Sold"
    >
      <VehicleSaleForm
        vehicle={vehicle}
        onClose={onClose}
      />
    </Modal>
  );
};

export default VehicleSaleModal;