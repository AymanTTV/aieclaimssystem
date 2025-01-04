import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Search...',
  required = false,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div
          className={`w-full border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          {!isOpen && (
            <div className="px-3 py-2 text-gray-900">
              {selectedOption ? (
                <div>
                  <div>{selectedOption.label}</div>
                  {selectedOption.subLabel && (
                    <div className="text-sm text-gray-500">{selectedOption.subLabel}</div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">{placeholder}</span>
              )}
            </div>
          )}

          {isOpen && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border-0 focus:ring-0 sm:text-sm"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="cursor-pointer hover:bg-gray-100 px-3 py-2"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div>{option.label}</div>
                  {option.subLabel && (
                    <div className="text-sm text-gray-500">{option.subLabel}</div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 px-3 py-2">No results found</div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export default SearchableSelect;