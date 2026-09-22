import React from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { format, isValid } from 'date-fns';
import { Edit, Trash2, Eye } from 'lucide-react';
import StatusBadge from '../StatusBadge';

interface MaintenanceListProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (id: string) => void;
  onView: (log: MaintenanceLog) => void;
}

const MaintenanceList: React.FC<MaintenanceListProps> = ({
  logs,
  vehicles,
  onEdit,
  onDelete,
  onView,
}) => {
  const formatDate = (date: Date | undefined | null): string => {
    if (!date || !isValid(date)) {
      return 'Not set';
    }
    return format(date, 'MMM dd, yyyy');
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg">
        <p className="text-gray-500">No maintenance logs found</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[#F8FAFC] text-[#334155] border-b-2 border-[#E2E8F0]">
            <tr className="border-b-2 border-[#E2E8F0]">
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Registration
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Make/Model
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Service Due
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Status
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Type
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Location
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Cost
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold text-[#334155] uppercase tracking-wider select-none whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const vehicle = vehicles[log.vehicleId];
              if (!vehicle) return null;

              const isEven = idx % 2 === 1;
              const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';

              return (
                <tr
                  key={log.id}
                  className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {vehicle.registrationNumber}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-800">{vehicle.make}</div>
                    <div className="text-xs text-slate-500">{vehicle.model}</div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="text-sm text-slate-800">
                      {formatDate(log.nextServiceDate)}
                    </div>
                    <div className="text-xs text-slate-500">
                      or {log.nextServiceMileage?.toLocaleString() || 'N/A'} miles
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-sm text-slate-800 capitalize">
                      {log.type.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="text-sm text-slate-800">{log.serviceProvider}</div>
                    <div className="text-xs text-slate-500">{log.location}</div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-slate-900">
                    £{log.cost.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onView(log)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-white/80 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onEdit(log)}
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-white/80 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDelete(log.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-white/80 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">
                  No maintenance records available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Consistent Light Footer */}
      <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <span className="font-bold text-slate-900">{logs.length}</span> total maintenance records
        </div>
        <div className="text-slate-500">
          Fleet Maintenance Log
        </div>
      </div>
    </div>
  );
};

export default MaintenanceList;