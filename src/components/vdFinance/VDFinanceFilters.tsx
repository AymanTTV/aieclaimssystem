// src/components/vdFinance/VDFinanceFilters.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useVDFinanceCategories } from '../../hooks/useVDFinanceCategories';
import { useVDFinanceGroups } from '../../hooks/useVDFinanceGroups';

export type ProfitStatusFilter = 'all' | 'unpaid' | 'paid' | 'cleared';

interface MultiSelectDropdownProps {
  label: string;
  options: { id: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const toggleOption = (id: string) => {
    if (selectedValues.includes(id)) onChange(selectedValues.filter(v => v !== id));
    else onChange([...selectedValues, id]);
  };

  const displayText = selectedValues.length === 0 
    ? (placeholder || 'Select...') 
    : selectedValues.length === 1 
      ? options.find(o => o.id === selectedValues[0])?.label 
      : `${selectedValues.length} Selected`;

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm flex justify-between items-center cursor-pointer hover:bg-white transition-colors"
      >
        <span className={selectedValues.length === 0 ? "text-gray-500" : "text-gray-900 font-medium"}>{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-gray-500 text-center">No results</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.id);
                return (
                  <div 
                    key={opt.id} 
                    onClick={() => toggleOption(opt.id)}
                    className="flex items-center px-2 py-1.5 text-sm hover:bg-blue-50 rounded cursor-pointer transition-colors"
                  >
                    <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={isSelected ? 'font-medium text-primary' : 'text-gray-700'}>{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};


interface VDFinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  statusFilter: ProfitStatusFilter;
  onStatusChange: (status: ProfitStatusFilter) => void;

  categoriesFilter: string[];
  onCategoriesFilterChange: (ids: string[]) => void;
  groupsFilter: string[];
  onGroupsFilterChange: (ids: string[]) => void;
  claimReasonsFilter: string[];
  onClaimReasonsFilterChange: (reasons: string[]) => void;
  
  amountRange: { min: number | null; max: number | null };
  onAmountRangeChange: (r: { min: number | null; max: number | null }) => void;
}

const VDFinanceFilters: React.FC<VDFinanceFiltersProps> = ({
  searchQuery, onSearchChange,
  dateRange, onDateRangeChange,
  statusFilter, onStatusChange,
  categoriesFilter, onCategoriesFilterChange,
  groupsFilter, onGroupsFilterChange,
  claimReasonsFilter, onClaimReasonsFilterChange,
  amountRange, onAmountRangeChange,
}) => {
  const startStr = dateRange.start ? dateRange.start.toISOString().slice(0, 10) : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().slice(0, 10) : '';

  const { categories } = useVDFinanceCategories();
  const { groups } = useVDFinanceGroups();

  const categoryOptions = categories.map(c => ({ id: c.id, label: c.name }));
  const groupOptions = [{ id: 'none', label: 'Unassigned (None)' }, ...groups.map(g => ({ id: g.id, label: g.name }))];
  const claimOptions = [
    { id: 'VD', label: 'Vehicle Damage' },
    { id: 'H', label: 'Hire' },
    { id: 'S', label: 'Storage' },
    { id: 'PI', label: 'Personal Injury' }
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
      
      {/* Top Search & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name, reference, or registration…"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as ProfitStatusFilter)}
            className="block w-full px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
          >
            <option value="all">All Profit Statuses</option>
            <option value="unpaid">Unpaid Profit</option>
            <option value="paid">Paid Profit</option>
            <option value="cleared">No Profit Recorded</option>
          </select>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Grid Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Date Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
            <input type="date" value={startStr} max={endStr || undefined} onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
            <input type="date" value={endStr} min={startStr || undefined} onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Amount Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Min Total (£)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={amountRange.min ?? ''} onChange={e => onAmountRangeChange({ ...amountRange, min: e.target.value ? parseFloat(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Max Total (£)</label>
            <input type="number" step="0.01" min={amountRange.min ?? 0} placeholder="Any" value={amountRange.max ?? ''} onChange={e => onAmountRangeChange({ ...amountRange, max: e.target.value ? parseFloat(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Multi-Select Components */}
        <MultiSelectDropdown label="Categories" options={categoryOptions} selectedValues={categoriesFilter} onChange={onCategoriesFilterChange} placeholder="All Categories" />
        <MultiSelectDropdown label="Groups" options={groupOptions} selectedValues={groupsFilter} onChange={onGroupsFilterChange} placeholder="All Groups" />
        <MultiSelectDropdown label="Claim Reasons" options={claimOptions} selectedValues={claimReasonsFilter} onChange={onClaimReasonsFilterChange} placeholder="All Reasons" />
        
      </div>
    </div>
  );
};

export default VDFinanceFilters;