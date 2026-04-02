// src/pages/Claims.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, FileText, Download, Search, ChevronDown, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { moveToTrash } from '../utils/trashService';
import Modal from '../components/ui/Modal';
import ClaimSummaryCards from '../components/claims/ClaimSummaryCards';
import ClaimTable from '../components/claims/ClaimTable';
import ClaimForm from '../components/claims/ClaimForm';
import ClaimEditModal from '../components/claims/ClaimEditModal';
import ClaimDetailsModal from '../components/claims/ClaimDetailsModal';
import NotesModal from '../components/claims/NotesModal';
import ClaimDeleteModal from '../components/claims/ClaimDeleteModal';
import ProgressUpdateModal from '../components/claims/ProgressUpdateModal';

import { usePermissions } from '../hooks/usePermissions';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { useAuth } from '../context/AuthContext';

import { PROGRESS_OPTIONS, deriveDisplayStatus } from '../utils/claimProgress';

import {
  collection,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

import { ensureValidDate } from '../utils/dateHelpers';
import { format } from 'date-fns';
import { exportToExcel } from '../utils/excel';

import {
  generateAndUploadDocument,
  generateBulkDocuments,
} from '../utils/documentGenerator';
import { ClaimDocument, ClaimBulkDocument } from '../components/pdf/documents';

import { Claim } from '../types';

/* ──────────────────────────────────────────────────────────────
   Inline, dependency-free Searchable Multi-Select (All Progress)
────────────────────────────────────────────────────────────── */
type Option = { label: string; value: string };
const SearchableMultiSelect: React.FC<{
  options: Option[];
  value: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}> = ({ options, value, onChange, placeholder = 'Filter by progress…' }) => {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, queryText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];
    onChange(next);
  };

  const clearOne = (val: string) => onChange(value.filter((v) => v !== val));
  const clearAll = () => onChange([]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-[40px] px-3 py-2 border border-gray-300 rounded-md flex items-center justify-between text-left"
      >
        <span className="text-sm text-gray-700">
          {value.length === 0 ? placeholder : `${value.length} selected`}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {value.slice(0, 6).map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v;
            return (
              <span
                key={v}
                className="inline-flex items-center text-xs bg-gray-100 border rounded px-2 py-1"
              >
                {label}
                <button
                  className="ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => clearOne(v)}
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          {value.length > 6 && (
            <span className="text-xs text-gray-500">+{value.length - 6} more</span>
          )}
          <button className="ml-2 text-xs underline text-gray-600" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search progress…"
              className="w-full px-2 py-1.5 text-sm border rounded outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
            ) : (
              filtered.map((o) => {
                const checked = value.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-gray-800">{o.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */

type ShowFilter =
  | 'Default'
  | 'Claim Completed - Record Archived'
  | 'Claim Withdrawn by Client'
  | 'Claim Rejected - Insufficient Evidence'
  | 'ALL';

const SHOW_OPTIONS: { label: string; value: ShowFilter }[] = [
  { label: 'Default', value: 'Default' },
  { label: 'Claim Completed - Record Archived', value: 'Claim Completed - Record Archived' },
  { label: 'Claim Withdrawn by Client', value: 'Claim Withdrawn by Client' },
  { label: 'Claim Rejected - Insufficient Evidence', value: 'Claim Rejected - Insufficient Evidence' },
  { label: 'ALL', value: 'ALL' },
];

// Default hides only these terminal states
const HIDDEN_IN_DEFAULT = new Set<ShowFilter>([
  'Claim Completed - Record Archived',
  'Claim Withdrawn by Client',
  'Claim Rejected - Insufficient Evidence',
]);

const Claims: React.FC = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  // raw list
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // UI filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [submitterFilter, setSubmitterFilter] = useState<'all' | string>('all');

  // NEW: Show filter
  const [showFilter, setShowFilter] = useState<ShowFilter>('Default');

  // NEW: All Progress searchable multi-select
  // AFTER: always use the derived/latest status for safety
  const allProgressOptions: Option[] = useMemo(() => {
    const union = new Set<string>(PROGRESS_OPTIONS);
    claims.forEach((c) => {
      const p = deriveDisplayStatus(c);
      if (p) union.add(String(p));
    });
    return Array.from(union)
      .sort()
      .map((p) => ({ label: p, value: p }));
  }, [claims]);

  const [selectedProgresses, setSelectedProgresses] = useState<string[]>([]);

  // modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<Claim | null>(null);
  const [notesFor, setNotesFor] = useState<Claim | null>(null);

  // subscribe once (normalized)
  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          ...raw,
          submittedAt: ensureValidDate(raw.submittedAt),
          updatedAt: ensureValidDate(raw.updatedAt),
          clientInfo: {
            ...raw.clientInfo,
            dateOfBirth: ensureValidDate(raw.clientInfo?.dateOfBirth),
          },
          incidentDetails: {
            ...raw.incidentDetails,
            date: ensureValidDate(raw.incidentDetails?.date),
          },
          notes: (raw.notes || []).map((n: any) => ({
            ...n,
            createdAt: ensureValidDate(n?.createdAt),
            dueDate: ensureValidDate(n?.dueDate),
          })),
          progressHistory: (raw.progressHistory || []).map((h: any) => ({
            ...h,
            date: ensureValidDate(h?.date),
          })),
        } as Claim;
      });
      setClaims(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // filtered + sorted
  const filteredClaims = useMemo(() => {
    let list = [...claims];

    // 0) search (client, phone, email, reg, TP)
    list = list.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const name = (c.clientInfo?.name || '').toLowerCase();
      const phone = c.clientInfo?.phone || '';
      const email = (c.clientInfo?.email || '').toLowerCase();
      const reg = (c.clientVehicle?.registration || '').toLowerCase();
      const clientRef = (c.clientRef || '').toLowerCase();
      const tpName = (c.thirdParty?.name || '').toLowerCase();
      const tpReg = (c.thirdParty?.registration || '').toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        reg.includes(q) ||
        clientRef.includes(q) ||
        tpName.includes(q) ||
        tpReg.includes(q)
      );
    });

    // 1) Show filter — AFTER: compare against the derived status
    list = list.filter((c) => {
      const status = deriveDisplayStatus(c) as ShowFilter | string;

      if (showFilter === 'Default') {
        return !HIDDEN_IN_DEFAULT.has(status as ShowFilter);
      }
      if (showFilter === 'ALL') {
        return true;
      }
      // specific
      return status === showFilter;
    });

    // 2) All Progress multi-select — AFTER: use derived status
    if (selectedProgresses.length > 0) {
      const wanted = new Set(selectedProgresses);
      list = list.filter((c) => wanted.has(deriveDisplayStatus(c)));
    }

    // 3) type + submitter filters
    list = list.filter((c) => {
      if (typeFilter !== 'all' && c.claimType !== typeFilter) return false;
      if (submitterFilter !== 'all' && c.submitterType !== submitterFilter) return false;
      return true;
    });

    // 4) sort by updatedAt ascending (as in your original)
    return list.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }, [claims, searchQuery, showFilter, selectedProgresses, typeFilter, submitterFilter]);

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
  if (!selectedClaim) return;
  try {
    const displayName = selectedClaim.clientRef 
      ? `Claim Ref: ${selectedClaim.clientRef}` 
      : `Claim #${selectedClaim.claimId || selectedClaim.id.slice(-8).toUpperCase()}`;

    // OLD: await deleteDoc(doc(db, 'claims', selectedClaim.id));
    await moveToTrash(
      'claims', 
      selectedClaim.id, 
      selectedClaim, 
      user?.id || 'system', 
      displayName
    );

    toast.success('Claim moved to trash');
    setShowDeleteModal(false);
    setSelectedClaim(null);
  } catch (error) {
    console.error('Error deleting claim:', error);
    toast.error('Failed to delete claim');
  }
};

  const handleExport = () => {
    try {
      const exportData = claims.map((claim) => ({
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
        'Claim Reason': Array.isArray(claim.claimReason)
          ? claim.claimReason.join(', ')
          : claim.claimReason,
        'Case Progress': (claim as any).caseProgress,
        Status: deriveDisplayStatus(claim), // export what the user sees
        'Hire Details': claim.hireDetails
          ? `£${claim.hireDetails.totalCost} (${claim.hireDetails.daysOfHire} days)`
          : 'N/A',
        'Recovery Cost': claim.recovery ? `£${claim.recovery.cost}` : 'N/A',
        'Storage Cost': claim.storage ? `£${claim.storage.totalCost}` : 'N/A',
        'AIE Handler': claim.fileHandlers.aieHandler,
        'Legal Handler': claim.fileHandlers.legalHandler,
        'Submitted At': format(claim.submittedAt, 'dd/MM/yyyy HH:mm'),
        'Last Updated': format(claim.updatedAt, 'dd/MM/yyyy HH:mm'),
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

    const normalized: Claim = {
      ...c,
      claimReason: Array.isArray(c.claimReason) ? c.claimReason : [c.claimReason as any],
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
      const blob = await generateBulkDocuments(ClaimBulkDocument, filteredClaims, companyDetails);
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

      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Claims</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can('claims', 'export') && (
            <button
              onClick={handleGenerateBulkPDF}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">PDF</span>
              <span className="hidden sm:inline">&nbsp;Bulk</span>
            </button>
          )}

          {can('claims', 'export') && (
            <button
              onClick={handleExport}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Export</span>
            </button>
          )}

          {can('claims', 'create') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Add</span>
              <span className="hidden sm:inline">&nbsp;Claim</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, phone, email, reg, TP name/reg…"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>

          {/* Show filter */}
          <div className="flex sm:justify-end">
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value as ShowFilter)}
              className="block w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              {SHOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second row: All Progress + Type + Submitter */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              All Progress (searchable)
            </label>
            <SearchableMultiSelect
              options={allProgressOptions}
              value={selectedProgresses}
              onChange={setSelectedProgresses}
              placeholder="Filter by progress…"
            />
            <p className="text-xs text-gray-500 mt-1">
              Pick one or more progress values. Combined with “Show”.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select w-full"
            >
              <option value="all">All Types</option>
              <option value="Domestic">Domestic</option>
              <option value="Taxi">Taxi</option>
              <option value="PI">PI</option>
              <option value="PCO">PCO</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Submitter</label>
            <select
              value={submitterFilter}
              onChange={(e) => setSubmitterFilter(e.target.value)}
              className="form-select w-full"
            >
              <option value="all">All Submitters</option>
              <option value="company">Company</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>
      </div>

      {/* table */}
      <ClaimTable
        claims={filteredClaims}
        onView={(c) => setSelectedClaim(c)}
        onEdit={(c) => {
          setSelectedClaim(c);
          setShowEditModal(true);
        }}
        onDelete={(c) => {
          setSelectedClaim(c);
          setShowDeleteModal(true);
        }}
        onUpdateProgress={setUpdatingProgress}
        onGeneratePdf={handleGeneratePdf}
        onNotes={(c) => setNotesFor(c)}
      />

      {notesFor && (
        <NotesModal
          claimId={notesFor.id}
          existing={notesFor.notes || []}
          onClose={() => setNotesFor(null)}
          size="xl"
          onChange={() => {
            /* optional */
          }}
        />
      )}

      {/* Add */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Claim" size="xl">
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
        <Modal isOpen onClose={() => setSelectedClaim(null)} title="Claim Details" size="xl">
          <ClaimDetailsModal claim={selectedClaim} onDownloadDocument={(url) => window.open(url, '_blank')} />
        </Modal>
      )}

      {/* Progress */}
      {updatingProgress && (
        <Modal isOpen onClose={() => setUpdatingProgress(null)} size="xl" title="Update Progress">
          <ProgressUpdateModal
            claimId={updatingProgress.id}
            // keep prop parity with your existing codebase if needed:
            currentProgress={updatingProgress.progress as any}
            onClose={() => setUpdatingProgress(null)}
            onUpdate={() => {
              /* onSnapshot keeps in sync */
            }}
          />
        </Modal>
      )}

      {/* Delete */}
      {selectedClaim && showDeleteModal && (
        <Modal isOpen onClose={() => setShowDeleteModal(false)} title="Delete Claim">
          <div className="space-y-4">
            <p>Are you sure you want to delete this claim?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-md border">
                Cancel
              </button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-md bg-red-600 text-white">
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
