// src/components/rentals/RentalExtensionModal.tsx
import React, { useState } from 'react';
import { Rental } from '../../types';
import { format } from 'date-fns';
import FormField from '../ui/FormField';
import { Clock, Calendar, AlertCircle } from 'lucide-react';

interface RentalExtensionModalProps {
  rental: Rental;
  onClose: () => void;
  onConfirm: (newDate: Date) => Promise<void>;
}

const RentalExtensionModal: React.FC<RentalExtensionModalProps> = ({ rental, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  
  // Default to Today's date
  const today = new Date();
  
  // Default to the Original End Time
  const originalEnd = new Date(rental.endDate);
  
  const [date, setDate] = useState(format(today, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(originalEnd, 'HH:mm'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construct the new Date object
      const newDate = new Date(`${date}T${time}`);
      await onConfirm(newDate);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Update Ongoing Rental</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This will update the expected end date to current. 
                Ongoing charges will stop accumulating until this new date is passed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="New End Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          icon={Calendar}
        />
        <FormField
          label="End Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          icon={Clock}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Confirm Update'}
        </button>
      </div>
    </form>
  );
};

export default RentalExtensionModal;