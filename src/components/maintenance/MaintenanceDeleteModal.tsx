import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useMaintenanceCascadeDelete } from '../../hooks/useMaintenanceCascadeDelete';

interface MaintenanceDeleteModalProps {
  logId: string;
  onClose: () => void;
}

const MaintenanceDeleteModal: React.FC<MaintenanceDeleteModalProps> = ({ logId, onClose }) => {
  const { deleteMaintenanceRecord, loading } = useMaintenanceCascadeDelete();

  const handleDelete = async () => {
    const result = await deleteMaintenanceRecord(logId);
    if (result?.success) {
      onClose();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-medium">Delete Maintenance Log</h3>
      </div>
      
      <p className="text-sm text-gray-500">
        Are you sure you want to delete this maintenance log? This will automatically cascade delete all linked Finance transactions and Invoices across the system to ensure total data reconciliation.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting everywhere...' : 'Delete Log'}
        </button>
      </div>
    </div>
  );
};

export default MaintenanceDeleteModal;
