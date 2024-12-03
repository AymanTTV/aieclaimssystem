import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Vehicle } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';

interface AccidentFormProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const AccidentForm: React.FC<AccidentFormProps> = ({ vehicle, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    claimAmount: '',
  });
  const [images, setImages] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrls: string[] = [];

      if (images) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const imageRef = ref(storage, `accidents/${Date.now()}_${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      await addDoc(collection(db, 'accidents'), {
        vehicleId: vehicle.id,
        driverId: user?.id,
        date: new Date(formData.date),
        location: formData.location,
        description: formData.description,
        images: imageUrls,
        status: 'reported',
        claimAmount: formData.claimAmount ? parseFloat(formData.claimAmount) : null,
        claimStatus: 'pending',
      });

      toast.success('Accident report submitted successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to submit accident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          placeholder="Enter accident location"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          placeholder="Describe what happened"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Claim Amount</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            value={formData.claimAmount}
            onChange={(e) => setFormData({ ...formData, claimAmount: e.target.value })}
            className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.01"
            placeholder="Enter claim amount (optional)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Images</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label htmlFor="images" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload images</span>
                <input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(e.target.files)}
                  className="sr-only"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
          </div>
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
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};

export default AccidentForm;