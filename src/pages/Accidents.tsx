// src/pages/Accidents.tsx
import React, { useState } from 'react';
import { useAccidents } from '../hooks/useAccidents';

import { useAccidentFilters } from '../hooks/useAccidentFilters';

import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { AccidentDocument, AccidentBulkDocument } from '../components/pdf/documents';
import { exportFleetClaimExperiencePDF } from '../utils/exportFleetExperiencePDF';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { saveAs } from 'file-saver';


import AccidentHeader from '../components/accidents/AccidentHeader';
import AccidentFilters from '../components/accidents/AccidentFilters';
import AccidentTable from '../components/accidents/AccidentClaimTable';
import AccidentClaimForm from '../components/accidents/AccidentClaimForm';
import AccidentClaimView from '../components/accidents/AccidentClaimView';
import AccidentClaimEdit from '../components/accidents/AccidentClaimEdit';
import StatusUpdateModal from '../components/accidents/StatusUpdateModal'; 
import PostReportInsuranceModal from '../components/accidents/PostReportInsuranceModal';
import { DriverRiskDashboard } from '../components/accidents/DriverRiskDashboard';
import { useCustomers } from '../hooks/useCustomers';
import { ClipboardList, ShieldAlert } from 'lucide-react';

import Modal from '../components/ui/Modal';
import { useVehicles } from '../hooks/useVehicles';
import { Accident } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Accidents = () => {
  const { accidents, loading } = useAccidents();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const { companyDetails } = useCompanyDetails();
  const [activeTab, setActiveTab] = useState<'claims' | 'risk_analysis'>('claims');
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
  const [showStatusModal, setShowStatusModal] = useState(false); 
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);

  // const [showResolvedOnly, setShowResolvedOnly] = useState(false);

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

  const handleUpdateStatus = (accident: Accident) => {
    setSelectedAccident(accident);
    setShowStatusModal(true);
  };

  const handleUpdateInsurance = (accident: Accident) => {
    setSelectedAccident(accident);
    setShowInsuranceModal(true);
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
      await exportFleetClaimExperiencePDF({
        accidents,
        sourceClaim: accident,
        companyDetails,
        customers,
        highlightedAccidentId: accident.id,
      });
    } catch (error) {
      console.error('Error generating fleet claim experience document:', error);
      toast.error('Failed to export Fleet Claim Experience Report');
    }
  };

  const handleExportFleetExperiencePDF = async () => {
    try {
      await exportFleetClaimExperiencePDF({
        accidents,
        companyDetails,
        customers,
      });
    } catch (error) {
      console.error('Error generating fleet claim experience document:', error);
      toast.error('Failed to export Fleet Claim Experience Report');
    }
  };

  const handleGenerateBulkDocument = async () => {
    await handleExportFleetExperiencePDF();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Hide 'resolved' records when viewing 'all'. 
  // If a specific filter (like 'resolved') is selected, useAccidentFilters handles it.
  const displayedAccidents = statusFilter === 'all' 
    ? filteredAccidents.filter(a => a.status !== 'resolved')
    : filteredAccidents;

  return (
    <div className="space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'claims'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>Claims Register</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-200 text-gray-800 font-bold">
              {displayedAccidents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('risk_analysis')}
            className={`flex items-center space-x-2 py-2 px-4 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'risk_analysis'
                ? 'bg-white text-rose-900 shadow-xs ring-1 ring-rose-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Driver Risk &amp; Renewal Analysis</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-black uppercase tracking-wider">
              18 Dec Renewal
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'claims' ? (
        <>
          <AccidentHeader
            onSearch={setSearchQuery}
            onImport={() => {}}
            onExport={() => {}}
            onAdd={handleAdd}
            onStatusFilterChange={setStatusFilter}
            onGeneratePDF={handleGenerateBulkDocument}
            onExportFleetExperiencePDF={handleExportFleetExperiencePDF}
            accidents={displayedAccidents}
            activeTab={activeTab}
            onTabChange={setActiveTab}
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
            accidents={displayedAccidents}
            vehicles={vehicles}
            onView={handleView}
            onEdit={handleEdit}
            onUpdateStatus={handleUpdateStatus} 
            onUpdateInsurance={handleUpdateInsurance}
            onDelete={acc => {
              setSelectedAccident(acc);
              setShowDeleteModal(true);
            }}
            onGenerateDocument={handleGenerateDocument}
            onViewDocument={url => window.open(url, '_blank')}
          />
        </>
      ) : (
        <DriverRiskDashboard
          accidents={accidents}
          customers={customers}
          onViewAccident={handleView}
        />
      )}


      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Report Accident"
        size="xl"
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
          size="xl"
        >
          <AccidentClaimView accident={selectedAccident} />
        </Modal>
      )}

      {/* Post-Report Insurance Data Modal */}
      {selectedAccident && (
        <Modal
          isOpen={showInsuranceModal}
          onClose={() => {
            setShowInsuranceModal(false);
            setSelectedAccident(null);
          }}
          title="Post-Report Insurance Data"
          size="xl"
        >
          <PostReportInsuranceModal
            accident={selectedAccident}
            onClose={() => {
              setShowInsuranceModal(false);
              setSelectedAccident(null);
            }}
          />
        </Modal>
      )}

      {/* Status Update Modal */}
      {selectedAccident && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedAccident(null);
          }}
          title="Update Status"
          size="md"
        >
          <StatusUpdateModal
            accident={selectedAccident}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedAccident(null);
            }}
          />
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
          size="xl"
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