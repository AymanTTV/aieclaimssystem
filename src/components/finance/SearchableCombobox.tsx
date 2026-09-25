// src/components/finance/SearchableCombobox.tsx
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check, Plus } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string, selectedOption?: ComboboxOption) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  isClearable?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
  className?: string;
  compact?: boolean;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select or search...',
  required = false,
  disabled = false,
  isClearable = true,
  allowCustom = false,
  customPlaceholder = 'Use custom value',
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; openUpwards: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value || o.label === value);

  // Position calculation
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > spaceBelow;

    setDropdownPosition({
      top: openUpwards ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpwards,
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const onScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(term)) ||
      opt.id.toLowerCase().includes(term)
    );
  });

  const handleSelect = (opt: ComboboxOption) => {
    onChange(opt.id, opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCustomAdd = () => {
    if (!searchTerm.trim()) return;
    onChange(searchTerm.trim());
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className={`block font-bold text-slate-700 tracking-wide ${compact ? 'text-xs' : 'text-xs'}`}>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
      )}

      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            updatePosition();
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full flex items-center justify-between bg-white border transition-all rounded-lg cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs min-h-[36px]' : 'px-3.5 py-2.5 text-sm min-h-[42px]'
        } ${
          isOpen
            ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-xs'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1 truncate">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className={`font-semibold text-slate-900 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-xs text-slate-500 truncate">({selectedOption.subLabel})</span>
              )}
              {selectedOption.badge && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs rounded font-bold shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : value ? (
            <span className={`font-semibold text-slate-900 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{value}</span>
          ) : (
            <span className={`text-slate-400 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {isClearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-slate-600 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        (() => {
          const dropdownContent = (
            <div
              ref={dropdownRef}
              className={`${
                dropdownPosition ? 'fixed z-[9999]' : 'absolute z-50 left-0 right-0 mt-1'
              } bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
              style={
                dropdownPosition
                  ? {
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${Math.max(dropdownPosition.width, 240)}px`,
                      maxHeight: '260px',
                    }
                  : { maxHeight: '240px' }
              }
            >
              {/* Search Input */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Type to filter..."
                  className="w-full bg-transparent text-xs text-slate-900 border-0 focus:ring-0 focus:outline-none p-0"
                  onClick={e => e.stopPropagation()}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Options List */}
              <div className="overflow-y-auto max-h-48 divide-y divide-slate-50 p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => {
                    const isSelected = opt.id === value || opt.label === value;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelect(opt)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate">{opt.label}</span>
                          {opt.subLabel && (
                            <span className="text-[10px] text-slate-400 truncate">{opt.subLabel}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] rounded font-bold">
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching options found
                  </div>
                )}

                {/* Custom input quick adder */}
                {allowCustom && searchTerm.trim() && !filteredOptions.some(o => o.label.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div
                    onClick={handleCustomAdd}
                    className="flex items-center gap-1.5 px-2.5 py-2 mt-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{customPlaceholder}: <span className="text-indigo-900 font-black">"{searchTerm.trim()}"</span></span>
                  </div>
                )}
              </div>
            </div>
          );

          return dropdownPosition ? createPortal(dropdownContent, document.body) : dropdownContent;
        })()
      )}
    </div>
  );
};

export default SearchableCombobox;
