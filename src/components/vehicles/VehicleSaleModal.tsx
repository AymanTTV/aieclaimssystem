import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import toast from 'react-hot-toast';

interface VehicleSaleModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleSaleModal: React.FC<VehicleSaleModalProps> = ({ vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [salePrice, setSalePrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salePrice || parseFloat(salePrice) <= 0) {
      toast.error('Please enter a valid sale price');
      return;
    }

    setLoading(true);

    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        status: 'sold',
        soldDate: new Date(),
        salePrice: parseFloat(salePrice),
        updatedAt: new Date(),
      });

      toast.success('Vehicle marked as sold successfully');
      onClose();
    } catch (error) {
      console.error('Error marking vehicle as sold:', error);
      toast.error('Failed to mark vehicle as sold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Sale Price</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">£</span>
          </div>
          <input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
            min="0"
            step="0.01"
            placeholder="Enter sale price"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Processing...' : 'Mark as Sold'}
        </button>
      </div>
    </form>
  );
};

export default VehicleSaleModal;