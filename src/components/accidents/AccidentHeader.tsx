// src/components/accidents/AccidentHeader.tsx
import React from 'react';
import { Download, Plus, Search, FileText } from 'lucide-react';
import { Accident } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
interface AccidentHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
  onAdd: () => void;
  onStatusFilterChange: (status: string) => void;
  onGeneratePDF: () => void;
  accidents: Accident[];
}

const AccidentHeader: React.FC<AccidentHeaderProps> = ({
  onSearch,
  onImport,
  onExport,
  onAdd,
  onStatusFilterChange,
  onGeneratePDF,
  accidents
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { user } = useAuth();

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // counts
  const totalCount = accidents.length;
  const faultCount = accidents.filter(a => a.type === 'fault').length;
  const nonFaultCount = accidents.filter(a => a.type === 'non-fault').length;

  

  // amounts
  const faultTotal = accidents
    .filter(a => a.type === 'fault')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const nonFaultTotal = accidents
    .filter(a => a.type === 'non-fault')
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  return (
    <div className="space-y-4 mb-6">
      
      {can('accidents', 'cards') && (
        // FIX: Wrap the two adjacent divs in a single React Fragment
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-blue-700">Total Accidents</h3>
              <p className="text-2xl font-bold text-blue-800 mt-2">{totalCount}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-red-700">Fault Accidents</h3>
              <p className="text-2xl font-bold text-red-800 mt-2">{faultCount}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-green-700">Non-Fault Accidents</h3>
              <p className="text-2xl font-bold text-green-800 mt-2">{nonFaultCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-red-700">Fault Accidents Total (£)</h3>
              <p className="text-2xl font-bold text-red-800 mt-2">
                £{faultTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-green-700">Non-Fault Accidents Total (£)</h3>
              <p className="text-2xl font-bold text-green-800 mt-2">
                £{nonFaultTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
          <button
            onClick={onGeneratePDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>
          )}
          {user?.role === 'manager' && (
          <button
            onClick={onExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          )}
          {can('accidents', 'create') && (
          <button
            onClick={onAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Report Accident
          </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by reference no, name, vehicle, location..."
            onChange={e => onSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <select
          onChange={e => onStatusFilterChange(e.target.value)}
          className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">All Status</option>
          <option value="reported">Reported</option>
          <option value="investigating">Investigating</option>
          <option value="processing">Processing</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
    </div>
  );
};

export default AccidentHeader;