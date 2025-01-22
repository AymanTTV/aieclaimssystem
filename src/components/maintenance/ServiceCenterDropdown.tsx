// src/components/maintenance/ServiceCenterDropdown.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ServiceCenter, fetchServiceCenters, searchServiceCenters, deleteServiceCenter } from '../../utils/serviceCenters';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import Modal from '../ui/Modal';
import ServiceCenterForm from './ServiceCenterForm';
import ServiceCenterDeleteModal from './ServiceCenterDeleteModal';
import { Trash2, Plus } from 'lucide-react';
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

  const handleDelete = async (center: ServiceCenter, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCenter(center);
  };

  const confirmDelete = async () => {
    if (!deletingCenter?.id) return;
    
    try {
      await deleteServiceCenter(deletingCenter.id);
      await loadServiceCenters(); // Refresh the list
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
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((center) => (
              <div
                key={center.id}
                className="group px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div onClick={() => handleSelect(center)}>
                    <div className="font-medium">{center.name}</div>
                    <div className="text-sm text-gray-500">{center.address}</div>
                    <div className="text-sm text-gray-500">£{center.hourlyRate}/hour</div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(center, e)}
                    className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Service Center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
        <ServiceCenterForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleCreateSuccess}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ServiceCenterDeleteModal
        isOpen={!!deletingCenter}
        serviceCenterName={deletingCenter?.name || ''}
        onConfirm={confirmDelete}
        onClose={() => setDeletingCenter(null)}
      />
    </div>
  );
};

export default ServiceCenterDropdown;
