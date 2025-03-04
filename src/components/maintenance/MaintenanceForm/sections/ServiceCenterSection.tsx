import React from 'react';
import ServiceCenterDropdown from '../../ServiceCenterDropdown';

interface ServiceCenterSectionProps {
  formData: {
    serviceProvider: string;
    location: string;
  };
  onServiceCenterSelect: (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => void;
}

const ServiceCenterSection: React.FC<ServiceCenterSectionProps> = ({
  formData,
  onServiceCenterSelect,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Service Center</label>
        <ServiceCenterDropdown
          value={formData.serviceProvider}
          onChange={onServiceCenterSelect}
          onInputChange={(value) => onServiceCenterSelect({ 
            name: value, 
            address: formData.location,
            postcode: '',
            hourlyRate: 75 
          })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          type="text"
          value={formData.location}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
    </div>
  );
};

export default ServiceCenterSection;