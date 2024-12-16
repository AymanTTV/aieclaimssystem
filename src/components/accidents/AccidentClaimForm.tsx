import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ClaimDetails } from '../../types';

interface AccidentClaimFormProps {
  accidentId: string;
  onClose: () => void;
}

const AccidentClaimForm: React.FC<AccidentClaimFormProps> = ({ accidentId, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ClaimDetails>>({
    passengers: Array(4).fill({
      name: '',
      address: '',
      postCode: '',
      dob: new Date(),
      contactNumber: ''
    })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'claims'), {
        accidentId,
        claimDetails: formData,
        status: 'submitted',
        type: 'pending', // Will be determined by claims department
        assignedTo: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        documents: {
          invoices: []
        },
        progressNotes: [{
          id: Date.now().toString(),
          date: new Date(),
          note: 'Claim details submitted',
          author: user.name
        }]
      });

      toast.success('Claim details submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Failed to submit claim details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Driver Details */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={formData.driverName || ''}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              required
              value={formData.driverAddress || ''}
              onChange={(e) => setFormData({ ...formData, driverAddress: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Post Code</label>
            <input
              type="text"
              required
              value={formData.driverPostCode || ''}
              onChange={(e) => setFormData({ ...formData, driverPostCode: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input
              type="date"
              required
              value={formData.driverDOB?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFormData({ ...formData, driverDOB: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.driverPhone || ''}
              onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <input
              type="tel"
              required
              value={formData.driverMobile || ''}
              onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">National Insurance Number</label>
            <input
              type="text"
              required
              value={formData.driverNIN || ''}
              onChange={(e) => setFormData({ ...formData, driverNIN: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
        </div>
      </section>

      {/* Vehicle Details */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Registered Keeper Name</label>
            <input
              type="text"
              required
              value={formData.registeredKeeperName || ''}
              onChange={(e) => setFormData({ ...formData, registeredKeeperName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Registered Keeper Address</label>
            <input
              type="text"
              required
              value={formData.registeredKeeperAddress || ''}
              onChange={(e) => setFormData({ ...formData, registeredKeeperAddress: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          {/* Add other vehicle fields similarly */}
        </div>
      </section>

      {/* Fault Party Details */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fault Party Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={formData.faultPartyName || ''}
              onChange={(e) => setFormData({ ...formData, faultPartyName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          {/* Add other fault party fields similarly */}
        </div>
      </section>

      {/* Accident Details */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accident Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              required
              value={formData.accidentDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFormData({ ...formData, accidentDate: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          {/* Add other accident fields similarly */}
        </div>
      </section>

      {/* Passengers Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Passenger Details</h3>
        {formData.passengers?.map((passenger, index) => (
          <div key={index} className="mb-6 p-4 border rounded-lg">
            <h4 className="text-md font-medium mb-2">Passenger {index + 1}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={passenger.name}
                  onChange={(e) => {
                    const newPassengers = [...(formData.passengers || [])];
                    newPassengers[index] = { ...passenger, name: e.target.value };
                    setFormData({ ...formData, passengers: newPassengers });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
              {/* Add other passenger fields similarly */}
            </div>
          </div>
        ))}
      </section>

      {/* Submit Button */}
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
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
      </div>
    </form>
  );
};

export default AccidentClaimForm;