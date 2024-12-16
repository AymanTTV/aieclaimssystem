import React from 'react';
import { Plus } from 'lucide-react';

interface VehicleHeaderProps {
  onAdd: () => void;
  showAddButton: boolean;
}

const VehicleHeader: React.FC<VehicleHeaderProps> = ({ onAdd, showAddButton }) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
      {showAddButton && (
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vehicle
        </button>
      )}
    </div>
  );
};

export default VehicleHeader;