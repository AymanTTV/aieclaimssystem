import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Claim } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import ClaimTable from '../components/claims/ClaimTable';
import ClaimForm from '../components/claims/ClaimForm';
import ClaimDetailsModal from '../components/claims/ClaimDetailsModal';
import ClaimEditModal from '../components/claims/ClaimEditModal';
import ClaimDeleteModal from '../components/claims/ClaimDeleteModal';
import ProgressUpdateModal from '../components/claims/ProgressUpdateModal';
import Modal from '../components/ui/Modal';
import { Plus, Download, Search } from 'lucide-react';
import { exportToExcel } from '../utils/excel';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';


const Claims = () => {
  const { can } = usePermissions();
  const { user } = useAuth();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [submitterFilter, setSubmitterFilter] = useState('all'); // Add submitter filter
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<Claim | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<Claim | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const claimsRef = collection(db, 'claims');
      const q = query(claimsRef, orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      const claimsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          clientInfo: {
            ...data.clientInfo,
            dateOfBirth: data.clientInfo.dateOfBirth.toDate()
          },
          incidentDetails: {
            ...data.incidentDetails,
            date: data.incidentDetails.date.toDate()
          },
          progressHistory: data.progressHistory.map((progress: any) => ({
            ...progress,
            date: progress.date.toDate()
          }))
        } as Claim;
      });
      setClaims(claimsData);
    } catch (error) {
      console.error('Error fetching claims:', error);
      toast.error('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const exportData = claims.map(claim => ({
        'Reference': `AIE-${claim.id.slice(-8).toUpperCase()}`,
        'Client Ref': claim.clientRef || 'N/A',
        'Submitter Type': claim.submitterType,
        'Client Name': claim.clientInfo.name,
        'Client Phone': claim.clientInfo.phone,
        'Client Email': claim.clientInfo.email,
        'Vehicle Reg': claim.clientVehicle.registration,
        'Incident Date': format(claim.incidentDetails.date, 'dd/MM/yyyy'),
        'Incident Time': claim.incidentDetails.time,
        'Location': claim.incidentDetails.location,
        'Third Party': claim.thirdParty.name,
        'Third Party Reg': claim.thirdParty.registration,
        'Claim Type': claim.claimType,
        'Claim Reason': claim.claimReason,
        'Case Progress': claim.caseProgress,
        'Status': claim.progress,
        'Hire Details': claim.hireDetails ? `£${claim.hireDetails.totalCost} (${claim.hireDetails.daysOfHire} days)` : 'N/A',
        'Recovery Cost': claim.recovery ? `£${claim.recovery.cost}` : 'N/A',
        'Storage Cost': claim.storage ? `£${claim.storage.totalCost}` : 'N/A',
        'AIE Handler': claim.fileHandlers.aieHandler,
        'Legal Handler': claim.fileHandlers.legalHandler,
        'Submitted At': format(claim.submittedAt, 'dd/MM/yyyy HH:mm'),
        'Last Updated': format(claim.updatedAt, 'dd/MM/yyyy HH:mm')
      }));

      exportToExcel(exportData, 'claims_export');
      toast.success('Claims exported successfully');
    } catch (error) {
      console.error('Error exporting claims:', error);
      toast.error('Failed to export claims');
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.clientInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.clientInfo.phone.includes(searchQuery) ||
      claim.clientInfo.email.toLowerCase().includes(searchQuery) ||
      claim.clientVehicle.registration.toLowerCase().includes(searchQuery) ||
      claim.clientRef?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.thirdParty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.thirdParty.registration.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || claim.progress === statusFilter;
    const matchesType = typeFilter === 'all' || claim.claimType === typeFilter;
    const matchesSubmitter = submitterFilter === 'all' || claim.submitterType === submitterFilter;

    return matchesSearch && matchesStatus && matchesType && matchesSubmitter;
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Claims Management</h1>
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
                Add Claim
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="Your Claim Has Started">Claim Started</option>
          <option value="Reported to Legal Team">With Legal Team</option>
          <option value="Engineer Report Pending">Engineer Report</option>
          <option value="Awaiting TPI">Awaiting TPI</option>
          <option value="Claim in Progress">In Progress</option>
          <option value="Claim Complete">Completed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="Domestic">Domestic</option>
          <option value="Taxi">Taxi</option>
          <option value="PI">PI</option>
          <option value="PCO">PCO</option>
        </select>

        {/* Add Submitter Type Filter */}
        <select
          value={submitterFilter}
          onChange={(e) => setSubmitterFilter(e.target.value)}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Submitters</option>
          <option value="company">Company Fleet</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Claims Table */}
      <ClaimTable
        claims={filteredClaims}
        onView={setSelectedClaim}
        onEdit={setEditingClaim}
        onDelete={setDeletingClaim}
        onUpdateProgress={setUpdatingProgress}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Claim"
        size="xl"
      >
        <ClaimForm onClose={() => {
          setShowForm(false);
          fetchClaims();
        }} />
      </Modal>

      <Modal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title="Claim Details"
        size="xl"
      >
        {selectedClaim && (
          <ClaimDetailsModal
            claim={selectedClaim}
            onClose={() => setSelectedClaim(null)}
            onDownloadDocument={(url) => window.open(url, '_blank')}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!updatingProgress}
        onClose={() => setUpdatingProgress(null)}
        title="Update Progress"
      >
        {updatingProgress && (
          <ProgressUpdateModal
            claimId={updatingProgress.id}
            currentProgress={updatingProgress.progress}
            onClose={() => setUpdatingProgress(null)}
            onUpdate={fetchClaims}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingClaim}
        onClose={() => setEditingClaim(null)}
        title="Edit Claim"
        size="xl"
      >
        {editingClaim && (
          <ClaimEditModal
            claim={editingClaim}
            onClose={() => {
              setEditingClaim(null);
              fetchClaims();
            }}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingClaim}
        onClose={() => setDeletingClaim(null)}
        title="Delete Claim"
      >
        {deletingClaim && (
          <ClaimDeleteModal
            claimId={deletingClaim.id}
            onClose={() => {
              setDeletingClaim(null);
              fetchClaims();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default Claims;