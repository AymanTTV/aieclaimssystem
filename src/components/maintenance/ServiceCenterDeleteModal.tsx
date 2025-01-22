// src/components/maintenance/ServiceCenterDeleteModal.tsx

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';

interface ServiceCenterDeleteModalProps {
  isOpen: boolean;
  serviceCenterName: string;
  onConfirm: () => void;
  onClose: () => void;
}

const ServiceCenterDeleteModal: React.FC<ServiceCenterDeleteModalProps> = ({
  isOpen,
  serviceCenterName,
  onConfirm,
  onClose
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Service Center"
    >
      <div className="space-y-6">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg font-medium">Confirm Deletion</h3>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">
            Are you sure you want to delete <span className="font-semibold">{serviceCenterName}</span>?
          </p>
          <p className="text-sm text-red-600 mt-2">
            This action cannot be undone. All maintenance records associated with this service center will remain but will no longer be linked to an active service center.
          </p>
        </div>

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
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            Delete Service Center
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ServiceCenterDeleteModal;
