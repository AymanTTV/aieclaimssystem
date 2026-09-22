// src/components/finance/InvoiceFilters.tsx
import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Account } from '../../types/finance';
import SearchableSelect from '../ui/SearchableSelect';

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string | string[];
  onCategoryFilterChange: (category: string | string[]) => void;
  accountFilter: string | string[];
  onAccountFilterChange: (account: string | string[]) => void;
  groupFilter: string | string[];
  onGroupFilterChange: (group: string | string[]) => void;
  departmentFilter: string | string[];
  onDepartmentFilterChange: (department: string | string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  categories: string[];
  accounts: Account[];
  groups: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
}

const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  categoryFilter, onCategoryFilterChange,
  accountFilter, onAccountFilterChange,
  groupFilter, onGroupFilterChange,
  departmentFilter, onDepartmentFilterChange,
  dateRange, onDateRangeChange,
  categories, accounts, groups, departments,
  showCompleted, onShowCompletedChange
}) => {

  const categoryOptions = useMemo(() => [{ id: 'all', label: 'All Categories' }, ...categories.map(c => ({ id: c, label: c }))], [categories]);
  
  const accountOptions = useMemo(() => [
    { id: 'all', label: 'All Accounts' }, 
    { id: 'no_account_assigned', label: 'No Account Assigned' },
    ...accounts
      .filter(a => !(a.name && a.name.toLowerCase().startsWith('aie')))
      .map(a => ({ id: a.id, label: a.name }))
  ], [accounts]);
  
  const groupOptions = useMemo(() => [{ id: 'all', label: 'All Groups' }, { id: 'no_group_assigned', label: 'No Group Assigned' }, ...groups.map(g => ({ id: g.id, label: g.name }))], [groups]);
  
  // ✅ Proper Options with "No Department"
  const deptOptions = useMemo(() => [
    { id: 'all', label: 'All Departments' }, 
    { id: 'no_department_assigned', label: 'No Department Assigned' },
    ...departments.map(d => ({ id: d.id, label: d.name }))
  ], [departments]);

  const isAll = (val: string | string[]) => {
    if (Array.isArray(val)) return val.length === 0 || val.includes('all') || (val.length === 1 && val[0] === '');
    return val === 'all' || val === '';
  };

  const createMultiHandler = (onChange: (val: string | string[]) => void) => (val: any) => {
    if (val == null) return onChange([]);
    if (Array.isArray(val)) {
      const cleaned = val.filter(Boolean);
      if (cleaned.includes('all')) return onChange(['all']);
      return onChange(cleaned.length === 0 ? [] : cleaned);
    }
    if (val === '') return onChange([]);
    if (val === 'all') return onChange(['all']);
    return onChange(val);
  };

  return (
    <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl shadow-xl p-4 sm:p-5 text-white space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoices, clients, or vehicles..."
            className="block w-full pl-10 pr-3.5 py-2.5 border border-[#2B314E] rounded-xl leading-5 bg-[#0F111A] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-inner"
          />
        </div>
        
        <label className="flex items-center space-x-2.5 cursor-pointer bg-[#0F111A] px-3.5 py-2 rounded-xl border border-[#2B314E] hover:bg-[#16192B] transition-colors">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => onShowCompletedChange(e.target.checked)}
            className="rounded border-[#2B314E] text-blue-600 focus:ring-blue-500 h-4 w-4 bg-[#16192B]"
          />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Show Completed / Paid</span>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full min-h-[38px] border border-[#2B314E] rounded-xl bg-[#0F111A] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none px-3"
            >
              <option value="all">All Status</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              {showCompleted && <option value="paid">Paid</option>}
            </select>
          </div>
        </div>

        <SearchableSelect
          label="Account"
          labelClassName="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
          value={accountFilter}
          onChange={createMultiHandler(onAccountFilterChange)}
          options={accountOptions}
          isClearable={!isAll(accountFilter)}
          isMulti={true}
          multiEmptyMode="empty"
          showAllChipInMulti={true}
          allId="all"
        />

        <SearchableSelect
          label="Group"
          labelClassName="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
          value={groupFilter}
          onChange={createMultiHandler(onGroupFilterChange)}
          options={groupOptions}
          isClearable={!isAll(groupFilter)}
          isMulti={true}
          multiEmptyMode="empty"
          showAllChipInMulti={true}
          allId="all"
        />

        <SearchableSelect
          label="Department"
          labelClassName="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
          value={departmentFilter}
          onChange={createMultiHandler(onDepartmentFilterChange)}
          options={deptOptions}
          isClearable={!isAll(departmentFilter)}
          isMulti={true}
          multiEmptyMode="empty"
          showAllChipInMulti={true}
          allId="all"
        />

        <SearchableSelect
          label="Category"
          labelClassName="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
          value={categoryFilter}
          onChange={createMultiHandler(onCategoryFilterChange)}
          options={categoryOptions}
          isClearable={!isAll(categoryFilter)}
          isMulti={true}
          multiEmptyMode="empty"
          showAllChipInMulti={true}
          allId="all"
        />

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })
            }
            className="w-full min-h-[38px] border border-[#2B314E] rounded-xl bg-[#0F111A] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none px-3"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">To</label>
          <input
            type="date"
            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })
            }
            min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
            className="w-full min-h-[38px] border border-[#2B314E] rounded-xl bg-[#0F111A] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none px-3"
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilters;