// src/pages/VATRecord.tsx

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVATRecords } from '../hooks/useVATRecords';
import { useVATRecordFilters } from '../hooks/useVATRecordFilters';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import VATRecordTable from '../components/vatRecord/VATRecordTable';
import VATRecordForm from '../components/vatRecord/VATRecordForm';
import VATRecordDetails from '../components/vatRecord/VATRecordDetails';
import VATRecordFilters from '../components/vatRecord/VATRecordFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText, CheckCircle, Repeat, Settings } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { VATRecord } from '../types/vatRecord';
import { doc, deleteDoc, getDoc, writeBatch, collection, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../utils/excel';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { VATRecordDocument } from '../components/pdf/documents';
import { useFormattedDisplay } from '../hooks/useFormattedDisplay';
import { addDays, addWeeks, addMonths, addYears, isBefore, isSameDay } from 'date-fns';

import { useVATCategories } from '../hooks/useVATCategories';
import ManageVATCategoriesModal from '../components/vatRecord/ManageVATCategoriesModal';
import ManageVATGroupsModal from '../components/vatRecord/ManageVATGroupsModal';
import { useVATGroups } from '../hooks/useVATGroups';

import { generateBulkDocuments } from '../utils/documentGenerator';
import { VATRecordBulkDocument } from '../components/pdf/documents';

import StatusUpdateModal from '../components/vatRecord/StatusUpdateModal';

const VATRecordPage = () => {
  const { records, loading } = useVATRecords();
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    dateRange, setDateRange,
    amountRange, setAmountRange,
    filteredRecords,
    categoryIdFilter, setCategoryIdFilter,
    groupIdFilter, setGroupIdFilter,
    dueDateFilter, setDueDateFilter,
    recurringFilter, setRecurringFilter,
    recurringFrequency, setRecurringFrequency
  } = useVATRecordFilters(records);

  const [showForm, setShowForm] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false); 
  
  const [selectedRecord, setSelectedRecord] = useState<VATRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<VATRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<VATRecord | null>(null);
  
  const [updatingRecords, setUpdatingRecords] = useState<VATRecord[]>([]);

  const { categories } = useVATCategories();
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);
  
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  const isProcessingRecurring = useRef(false);
  const processedRecurringIds = useRef(new Set<string>());

  useEffect(() => {
    if (loading || records.length === 0 || isProcessingRecurring.current) return;

    const processRecurring = async () => {
      isProcessingRecurring.current = true;
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date();

      const dueRecords = records.filter(r => 
        r.isRecurring && 
        r.nextRecurringDate && 
        isBefore(r.nextRecurringDate instanceof Timestamp ? r.nextRecurringDate.toDate() : new Date(r.nextRecurringDate), now)
      );

      for (const rec of dueRecords) {
        if (processedRecurringIds.current.has(rec.id)) continue;
        processedRecurringIds.current.add(rec.id);

        let currentDate = rec.nextRecurringDate instanceof Timestamp ? rec.nextRecurringDate.toDate() : new Date(rec.nextRecurringDate);
        
        const alreadyExists = records.some(r => 
            r.id !== rec.id &&
            r.supplier === rec.supplier &&
            r.receiptNo === rec.receiptNo && 
            isSameDay(r.date, currentDate) && 
            r.isRecurring 
        );

        if (alreadyExists) {
             const oldRef = doc(db, 'vatRecords', rec.id);
             batch.update(oldRef, { nextRecurringDate: null });
             continue;
        }

        while (isBefore(currentDate, now)) {
            updatesCount++;
            let nextDate: Date;
            switch (rec.recurringFrequency) {
                case 'daily': nextDate = addDays(currentDate, 1); break;
                case 'weekly': nextDate = addWeeks(currentDate, 1); break;
                case 'monthly': nextDate = addMonths(currentDate, 1); break;
                case 'quarterly': nextDate = addMonths(currentDate, 3); break;
                case 'biannually': nextDate = addMonths(currentDate, 6); break;
                case 'yearly': nextDate = addYears(currentDate, 1); break;
                default: nextDate = addMonths(currentDate, 1);
            }

            const newRef = doc(collection(db, 'vatRecords'));
            const isLast = !isBefore(nextDate, now);

            const { id, createdAt, updatedAt, nextRecurringDate, ...cleanData } = rec as any;
            
            const newDocData: any = {
                ...cleanData,
                date: currentDate, 
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'System (Recurring)',
                isRecurring: true,
                recurringFrequency: rec.recurringFrequency,
                nextRecurringDate: isLast ? nextDate : null 
            };
            
            batch.set(newRef, newDocData);
            currentDate = nextDate;
        }
        
        const oldRef = doc(db, 'vatRecords', rec.id);
        batch.update(oldRef, { nextRecurringDate: null });
      }

      if (updatesCount > 0) {
        try {
          await batch.commit();
          toast.success(`Generated ${updatesCount} recurring VAT records.`);
        } catch (e) { console.error(e); }
      }
      isProcessingRecurring.current = false;
    };

    processRecurring();
  }, [loading, records]);

  // --- UPDATED SORTING LOGIC ---
  const finalFilteredRecords = useMemo(() => {
    // 1. First, apply any specific page-level filters (like due date specific picker if used)
    const filtered = filteredRecords.filter(record => {
      if (!dueDateFilter) return true;
      if (!record.dueDate) return false;
      return record.dueDate.toISOString().split('T')[0] === dueDateFilter;
    });

    // 2. Then apply the custom sort: Status Priority -> Nearest Due Date
    return filtered.sort((a, b) => {
      // Priority 1: Status (Awaiting -> Processing -> Paid)
      const statusOrder: Record<string, number> = {
        'awaiting': 1,
        'processing': 2,
        'paid': 3
      };

      const statusA = statusOrder[a.status] || 4; // Unknown status goes to bottom
      const statusB = statusOrder[b.status] || 4;

      if (statusA !== statusB) {
        return statusA - statusB; // Lower number (higher priority) first
      }

      // Priority 2: Due Date (Nearest first)
      // If no due date, push to very bottom
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

      return dateA - dateB; // Ascending order
    });
  }, [filteredRecords, dueDateFilter]);
  // -----------------------------

  const summary = useMemo(() => {
    const newSummary = finalFilteredRecords.reduce(
      (acc, record) => {
        acc.net += record.net || 0;
        acc.vat += record.vat || 0;
        acc.gross += record.gross || 0;
        acc.vatReceived += record.vatReceived || 0;
        return acc;
      },
      { net: 0, vat: 0, gross: 0, vatReceived: 0 }
    );
    const balance = newSummary.vat - newSummary.vatReceived;
    return { ...newSummary, balance };
  }, [finalFilteredRecords]);

  useVATGroups();

  const handleToggleOne = useCallback((id: string) => {
    setSelectedRecordIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedRecordIds(checked ? new Set(finalFilteredRecords.map(t => t.id)) : new Set());
  }, [finalFilteredRecords]);

  const handleExport = () => {
    try {
      const exportData = finalFilteredRecords.map(record => ({
        'Date': record.date.toLocaleDateString(),
        'Due Date': record.dueDate ? record.dueDate.toLocaleDateString() : '',
        'Receipt/Invoice No': record.receiptNo,
        'Inquiry/Order No': record.accountant,
        'Supplier': record.supplier,
        'REG No': record.regNo,
        'Account No': record.accountNo || '',
        'Customer': record.customerName,
        'Category': record.categoryName || '',
        'Group': record.groupName || '',
        'NET': record.net.toFixed(2),
        'VAT': record.vat !== undefined ? record.vat.toFixed(2) : '0.00',
        'GROSS': record.gross !== undefined ? record.gross.toFixed(2) : '0.00',
        'VAT Received': record.vatReceived !== undefined ? record.vatReceived.toFixed(2) : '0.00',
        'Status': record.status,
      }));

      const summaryRow = {
        'Date': 'TOTALS',
        'Due Date': '',
        'Receipt/Invoice No': '',
        'Inquiry/Order No': '',
        'Supplier': '',
        'REG No': '',
        'Account No': '',
        'Customer': '',
        'Category': '',
        'Group': '',
        'NET': summary.net.toFixed(2),
        'VAT': summary.vat.toFixed(2),
        'GROSS': summary.gross.toFixed(2),
        'VAT Received': summary.vatReceived.toFixed(2),
        'Status': '',
      };

      exportToExcel([...exportData, summaryRow], 'vat_records');
      toast.success('VAT records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error('Failed to export records');
    }
  };

  const handleDelete = async (record: VATRecord) => {
    try {
      await deleteDoc(doc(db, 'vatRecords', record.id));
      toast.success('Record deleted successfully');
      setDeletingRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleGenerateDocument = async (record: VATRecord) => {
    try {
      await generateAndUploadDocument(
        VATRecordDocument,
        record,
        'vatRecords',
        record.id,
        'vatRecords'
      );
      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const handleGeneratePDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error('Company details not found');
      const companyDetails = companyDoc.data();
      const pdfBlob = await generateBulkDocuments(VATRecordBulkDocument, finalFilteredRecords, companyDetails);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      toast.success('VAT Records summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating VAT Records PDF:', error);
      toast.error('Failed to generate VAT Records PDF');
    }
  };

  const handleUpdateStatusSingle = (record: VATRecord) => {
    setUpdatingRecords([record]);
  };

  const handleBulkUpdateStatus = () => {
    if (selectedRecordIds.size === 0) return;
    const recordsToUpdate = records.filter(r => selectedRecordIds.has(r.id));
    setUpdatingRecords(recordsToUpdate);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      {can('vatRecord', 'cards') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-500">Total NET</h3>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-green-600">{formatCurrency(isNaN(summary.net) ? 0 : summary.net)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-500">Total VAT</h3>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-blue-600">{formatCurrency(isNaN(summary.vat) ? 0 : summary.vat)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-500">Total GROSS</h3>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-gray-900">{formatCurrency(isNaN(summary.gross) ? 0 : summary.gross)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-500">Total VAT Received</h3>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-purple-600">{formatCurrency(isNaN(summary.vatReceived) ? 0 : summary.vatReceived)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-5">
            <h3 className="text-[11px] sm:text-xs font-medium text-gray-500">Balance</h3>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-orange-600">{formatCurrency(isNaN(summary.balance) ? 0 : summary.balance)}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">VAT Records</h1>
        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
          {can('vatRecord', 'export') && (
            
             <button onClick={handleGeneratePDF} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"><FileText className="h-5 w-5 mr-2" /> Generate PDF</button> )}
             {can('vatRecord', 'categories') && (<button onClick={() => setShowManageCategories(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Manage Categories</button>)}
             {can('vatRecord', 'groups') && (<button onClick={() => setShowManageGroups(true)} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Manage Groups</button>)}
            
          
          {can('vatRecord', 'export') && (
            <button onClick={handleExport} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"><Download className="h-5 w-5 mr-2" /> Export</button>
          )}
          
          {can('vatRecord', 'reoccurring') && (
            <button
              onClick={() => { setIsCreatingRecurring(true); setShowForm(true); }}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
            >
              <Repeat className="h-5 w-5 mr-2" /> Recurring
            </button>
          )}

          {can('vatRecord', 'create') && (
            <button
              onClick={() => { setIsCreatingRecurring(false); setShowForm(true); }}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5 mr-2" /> Add Record
            </button>
          )}
        </div>
      </div>

      <VATRecordFilters
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
        dateRange={dateRange} onDateRangeChange={setDateRange}
        amountRange={amountRange} onAmountRangeChange={setAmountRange}
        categoryIdFilter={categoryIdFilter} onCategoryIdFilterChange={setCategoryIdFilter}
        groupIdFilter={groupIdFilter} onGroupIdFilterChange={setGroupIdFilter}
        dueDateFilter={dueDateFilter} onDueDateFilterChange={setDueDateFilter}
        recurringFilter={recurringFilter} onRecurringFilterChange={setRecurringFilter}
        recurringFrequency={recurringFrequency} onRecurringFrequencyChange={setRecurringFrequency}
      />

      {selectedRecordIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm text-blue-800">{selectedRecordIds.size} record(s) selected</span>
          <button onClick={handleBulkUpdateStatus} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none"><CheckCircle className="h-4 w-4 mr-2" /> Update Status</button>
        </div>
      )}

      <VATRecordTable
        records={finalFilteredRecords}
        onView={setSelectedRecord}
        onEdit={(r) => { setIsCreatingRecurring(false); setEditingRecord(r); }}
        onDelete={setDeletingRecord}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onUpdateStatus={handleUpdateStatusSingle}
        selectedIds={selectedRecordIds}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
      />

      <Modal isOpen={showForm || !!editingRecord} onClose={() => { setShowForm(false); setEditingRecord(null); }} title={editingRecord ? "Edit VAT Record" : "Add VAT Record"} size="xl">
        <VATRecordForm
          record={editingRecord || undefined}
          customers={customers}
          vehicles={vehicles}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          initialIsRecurring={isCreatingRecurring} 
        />
      </Modal>

      <Modal isOpen={updatingRecords.length > 0} onClose={() => { setUpdatingRecords([]); setSelectedRecordIds(new Set()); }} title={`Update Status`} size="md">
        {updatingRecords.length > 0 && <StatusUpdateModal records={updatingRecords} onClose={() => { setUpdatingRecords([]); setSelectedRecordIds(new Set()); }} />}
      </Modal>

      <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="VAT Record Details" size="lg">
        {selectedRecord && <VATRecordDetails record={selectedRecord} />}
      </Modal>

      <ManageVATCategoriesModal isOpen={showManageCategories} onClose={() => setShowManageCategories(false)} />
      <ManageVATGroupsModal isOpen={showManageGroups} onClose={() => setShowManageGroups(false)} />
      
      <Modal isOpen={!!deletingRecord} onClose={() => setDeletingRecord(null)} title="Delete VAT Record">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Are you sure you want to delete this VAT record? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setDeletingRecord(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">Cancel</button>
            <button onClick={() => deletingRecord && handleDelete(deletingRecord)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md">Delete Record</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VATRecordPage;