import React from 'react';
import { Vehicle } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { formatDate } from '../../utils/dateHelpers';

interface AvailableVehiclesModalProps {
  vehicles: Vehicle[];
  onClose: () => void;
}

const AvailableVehiclesModal: React.FC<AvailableVehiclesModalProps> = ({
  vehicles,
  onClose
}) => {
  const availableVehicles = vehicles.filter(v => v.status === 'available');

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Maintenance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Service
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {availableVehicles.map(vehicle => (
              <tr key={vehicle.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                  <div className="text-sm text-gray-500">{vehicle.year}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {vehicle.registrationNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={vehicle.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(vehicle.lastMaintenance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {formatDate(vehicle.nextMaintenance)}
                </td>
              </tr>
            ))}
            {availableVehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No vehicles currently available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AvailableVehiclesModal;