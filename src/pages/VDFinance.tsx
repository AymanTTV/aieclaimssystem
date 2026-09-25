// src/pages/VDFinance.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useVDFinance } from '../hooks/useVDFinance';
import { useVehicles } from '../hooks/useVehicles';
import VDFinanceTable from '../components/vdFinance/VDFinanceTable';
import VDFinanceForm from '../components/vdFinance/VDFinanceForm';
import VDFinanceSummary from '../components/vdFinance/VDFinanceSummary';
import VDFinanceDetails from '../components/vdFinance/VDFinanceDetails';
import VDFinanceFilters, { ProfitStatusFilter } from '../components/vdFinance/VDFinanceFilters';
import Modal from '../components/ui/Modal';
import SearchableSelect from '../components/ui/SearchableSelect'; 
import { Plus, Download, FileText, Settings, LayoutGrid, Upload, DownloadCloud, Shield, Briefcase, Edit2, Trash2, Layers } from 'lucide-react'; 
import { VDFinanceRecord } from '../types/vdFinance';
import { usePermissions } from '../hooks/usePermissions';

// ADDED onSnapshot here
import { doc, deleteDoc, getDoc, updateDoc, deleteField, addDoc, collection, writeBatch, query, getDocs, onSnapshot } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VDFinanceDocument, VDFinanceBulkDocument } from '../components/pdf/documents';
import { moveToTrash } from '../utils/trashService';
import ManageVDFinanceCategoriesModal from '../components/vdFinance/ManageVDFinanceCategoriesModal';
import ManageVDFinanceGroupsModal from '../components/vdFinance/ManageVDFinanceGroupsModal';
import ManageClaimDepartmentsModal from '../components/claims/ManageClaimDepartmentsModal'; 

import AssignVDFinanceGroupModal from '../components/vdFinance/AssignVDFinanceGroupModal';
import AssignVDFinanceDepartmentModal from '../components/vdFinance/AssignVDFinanceDepartmentModal';

import { format } from 'date-fns';

const VDFinancePermissionModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
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

      // We look specifically for vdFinanceAccess here
      const activeAccessUsers = allUsers.filter((u: any) => u.vdFinanceAccess != null && u.role !== 'superadmin');
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
          vdFinanceAccess: clear ? null : { 
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
      await updateDoc(doc(db, 'users', uid), { vdFinanceAccess: null });
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
    setStartDate(user.vdFinanceAccess?.start || '');
    setEndDate(user.vdFinanceAccess?.end || '');
    setSelectedDepartments(user.vdFinanceAccess?.departments || []);
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
                const acc = u.vdFinanceAccess;
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

const VDFinance: React.FC = () => {
  const { records, loading } = useVDFinance();
  const { vehicles } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk / Selection State
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // App Level State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [incidentDateRange, setIncidentDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [statusFilter, setStatusFilter] = useState<ProfitStatusFilter>('all');

  const [categoriesFilter, setCategoriesFilter] = useState<string[]>([]);
  const [groupsFilter, setGroupsFilter] = useState<string[]>([]);
  const [departmentsFilter, setDepartmentsFilter] = useState<string[]>([]);
  const [claimReasonsFilter, setClaimReasonsFilter] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false); 
  const [selectedRecord, setSelectedRecord] = useState<VDFinanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<VDFinanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<VDFinanceRecord | null>(null);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  const [showManageDepartments, setShowManageDepartments] = useState(false);

  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);

  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'claimGroups'), snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'claimDepartments'), snap => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

  const handleClearProfit = async (rec: VDFinanceRecord) => {
    try {
      const incomeRec = {
        type: 'income',
        clientName: rec.name || '',
        clientId: '', 
        vehicleName: rec.reg || '',
        claimRef: rec.ref || (rec as any).reference || '',
        date: new Date(rec.date).toISOString(),
        notes: rec.description || '',
        progress: 'in-progress',
        updatedAt: new Date(),
        createdBy: user?.id || 'system',
        amount: rec.profit, 
        reasons: rec.claimReasons || [],
        vdProfit: 0,
        actualPaid: rec.profit, 
        legalFeePct: 0,
        legalFeeCost: 0,
        commissionPct: 0,
        commissionCost: 0,
        storageCost: 0,
        recoveryCost: 0,
        piCost: 0,
        linkedVdFinanceId: rec.id 
      };

      const shareDocRef = await addDoc(collection(db, 'shares'), {
        ...incomeRec,
        createdAt: new Date(),
        payments: [incomeRec], 
        expenses: [],
        recipients: [
          { name: 'AIE Skyline', percentage: 0, amount: 0 },
          { name: 'AbdulAziz', percentage: 0, amount: 0 },
          { name: 'JAY', percentage: 0, amount: 0 },
        ]
      });

      await updateDoc(doc(db, 'vdFinance', rec.id), {
        originalProfit: rec.profit,
        profit: 0,
        linkedShareId: shareDocRef.id
      });

      toast.success('Profit marked as paid & Share Income record created');
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear profit');
    }
  };

  const handleUnclearProfit = async (rec: VDFinanceRecord) => {
    try {
      if (rec.linkedShareId) await deleteDoc(doc(db, 'shares', rec.linkedShareId));

      await updateDoc(doc(db, 'vdFinance', rec.id), {
        profit: rec.originalProfit,
        originalProfit: deleteField(),
        linkedShareId: deleteField() 
      });
      
      toast.success('Profit restored & Share Income record removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore profit');
    }
  };

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    let str: string;
    if (typeof val === 'object') {
      try {
        str = JSON.stringify(val);
      } catch {
        str = String(val);
      }
    } else {
      str = String(val);
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return toast.error("No records to export");

    const headers = [
      "id", "name", "ref", "reg", "totalAmount", "vatPercentage", "netAmount", 
      "solicitorFee", "vatIn", "purchasedItems", "clientRepair", "profit", 
      "description", "date", "incidentDate", "incidentTime", "laborCharge", "serviceCenter", "vatOut", 
      "createdAt", "updatedAt", "createdBy", "claimId", "salvage", 
      "clientReferralFee", "clientRepairAmount", "categoryId", "categoryName", 
      "groupId", "groupName", "departmentId", "departmentName", "originalProfit", "linkedShareId",
      "parts", "claimReasons", "vatDetails"
    ];

    const rows = filteredRecords.map(r => {
      return headers.map(h => {
        const val = (r as any)[h];
        if (val instanceof Date) return escapeCSV(val.toISOString());
        return escapeCSV(val);
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), `VDFinance_Backup_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    toast.success('Full records exported successfully');
  };

  const parseCSV = (str: string) => {
    const arr: string[][] = [];
    let quote = false;
    let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
      let cc = str[c], nc = str[c + 1];
      arr[row] = arr[row] || [];
      arr[row][col] = arr[row][col] || '';

      if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
      if (cc === '"') { quote = !quote; continue; }
      if (cc === ',' && !quote) { ++col; continue; }
      if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
      if (cc === '\n' && !quote) { ++row; col = 0; continue; }
      if (cc === '\r' && !quote) { ++row; col = 0; continue; }

      arr[row][col] += cc;
    }
    return arr;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseCSV(text);
        if (parsedRows.length < 2) throw new Error("File is empty or invalid format");

        const headers = parsedRows[0].map(h => h.trim());
        let count = 0;
        
        const chunks = [];
        for (let i = 1; i < parsedRows.length; i += 400) {
          chunks.push(parsedRows.slice(i, i + 400));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          for (const row of chunk) {
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;

            const getVal = (colName: string) => {
              const idx = headers.indexOf(colName);
              return idx !== -1 ? row[idx] : undefined;
            };

            const safeParseJSON = (valStr: string | undefined, fallback: any) => {
              try { return valStr ? JSON.parse(valStr) : fallback; } catch (e) { return fallback; }
            };

            const safeDate = (valStr: string | undefined, allowEmpty = false) => {
              if (!valStr && allowEmpty) return null;
              if (!valStr) return new Date();
              const d = new Date(valStr);
              return isNaN(d.getTime()) ? (allowEmpty ? null : new Date()) : d;
            };

            const docId = getVal("id") || doc(collection(db, 'vdFinance')).id;
            
            const recordData = {
              name: getVal("name") || '',
              ref: getVal("ref") || '',
              reg: getVal("reg") || '',
              totalAmount: Number(getVal("totalAmount")) || 0,
              vatPercentage: Number(getVal("vatPercentage")) || 0,
              netAmount: Number(getVal("netAmount")) || 0,
              solicitorFee: Number(getVal("solicitorFee")) || 0,
              vatIn: Number(getVal("vatIn")) || 0,
              purchasedItems: Number(getVal("purchasedItems")) || 0,
              clientRepair: Number(getVal("clientRepair")) || 0,
              profit: Number(getVal("profit")) || 0,
              description: getVal("description") || '',
              date: safeDate(getVal("date")),
              incidentDate: safeDate(getVal("incidentDate"), true), 
              incidentTime: getVal("incidentTime") || '', 
              laborCharge: Number(getVal("laborCharge")) || 0,
              serviceCenter: getVal("serviceCenter") || '',
              vatOut: Number(getVal("vatOut")) || 0,
              createdAt: safeDate(getVal("createdAt")),
              updatedAt: new Date(),
              createdBy: getVal("createdBy") || user?.id || 'system',
              claimId: getVal("claimId") || '',
              salvage: Number(getVal("salvage")) || 0,
              clientReferralFee: Number(getVal("clientReferralFee")) || 0,
              clientRepairAmount: Number(getVal("clientRepairAmount")) || 0,
              categoryId: getVal("categoryId") || '',
              categoryName: getVal("categoryName") || '',
              groupId: getVal("groupId") || '',
              groupName: getVal("groupName") || '',
              departmentId: getVal("departmentId") || '',
              departmentName: getVal("departmentName") || '',
              linkedShareId: getVal("linkedShareId") || '',
              
              parts: safeParseJSON(getVal("parts"), []),
              claimReasons: safeParseJSON(getVal("claimReasons"), []),
              vatDetails: safeParseJSON(getVal("vatDetails"), { partsVAT: [], laborVAT: false }),
            };

            const origProfit = getVal("originalProfit");
            if (origProfit && origProfit !== 'undefined' && origProfit !== '') {
               (recordData as any).originalProfit = Number(origProfit);
            }

            batch.set(doc(db, 'vdFinance', docId), recordData, { merge: true });
            count++;
          }
          await batch.commit();
        }
        
        toast.success(`Imported/Updated ${count} VD Finance records safely!`);
      } catch (error: any) {
        toast.error("Import failed: " + error.message);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (record: VDFinanceRecord) => {
    try {
      const displayName = record.ref 
        ? `VD Finance Ref: ${record.ref}` 
        : `VD Finance - ${record.name || record.reg}`;

      if (record.linkedShareId) await deleteDoc(doc(db, 'shares', record.linkedShareId));

      await moveToTrash('vdFinance', record.id, record, user?.id || 'system', displayName);
      toast.success('Record moved to trash');
      setDeletingRecord(null);
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const handleGenerateDocument = async (record: VDFinanceRecord) => {
    try {
      const vehicle = vehicles.find(v => v.registrationNumber === record.reg);
      await generateAndUploadDocument(VDFinanceDocument, { ...record, vehicle }, 'vdFinance', record.id, 'vdFinance');
      toast.success('Document generated successfully');
    } catch (error) {
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => window.open(url, '_blank');

  const handleGeneratePDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error('Company details not found');
      const companyDetails = companyDoc.data();
      const pdfBlob = await generateBulkDocuments(VDFinanceBulkDocument, filteredRecords, companyDetails);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      toast.success('VDFinance summary PDF generated successfully');
    } catch (error) {
      toast.error('Failed to generate VDFinance PDF');
    }
  };

  // Selection Handlers
  const handleToggleOne = (id: string) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (checked: boolean, allIds: string[]) => {
    setSelectedRecordIds(checked ? new Set(allIds) : new Set());
  };

  const filteredRecords = records
    .filter(record => {
      const mq = searchQuery.toLowerCase();
      const matchesSearch =
        record.name.toLowerCase().includes(mq) ||
        record.ref.toLowerCase().includes(mq) ||
        record.reg.toLowerCase().includes(mq);

      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = record.date >= dateRange.start && record.date <= dateRange.end;
      }

      let matchesIncidentDate = true;
      if (incidentDateRange.start && incidentDateRange.end) {
        if (record.incidentDate) {
          matchesIncidentDate = record.incidentDate >= incidentDateRange.start && record.incidentDate <= incidentDateRange.end;
        } else {
          matchesIncidentDate = false;
        }
      }

      let matchesCategory = true;
      if (categoriesFilter.length > 0) {
        const hasNone = categoriesFilter.includes('none');
        const hasMatch = categoriesFilter.includes(record.categoryId || '');
        matchesCategory = (hasNone && !record.categoryId) || hasMatch;
      }
      
      let matchesGroup = true;
      if (groupsFilter.length > 0) {
        const hasNone = groupsFilter.includes('none');
        const hasMatch = groupsFilter.includes(record.groupId || '');
        matchesGroup = (hasNone && !record.groupId) || hasMatch;
      }

      let matchesDepartment = true;
      if (departmentsFilter.length > 0) {
        const hasNone = departmentsFilter.includes('none');
        const hasMatch = departmentsFilter.includes(record.departmentId || '');
        matchesDepartment = (hasNone && !record.departmentId) || hasMatch;
      }

      const amt = record.totalAmount ?? 0;
      const matchesAmount =
        (amountRange.min == null || amt >= amountRange.min) &&
        (amountRange.max == null || amt <= amountRange.max);

      let matchesClaim = true;
      if (claimReasonsFilter.length > 0) {
        if (Array.isArray(record.claimReasons)) {
          matchesClaim = record.claimReasons.some(r => claimReasonsFilter.includes(r));
        } else {
          matchesClaim = false;
        }
      }

      return matchesSearch && matchesDate && matchesIncidentDate && matchesCategory && matchesGroup && matchesDepartment && matchesAmount && matchesClaim;
    })
    .filter(record => {
      // Use granular permissions instead of strict role checks where possible
      const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin' || user?.role === 'superadmin';
      const vdFinanceAccess = (user as any)?.vdFinanceAccess;
      const hasCustomAccess = !!vdFinanceAccess && (vdFinanceAccess.start || vdFinanceAccess.end || (vdFinanceAccess.departments && vdFinanceAccess.departments.length > 0));

      if (!isManagerOrAdmin && hasCustomAccess) {
        const recordDate = record.createdAt;
        
        if (vdFinanceAccess.start || vdFinanceAccess.end) {
          if (!recordDate) return false;
          if (vdFinanceAccess.start) {
            const s = new Date(vdFinanceAccess.start);
            s.setHours(0, 0, 0, 0);
            if (recordDate < s) return false;
          }
          if (vdFinanceAccess.end) {
            const e = new Date(vdFinanceAccess.end);
            e.setHours(23, 59, 59, 999);
            if (recordDate > e) return false;
          }
        }
        
        if (vdFinanceAccess.departments && vdFinanceAccess.departments.length > 0) {
          if (!record.departmentId || !vdFinanceAccess.departments.includes(record.departmentId)) {
            return false;
          }
        }
      }
      return true;
    })
    .filter(record => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'unpaid')   return record.profit > 0;
      if (statusFilter === 'paid')     return record.profit === 0 && record.originalProfit != null;
      /* cleared */                    return record.profit === 0 && record.originalProfit == null;
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
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />

      <VDFinanceSummary records={filteredRecords} />

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">VD Finance Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Manage financial claims, track expenses, and oversee profit statuses.</p>
        </div>

        <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2 sm:gap-3 w-full xl:w-auto">
          
          {can('vdFinance', 'recordsPermission') && (
            <button 
              onClick={() => setShowPermissionModal(true)} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-indigo-200 rounded-xl shadow-xs text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 active:scale-95 transition-all cursor-pointer"
            >
              <Shield className="h-4 w-4 mr-1.5 sm:mr-2 text-indigo-600 pointer-events-none" /> Records Permission
            </button>
          )}

          {can('vdFinance', 'import') && (
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-amber-200 rounded-xl shadow-xs text-sm font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-900 active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-1.5 sm:mr-2 text-amber-600 pointer-events-none" /> Import CSV
            </button>
          )}

          {can('vdFinance', 'export') && (
            <button 
              onClick={handleExportCSV} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-blue-200 rounded-xl shadow-xs text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 active:scale-95 transition-all cursor-pointer"
            >
              <DownloadCloud className="h-4 w-4 mr-1.5 sm:mr-2 text-blue-600 pointer-events-none" /> Export CSV
            </button>
          )}

          {can('vdFinance', 'categories') && (
            <button 
              onClick={() => setShowManageCategories(true)} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-violet-200 rounded-xl shadow-xs text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 hover:text-violet-800 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5 sm:mr-2 text-violet-600 pointer-events-none" /> Categories
            </button>
          )}
          
          {can('vdFinance', 'groups') && (
            <button 
              onClick={() => setShowManageGroups(true)} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-purple-200 rounded-xl shadow-xs text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-800 active:scale-95 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4 mr-1.5 sm:mr-2 text-purple-600 pointer-events-none" /> Groups
            </button>
          )}

          {can('vdFinance', 'departments') && (
            <button 
              onClick={() => setShowManageDepartments(true)} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-teal-200 rounded-xl shadow-xs text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 hover:text-teal-800 active:scale-95 transition-all cursor-pointer"
            >
              <Briefcase className="h-4 w-4 mr-1.5 sm:mr-2 text-teal-600 pointer-events-none" /> Depts
            </button>
          )}

          {can('vdFinance', 'export') && (
            <button 
              onClick={handleGeneratePDF} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-rose-200 rounded-xl shadow-xs text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-1.5 sm:mr-2 text-rose-600 pointer-events-none" /> PDF Summary
            </button>
          )}

          {can('vdFinance', 'create') && (
            <button 
              onClick={() => setShowForm(true)} 
              className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-4 py-2 border border-emerald-600 rounded-xl shadow-xs text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5 mr-1.5 pointer-events-none" /> Add Record
            </button>
          )}
        </div>
      </div>

      <VDFinanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        incidentDateRange={incidentDateRange} 
        onIncidentDateRangeChange={setIncidentDateRange} 
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        
        categoriesFilter={categoriesFilter}
        onCategoriesFilterChange={setCategoriesFilter}
        groupsFilter={groupsFilter}
        onGroupsFilterChange={setGroupsFilter}
        departmentsFilter={departmentsFilter}
        onDepartmentsFilterChange={setDepartmentsFilter}
        claimReasonsFilter={claimReasonsFilter}
        onClaimReasonsFilterChange={setClaimReasonsFilter}
        
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />

      {selectedRecordIds.size > 0 && can('vdFinance', 'assign') && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm text-indigo-800">{selectedRecordIds.size} record(s) selected</span>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <VDFinanceTable
          records={filteredRecords}
          onView={setSelectedRecord}
          onEdit={setEditingRecord}
          onDelete={setDeletingRecord}
          onGenerateDocument={handleGenerateDocument}
          onViewDocument={handleViewDocument}
          onClearProfit={handleClearProfit}
          onUnclearProfit={handleUnclearProfit}
          selectedIds={selectedRecordIds}
          onToggleOne={handleToggleOne}
          onToggleAll={handleToggleAll}
        />
      </div>

      <VDFinancePermissionModal isOpen={showPermissionModal} onClose={() => setShowPermissionModal(false)} />

      <Modal isOpen={showForm || !!editingRecord} onClose={() => { setShowForm(false); setEditingRecord(null); }} title={editingRecord ? 'Edit Record' : 'Add Record'} size="xl">
        <VDFinanceForm record={editingRecord} vehicles={vehicles} onClose={() => { setShowForm(false); setEditingRecord(null); }} />
      </Modal>

      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="VD Finance Details"
        subtitle={
          selectedRecord
            ? `${selectedRecord.reg || (selectedRecord as any).registration || 'Vehicle'} • Ref: #${selectedRecord.ref || (selectedRecord as any).reference || 'N/A'} • ${selectedRecord.name || ''}`
            : undefined
        }
        size="2xl"
        contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0 bg-white"
      >
        {selectedRecord && (
          <VDFinanceDetails
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </Modal>

      <ManageVDFinanceCategoriesModal isOpen={showManageCategories} onClose={() => setShowManageCategories(false)} />
      <ManageVDFinanceGroupsModal isOpen={showManageGroups} onClose={() => setShowManageGroups(false)} />
      <ManageClaimDepartmentsModal isOpen={showManageDepartments} onClose={() => setShowManageDepartments(false)} />

      <AssignVDFinanceGroupModal
        isOpen={showAssignGroupModal}
        onClose={() => setShowAssignGroupModal(false)}
        selectedIds={selectedRecordIds}
        groups={groups}
        onSuccess={() => {
          setShowAssignGroupModal(false);
          setSelectedRecordIds(new Set()); 
        }}
      />

      <AssignVDFinanceDepartmentModal
        isOpen={showAssignDepartmentModal}
        onClose={() => setShowAssignDepartmentModal(false)}
        selectedIds={selectedRecordIds}
        departments={departments}
        onSuccess={() => {
          setShowAssignDepartmentModal(false);
          setSelectedRecordIds(new Set()); 
        }}
      />

      <Modal isOpen={!!deletingRecord} onClose={() => setDeletingRecord(null)} title="Delete Record">
        <div className="space-y-4 p-2">
          <p className="text-sm text-gray-600">Are you sure you want to delete this record? This action will move it to the trash.</p>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={() => setDeletingRecord(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => deletingRecord && handleDelete(deletingRecord)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700">Delete Record</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VDFinance;