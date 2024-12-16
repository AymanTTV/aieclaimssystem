import React from 'react';
import Modal from '../../../components/ui/Modal';
import VehicleForm from '../../../components/vehicles/VehicleForm';
import { Vehicle } from '../../../types';

interface VehicleFormModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  vehicle,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vehicle?.id ? 'Edit Vehicle' : 'Add Vehicle'}
      size="xl"
    >
      <VehicleForm
        vehicle={vehicle}
        onClose={onClose}
      />
    </Modal>
  );
};

export default VehicleFormModal;