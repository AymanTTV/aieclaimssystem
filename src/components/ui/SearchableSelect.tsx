// src/components/ui/SearchableSelect.tsx
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  isClearable?: boolean;
  isMulti?: boolean;

  /**
   * ✅ NEW:
   * - "all": empty selection becomes ["all"] (your old behavior)
   * - "empty": empty selection stays [] (needed for Accounts filter default)
   */
  multiEmptyMode?: 'all' | 'empty';

  /**
   * ✅ NEW:
   * If true, when value includes "all", we render a chip for it (so user can SEE it's selected).
   * Default true (better UX).
   */
  showAllChipInMulti?: boolean;

  /**
   * ✅ NEW:
   * Which id is considered the special "All" option.
   * Default: "all"
   */
  allId?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  openUpwards: boolean;
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
  multiEmptyMode = 'all',
  showAllChipInMulti = true,
  allId = 'all',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Measure control and calculate optimal position for the portal dropdown
  const updatePosition = useCallback(() => {
    if (!controlRef.current) return;
    const rect = controlRef.current.getBoundingClientRect();
    const dropdownEstimatedHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownEstimatedHeight && rect.top > spaceBelow;

    setDropdownPosition({
      top: openUpwards ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpwards,
    });
  }, []);

  // Update position when opened or when window/parent scrolls or resizes
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, updatePosition]);

  // Click outside handling for both control trigger and portal dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.subLabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Normalize value to array for rendering/logic
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];

  const getOptionLabel = (id: string) => options.find((o) => o.id === id)?.label || id;

  const toEmptyValue = () => {
    if (isMulti) return multiEmptyMode === 'all' ? [allId] : [];
    return allId;
  };

  const handleSelect = (optionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isMulti) {
      let newValues: string[] = [];

      if (optionId === allId) {
        newValues = [allId];
      } else {
        const hasThis = selectedIds.includes(optionId);

        if (hasThis) {
          newValues = selectedIds.filter((id) => id !== optionId);
        } else {
          const clean = selectedIds.filter((id) => id !== allId);
          newValues = [...clean, optionId];
        }

        if (newValues.length === 0) {
          const empty = toEmptyValue();
          onChange(empty);
          setSearchTerm('');
          return;
        }
      }

      onChange(newValues);
      setSearchTerm('');
    } else {
      onChange(optionId);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const removeValue = (idToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (Array.isArray(value)) {
      const newValues = value.filter((id) => id !== idToRemove);
      if (newValues.length > 0) onChange(newValues);
      else onChange(toEmptyValue());
    } else {
      onChange(toEmptyValue());
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(toEmptyValue());
  };

  const isValueEmpty = (() => {
    if (selectedIds.length === 0) return true;
    if (multiEmptyMode === 'all' && selectedIds.length === 1 && selectedIds[0] === allId) return true;
    return false;
  })();

  const renderMultiChips = () => {
    const hasAll = selectedIds.includes(allId);
    const specific = selectedIds.filter((id) => id !== allId);

    return (
      <>
        {hasAll && showAllChipInMulti && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-500/30">
            {getOptionLabel(allId)}
            <button
              type="button"
              onClick={(e) => removeValue(allId, e)}
              className="ml-1 text-indigo-300 hover:text-white focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {specific.map((id) => (
          <span
            key={id}
            className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-900/50 text-indigo-200 border border-indigo-500/30"
          >
            {getOptionLabel(id)}
            <button
              type="button"
              onClick={(e) => removeValue(id, e)}
              className="ml-1 text-indigo-300 hover:text-white focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {isValueEmpty && !isOpen && <span className="text-slate-400 px-2 py-1">{placeholder}</span>}

        {isOpen && (
          <input
            ref={inputRef}
            type="text"
            className="flex-1 min-w-[60px] bg-transparent border-0 p-1 text-sm text-white placeholder-slate-400 focus:ring-0 focus:outline-none"
            placeholder={isValueEmpty ? placeholder : ''}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}
      </>
    );
  };

  return (
    <div className="space-y-1" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-200">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      <div className="relative">
        <div
          ref={controlRef}
          className={`w-full min-h-[38px] border ${
            error ? 'border-red-400/80' : 'border-white/20'
          } rounded-xl bg-[#0f1022] text-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} relative shadow-inner`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="flex flex-wrap items-center gap-1 p-1 pr-8">
            {!isMulti && !isOpen && (
              <div className="px-2 py-1 text-white w-full truncate">
                {selectedIds.length > 0 && selectedIds[0] !== allId ? (
                  <span>{getOptionLabel(selectedIds[0])}</span>
                ) : (
                  <span className="text-slate-400">{placeholder}</span>
                )}
              </div>
            )}

            {isMulti && renderMultiChips()}
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {isClearable && !isValueEmpty && !disabled && (
              <button
                type="button"
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 mr-1"
                onClick={clearAll}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!isOpen && !isMulti && <Search className="h-4 w-4 text-slate-400" />}
          </div>

          {isOpen && !isMulti && (
            <div className="absolute inset-0 z-10 bg-[#0f1022] rounded-xl flex items-center px-3 border border-indigo-500/50">
              <Search className="h-4 w-4 text-slate-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-0 p-0 text-sm text-white placeholder-slate-400 focus:ring-0 focus:outline-none"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="ml-2 text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Render dropdown into document.body to break free from any table/modal/form overflow constraints */}
        {isOpen &&
          dropdownPosition &&
          ReactDOM.createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPosition.openUpwards ? undefined : dropdownPosition.top,
                bottom: dropdownPosition.openUpwards
                  ? window.innerHeight - dropdownPosition.top
                  : undefined,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 99999,
              }}
              className="bg-white shadow-xl max-h-60 rounded-xl py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 custom-scrollbar text-gray-900"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = selectedIds.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      className={`cursor-pointer px-3 py-2 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={(e) => handleSelect(option.id, e)}
                    >
                      <div>
                        <div>{option.label}</div>
                        {option.subLabel && <div className="text-xs text-gray-500">{option.subLabel}</div>}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 px-3 py-2">No results found</div>
              )}
            </div>,
            document.body
          )}
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
