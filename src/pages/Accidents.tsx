import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useAccidents } from '../hooks/useAccidents';
import { useAccidentFilters } from '../hooks/useAccidentFilters';
import AccidentClaimTable from '../components/accidents/AccidentClaimTable';
import AccidentClaimForm from '../components/accidents/AccidentClaimForm';
import AccidentClaimView from '../components/accidents/AccidentClaimView';
import AccidentClaimEdit from '../components/accidents/AccidentClaimEdit';
import AccidentFilters from '../components/accidents/AccidentFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excel';
import { usePermissions } from '../hooks/usePermissions';
import { Accident } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useVehiclesContext } from '../utils/VehicleProvider';

import { useAuth } from '../context/AuthContext';

const Accidents = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { accidents, loading: accidentsLoading } = useAccidents();
  const { can } = usePermissions(); // Add this hook
  const { user } = useAuth();
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

  const [showForm, setShowForm] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);
  const [editingAccident, setEditingAccident] = useState<Accident | null>(null);
  const [deletingAccident, setDeletingAccident] = useState<Accident | null>(null);

  const handleExport = () => {
  const exportData = accidents.map(accident => ({
    'Reference No': accident.referenceNo,
    'Reference Name': accident.referenceName,
    // Driver Details
    'Driver Name': accident.driverName,
    'Driver Address': accident.driverAddress,
    'Driver Post Code': accident.driverPostCode,
    'Driver DOB': accident.driverDOB,
    'Driver Phone': accident.driverPhone,
    'Driver Mobile': accident.driverMobile,
    'Driver NIN': accident.driverNIN,
    // Vehicle Details
    'Vehicle Make': accident.vehicleMake,
    'Vehicle Model': accident.vehicleModel,
    'Vehicle VRN': accident.vehicleVRN,
    'Insurance Company': accident.insuranceCompany,
    'Policy Number': accident.policyNumber,
    'Policy Excess': accident.policyExcess,
    // Accident Details
    'Date': accident.accidentDate,
    'Time': accident.accidentTime,
    'Location': accident.accidentLocation,
    'Description': accident.description,
    'Damage Details': accident.damageDetails,
    // Status Information
    'Status': accident.status,
    'Type': accident.type || 'Pending',
    // Timestamps
    'Submitted At': new Date(accident.submittedAt).toLocaleString(),
    'Updated At': new Date(accident.updatedAt).toLocaleString()
  }));

  exportToExcel(exportData, 'accidents');
  toast.success('Accidents exported successfully');
};

  const handleDelete = async (accident: Accident) => {
    try {
      await deleteDoc(doc(db, 'accidents', accident.id));
      toast.success('Accident record deleted successfully');
      setDeletingAccident(null);
    } catch (error) {
      console.error('Error deleting accident:', error);
      toast.error('Failed to delete accident record');
    }
  };

  if (vehiclesLoading || accidentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
        <div className="flex space-x-2">
        {user?.role === 'manager' && (
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
        )}
          {can('accidents', 'create') && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Report Accident
              </button>
            </>
          )}
        </div>
      </div>

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

      <AccidentClaimTable
        accidents={filteredAccidents}
        vehicles={vehicles}
        onView={setSelectedAccident}
        onEdit={setEditingAccident}
        onDelete={setDeletingAccident}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Report Accident"
        size="xl"
      >
        <AccidentClaimForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedAccident}
        onClose={() => setSelectedAccident(null)}
        title="Accident Details"
        size="lg"
      >
        {selectedAccident && (
          <AccidentClaimView
            accident={selectedAccident}
            vehicle={vehicles.find(v => v.id === selectedAccident.vehicleId)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingAccident}
        onClose={() => setEditingAccident(null)}
        title="Edit Accident"
      >
        {editingAccident && (
          <AccidentClaimEdit
            accident={editingAccident}
            onClose={() => setEditingAccident(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingAccident}
        onClose={() => setDeletingAccident(null)}
        title="Delete Accident Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this accident record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingAccident(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingAccident && handleDelete(deletingAccident)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Accidents;