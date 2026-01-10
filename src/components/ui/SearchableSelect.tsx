// src/components/ui/SearchableSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | string[]; // Updated to accept arrays
  onChange: (value: string | string[]) => void; // Updated callback signature
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  isClearable?: boolean;
  isMulti?: boolean; // New prop for multi-select mode
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
  isClearable = false,
  isMulti = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useOnClickOutside(wrapperRef, () => setIsOpen(false));

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to normalize value to array
  const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);

  // Helper to get option label
  const getOptionLabel = (id: string) => options.find(o => o.id === id)?.label || id;

  const handleSelect = (optionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isMulti) {
      let newValues: string[];
      
      if (optionId === 'all') {
        // If "All" is selected, clear everything else and set to "all" (or empty string if you prefer that logic)
        newValues = ['all'];
      } else {
        // If a specific item is selected
        if (selectedIds.includes(optionId)) {
          // Remove it
          newValues = selectedIds.filter(id => id !== optionId);
          // If we removed the last item, maybe default back to 'all'? 
          if (newValues.length === 0) newValues = ['all'];
        } else {
          // Add it
          // First, remove 'all' if it exists
          const cleanIds = selectedIds.filter(id => id !== 'all');
          newValues = [...cleanIds, optionId];
        }
      }
      
      onChange(newValues);
      setSearchTerm(''); // Optional: clear search after select
      // We do NOT close the dropdown in multi mode
    } else {
      // Single select behavior
      onChange(optionId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const removeValue = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Array.isArray(value)) {
      const newValues = value.filter(id => id !== idToRemove);
      // If empty, revert to 'all' or empty depending on logic.
      // Assuming 'all' is the default state for empty.
      onChange(newValues.length > 0 ? newValues : 'all');
    } else {
      onChange('all'); // Clear single value
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(isMulti ? ['all'] : 'all');
  };

  const isValueEmpty = selectedIds.length === 0 || (selectedIds.length === 1 && selectedIds[0] === 'all');

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <div
          className={`w-full min-h-[38px] border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md bg-white ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
          } relative`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          {/* Render Selected Items or Placeholder */}
          <div className="flex flex-wrap items-center gap-1 p-1 pr-8">
            {!isMulti && !isOpen && (
                <div className="px-2 py-1 text-gray-900 w-full truncate">
                    {selectedIds.length > 0 && selectedIds[0] !== 'all' ? (
                        <span>{getOptionLabel(selectedIds[0])}</span>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
            )}

            {isMulti && (
                <>
                    {selectedIds.filter(id => id !== 'all').map(id => (
                        <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            {getOptionLabel(id)}
                            <button
                                type="button"
                                onClick={(e) => removeValue(id, e)}
                                className="ml-1 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {(isValueEmpty && !isOpen) && <span className="text-gray-400 px-2 py-1">{placeholder}</span>}
                    {/* Input for searching is inline for multi-select if open */}
                    {isOpen && (
                         <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 min-w-[60px] border-0 p-1 text-sm focus:ring-0"
                            placeholder={selectedIds.length === 0 || (selectedIds.length === 1 && selectedIds[0] === 'all') ? placeholder : ""}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                         />
                    )}
                </>
            )}
          </div>

          {/* Right Icon Controls */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {isClearable && !isValueEmpty && !disabled && (
                <button
                    type="button"
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 mr-1"
                    onClick={clearAll}
                    aria-label="Clear selection"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
            {!isOpen && !isMulti && <Search className="h-4 w-4 text-gray-400" />}
          </div>
          
          {/* Single Select Search Input (Overlay) */}
          {isOpen && !isMulti && (
               <div className="absolute inset-0 z-10 bg-white rounded-md flex items-center px-2">
                  <Search className="h-4 w-4 text-gray-400 mr-2" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 border-0 p-0 text-sm focus:ring-0"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="ml-2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4"/></button>
               </div>
          )}
        </div>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                    <div
                    key={option.id}
                    className={`cursor-pointer px-3 py-2 flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900 hover:bg-gray-100'}`}
                    onClick={(e) => handleSelect(option.id, e)}
                    >
                    <div>
                        <div>{option.label}</div>
                        {option.subLabel && (
                        <div className="text-xs text-gray-500">{option.subLabel}</div>
                        )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                )
              })
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