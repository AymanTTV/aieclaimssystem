import React from 'react';
import { doc, getDoc } from 'firebase/firestore'; // Replace deleteDoc with getDoc
import { useAuth } from '../../context/AuthContext';
import { moveToTrash } from '../../utils/trashService';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface MaintenanceDeleteModalProps {
  logId: string;
  onClose: () => void;
}

const MaintenanceDeleteModal: React.FC<MaintenanceDeleteModalProps> = ({ logId, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const { user } = useAuth(); // Add this at the top of the component
  const handleDelete = async () => {
  setLoading(true);
  try {
    // 1. Fetch the log data first
    const logRef = doc(db, 'maintenanceLogs', logId);
    const logSnap = await getDoc(logRef);
    
    if (!logSnap.exists()) {
      toast.error('Log not found');
      return;
    }
    
    const logData = logSnap.data();
    const displayName = logData.orderNumber 
      ? `Maintenance ${logData.orderNumber}` 
      : `${logData.type.replace('-', ' ')} - ${logData.vehicleDetails?.registrationNumber || 'Unknown'}`;

    // 2. Move to trash
    await moveToTrash(
      'maintenanceLogs', 
      logId, 
      logData, 
      user?.id || 'system', 
      displayName
    );

    toast.success('Maintenance log moved to trash');
    onClose();
  } catch (error) {
    console.error('Error deleting maintenance log:', error);
    toast.error('Failed to delete maintenance log');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-medium">Delete Maintenance Log</h3>
      </div>
      
      <p className="text-sm text-gray-500">
        Are you sure you want to delete this maintenance log? This action cannot be undone.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
        >
          {loading ? 'Deleting...' : 'Delete Log'}
        </button>
      </div>
    </div>
  );
};

export default MaintenanceDeleteModal;