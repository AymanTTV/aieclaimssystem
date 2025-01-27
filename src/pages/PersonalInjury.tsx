import React, { useState } from 'react';
import { usePersonalInjuries } from '../hooks/usePersonalInjuries';
import PersonalInjuryTable from '../components/personalInjury/PersonalInjuryTable';
import PersonalInjuryForm from '../components/personalInjury/PersonalInjuryForm';
import PersonalInjuryDetails from '../components/personalInjury/PersonalInjuryDetails';
import PersonalInjuryFilters from '../components/personalInjury/PersonalInjuryFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excel';
import type { PersonalInjury as PersonalInjuryType } from '../types/personalInjury';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import PersonalInjuryStatusModal from '../components/personalInjury/PersonalInjuryStatusModal';
import { useAuth } from '../context/AuthContext';



const PersonalInjuryPage = () => {
  const { injuries, loading } = usePersonalInjuries();
  const { can } = usePermissions();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [updatingStatus, setUpdatingStatus] = useState<PersonalInjuryType | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  

  const [showForm, setShowForm] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState<PersonalInjuryType | null>(null);
  const [editingInjury, setEditingInjury] = useState<PersonalInjuryType | null>(null);
  const [deletingInjury, setDeletingInjury] = useState<PersonalInjuryType | null>(null);


  

  const handleExport = () => {
    const exportData = injuries.map(injury => ({
      'Full Name': injury.fullName,
      'Date of Birth': injury.dateOfBirth.toLocaleDateString(),
      'Contact Number': injury.contactNumber,
      'Email': injury.emailAddress,
      'Incident Date': injury.incidentDate.toLocaleDateString(),
      'Incident Time': injury.incidentTime,
      'Location': injury.incidentLocation,
      'Status': injury.status,
      'Created At': injury.createdAt.toLocaleDateString()
    }));

    exportToExcel(exportData, 'personal_injuries');
    toast.success('Personal injuries exported successfully');
  };

  const handleDelete = async (injury: PersonalInjury) => {
    try {
      await deleteDoc(doc(db, 'personalInjuries', injury.id));
      toast.success('Record deleted successfully');
      setDeletingInjury(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const filteredInjuries = injuries.filter(injury => {

    const matchesSearch = 
      injury.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      injury.emailAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      injury.contactNumber.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || injury.status === statusFilter;

    let matchesDateRange = true;
    if (dateRange.start && dateRange.end) {
      matchesDateRange = injury.incidentDate >= dateRange.start && 
                        injury.incidentDate <= dateRange.end;
    }

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Personal Injury Claims</h1>
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

          {can('claims', 'create') && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Claim
              </button>
            </>
          )}
        </div>
      </div>

      <PersonalInjuryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

<PersonalInjuryTable
  injuries={filteredInjuries}
  onView={setSelectedInjury}
  onEdit={setEditingInjury}
  onDelete={setDeletingInjury}
  onUpdateStatus={setUpdatingStatus} // Add this line
/>

      {/* Modals */}

      <Modal
  isOpen={!!updatingStatus}
  onClose={() => setUpdatingStatus(null)}
  title="Update Status"
>
  {updatingStatus && (
    <PersonalInjuryStatusModal
      injury={updatingStatus}
      onClose={() => setUpdatingStatus(null)}
    />
  )}
</Modal>
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Personal Injury Claim"
        size="xl"
      >
        <PersonalInjuryForm onClose={() => setShowForm(false)} />
      </Modal>


      <Modal
        isOpen={!!selectedInjury}
        onClose={() => setSelectedInjury(null)}
        title="Personal Injury Details"
        size="lg"
      >
        {selectedInjury && (
          <PersonalInjuryDetails injury={selectedInjury} />
        )}
      </Modal>

      <Modal
        isOpen={!!editingInjury}
        onClose={() => setEditingInjury(null)}
        title="Edit Personal Injury Claim"
        size="xl"
      >
        {editingInjury && (
          <PersonalInjuryForm
            injury={editingInjury}
            onClose={() => setEditingInjury(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingInjury}
        onClose={() => setDeletingInjury(null)}
        title="Delete Personal Injury Claim"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this personal injury claim? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingInjury(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingInjury && handleDelete(deletingInjury)}
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

export default PersonalInjuryPage;
