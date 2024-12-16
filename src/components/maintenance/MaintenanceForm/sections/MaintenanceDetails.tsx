import React from 'react';
import FormField from '../../../ui/FormField';

interface MaintenanceDetailsProps {
  formData: {
    type: string;
    description: string;
    date: string;
    currentMileage: number;
  };
  setFormData: (data: any) => void;
}

const MaintenanceDetails: React.FC<MaintenanceDetailsProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="yearly-service">Yearly Service</option>
          <option value="mileage-service">Mileage Service</option>
          <option value="repair">Repair</option>
          <option value="emergency-repair">Emergency Repair</option>
        </select>
      </div>

      <FormField
        type="date"
        label="Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />

      <FormField
        type="number"
        label="Current Mileage"
        value={formData.currentMileage}
        onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) })}
        required
        min="0"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>
    </div>
  );
};

export default MaintenanceDetails;