import React from 'react';
import { Search } from 'lucide-react';

interface SearchAndFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    label?: string;
  }[];
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  filters = [],
}) => {
  return (
    <div className="flex space-x-4">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
      {filters.map((filter, index) => (
        <div key={index} className="min-w-[150px]">
          {filter.label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {filter.label}
            </label>
          )}
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};

export default SearchAndFilter;