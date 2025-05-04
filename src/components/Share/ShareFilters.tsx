// src/components/share/ShareFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface ShareFiltersProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedReasons: string[];
  onReasonChange: (vals: string[]) => void;
  progressFilter: 'all' | 'in-progress' | 'completed';
  onProgressChange: (v: 'all' | 'in-progress' | 'completed') => void;
}

const reasonsOptions = ['VD', 'H', 'S', 'PI'];

const ShareFilters: React.FC<ShareFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedReasons,
  onReasonChange,
  progressFilter,
  onProgressChange,
}) => {
  const handleReasonSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vals = Array.from(e.target.selectedOptions, o => o.value);
    onReasonChange(vals);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by client name…"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Reason & Status in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reason Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            multiple
            value={selectedReasons}
            onChange={handleReasonSelect}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm h-28"
          >
            {reasonsOptions.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Hold Ctrl (Windows) or Cmd (Mac) to select multiple.
          </p>
        </div>

        {/* Progress Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={progressFilter}
            onChange={e => onProgressChange(e.target.value as any)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
    </div>
  );
};
export default ShareFilters;