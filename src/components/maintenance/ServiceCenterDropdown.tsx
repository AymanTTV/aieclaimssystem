import React, { useState, useRef, useEffect } from 'react';
import { ServiceCenter, fetchServiceCenters, searchServiceCenters, deleteServiceCenter, updateServiceCenter } from '../../utils/serviceCenters';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import Modal from '../ui/Modal';
import ServiceCenterForm from './ServiceCenterForm';
import { Trash2, Plus, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [searchResults, setSearchResults] = useState<ServiceCenter[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<ServiceCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingCenter, setDeletingCenter] = useState<ServiceCenter | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsOpen(false));

  const loadServiceCenters = async () => {
    try {
      const centers = await fetchServiceCenters();
      setSearchResults(centers);
    } catch (error) {
      console.error('Error loading service centers:', error);
      toast.error('Failed to load service centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceCenters();
  }, []);

  const handleSearch = (query: string) => {
    onInputChange(query);
    setSearchResults(searchServiceCenters(query));
    setIsOpen(true);
  };

  const handleSelect = (center: ServiceCenter) => {
    onChange(center);
    setIsOpen(false);
  };

  const handleEdit = async (center: ServiceCenter, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCenter(center);
    setShowEditForm(true);
  };

  const handleDelete = async (center: ServiceCenter, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCenter(center);
  };

  const confirmDelete = async () => {
    if (!deletingCenter?.id) return;
    
    try {
      await deleteServiceCenter(deletingCenter.id);
      await loadServiceCenters();
      toast.success('Service center deleted successfully');
    } catch (error) {
      console.error('Error deleting service center:', error);
      toast.error('Failed to delete service center');
    } finally {
      setDeletingCenter(null);
    }
  };

  const handleCreateSuccess = async (newCenter: ServiceCenter) => {
    await loadServiceCenters();
    setShowCreateForm(false);
    handleSelect(newCenter);
  };

  const handleEditSuccess = async (updatedCenter: ServiceCenter) => {
    if (!selectedCenter?.id) return;
    
    try {
      await updateServiceCenter(selectedCenter.id, updatedCenter);
      await loadServiceCenters();
      setShowEditForm(false);
      handleSelect({ ...updatedCenter, id: selectedCenter.id });
      toast.success('Service center updated successfully');
    } catch (error) {
      console.error('Error updating service center:', error);
      toast.error('Failed to update service center');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={dropdownRef} className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Search service centers..."
        />
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {searchResults.map((center) => (
              <div
                key={center.id}
                className="group px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div onClick={() => handleSelect(center)}>
                    <div className="font-medium">{center.name}</div>
                    <div className="text-sm text-gray-500">{center.address}</div>
                    <div className="text-sm text-gray-500">
                      £{center.hourlyRate}/hour | {center.email}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleEdit(center, e)}
                      className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit Service Center"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(center, e)}
                      className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Service Center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-gray-50 rounded-md flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Service Center
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Add New Service Center"
      >
        <div>
          <ServiceCenterForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleCreateSuccess}
          />
        </div>
      </Modal>

      {/* Edit Form Modal */}
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