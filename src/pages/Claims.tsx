// src/pages/Claims.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, Download, Search, Shield, Layers, Briefcase, Edit2, Trash2 } from 'lucide-react'; 
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
import ClaimCommunicationModal from '../components/claims/ClaimCommunicationModal';
import SearchableSelect from '../components/ui/SearchableSelect'; 

import ManageClaimGroupsModal from '../components/claims/ManageClaimGroupsModal';
import AssignClaimGroupModal from '../components/claims/AssignClaimGroupModal';
import ManageClaimDepartmentsModal from '../components/claims/ManageClaimDepartmentsModal';
import AssignClaimDepartmentModal from '../components/claims/AssignClaimDepartmentModal';

import { usePermissions } from '../hooks/usePermissions';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { useAuth } from '../context/AuthContext';

import { PROGRESS_OPTIONS, deriveDisplayStatus } from '../utils/claimProgress';

import { collection, query, onSnapshot, orderBy, updateDoc, getDocs, doc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';

import { ensureValidDate } from '../utils/dateHelpers';
import { format, differenceInDays } from 'date-fns';
import { exportToExcel } from '../utils/excel';

import {
  generateAndUploadDocument,
  generateBulkDocuments,
} from '../utils/documentGenerator';
import { ClaimDocument, ClaimBulkDocument } from '../components/pdf/documents';

import { Claim } from '../types';

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

const TYPE_OPTIONS = [
  { id: 'Domestic', label: 'Domestic' },
  { id: 'Taxi', label: 'Taxi' },
  { id: 'PI', label: 'PI' },
  { id: 'PCO', label: 'PCO' },
];

const SUBMITTER_OPTIONS = [
  { id: 'company', label: 'Company' },
  { id: 'client', label: 'Client' },
];

const REASON_OPTIONS = [
  { id: 'VD', label: 'Vehicle Damage (VD)' },
  { id: 'H', label: 'Hire (H)' },
  { id: 'S', label: 'Storage (S)' },
  { id: 'PI', label: 'Personal Injury (PI)' },
];

const HIDDEN_IN_DEFAULT = new Set<ShowFilter>([
  'Claim Completed - Record Archived',
  'Claim Withdrawn by Client',
  'Claim Rejected - Insufficient Evidence',
]);

const ClaimPermissionModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { user: currentUser } = useAuth(); 
  const [usersList, setUsersList] = useState<{ id: string; label: string }[]>([]);
  const [departmentsList, setDepartmentsList] = useState<{ id: string; label: string }[]>([]);
  const [usersWithAccess, setUsersWithAccess] = useState<any[]>([]); 
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUsersAndDepts = async () => {
    try {
      const [usersSnap, deptsSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'))),
        getDocs(collection(db, 'claimDepartments'))
      ]);
      
      const fetchedDepts = deptsSnap.docs.map((d) => ({
        id: d.id,
        label: d.data().name
      })).sort((a, b) => a.label.localeCompare(b.label));
      setDepartmentsList(fetchedDepts);

      const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const assignableUsers = allUsers
        .filter((u: any) => u.id !== currentUser?.id && u.role !== 'superadmin') 
        .map((u: any) => ({ 
          id: u.id, 
          label: `${u.name || u.email || u.id} (${u.role})` 
        }));
      setUsersList(assignableUsers);

      const activeAccessUsers = allUsers.filter((u: any) => u.claimAccess != null && u.role !== 'superadmin');
      setUsersWithAccess(activeAccessUsers);

    } catch (err) {
      console.error('Error fetching data for permissions:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndDepts();
    } else {
      setSelectedUsers([]);
      setSelectedDepartments([]);
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen, currentUser?.id]);

  const handleSave = async (clear: boolean = false) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user.');
      return;
    }

    setLoading(true);
    try {
      for (const uid of selectedUsers) {
        await updateDoc(doc(db, 'users', uid), {
          claimAccess: clear ? null : { 
            start: startDate || null, 
            end: endDate || null,
            departments: selectedDepartments.length > 0 ? selectedDepartments : null
          },
        });
      }
      toast.success(clear ? 'Permissions cleared.' : 'Permissions applied successfully.');
      
      setSelectedUsers([]);
      setSelectedDepartments([]);
      setStartDate('');
      setEndDate('');

      await fetchUsersAndDepts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccess = async (uid: string) => {
    if (!window.confirm('Are you sure you want to remove permissions for this user?')) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', uid), { claimAccess: null });
      toast.success('Permissions removed.');
      await fetchUsersAndDepts(); 
    } catch(err) {
      toast.error('Failed to remove permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccess = (user: any) => {
    setSelectedUsers([user.id]);
    setStartDate(user.claimAccess?.start || '');
    setEndDate(user.claimAccess?.end || '');
    setSelectedDepartments(user.claimAccess?.departments || []);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Records Permission" size="xl">
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Assign specific creation date boundaries and/or allowed departments for selected users. These users will ONLY be able to see records matching these conditions.
        </p>

        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Assign or Update Permissions</h3>
          
          <div>
            <SearchableSelect
              label="Select Users"
              options={usersList}
              value={selectedUsers}
              onChange={(val) => setSelectedUsers(val as string[])}
              isMulti={true}
              multiEmptyMode="empty"
              placeholder="Search and select users..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Allowed Departments (Optional)"
              options={departmentsList}
              value={selectedDepartments}
              onChange={(val) => setSelectedDepartments(val as string[])}
              isMulti={true}
              multiEmptyMode="empty"
              placeholder="Select allowed departments..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created After (Start Date)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created Before (End Date)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => handleSave(true)}
              disabled={loading || selectedUsers.length === 0}
              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
            >
              Clear for Selected
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Apply Permissions'}
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Current Active Permissions</h3>
          {usersWithAccess.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md text-center border border-gray-200">
              No users currently have restricted access.
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {usersWithAccess.map(u => {
                const acc = u.claimAccess;
                const deptNames = acc.departments && acc.departments.length > 0 
                  ? acc.departments.map((id: string) => departmentsList.find(d => d.id === id)?.label || 'Unknown').join(', ') 
                  : 'All Departments';
                
                return (
                  <div key={u.id} className="bg-white p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center border border-gray-200 shadow-sm gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{u.name || u.email} <span className="text-gray-400 text-xs font-normal">({u.role})</span></div>
                      <div className="text-xs text-gray-600 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <div><span className="font-semibold text-gray-500">From Date:</span> {acc.start || 'Any'}</div>
                        <div><span className="font-semibold text-gray-500">To Date:</span> {acc.end || 'Any'}</div>
                        <div className="sm:col-span-2"><span className="font-semibold text-gray-500">Depts Allowed:</span> {deptNames}</div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditAccess(u)} 
                        className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </button>
                      <button 
                        onClick={() => handleRemoveAccess(u.id)} 
                        className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    </Modal>
  );
};


const Claims: React.FC = () => {
  const { can, isManager, isAdmin } = usePermissions(); 
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // Group and Department Bulk Action State
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
  
  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [manageDepartmentsOpen, setManageDepartmentsOpen] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);

  // UI filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState<ShowFilter>('Default');
  const [selectedProgresses, setSelectedProgresses] = useState<string[]>([]);
  
  const [selectedGroupFilters, setSelectedGroupFilters] = useState<string[]>([]);
  const [selectedDepartmentFilters, setSelectedDepartmentFilters] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]); 
  const [selectedSubmitters, setSelectedSubmitters] = useState<string[]>([]);
  const [selectedAIEHandlers, setSelectedAIEHandlers] = useState<string[]>([]);
  const [selectedLegalHandlers, setSelectedLegalHandlers] = useState<string[]>([]);

  const [incidentDateStart, setIncidentDateStart] = useState<string>('');
  const [incidentDateEnd, setIncidentDateEnd] = useState<string>('');

  // Claim Communication Modal State
  const [commClaim, setCommClaim] = useState<Claim | null>(null);
  const [commChannel, setCommChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [commCategory, setCommCategory] = useState<'general' | 'progress' | 'legal_handler' | 'custom'>('general');
  const [commRecipient, setCommRecipient] = useState<'client' | 'legalHandler'>('client');

  const handleOpenWhatsApp = (c: Claim, recipient: 'client' | 'legalHandler' = 'client') => {
    setCommClaim(c);
    setCommChannel('whatsapp');
    setCommRecipient(recipient);
    setCommCategory(recipient === 'legalHandler' ? 'legal_handler' : 'general');
  };

  const handleOpenEmail = (c: Claim, recipient: 'client' | 'legalHandler' = 'client') => {
    setCommClaim(c);
    setCommChannel('email');
    setCommRecipient(recipient);
    setCommCategory(recipient === 'legalHandler' ? 'legal_handler' : 'general');
  };

  const allProgressOptions = useMemo(() => {
    const union = new Set<string>(PROGRESS_OPTIONS);
    claims.forEach((c) => {
      const p = deriveDisplayStatus(c);
      if (p) union.add(String(p));
    });
    return Array.from(union)
      .sort()
      .map((p) => ({ id: p, label: p }));
  }, [claims]);

  const aieHandlerOptions = useMemo(() => {
    const handlerMap = new Map<string, string>(); 
    
    claims.forEach((c) => {
      const rawHandler = c.fileHandlers?.aieHandler;
      if (rawHandler) {
        const normalizedId = rawHandler.trim().toLowerCase();
        if (!handlerMap.has(normalizedId)) {
          const displayLabel = rawHandler.trim().charAt(0).toUpperCase() + rawHandler.trim().slice(1).toLowerCase();
          handlerMap.set(normalizedId, displayLabel);
        }
      }
    });

    return Array.from(handlerMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ id, label }));
  }, [claims]);

  const legalHandlerOptions = useMemo(() => {
    const handlers = new Set<string>();
    claims.forEach((c) => {
      if (c.fileHandlers?.legalHandler?.name) handlers.add(c.fileHandlers.legalHandler.name);
    });
    return Array.from(handlers)
      .sort()
      .map((h) => ({ id: h, label: h }));
  }, [claims]);

  const groupOptions = useMemo(() => [
    { id: 'none', label: 'Unassigned (None)' },
    ...groups.map(g => ({ id: g.id, label: g.name }))
  ], [groups]);

  const deptOptions = useMemo(() => [
    { id: 'none', label: 'Unassigned (None)' },
    ...departments.map(d => ({ id: d.id, label: d.name }))
  ], [departments]);


  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false); 
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState<Claim | null>(null);
  const [notesFor, setNotesFor] = useState<Claim | null>(null);

  // Fetch Claims
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

  // Fetch Claim Groups
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'claimGroups'), (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  // Fetch Claim Departments
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'claimDepartments'), (snap) => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  // filtered + sorted
  const filteredClaims = useMemo(() => {
    let list = [...claims];

    const q = searchQuery.trim().toLowerCase();
    const hasSearch = q.length > 0;
    
    const claimAccess = (user as any)?.claimAccess;
    const hasCustomAccess = !!claimAccess && (claimAccess.start || claimAccess.end || (claimAccess.departments && claimAccess.departments.length > 0));
    const isManagerOrAdmin = isManager || isAdmin;

    // 0) search
    list = list.filter((c) => {
      if (!hasSearch) return true;
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

    // 1) 7-DAY HIDE LOGIC 
    if (!hasCustomAccess && !isManagerOrAdmin && !hasSearch) {
      list = list.filter((c) => {
        const status = deriveDisplayStatus(c);
        if (status === 'Claim Completed - Record Archived') return false;
        
        const daysSinceUpdate = differenceInDays(new Date(), c.updatedAt);
        if (daysSinceUpdate <= 7) return false;

        return true;
      });
    }

    // 1.5) APPLY CUSTOM PERMISSIONS
    if (hasCustomAccess) {
      list = list.filter((c) => {
        const claimDate = c.submittedAt;
        
        if (claimAccess.start || claimAccess.end) {
          if (!claimDate) return false; 
          if (claimAccess.start) {
            const s = new Date(claimAccess.start);
            s.setHours(0, 0, 0, 0);
            if (claimDate < s) return false;
          }
          if (claimAccess.end) {
            const e = new Date(claimAccess.end);
            e.setHours(23, 59, 59, 999);
            if (claimDate > e) return false;
          }
        }

        if (claimAccess.departments && claimAccess.departments.length > 0) {
          if (!c.departmentId || !claimAccess.departments.includes(c.departmentId)) {
            return false;
          }
        }
        
        return true;
      });
    }

    // 2) Show filter
    list = list.filter((c) => {
      const status = deriveDisplayStatus(c) as ShowFilter | string;
      if (showFilter === 'Default') return !HIDDEN_IN_DEFAULT.has(status as ShowFilter);
      if (showFilter === 'ALL') return true;
      return status === showFilter;
    });

    // 3) Progress
    if (selectedProgresses.length > 0) {
      const wanted = new Set(selectedProgresses);
      list = list.filter((c) => wanted.has(deriveDisplayStatus(c)));
    }

    // 4) Multi-selects & Groups & Departments
    list = list.filter((c) => {
      if (selectedGroupFilters.length > 0) {
        const gId = c.groupId || 'none';
        if (!selectedGroupFilters.includes(gId)) return false;
      }
      
      if (selectedDepartmentFilters.length > 0) {
        const dId = c.departmentId || 'none';
        if (!selectedDepartmentFilters.includes(dId)) return false;
      }

      if (selectedTypes.length > 0 && !selectedTypes.includes(c.claimType)) return false;
      
      if (selectedReasons.length > 0) {
        const claimReasons = Array.isArray(c.claimReason) ? c.claimReason : [c.claimReason].filter(Boolean);
        const matchesReason = selectedReasons.some((r) => claimReasons.includes(r as any));
        if (!matchesReason) return false;
      }

      if (selectedSubmitters.length > 0 && !selectedSubmitters.includes(c.submitterType)) return false;
      
      if (selectedAIEHandlers.length > 0) {
        const normalizedClaimHandler = (c.fileHandlers?.aieHandler || '').trim().toLowerCase();
        if (!selectedAIEHandlers.includes(normalizedClaimHandler)) return false;
      }
      
      if (selectedLegalHandlers.length > 0 && !selectedLegalHandlers.includes(c.fileHandlers?.legalHandler?.name || '')) return false;
      
      if (incidentDateStart) {
        const start = new Date(incidentDateStart);
        if (c.incidentDetails?.date < start) return false;
      }
      if (incidentDateEnd) {
        const end = new Date(incidentDateEnd);
        end.setHours(23, 59, 59, 999);
        if (c.incidentDetails?.date > end) return false;
      }

      return true;
    });

    // 5) Sort
    return list.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  }, [
    claims, searchQuery, showFilter, selectedProgresses, selectedTypes, selectedReasons, 
    selectedSubmitters, selectedAIEHandlers, selectedLegalHandlers, 
    incidentDateStart, incidentDateEnd, user, isManager, isAdmin, 
    selectedGroupFilters, selectedDepartmentFilters 
  ]);

  // Selection Handlers
  const handleToggleOne = (id: string) => {
    setSelectedClaimIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (checked: boolean, allIds: string[]) => {
    setSelectedClaimIds(checked ? new Set(allIds) : new Set());
  };

  const confirmDelete = async () => {
    if (!selectedClaim) return;
    try {
      const displayName = selectedClaim.clientRef 
        ? `Claim Ref: ${selectedClaim.clientRef}` 
        : `Claim #${selectedClaim.claimId || selectedClaim.id.slice(-8).toUpperCase()}`;

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
        'Group': claim.groupName || 'N/A',
        'Department': claim.departmentName || 'N/A',
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
        Status: deriveDisplayStatus(claim), 
        'Hire Details': claim.hireDetails
          ? `£${claim.hireDetails.totalCost} (${claim.hireDetails.daysOfHire} days)`
          : 'N/A',
        'Recovery Cost': claim.recovery ? `£${claim.recovery.cost}` : 'N/A',
        'Storage Cost': claim.storage ? `£${claim.storage.totalCost}` : 'N/A',
        'AIE Handler': claim.fileHandlers.aieHandler,
        'Legal Handler': claim.fileHandlers.legalHandler?.name || 'N/A',
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
          {can('claims', 'recordsPermission') && (
            <button
              onClick={() => setShowPermissionModal(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-indigo-200 rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Shield className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Records</span>
              <span className="hidden sm:inline">&nbsp;Permission</span>
            </button>
          )}

          {can('claims', 'groups') && (
            <button
              onClick={() => setManageGroupsOpen(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Layers className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Groups</span>
            </button>
          )}

          {can('claims', 'departments') && (
            <button
              onClick={() => setManageDepartmentsOpen(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Briefcase className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Depts</span>
            </button>
          )}

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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
          <div className="relative sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client, phone, email, reg, TP name/reg…"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm min-h-[38px]"
              />
            </div>
          </div>

          <div>
            <SearchableSelect
              label="Show Filter"
              options={SHOW_OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
              value={showFilter}
              onChange={(val) => setShowFilter((val as ShowFilter) || 'Default')}
              isMulti={false}
              isClearable={false}
            />
          </div>

          <div>
            <SearchableSelect
              label="Progress"
              options={allProgressOptions}
              value={selectedProgresses}
              onChange={(val) => setSelectedProgresses(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Progress..."
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
          <div>
            <SearchableSelect
              label="Group"
              options={groupOptions}
              value={selectedGroupFilters}
              onChange={(val) => setSelectedGroupFilters(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Groups..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Department"
              options={deptOptions}
              value={selectedDepartmentFilters}
              onChange={(val) => setSelectedDepartmentFilters(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Departments..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Type"
              options={TYPE_OPTIONS}
              value={selectedTypes}
              onChange={(val) => setSelectedTypes(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Types..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Claim Reason"
              options={REASON_OPTIONS}
              value={selectedReasons}
              onChange={(val) => setSelectedReasons(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Reasons..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Submitter"
              options={SUBMITTER_OPTIONS}
              value={selectedSubmitters}
              onChange={(val) => setSelectedSubmitters(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Submitters..."
            />
          </div>

          <div>
            <SearchableSelect
              label="AIE Handler"
              options={aieHandlerOptions}
              value={selectedAIEHandlers}
              onChange={(val) => setSelectedAIEHandlers(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Handlers..."
            />
          </div>

          <div>
            <SearchableSelect
              label="Legal Handler"
              options={legalHandlerOptions}
              value={selectedLegalHandlers}
              onChange={(val) => setSelectedLegalHandlers(val as string[])}
              isMulti={true}
              isClearable={true}
              multiEmptyMode="empty"
              placeholder="All Legal..."
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date (Start)</label>
            <input
              type="date"
              value={incidentDateStart}
              onChange={(e) => setIncidentDateStart(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm h-[38px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date (End)</label>
            <input
              type="date"
              value={incidentDateEnd}
              onChange={(e) => setIncidentDateEnd(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm h-[38px]"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedClaimIds.size > 0 && can('claims', 'assign') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm text-indigo-800">{selectedClaimIds.size} claim(s) selected</span>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAssignGroupModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
            >
              Assign Group
            </button>
            <button 
              onClick={() => setShowAssignDepartmentModal(true)}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors"
            >
              Assign Dept
            </button>
          </div>
        </div>
      )}

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
        onWhatsApp={handleOpenWhatsApp}
        onEmail={handleOpenEmail}
        selectedIds={selectedClaimIds}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
      />

      {/* Modals */}
      <ClaimPermissionModal isOpen={showPermissionModal} onClose={() => setShowPermissionModal(false)} />

      <ManageClaimGroupsModal isOpen={manageGroupsOpen} onClose={() => setManageGroupsOpen(false)} />
      <ManageClaimDepartmentsModal isOpen={manageDepartmentsOpen} onClose={() => setManageDepartmentsOpen(false)} />

      <AssignClaimGroupModal
        isOpen={showAssignGroupModal}
        onClose={() => setShowAssignGroupModal(false)}
        selectedIds={selectedClaimIds}
        groups={groups}
        onSuccess={() => {
          setShowAssignGroupModal(false);
          setSelectedClaimIds(new Set()); 
        }}
      />

      <AssignClaimDepartmentModal
        isOpen={showAssignDepartmentModal}
        onClose={() => setShowAssignDepartmentModal(false)}
        selectedIds={selectedClaimIds}
        departments={departments}
        onSuccess={() => {
          setShowAssignDepartmentModal(false);
          setSelectedClaimIds(new Set()); 
        }}
      />

      {notesFor && (
        <NotesModal
          claimId={notesFor.id}
          existing={notesFor.notes || []}
          onClose={() => setNotesFor(null)}
          size="xl"
          onChange={() => {}}
        />
      )}

      {showAddModal && (
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Claim" size="xl">
          <ClaimForm onClose={() => setShowAddModal(false)} />
        </Modal>
      )}

      {selectedClaim && showEditModal && (
        <Modal isOpen onClose={() => { setShowEditModal(false); setSelectedClaim(null); }} title="Edit Claim" size="xl">
          <ClaimEditModal
            key={selectedClaim.id}
            claim={selectedClaim}
            onClose={() => { setShowEditModal(false); setSelectedClaim(null); }}
          />
        </Modal>
      )}

      {selectedClaim && !showEditModal && !showDeleteModal && (
        <Modal isOpen onClose={() => setSelectedClaim(null)} title="Claim Details" size="xl">
          <ClaimDetailsModal
            claim={selectedClaim}
            onDownloadDocument={(url) => window.open(url, '_blank')}
            onWhatsApp={handleOpenWhatsApp}
            onEmail={handleOpenEmail}
          />
        </Modal>
      )}

      {updatingProgress && (
        <Modal isOpen onClose={() => setUpdatingProgress(null)} size="xl" title="Update Progress">
          <ProgressUpdateModal
            claimId={updatingProgress.id}
            currentProgress={updatingProgress.progress as any}
            onClose={() => setUpdatingProgress(null)}
            onUpdate={() => {}}
          />
        </Modal>
      )}

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

      {commClaim && (
        <ClaimCommunicationModal
          isOpen={!!commClaim}
          onClose={() => setCommClaim(null)}
          claim={commClaim}
          initialChannel={commChannel}
          initialCategory={commCategory}
          initialRecipient={commRecipient}
        />
      )}
    </div>
  );
};

export default Claims;