// src/pages/SkylineIncomeExpense.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react'; 
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { useSkylineIncomeExpenses } from '../hooks/useSkylineIncomeExpenses';
import { useIncomeExpenseFilters } from '../hooks/useIncomeExpenseFilters';
import { usePermissions } from '../hooks/usePermissions';
import IncomeExpenseSummary from '../components/IncomeExpense/IncomeExpenseSummary';
import IncomeExpenseFilters from '../components/IncomeExpense/IncomeExpenseFilters';
import IncomeExpenseTable from '../components/IncomeExpense/IncomeExpenseTable';
import IncomeForm from '../components/IncomeExpense/IncomeForm';
import ExpenseForm from '../components/IncomeExpense/ExpenseForm';
import ProfitShareForm from '../components/IncomeExpense/ProfitShareForm';
import IncomeExpenseDetails from '../components/IncomeExpense/IncomeExpenseDetails';
import ManageIECategoriesModal from '../components/IncomeExpense/ManageIECategoriesModal';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import IncomeExpenseDocument from '../components/pdf/documents/IncomeExpenseDocument'; 
import ProfitSharesDocument from '../components/pdf/documents/ProfitSharesDocument'; 
import IncomeExpenseBulkDocument from '../components/pdf/documents/IncomeExpenseBulkDocument';
import { IncomeExpenseEntry, ProfitShare } from '../types/incomeExpense'; 
import { useProfitShares } from '../hooks/useProfitShares';
import { getCompanyDetails } from '../utils/documentGenerator';
import { deleteDoc, doc, writeBatch, collection } from 'firebase/firestore';
import { Settings, FileSpreadsheet, Download, Plus, Repeat } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears, isBefore } from 'date-fns';

import SharesModal from '../components/IncomeExpense/SharesModal';

export default function IncomeExpense() {
  const { records, loading } = useSkylineIncomeExpenses();
  const { can } = usePermissions();
  const filter = useIncomeExpenseFilters(records);
  const { shares } = useProfitShares('skylineProfitShares'); 
  const { user } = useAuth();

  const [shareToEdit, setShareToEdit] = useState<ProfitShare | null>(null);
  const [showShares, setShowShares] = useState(false);
  const [viewing, setViewing] = useState<IncomeExpenseEntry | null>(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showManageCats, setShowManageCats] = useState(false);
  
  const [showRecurringSelect, setShowRecurringSelect] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);

  const [recordBeingEdited, setRecordBeingEdited] = useState<IncomeExpenseEntry | null>(null);
  const [showShareHistory, setShowShareHistory] = useState(false); 
  const [deletingEntry, setDeletingEntry] = useState<IncomeExpenseEntry | null>(null);
  
  const isProcessingRecurring = useRef(false);
  const processedRecurringIds = useRef(new Set<string>());

  const [companyDetails] = useState({
    fullName: 'AIE Skyline',
    email: 'info@aie.com',
    phone: '+44 1234567890'
  });

  // --- RECURRING ENGINE LOGIC ---
  useEffect(() => {
    if (loading || !records.length || isProcessingRecurring.current) return;
    
    const processRecurring = async () => {
      isProcessingRecurring.current = true;
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date();
      
      const dueRecords = records.filter(r => 
        r.isRecurring && 
        r.nextRecurringDate && 
        isBefore(new Date(r.nextRecurringDate), now)
      );

      for (const rec of dueRecords) {
        if (processedRecurringIds.current.has(rec.id)) continue;
        processedRecurringIds.current.add(rec.id);

        let currentDate = new Date(rec.nextRecurringDate!);
        
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

            const newId = doc(collection(db, 'skylineIncomeExpenses')).id;
            const newRef = doc(db, 'skylineIncomeExpenses', newId);
            const isLast = !isBefore(nextDate, now);

            const newRecData: any = {
                ...rec,
                id: newId,
                date: currentDate.toISOString(), 
                createdAt: new Date().toISOString(),
                isRecurring: true, 
                recurringFrequency: rec.recurringFrequency,
                nextRecurringDate: isLast ? nextDate.toISOString() : null 
            };
            
            batch.set(newRef, newRecData);
            currentDate = nextDate;
        }

        const oldRef = doc(db, 'skylineIncomeExpenses', rec.id);
        batch.update(oldRef, { nextRecurringDate: null });
      }

      if (updatesCount > 0) {
        try {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring entries.`);
        } catch (e) { console.error("Recurring Engine Error", e); }
      }
      isProcessingRecurring.current = false;
    };

    processRecurring();
  }, [loading, records]);

  const isRecordSplitted = (record: IncomeExpenseEntry, shareList: ProfitShare[]) => {
    return shareList.some(sp => {
       const d = record.date.slice(0, 10);
       const inRange = sp.startDate && sp.endDate && d >= sp.startDate && d <= sp.endDate;
       if (!inRange) return false;
       if (!record.createdAt || !sp.createdAt) return true;
       const recordTime = new Date(record.createdAt).getTime();
       const splitTime = new Date(sp.createdAt).getTime();
       return recordTime < splitTime;
    });
  }

  const historicalFilteredEntries = useMemo(() => {
    let data = records;
    if (!showShareHistory) data = data.filter(r => !isRecordSplitted(r, shares));
    
    // Apply hook logic
    if (filter.filteredEntries) {
        data = filter.filteredEntries;
    }
    
    // Re-apply history filter
    if (!showShareHistory) {
        data = data.filter(r => !isRecordSplitted(r, shares));
    }

    return data;
  }, [records, showShareHistory, shares, filter.filteredEntries]);

  const filteredSharesForSummary = useMemo(() => {
    if (!showShareHistory) return [];
    const { start, end } = filter.dateRange;
    if (start && end) {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      return shares.filter(sp => {
        const ss = new Date(sp.startDate).getTime();
        const ee = new Date(sp.endDate).getTime();
        return !(ee < s || ss > e);
      });
    }
    return shares;
  }, [shares, showShareHistory, filter.dateRange]);
  
  const handleExport = () => { /* ... */ };
  const handleGenerateDocument = async (entry: IncomeExpenseEntry) => { /* ... */ };
  const handleExportBulkPDF = async () => { /* ... */ };
  const handleDownloadProfitSharesPDF = async () => { /* ... */ };
  
  const handleDelete = async () => {
    if (!deletingEntry?.id) return;
    try {
      await deleteDoc(doc(db, 'skylineIncomeExpenses', deletingEntry.id));
      toast.success('Entry deleted');
      setDeletingEntry(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (entry: IncomeExpenseEntry) => {
    setRecordBeingEdited(entry);
    setIsCreatingRecurring(false);
    if (entry.type === 'income') setShowIncome(true);
    else setShowExpense(true);
  };

  const clearModals = () => {
    setShowIncome(false);
    setShowExpense(false);
    setShowShare(false);
    setShowRecurringSelect(false);
    setViewing(null);
    setRecordBeingEdited(null);
    setShareToEdit(null);
    setIsCreatingRecurring(false);
  };
  
  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Skyline Income & Expenses</h1>
        <p className="text-sm text-[#64748B] mt-0.5 font-medium">Skyline branch accounting, profit shares, recurring entries, and cash flow records.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
        {can('skylineIncomeExpense', 'categories') && (
          <button onClick={() => setShowManageCats(true)} className="px-3.5 py-2.5 border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl shadow-xs font-semibold text-sm flex items-center justify-center transition-colors">
            <Settings className="h-4 w-4 mr-1.5 text-[#64748B]"/> Categories
          </button>
        )}
        
        {can('skylineIncomeExpense', 'create') && (
          <button onClick={() => { setShowIncome(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="px-3.5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl shadow-xs font-bold text-sm flex items-center justify-center transition-colors cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" /> Income
          </button>
        )}
        {can('skylineIncomeExpense', 'create') && (
          <button onClick={() => { setShowExpense(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="px-3.5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl shadow-xs font-bold text-sm flex items-center justify-center transition-colors cursor-pointer">
            <Plus className="h-4 w-4 mr-1.5" /> Expense
          </button>
        )}
        
        {can('skylineIncomeExpense', 'reoccurring') && (
          <button onClick={() => setShowRecurringSelect(true)} className="px-3.5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-xs font-bold text-sm flex items-center justify-center transition-colors cursor-pointer">
            <Repeat className="h-4 w-4 mr-1.5" /> Recurring
          </button>
        )}

        <button onClick={() => setShowShares(true)} className="px-3.5 py-2.5 border border-[#CBD5E1] bg-white text-[#1E293B] hover:bg-[#F8FAFC] rounded-xl shadow-xs font-semibold text-sm transition-colors">
          Shares
        </button>
        {can('skylineIncomeExpense', 'share') && (
          <button onClick={() => setShowShare(true)} className="px-3.5 py-2.5 border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl shadow-xs font-semibold text-sm transition-colors">
            Share Profit
          </button>
        )}
        {can('skylineIncomeExpense', 'export') && (
          <>
            <button onClick={handleExportBulkPDF} className="p-2.5 border border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC] rounded-xl shadow-xs transition-colors" title="Export PDF">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={handleExport} className="p-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl shadow-xs transition-colors" title="Export Spreadsheet">
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>

    <IncomeExpenseSummary
      entries={historicalFilteredEntries}
      shares={filteredSharesForSummary}
      startDate={filter.dateRange.start}
      endDate={filter.dateRange.end}
      permissionScope="skylineIncomeExpense"
    />

    <IncomeExpenseFilters
      search={filter.search} onSearch={filter.setSearch}
      typeFilter={filter.typeFilter} onType={filter.setTypeFilter}
      progress={filter.progress} onProgress={filter.setProgress}
      dateRange={filter.dateRange} onDateRange={filter.setDateRange}
      showHistory={showShareHistory} onToggleHistory={setShowShareHistory}
      category={filter.category} onCategory={filter.setCategory}
      categoriesCollection="incomeExpenseCategories"
      // --- UPDATED: Pass Frequency Props ---
      recurringFilter={filter.recurringFilter} 
      onRecurringFilterChange={filter.setRecurringFilter}
      recurringFrequency={filter.recurringFrequency} // <--- ADDED
      onRecurringFrequencyChange={filter.setRecurringFrequency} // <--- ADDED
    />

    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <IncomeExpenseTable
        entries={historicalFilteredEntries}
        shares={shares}
        isSplitted={(r: any) => isRecordSplitted(r, shares)}
        onView={setViewing}
        onEdit={handleEdit}
        onDelete={setDeletingEntry}
        onGenerateDocument={handleGenerateDocument}
        permissionScope="skylineIncomeExpense"
      />
      {historicalFilteredEntries.length === 0 && !showShareHistory && <div className="p-8 text-center text-gray-500">No new records found. <br/><button onClick={()=>setShowShareHistory(true)} className="text-primary underline mt-2">View Full History</button></div>}
    </div>

    <Modal isOpen={!!deletingEntry} onClose={() => setDeletingEntry(null)} title="Delete Entry">
      <div className="space-y-4">
        <p>Are you sure you want to delete this entry?</p>
        <div className="flex justify-end space-x-2">
          <button onClick={() => setDeletingEntry(null)} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>
    </Modal>

    <Modal isOpen={!!viewing} onClose={clearModals} title="Record Details" size="lg">
      {viewing && <IncomeExpenseDetails entry={viewing} collectionName="skylineIncomeExpenses" />}
    </Modal>

    <Modal isOpen={showShares} onClose={() => setShowShares(false)} title="Profit Share History" size="xl">
      <SharesModal shares={shares} onClose={() => setShowShares(false)} onGeneratePDF={handleDownloadProfitSharesPDF} collectionName="skylineProfitShares" />
    </Modal>

    <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md">
       <ManageIECategoriesModal onClose={() => setShowManageCats(false)} collectionName="incomeExpenseCategories"/>
    </Modal>

    <Modal isOpen={showRecurringSelect} onClose={() => setShowRecurringSelect(false)} title="Add Recurring Transaction" size="sm">
        <div className="space-y-4 p-2">
            <p className="text-sm text-gray-600">What type of recurring transaction would you like to create?</p>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowIncome(true); }} className="flex flex-col items-center justify-center p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"><span className="text-green-700 font-bold">Income</span></button>
                <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowExpense(true); }} className="flex flex-col items-center justify-center p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><span className="text-red-700 font-bold">Expense</span></button>
            </div>
        </div>
    </Modal>

    <Modal isOpen={showIncome} onClose={clearModals} title={recordBeingEdited ? 'Edit Income' : 'Add Income'} size="xl">
      <IncomeForm onClose={clearModals} record={recordBeingEdited?.type === 'income' ? recordBeingEdited : undefined} collectionName="skylineIncomeExpenses" categoriesCollection="incomeExpenseCategories" initialIsRecurring={isCreatingRecurring} />
    </Modal>

    <Modal isOpen={showExpense} onClose={clearModals} title={recordBeingEdited ? 'Edit Expense' : 'Add Expense'} size="xl">
      <ExpenseForm onClose={clearModals} record={recordBeingEdited?.type === 'expense' ? recordBeingEdited : undefined} collectionName="skylineIncomeExpenses" categoriesCollection="incomeExpenseCategories" initialIsRecurring={isCreatingRecurring} />
    </Modal>

    <Modal isOpen={showShare} onClose={clearModals} title="Share Profit" size="xl">
      <ProfitShareForm
  onClose={clearModals}
  shareToEdit={shareToEdit}
  onEditRequested={setShareToEdit}
  collectionName="skylineProfitShares"
  records={historicalFilteredEntries} // ✅ SAME dataset used by summary/table
/>

    </Modal>
  </div>
);
}