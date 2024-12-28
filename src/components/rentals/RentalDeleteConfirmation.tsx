import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Rental } from '../../types';

interface RentalDeleteConfirmationProps {
  rental: Rental;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const RentalDeleteConfirmation: React.FC<RentalDeleteConfirmationProps> = ({
  rental,
  onConfirm,
  onCancel,
  loading = false
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-medium">Delete Rental</h3>
      </div>
      
      <div className="text-sm text-gray-500 space-y-2">
        <p>Are you sure you want to delete this rental?</p>
        <p>This action cannot be undone and will permanently remove the rental record.</p>
        
        <div className="mt-2 p-3 bg-gray-50 rounded-md">
          <p className="font-medium">Rental Details:</p>
          <ul className="mt-1 space-y-1">
            <li>Type: {rental.type}</li>
            <li>Status: {rental.status}</li>
            <li>Cost: £{rental.cost.toFixed(2)}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete Rental'}
        </button>
      </div>
    </div>
  );
};

export default RentalDeleteConfirmation;