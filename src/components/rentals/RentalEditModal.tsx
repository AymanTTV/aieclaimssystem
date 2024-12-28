import React from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import RentalForm from './RentalForm';

interface RentalEditModalProps {
  rental: Rental;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({ 
  rental, 
  vehicles,
  customers,
  onClose 
}) => {
  return (
    <RentalForm
      rental={rental}
      vehicles={vehicles}
      customers={customers}
      onClose={onClose}
    />
  );
};

export default RentalEditModal;