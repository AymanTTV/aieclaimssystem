import React from 'react';
import Modal from '../../../components/ui/Modal';
import VehicleUndoSoldForm from '../../../components/vehicles/VehicleUndoSoldModal';
import { Vehicle } from '../../../types';

interface VehicleUndoSaleModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleUndoSaleModal: React.FC<VehicleUndoSaleModalProps> = ({
  vehicle,
  onClose,
}) => {
  if (!vehicle) return null;

  return (
    <Modal
      isOpen={!!vehicle}
      onClose={onClose}
      title="Undo Vehicle Sale"
    >
      <VehicleUndoSoldForm
        vehicle={vehicle}
        onClose={onClose}
      />
    </Modal>
  );
};

export default VehicleUndoSaleModal;