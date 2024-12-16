import React from 'react';
import { Search } from 'lucide-react';

interface ClaimsHeaderProps {
  onSearch: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onTypeFilterChange: (type: string) => void;
}

const ClaimsHeader: React.FC<ClaimsHeaderProps> = ({
  onSearch,
  onStatusFilterChange,
  onTypeFilterChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search claims..."
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <select
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="in-progress">In Progress</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="settled">Settled</option>
        </select>

        <select
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">All Types</option>
          <option value="fault">Fault</option>
          <option value="non-fault">Non-Fault</option>
        </select>
      </div>
    </div>
  );
};

export default ClaimsHeader;