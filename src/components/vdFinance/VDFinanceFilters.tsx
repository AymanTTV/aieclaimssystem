// src/components/vdFinance/VDFinanceFilters.tsx
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useVDFinanceCategories } from '../../hooks/useVDFinanceCategories';
import { useVDFinanceGroups } from '../../hooks/useVDFinanceGroups';
import SearchableSelect from '../ui/SearchableSelect';

export type ProfitStatusFilter = 'all' | 'unpaid' | 'paid' | 'cleared';

interface VDFinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  incidentDateRange: { start: Date | null; end: Date | null }; 
  onIncidentDateRangeChange: (range: { start: Date | null; end: Date | null }) => void; 
  statusFilter: ProfitStatusFilter;
  onStatusChange: (status: ProfitStatusFilter) => void;

  categoriesFilter: string[];
  onCategoriesFilterChange: (ids: string[]) => void;
  groupsFilter: string[];
  onGroupsFilterChange: (ids: string[]) => void;
  departmentsFilter: string[]; // NEW
  onDepartmentsFilterChange: (ids: string[]) => void; // NEW
  claimReasonsFilter: string[];
  onClaimReasonsFilterChange: (reasons: string[]) => void;
  
  amountRange: { min: number | null; max: number | null };
  onAmountRangeChange: (r: { min: number | null; max: number | null }) => void;
}

const VDFinanceFilters: React.FC<VDFinanceFiltersProps> = ({
  searchQuery, onSearchChange,
  dateRange, onDateRangeChange,
  incidentDateRange, onIncidentDateRangeChange,
  statusFilter, onStatusChange,
  categoriesFilter, onCategoriesFilterChange,
  groupsFilter, onGroupsFilterChange,
  departmentsFilter, onDepartmentsFilterChange,
  claimReasonsFilter, onClaimReasonsFilterChange,
  amountRange, onAmountRangeChange,
}) => {
  const startStr = dateRange.start ? dateRange.start.toISOString().slice(0, 10) : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().slice(0, 10) : '';
  const incStartStr = incidentDateRange.start ? incidentDateRange.start.toISOString().slice(0, 10) : '';
  const incEndStr   = incidentDateRange.end ? incidentDateRange.end.toISOString().slice(0, 10) : '';

  const { categories } = useVDFinanceCategories();
  const { groups } = useVDFinanceGroups();
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'claimDepartments'), snap => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  const categoryOptions = categories.map(c => ({ id: c.id, label: c.name }));
  const groupOptions = [{ id: 'none', label: 'Unassigned (None)' }, ...groups.map(g => ({ id: g.id, label: g.name }))];
  const deptOptions = [{ id: 'none', label: 'Unassigned (None)' }, ...departments.map(d => ({ id: d.id, label: d.name }))];
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        
        {/* Record Date Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Record From</label>
            <input type="date" value={startStr} max={endStr || undefined} onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Record To</label>
            <input type="date" value={endStr} min={startStr || undefined} onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Incident Date Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Incident From</label>
            <input type="date" value={incStartStr} max={incEndStr || undefined} onChange={e => onIncidentDateRangeChange({ ...incidentDateRange, start: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Incident To</label>
            <input type="date" value={incEndStr} min={incStartStr || undefined} onChange={e => onIncidentDateRangeChange({ ...incidentDateRange, end: e.target.value ? new Date(e.target.value) : null })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary" />
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

        {/* Searchable Selects */}
        <div>
          <SearchableSelect label="Categories" options={categoryOptions} value={categoriesFilter} onChange={(val) => onCategoriesFilterChange(val as string[])} isMulti={true} multiEmptyMode="empty" placeholder="All Categories" />
        </div>
        <div>
          <SearchableSelect label="Groups" options={groupOptions} value={groupsFilter} onChange={(val) => onGroupsFilterChange(val as string[])} isMulti={true} multiEmptyMode="empty" placeholder="All Groups" />
        </div>
        <div>
          <SearchableSelect label="Departments" options={deptOptions} value={departmentsFilter} onChange={(val) => onDepartmentsFilterChange(val as string[])} isMulti={true} multiEmptyMode="empty" placeholder="All Depts" />
        </div>
        <div>
          <SearchableSelect label="Claim Reasons" options={claimOptions} value={claimReasonsFilter} onChange={(val) => onClaimReasonsFilterChange(val as string[])} isMulti={true} multiEmptyMode="empty" placeholder="All Reasons" />
        </div>
        
      </div>
    </div>
  );
};

export default VDFinanceFilters;