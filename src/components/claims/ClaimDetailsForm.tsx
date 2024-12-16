import React, { useState } from 'react';
import { ClaimDetails } from '../../types';
import { format } from 'date-fns';

interface ClaimDetailsFormProps {
  onSubmit: (details: ClaimDetails) => void;
  initialData?: Partial<ClaimDetails>;
}

const ClaimDetailsForm: React.FC<ClaimDetailsFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState<Partial<ClaimDetails>>({
    ...initialData,
    passengers: initialData?.passengers || Array(4).fill({
      name: '',
      address: '',
      postCode: '',
      dob: new Date(),
      contactNumber: ''
    })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as ClaimDetails);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Driver Details Section */}
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
          {/* Add all other driver fields similarly */}
        </div>
      </section>

      {/* Vehicle Details Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add vehicle fields */}
        </div>
      </section>

      {/* Fault Party Details Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fault Party Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add fault party fields */}
        </div>
      </section>

      {/* Accident Details Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accident Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add accident fields */}
        </div>
      </section>

      {/* Passengers Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Passenger Details</h3>
        {formData.passengers?.map((passenger, index) => (
          <div key={index} className="mb-6 p-4 border rounded-lg">
            <h4 className="text-md font-medium mb-2">Passenger {index + 1}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Add passenger fields */}
            </div>
          </div>
        ))}
      </section>

      {/* Witness Details Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Witness Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add witness fields */}
        </div>
      </section>

      {/* Police Information Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Police Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add police information fields */}
        </div>
      </section>

      {/* Paramedic Information Section */}
      <section>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Paramedic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Add paramedic information fields */}
        </div>
      </section>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Submit Claim
        </button>
      </div>
    </form>
  );
};

export default ClaimDetailsForm;