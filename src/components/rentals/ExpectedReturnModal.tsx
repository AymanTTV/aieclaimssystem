// src/components/rentals/ExpectedReturnModal.tsx
import React, { useState } from 'react';
import { Rental } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ExpectedReturnModalProps {
  rental: Rental;
  onClose: () => void;
}

const ExpectedReturnModal: React.FC<ExpectedReturnModalProps> = ({ rental, onClose }) => {
  // Default to existing expected date, or end date, or now
  const initialDate = rental.expectedReturnDate 
    ? new Date(rental.expectedReturnDate).toISOString().slice(0, 16)
    : new Date(rental.endDate).toISOString().slice(0, 16);

  const [dateVal, setDateVal] = useState(initialDate);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newDate = new Date(dateVal);
      
      await updateDoc(doc(db, 'rentals', rental.id), {
        expectedReturnDate: newDate,
        updatedAt: new Date()
      });

      toast.success('Expected return time updated');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update return time');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if(!window.confirm('Are you sure you want to remove the expected return time? It will revert to the contract end date.')) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rentals', rental.id), {
        expectedReturnDate: null,
        updatedAt: new Date()
      });
      toast.success('Expected return time cleared');
      onClose();
    } catch (error) {
      toast.error('Failed to clear date');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg text-base text-blue-800 border border-blue-100">
        Setting an <strong>Expected Return Time</strong> will override the contract End Date in the "Available Vehicles" view, helping you track when this vehicle will actually be ready for the next customer.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-lg font-semibold text-gray-800 mb-2">
            Expected Return Date & Time
          </label>
          <input
            type="datetime-local"
            required
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            // ✅ Increased text size (text-xl), padding (py-3 px-4), and made it fuller width
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xl py-3 px-4 font-mono"
          />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
          {rental.expectedReturnDate && (
             <button
               type="button"
               onClick={handleClear}
               // ✅ Larger button styling
               className="px-5 py-3 border border-red-300 text-red-700 rounded-lg text-base font-medium hover:bg-red-50 transition-colors"
             >
               Clear Expectation
             </button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              // ✅ Larger button styling
              className="px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              // ✅ Larger button styling
              className="px-8 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Set Time'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExpectedReturnModal;