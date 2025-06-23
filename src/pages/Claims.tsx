// src/pages/Claims.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Download, Search } from 'lucide-react';

import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import ClaimSummaryCards from '../components/claims/ClaimSummaryCards';
import ClaimTable from '../components/claims/ClaimTable';
import ClaimForm from '../components/claims/ClaimForm';
import ClaimEditModal from '../components/claims/ClaimEditModal';
import ClaimDetailsModal from '../components/claims/ClaimDetailsModal';
import  NotesModal from '../components/claims/NotesModal';
import ClaimDeleteModal from '../components/claims/ClaimDeleteModal';
import ProgressUpdateModal from '../components/claims/ProgressUpdateModal';
import { usePermissions } from '../hooks/usePermissions';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { useAuth } from '../context/AuthContext';

import { getDoc } from 'firebase/firestore';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ensureValidDate } from '../utils/dateHelpers';
import { format } from 'date-fns';
import { exportToExcel } from '../utils/excel';
import {
  generateAndUploadDocument,
  generateBulkDocuments
} from '../utils/documentGenerator';
import { ClaimDocument, ClaimBulkDocument } from '../components/pdf/documents';
import { Claim } from '../types';

const Claims: React.FC = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  // raw list
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // UI filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [submitterFilter, setSubmitterFilter] = useState<'all' | string>('all');
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  // modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<Claim | null>(null);
  const [notesFor, setNotesFor] = useState<Claim | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          // … your other converted fields …
          notes: (raw.notes || []).map((n: any) => ({
            ...n,
            createdAt: n.createdAt.toDate(),
            dueDate:    n.dueDate.toDate(),
          })),
        } as Claim;
      });
      setClaims(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // subscribe once
  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          ...raw,
          submittedAt: ensureValidDate(raw.submittedAt),
          updatedAt: ensureValidDate(raw.updatedAt),
          clientInfo: {
            ...raw.clientInfo,
            dateOfBirth: ensureValidDate(raw.clientInfo.dateOfBirth)
          },
          incidentDetails: {
            ...raw.incidentDetails,
            date: ensureValidDate(raw.incidentDetails.date)
          },
          progressHistory: (raw.progressHistory || []).map((h: any) => ({
            ...h,
            date: ensureValidDate(h.date)
          }))
        } as Claim;
      });
      setClaims(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // filtered + sorted
  const filteredClaims = useMemo(() => {
    return claims
      // 1) completed toggle
      .filter(c =>
        showCompletedOnly
          ? c.progress === 'Claim Completed - Record Archived' // Use the new "Completed" status
          : c.progress !== 'Claim Completed - Record Archived' // Use the new "Completed" status
      )
      // 2) search/status/type/submitter
      .filter(c => {
        const q = searchQuery.toLowerCase();
        if (
          !(
            c.clientInfo.name.toLowerCase().includes(q) ||
            c.clientInfo.phone.includes(q) ||
            c.clientInfo.email.toLowerCase().includes(q) ||
            // Ensure clientVehicle and its registration exist before accessing
            (c.clientVehicle?.registration || '').toLowerCase().includes(q) ||
            (c.clientRef || '').toLowerCase().includes(q) ||
             // Ensure thirdParty and its properties exist
            (c.thirdParty?.name || '').toLowerCase().includes(q) ||
            (c.thirdParty?.registration || '').toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        // This filter logic is correct and will work with the new string values
        if (statusFilter !== 'all' && c.progress !== statusFilter) return false;
        if (typeFilter !== 'all' && c.claimType !== typeFilter) return false;
        if (
          submitterFilter !== 'all' &&
          c.submitterType !== submitterFilter
        )
          return false;
        return true;
      })
      // 3) sort by `updatedAt` ascending (oldest first)
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }, [
    claims,
    showCompletedOnly,
    searchQuery,
    statusFilter,
    typeFilter,
    submitterFilter
  ]);

  const handleView = (c: Claim) => setSelectedClaim(c);
  const handleEdit = (c: Claim) => {
    setSelectedClaim(c);
    setShowEditModal(true);
  };
  const handleDelete = (c: Claim) => {
    setSelectedClaim(c);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedClaim?.id) return;
    try {
      await deleteDoc(doc(db, 'claims', selectedClaim.id));
      toast.success('Claim deleted');
      setShowDeleteModal(false);
      setSelectedClaim(null);
    } catch {
      toast.error('Failed to delete claim');
    }
  };

  const handleExport = () => {
    try {
      const exportData = claims.map(claim => ({
        Reference: `AIE-${claim.id.slice(-8).toUpperCase()}`,
        'Client Ref': claim.clientRef || 'N/A',
        'Submitter Type': claim.submitterType,
        'Client Name': claim.clientInfo.name,
        'Client Phone': claim.clientInfo.phone,
        'Client Email': claim.clientInfo.email,
        'Vehicle Reg': claim.clientVehicle.registration,
        'Incident Date': format(claim.incidentDetails.date, 'dd/MM/yyyy'),
        'Incident Time': claim.incidentDetails.time,
        Location: claim.incidentDetails.location,
        'Third Party': claim.thirdParty.name,
        'Third Party Reg': claim.thirdParty.registration,
        'Claim Type': claim.claimType,
        'Claim Reason': claim.claimReason,
        'Case Progress': claim.caseProgress,
        Status: claim.progress,
        'Hire Details': claim.hireDetails
          ? `£${claim.hireDetails.totalCost} (${claim.hireDetails.daysOfHire} days)`
          : 'N/A',
        'Recovery Cost': claim.recovery ? `£${claim.recovery.cost}` : 'N/A',
        'Storage Cost': claim.storage
          ? `£${claim.storage.totalCost}`
          : 'N/A',
        'AIE Handler': claim.fileHandlers.aieHandler,
        'Legal Handler': claim.fileHandlers.legalHandler,
        'Submitted At': format(claim.submittedAt, 'dd/MM/yyyy HH:mm'),
        'Last Updated': format(claim.updatedAt, 'dd/MM/yyyy HH:mm')
      }));
      exportToExcel(exportData, 'claims_export');
      toast.success('Claims exported successfully');
    } catch {
      toast.error('Failed to export claims');
    }
  };

  const handleGeneratePdf = async (c: Claim) => {
    if (!companyDetails) {
      return toast.error('Company details not found');
    }
  
    // Ensure claimReason is always an array
    const normalized: Claim = {
      ...c,
      claimReason: Array.isArray(c.claimReason)
        ? c.claimReason
        : [c.claimReason as any]  // cast if TS complains
    };
  
    try {
      const url = await generateAndUploadDocument(
        ClaimDocument,
        normalized,
        'claims',
        c.id!,
        'claims'
      );
      window.open(url, '_blank');
      toast.success('PDF generated and uploaded');
    } catch (err: any) {
      console.error('Error generating document:', err);
      toast.error(`Error generating document: ${err.message || err}`);
    }
  };

  const handleGenerateBulkPDF = async () => {
    if (!companyDetails) {
      return toast.error('Company details not found');
    }
    try {
      const blob = await generateBulkDocuments(
        ClaimBulkDocument,
        filteredClaims,
        companyDetails
      );
      saveAs(blob, 'claims_bulk.pdf');
      toast.success('Bulk PDF generated successfully');
    } catch {
      /* no-op */
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
        <ClaimSummaryCards claims={filteredClaims} />
      

      {/* top bar */}
      <div className="flex justify-between items-center">
        <label className="inline-flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showCompletedOnly}
            onChange={e => setShowCompletedOnly(e.target.checked)}
            className="form-checkbox"
          />
          <span>Show only completed</span>
        </label>

        <div className="flex space-x-2">
          {user?.role === 'manager' && (
          <button
            onClick={handleGenerateBulkPDF}
            className="inline-flex items-center px-4 py-2 border rounded"
          >
            <FileText className="mr-2" /> Bulk PDF
          </button>
          )}
          {user?.role === 'manager' && (
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border rounded"
          >
            <Download className="mr-2" /> Export
          </button>
          )}
          {can('claims', 'create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded"
            >
              <Plus className="mr-2" /> Add Claim
            </button>
          )}
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full pl-10 pr-3 py-2 border rounded"
          />
        </div>
       <select
  value={statusFilter}
  onChange={e => setStatusFilter(e.target.value)}
  className="border rounded px-2"
>
  <option value="all">All Progress</option>
  <option value="Your Claim Has Started">Your Claim Has Started</option>
  <option value="Client Contacted for Initial Statement">Client Contacted for Initial Statement</option>
  <option value="Accident Details Verified">Accident Details Verified</option>
  <option value="Report to Legal Team - Pending">Report to Legal Team - Pending</option>
  <option value="Legal Team Reviewing Claim">Legal Team Reviewing Claim</option>
  <option value="Client Documentation - Pending Submission">Client Documentation - Pending Submission</option>
  <option value="Additional Information - Requested from Client">Additional Information - Requested from Client</option>
  <option value="Client Failed to Respond">Client Failed to Respond</option>
  <option value="TPI (Third Party Insurer) - Notified and Awaiting Response">TPI (Third Party Insurer) - Notified and Awaiting Response</option>
  <option value="TPI Acknowledged Notification">TPI Acknowledged Notification</option>
  <option value="TPI Refuses to Deal with Claim">TPI Refuses to Deal with Claim</option>
  <option value="TPI Accepted Liability">TPI Accepted Liability</option>
  <option value="TPI Rejected Liability">TPI Rejected Liability</option>
  <option value="TPI Liability - 50/50 Split Under Review">TPI Liability - 50/50 Split Under Review</option>
  <option value="TPI Liability - 50/50 Split Agreed">TPI Liability - 50/50 Split Agreed</option>
  <option value="TPI Liability - Partial Split Under Review">TPI Liability - Partial Split Under Review</option>
  <option value="TPI Liability - Partial Split (Other Ratio Agreed)">TPI Liability - Partial Split (Other Ratio Agreed)</option>
  <option value="Liability Disputed - Awaiting Evidence from Client">Liability Disputed - Awaiting Evidence from Client</option>
  <option value="Liability Disputed - TPI Provided Counter Evidence">Liability Disputed - TPI Provided Counter Evidence</option>
  <option value="Liability Disputed - Under Legal Review">Liability Disputed - Under Legal Review</option>
  <option value="Liability Disputed - Witness Statement Requested">Liability Disputed - Witness Statement Requested</option>
  <option value="Liability Disputed - Expert Report Required">Liability Disputed - Expert Report Required</option>
  <option value="Liability Disputed - Negotiation Ongoing">Liability Disputed - Negotiation Ongoing</option>
  <option value="Liability Disputed - No Agreement Reached">Liability Disputed - No Agreement Reached</option>
  <option value="Liability Disputed - Referred to Court">Liability Disputed - Referred to Court</option>
  <option value="Engineer Assigned">Engineer Assigned</option>
  <option value="Engineer Report - Pending Completion">Engineer Report - Pending Completion</option>
  <option value="Engineer Report - Completed">Engineer Report - Completed</option>
  <option value="Vehicle Damage Assessment - TPI Scheduled">Vehicle Damage Assessment - TPI Scheduled</option>
  <option value="Vehicle Inspection - Completed">Vehicle Inspection - Completed</option>
  <option value="Repair Authorisation - Awaiting Approval">Repair Authorisation - Awaiting Approval</option>
  <option value="Repair in Progress">Repair in Progress</option>
  <option value="Vehicle Repair - Completed">Vehicle Repair - Completed</option>
  <option value="Total Loss - Awaiting Valuation">Total Loss - Awaiting Valuation</option>
  <option value="Total Loss Offer - Made">Total Loss Offer - Made</option>
  <option value="Total Loss Offer - Accepted">Total Loss Offer - Accepted</option>
  <option value="Total Loss Offer - Disputed">Total Loss Offer - Disputed</option>
  <option value="Salvage Collected">Salvage Collected</option>
  <option value="Salvage Payment Received">Salvage Payment Received</option>
  <option value="Hire Vehicle - Arranged">Hire Vehicle - Arranged</option>
  <option value="Hire Period - Ongoing">Hire Period - Ongoing</option>
  <option value="Hire Vehicle - Off-Hired">Hire Vehicle - Off-Hired</option>
  <option value="Hire Invoice - Generated">Hire Invoice - Generated</option>
  <option value="Hire Pack - Successfully Submitted">Hire Pack - Successfully Submitted</option>
  <option value="VD Completed Hire Pack - Awaiting Review">VD Completed Hire Pack - Awaiting Review</option>
  <option value="TPI made VD offer - Ongoing">TPI made VD offer - Ongoing</option>
  <option value="VD Negotiation with TPI - Ongoing">VD Negotiation with TPI - Ongoing</option>
  <option value="VD payment Received - Prejudice basis">VD payment Received - Prejudice basis</option>
  <option value="VD payment Received - with VAT">VD payment Received - with VAT</option>
  <option value="VD payment Received - Without VAT">VD payment Received - Without VAT</option>
  <option value="PI Medical Report - Requested">PI Medical Report - Requested</option>
  <option value="PI Medical Report - Received">PI Medical Report - Received</option>
  <option value="PI Negotiation with TPI - Ongoing">PI Negotiation with TPI - Ongoing</option>
  <option value="Settlement Offer - Under Review">Settlement Offer - Under Review</option>
  <option value="Client Approval - Pending for Settlement">Client Approval - Pending for Settlement</option>
  <option value="Client Rejected Offer">Client Rejected Offer</option>
  <option value="Settlement Agreement - Finalized">Settlement Agreement - Finalized</option>
  <option value="Legal Notice - Issued to Third Party">Legal Notice - Issued to Third Party</option>
  <option value="Court Proceedings - Initiated">Court Proceedings - Initiated</option>
  <option value="Court Hearing - Awaiting Date">Court Hearing - Awaiting Date</option>
  <option value="Court Hearing - Completed">Court Hearing - Completed</option>
  <option value="Judgement in Favour">Judgement in Favour</option>
  <option value="Judgement Against">Judgement Against</option>
  <option value="Claim - Referred to MIB (Motor Insurers' Bureau)">Claim - Referred to MIB (Motor Insurers' Bureau)</option>
  <option value="MIB Claim - Initial Review in Progress">MIB Claim - Initial Review in Progress</option>
  <option value="MIB Claim - Under Review/In Progress">MIB Claim - Under Review/In Progress</option>
  <option value="Awaiting MIB Response/Decision">Awaiting MIB Response/Decision</option>
  <option value="MIB - Completed (Outcome Received)">MIB - Completed (Outcome Received)</option>
  <option value="Payment Processing - Initiated">Payment Processing - Initiated</option>
  <option value="Final Payment - Received and Confirmed">Final Payment - Received and Confirmed</option>
  <option value="Client Payment Disbursed">Client Payment Disbursed</option>
  <option value="Claim Withdrawn by Client">Claim Withdrawn by Client</option>
  <option value="Claim Rejected - Insufficient Evidence">Claim Rejected - Insufficient Evidence</option>
  <option value="Claim Suspended - Pending Client Action">Claim Suspended - Pending Client Action</option>
  <option value="Claim Completed - Record Archived">Claim Completed - Record Archived</option>
</select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border rounded px-2"
        >
          <option value="all">All Types</option>
          <option value="Domestic">Domestic</option>
          <option value="Taxi">Taxi</option>
          <option value="PI">PI</option>
          <option value="PCO">PCO</option>
        </select>
        <select
          value={submitterFilter}
          onChange={e => setSubmitterFilter(e.target.value)}
          className="border rounded px-2"
        >
          <option value="all">All Submitters</option>
          <option value="company">Company</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* table */}
      <ClaimTable
        claims={filteredClaims}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUpdateProgress={setUpdatingProgress}
        onGeneratePdf={handleGeneratePdf}
        onNotes={c => setNotesFor(c)}
      />

      {notesFor && (
       <NotesModal
         claimId={notesFor.id}
         existing={notesFor.notes || []}
         onClose={() => setNotesFor(null)}
         size="xl"
         onChange={() => {
           // optional: re-fetch this claim if you need latest `.notes`
         }}
       />
     )}

      {/* Add */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Claim"
        size="xl"
      >
        <ClaimForm onClose={() => setShowAddModal(false)} />
      </Modal>

      {/* Edit */}
      {selectedClaim && showEditModal && (
        <Modal
          isOpen
          onClose={() => {
            setShowEditModal(false);
            setSelectedClaim(null);
          }}
          title="Edit Claim"
          size="xl"
        >
          <ClaimEditModal
            key={selectedClaim.id}
            claim={selectedClaim}
            onClose={() => {
              setShowEditModal(false);
              setSelectedClaim(null);
            }}
          />
        </Modal>
      )}

      {/* View */}
      {selectedClaim && !showEditModal && !showDeleteModal && (
        <Modal
          isOpen
          onClose={() => setSelectedClaim(null)}
          title="Claim Details"
          size="xl"
        >
          <ClaimDetailsModal
            claim={selectedClaim}
            onDownloadDocument={url => window.open(url, '_blank')}
          />
        </Modal>
      )}

      {/* Progress */}
      {updatingProgress && (
        <Modal
          isOpen
          onClose={() => setUpdatingProgress(null)}
          size="xl"
          title="Update Progress"
        >
          <ProgressUpdateModal
            claimId={updatingProgress.id}
            currentProgress={updatingProgress.progress}
            onClose={() => setUpdatingProgress(null)}
            onUpdate={() => {/* refetch happens automatically */}}
          />
        </Modal>
      )}

      {/* Delete */}
      {selectedClaim && showDeleteModal && (
        <Modal
          isOpen
          onClose={() => setShowDeleteModal(false)}
          title="Delete Claim"
        >
          <div className="space-y-4">
            <p>Are you sure you want to delete this claim?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-md border"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
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

export default Claims;
