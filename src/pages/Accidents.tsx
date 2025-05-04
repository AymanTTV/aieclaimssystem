import React, { useState } from 'react';
import { useAccidents } from '../hooks/useAccidents';

import { useAccidentFilters } from '../hooks/useAccidentFilters';

import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { AccidentDocument, AccidentBulkDocument } from '../components/pdf/documents';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { saveAs } from 'file-saver';


import AccidentHeader from '../components/accidents/AccidentHeader';
import AccidentFilters from '../components/accidents/AccidentFilters';
import AccidentTable from '../components/accidents/AccidentClaimTable';
import AccidentClaimForm from '../components/accidents/AccidentClaimForm';
import AccidentClaimView from '../components/accidents/AccidentClaimView';
import AccidentClaimEdit from '../components/accidents/AccidentClaimEdit';

import Modal from '../components/ui/Modal';
import { useVehicles } from '../hooks/useVehicles';
import { Accident } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Accidents = () => {
  const { accidents, loading } = useAccidents();
  const { vehicles } = useVehicles();
  const { companyDetails } = useCompanyDetails();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    claimStatusFilter,
    setClaimStatusFilter,
    dateRange,
    setDateRange,
    filteredAccidents
  } = useAccidentFilters(accidents);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAdd = () => {
    setShowAddModal(true);
  };

  const handleView = (accident: Accident) => {
    setSelectedAccident(accident);
    setShowViewModal(true);
  };

  const handleEdit = (accident: Accident) => {
    setSelectedAccident(accident);
    setShowEditModal(true);
  };

  const handleDelete = async (accident: Accident) => {
    try {
      await deleteDoc(doc(db, 'accidents', accident.id));
      toast.success('Accident deleted successfully');
      setShowDeleteModal(false);
      setSelectedAccident(null);
    } catch (error) {
      console.error('Error deleting accident:', error);
      toast.error('Failed to delete accident');
    }
  };

  const handleExport = () => {
    // Implement export functionality
  };

  const handleImport = (file: File) => {
    // Implement import functionality
  };

  const handleGenerateDocument = async (accident: Accident) => {
    try {
      const vehicle = vehicles.find(v => v.id === accident.vehicleId);

      await generateAndUploadDocument(
        AccidentDocument,
        { ...accident, vehicle },
        'accidents',
        accident.id,
        'accidents'
      );

      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  // Handle bulk document generation
  const handleGenerateBulkDocument = async () => {
    try {
      const pdfBlob = await generateBulkDocuments(
        AccidentBulkDocument,
        filteredAccidents,
        companyDetails
      );

      saveAs(pdfBlob, 'accident_summary.pdf');
      toast.success('Bulk document generated successfully');
    } catch (error) {
      console.error('Error generating bulk document:', error);
      toast.error('Failed to generate bulk document');
    }
  };

if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccidentHeader
        onSearch={setSearchQuery}
        onImport={() => {}}
        onExport={() => {}}
        onAdd={handleAdd}
        onStatusFilterChange={setStatusFilter}
        onGeneratePDF={handleGenerateBulkDocument}
        accidents={accidents} // Pass the accidents array for summary calculations
      />

      <AccidentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        claimStatusFilter={claimStatusFilter}
        onClaimStatusFilterChange={setClaimStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <AccidentTable
        accidents={filteredAccidents}
        vehicles={vehicles}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(accident) => {
          setSelectedAccident(accident);
          setShowDeleteModal(true);
        }}
        onGenerateDocument={() => {}}
        onViewDocument={() => {}}
      />

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Report Accident"
      >
        <AccidentClaimForm onClose={() => setShowAddModal(false)} />
      </Modal>

      {/* View Modal */}
      {selectedAccident && (
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAccident(null);
          }}
          title="Accident Details"
        >
          <AccidentClaimView accident={selectedAccident} />
        </Modal>
      )}

      {/* Edit Modal */}
      {selectedAccident && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccident(null);
          }}
          title="Edit Accident"
        >
          <AccidentClaimEdit
            accident={selectedAccident}
            onClose={() => {
              setShowEditModal(false);
              setSelectedAccident(null);
            }}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedAccident && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAccident(null);
          }}
          title="Delete Accident"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete this accident? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccident(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => selectedAccident && handleDelete(selectedAccident)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Accidents;