// src/pages/VDFinance.tsx
import React, { useState, useRef } from 'react';
import { useVDFinance } from '../hooks/useVDFinance';
import { useVehicles } from '../hooks/useVehicles';
import VDFinanceTable from '../components/vdFinance/VDFinanceTable';
import VDFinanceForm from '../components/vdFinance/VDFinanceForm';
import VDFinanceSummary from '../components/vdFinance/VDFinanceSummary';
import VDFinanceDetails from '../components/vdFinance/VDFinanceDetails';
import VDFinanceFilters, { ProfitStatusFilter } from '../components/vdFinance/VDFinanceFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText, Settings, LayoutGrid, Upload, DownloadCloud } from 'lucide-react';
import { VDFinanceRecord } from '../types/vdFinance';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc, getDoc, updateDoc, deleteField, addDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VDFinanceDocument, VDFinanceBulkDocument } from '../components/pdf/documents';
import { moveToTrash } from '../utils/trashService';
import ManageVDFinanceCategoriesModal from '../components/vdFinance/ManageVDFinanceCategoriesModal';
import ManageVDFinanceGroupsModal from '../components/vdFinance/ManageVDFinanceGroupsModal';
import { format } from 'date-fns';

const VDFinance: React.FC = () => {
  const { records, loading } = useVDFinance();
  const { vehicles } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [statusFilter, setStatusFilter] = useState<ProfitStatusFilter>('all');

  const [categoriesFilter, setCategoriesFilter] = useState<string[]>([]);
  const [groupsFilter, setGroupsFilter] = useState<string[]>([]);
  const [claimReasonsFilter, setClaimReasonsFilter] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VDFinanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<VDFinanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<VDFinanceRecord | null>(null);

  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);

  // --- SHARE RECORD LINKING LOGIC ---
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

  // --- CSV IMPORT / EXPORT LOGIC ---
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
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
      "description", "date", "laborCharge", "serviceCenter", "vatOut", 
      "createdAt", "updatedAt", "createdBy", "claimId", "salvage", 
      "clientReferralFee", "clientRepairAmount", "categoryId", "categoryName", 
      "groupId", "groupName", "originalProfit", "linkedShareId",
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

            const safeDate = (valStr: string | undefined) => {
              if (!valStr) return new Date();
              const d = new Date(valStr);
              return isNaN(d.getTime()) ? new Date() : d;
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
      const displayName = record.reference 
        ? `VD Finance Ref: ${record.reference}` 
        : `VD Finance - ${record.name || record.registration}`;

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
      const vehicle = vehicles.find(v => v.registrationNumber === record.registration);
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

  const filteredRecords = records
    .filter(record => {
      const mq = searchQuery.toLowerCase();
      const matchesSearch =
        record.name.toLowerCase().includes(mq) ||
        record.reference.toLowerCase().includes(mq) ||
        record.registration.toLowerCase().includes(mq);

      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = record.date >= dateRange.start && record.date <= dateRange.end;
      }

      const matchesCategory = categoriesFilter.length === 0 || categoriesFilter.includes(record.categoryId || '');
      
      let matchesGroup = true;
      if (groupsFilter.length > 0) {
        const hasNone = groupsFilter.includes('none');
        const hasMatch = groupsFilter.includes(record.groupId || '');
        matchesGroup = (hasNone && !record.groupId) || hasMatch;
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

      return matchesSearch && matchesDate && matchesCategory && matchesGroup && matchesAmount && matchesClaim;
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

      {/* 1. Summary Cards */}
      <VDFinanceSummary records={filteredRecords} />

      {/* 2. Enhanced Header Section (Buttons ABOVE Filters) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 overflow-hidden">
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">VD Finance Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Manage financial claims, track expenses, and oversee profit statuses.</p>
        </div>

        {/* Buttons forced to one line with horizontal scroll on small screens */}
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto w-full xl:w-auto pb-2 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
          
          {can('vdFinance', 'import') && (
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <Upload className="h-4 w-4 mr-2 text-indigo-500" /> Import CSV
            </button>
          )}

          {can('vdFinance', 'export') && (
            <button onClick={handleExportCSV} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <DownloadCloud className="h-4 w-4 mr-2 text-indigo-500" /> Export CSV
            </button>
          )}

          {can('vdFinance', 'categories') && (
            <button onClick={() => setShowManageCategories(true)} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <LayoutGrid className="h-4 w-4 mr-2 text-gray-500" /> Categories
            </button>
          )}
          
          {can('vdFinance', 'groups') && (
            <button onClick={() => setShowManageGroups(true)} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <Settings className="h-4 w-4 mr-2 text-gray-500" /> Groups
            </button>
          )}

          {can('vdFinance', 'export') && (
            <button onClick={handleGeneratePDF} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <FileText className="h-4 w-4 mr-2 text-blue-500" /> PDF Summary
            </button>
          )}

          {can('vdFinance', 'create') && (
            <button onClick={() => setShowForm(true)} className="inline-flex whitespace-nowrap flex-shrink-0 items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" /> Add Record
            </button>
          )}
        </div>
      </div>

      {/* 3. Filters Section */}
      <VDFinanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        
        categoriesFilter={categoriesFilter}
        onCategoriesFilterChange={setCategoriesFilter}
        groupsFilter={groupsFilter}
        onGroupsFilterChange={setGroupsFilter}
        claimReasonsFilter={claimReasonsFilter}
        onClaimReasonsFilterChange={setClaimReasonsFilter}
        
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />

      {/* 4. Data Table */}
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
        />
      </div>

      <Modal isOpen={showForm || !!editingRecord} onClose={() => { setShowForm(false); setEditingRecord(null); }} title={editingRecord ? 'Edit Record' : 'Add Record'} size="xl">
        <VDFinanceForm record={editingRecord} vehicles={vehicles} onClose={() => { setShowForm(false); setEditingRecord(null); }} />
      </Modal>

      <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="VD Finance Details" size="lg">
        {selectedRecord && <VDFinanceDetails record={selectedRecord} />}
      </Modal>

      <ManageVDFinanceCategoriesModal isOpen={showManageCategories} onClose={() => setShowManageCategories(false)} />
      <ManageVDFinanceGroupsModal isOpen={showManageGroups} onClose={() => setShowManageGroups(false)} />

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