import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ServiceCenter, deleteServiceCenter, updateServiceCenter } from '../../utils/serviceCenters';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import Modal from '../ui/Modal';
import ServiceCenterForm from './ServiceCenterForm';
import { Trash2, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useServiceCenters } from '../../hooks/useServiceCenters'; // Import the new hook

interface ServiceCenterDropdownProps {
  value: string;
  onChange: (center: ServiceCenter) => void;
  onInputChange: (value: string) => void;
}

const ServiceCenterDropdown: React.FC<ServiceCenterDropdownProps> = ({
  value,
  onChange,
  onInputChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<ServiceCenter | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<ServiceCenter | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value); // Local state for input value

  // Use the new hook to get real-time service centers
  const { serviceCenters, loading: loadingCenters, error: serviceCentersError } = useServiceCenters();

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  // Filter service centers based on input value
  // Filter service centers based on input value
  const filteredServiceCenters = useMemo(() => {
    if (!inputValue) {
      return serviceCenters;
    }
    const lowerCaseInput = inputValue.toLowerCase();
    return serviceCenters.filter(center => {
      // default each potentially-missing field
      const name       = center.name        || '';
      const address    = center.address     || '';
      const postcode   = center.postcode    || '';
      const email      = center.email       || '';
      const phone      = center.phone       || '';
      const specialties = Array.isArray(center.specialties)
        ? center.specialties
        : [];

      return (
        name.toLowerCase().includes(lowerCaseInput) ||
        address.toLowerCase().includes(lowerCaseInput) ||
        postcode.toLowerCase().includes(lowerCaseInput) ||
        email.toLowerCase().includes(lowerCaseInput) ||
        phone.toLowerCase().includes(lowerCaseInput) ||
        specialties.some(s => (s || '').toLowerCase().includes(lowerCaseInput))
      );
    });
  }, [serviceCenters, inputValue]);

  // Update internal input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Update local input state
    onInputChange(newValue); // Propagate to parent
    setIsOpen(true); // Open dropdown when typing
  };

  const handleSelectCenter = (center: ServiceCenter) => {
    onChange(center);
    setInputValue(center.name); // Set input to selected center's name
    setIsOpen(false);
  };

  const handleCreateSuccess = (newCenter: ServiceCenter) => {
    setShowCreateForm(false);
    toast.success('Service center added successfully');
    // The useServiceCenters hook will automatically update the list
  };

  const handleEditSuccess = (updatedCenter: ServiceCenter) => {
    setShowEditForm(false);
    toast.success('Service center updated successfully');
    // The useServiceCenters hook will automatically update the list
  };

  const handleDeleteClick = (center: ServiceCenter) => {
    setDeletingCenter(center);
  };

  const confirmDelete = async () => {
    if (deletingCenter?.id) {
      try {
        await deleteServiceCenter(deletingCenter.id);
        setDeletingCenter(null);
        // The useServiceCenters hook will automatically update the list
        // If the deleted center was currently selected, clear the selection
        if (selectedCenter?.id === deletingCenter.id) {
          onChange({} as ServiceCenter); // Clear selected center in parent
          setInputValue(''); // Clear input
        }
      } catch (error) {
        console.error('Error deleting service center:', error);
        toast.error('Failed to delete service center');
      }
    }
  };

  const openEditForm = (center: ServiceCenter) => {
    setSelectedCenter(center);
    setShowEditForm(true);
    setIsOpen(false); // Close dropdown when opening modal
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        className="form-input w-full"
        placeholder="Search or select service center..."
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {loadingCenters ? (
            <div className="p-2 text-sm text-gray-500">Loading service centers...</div>
          ) : serviceCentersError ? (
            <div className="p-2 text-sm text-red-500">Error: {serviceCentersError}</div>
          ) : filteredServiceCenters.length === 0 && inputValue ? (
            <div className="p-2 text-sm text-gray-500">No matching service centers found.</div>
          ) : (
            <>
              <div className="p-2 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    setIsOpen(false); // Close dropdown when opening modal
                  }}
                  className="w-full text-left flex items-center p-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Service Center
                </button>
              </div>
              {filteredServiceCenters.map((center) => (
                <div
                  key={center.id}
                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSelectCenter(center)}
                >
                  <span className="text-sm">{center.name}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent dropdown from closing
                        openEditForm(center);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent dropdown from closing
                        handleDeleteClick(center);
                      }}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Create Service Center Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Add New Service Center"
      >
        <ServiceCenterForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      </Modal>

      {/* Edit Service Center Modal */}
      <Modal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedCenter(null);
        }}
        title="Edit Service Center"
      >
        <div>
          <ServiceCenterForm
            center={selectedCenter || undefined}
            onClose={() => {
              setShowEditForm(false);
              setSelectedCenter(null);
            }}
            onSuccess={handleEditSuccess}
          />
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCenter}
        onClose={() => setDeletingCenter(null)}
        title="Delete Service Center"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete {deletingCenter?.name}? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingCenter(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Service Center
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServiceCenterDropdown;