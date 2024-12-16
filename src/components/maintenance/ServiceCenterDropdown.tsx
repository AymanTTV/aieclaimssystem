import React, { useState, useRef, useEffect } from 'react';
import { SERVICE_CENTERS, searchServiceCenters } from '../../utils/serviceCenters';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface ServiceCenterDropdownProps {
  value: string;
  onChange: (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => void;
  onInputChange: (value: string) => void;
}

const ServiceCenterDropdown: React.FC<ServiceCenterDropdownProps> = ({
  value,
  onChange,
  onInputChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(SERVICE_CENTERS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  const handleSearch = (query: string) => {
    onInputChange(query);
    setSearchResults(searchServiceCenters(query));
    setIsOpen(true);
  };

  const handleSelect = (center: typeof SERVICE_CENTERS[0]) => {
    onChange(center);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        placeholder="Search service centers..."
      />
      
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.map((center, index) => (
            <div
              key={index}
              onClick={() => handleSelect(center)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div className="font-medium">{center.name}</div>
              <div className="text-sm text-gray-500">{center.address}</div>
              <div className="text-sm text-gray-500">£{center.hourlyRate}/hour</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceCenterDropdown;