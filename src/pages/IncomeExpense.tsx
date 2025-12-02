// src/pages/IncomeExpense.tsx

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { db } from '../lib/firebase';
import { pdf } from '@react-pdf/renderer';
import { useIncomeExpenses } from '../hooks/useIncomeExpenses';
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
import { deleteDoc, doc } from 'firebase/firestore';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import IncomeExpenseDocument from '../components/pdf/documents/IncomeExpenseDocument'; 
import ProfitSharesDocument from '../components/pdf/documents/ProfitSharesDocument'; 
import IncomeExpenseBulkDocument from '../components/pdf/documents/IncomeExpenseBulkDocument';
import { IncomeExpenseEntry, ProfitShare } from '../types/incomeExpense'; 
import { useProfitShares } from '../hooks/useProfitShares';
import { getCompanyDetails } from '../utils/documentGenerator';
import { useAuth } from '../context/AuthContext';
import { Settings, FileSpreadsheet, Download, Plus } from 'lucide-react';
import { format } from 'date-fns';

import SharesModal from '../components/IncomeExpense/SharesModal';

export default function IncomeExpense() {
  const { records, loading } = useIncomeExpenses();
  const { can } = usePermissions();
  const filter = useIncomeExpenseFilters(records); 
  const { shares } = useProfitShares('profitShares');
  const { user } = useAuth();

  const [shareToEdit, setShareToEdit] = useState<ProfitShare | null>(null);
  const [showShares, setShowShares] = useState(false);
  const [viewing, setViewing] = useState<IncomeExpenseEntry | null>(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showManageCats, setShowManageCats] = useState(false);
  const [recordBeingEdited, setRecordBeingEdited] = useState<IncomeExpenseEntry | null>(null);
  const [showShareHistory, setShowShareHistory] = useState(false); 
  const [deletingEntry, setDeletingEntry] = useState<IncomeExpenseEntry | null>(null);

  const [companyDetails] = useState({
    fullName: 'AIE Skyline',
    email: 'info@aie.com',
    phone: '+44 1234567890'
  });

  // --- FIXED LOGIC: Timestamp comparison ---
  const isRecordSplitted = (record: IncomeExpenseEntry, shareList: ProfitShare[]) => {
    return shareList.some(sp => {
       // 1. Check Date Range
       const d = record.date.slice(0, 10);
       const inRange = sp.startDate && sp.endDate && d >= sp.startDate && d <= sp.endDate;
       if (!inRange) return false;

       // 2. Check Creation Time (to handle backdated records correctly)
       if (!record.createdAt || !sp.createdAt) return true; // Fallback if data missing

       const recordTime = new Date(record.createdAt).getTime();
       const splitTime = new Date(sp.createdAt).getTime();
       
       // It is splitted only if the record was created BEFORE the split
       return recordTime < splitTime;
    });
  }

  const historicalFilteredEntries = useMemo(() => {
    let data = records;

    // STEP 1: Filter Scope (History vs Current Pot)
    if (!showShareHistory) {
      // Show records that are NOT covered by existing shares (based on range AND creation time)
      data = data.filter(r => !isRecordSplitted(r, shares));
    }

    // STEP 2: Date Filter (Apply to whatever is visible)
    if (filter.dateRange.start && filter.dateRange.end) {
      const s = new Date(filter.dateRange.start).getTime();
      const e = new Date(filter.dateRange.end).getTime();
      data = data.filter(r => {
        const d = new Date(r.date).getTime();
        return d >= s && d <= e;
      });
    }

    // STEP 3: Other Filters
    const searchLower = filter.search.toLowerCase();
    data = data.filter(r => {
      const matchesSearch = 
        (r.customer || '').toLowerCase().includes(searchLower) ||
        (r.reference || '').toLowerCase().includes(searchLower);
      
      const matchesType = filter.typeFilter === 'all' || r.type === filter.typeFilter;
      const matchesProgress = filter.progress === 'all' || r.progress === filter.progress;
      const matchesCategory = filter.category === 'all' || r.category === filter.category;

      return matchesSearch && matchesType && matchesProgress && matchesCategory;
    });

    return data;
  }, [records, showShareHistory, shares, filter]);

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

  // --- EXCEL EXPORT HANDLER ---
  const handleExport = () => {
    if (historicalFilteredEntries.length === 0) {
      toast.error("No records to export");
      return;
    }

    try {
      const headers = [
        "Date",
        "Type",
        "Category",
        "Customer",
        "Phone",
        "Reference",
        "Splitted?",
        "Total Amount",
        "Status",
        "Description/Items",
        "Note"
      ];

      const rows = historicalFilteredEntries.map(entry => {
        const isIncome = entry.type === 'income';
        const desc = isIncome 
          ? entry.description 
          : (entry as any).items?.map((i:any) => `${i.type}: ${i.description}`).join(' | ');

        const total = isIncome ? entry.total : (entry as any).totalCost;
        // Pass entry object to checking function
        const splitted = isRecordSplitted(entry, shares) ? "Yes" : "No";

        return [
          format(new Date(entry.date), 'yyyy-MM-dd'),
          entry.type.toUpperCase(),
          `"${entry.category || ''}"`,
          `"${entry.customer || ''}"`,
          `"${entry.customerPhone || ''}"`,
          `"${entry.reference || ''}"`,
          splitted,
          (total || 0).toFixed(2),
          entry.status,
          `"${(desc || '').replace(/"/g, '""')}"`,
          `"${(entry.note || '').replace(/"/g, '""')}"`
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `IncomeExpense_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success("Export downloaded");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export data");
    }
  };

  const handleGenerateDocument = async (entry: IncomeExpenseEntry) => {
    try {
      const companyDetails = await getCompanyDetails(); 
      const downloadURL = await generateAndUploadDocument(
        (props) => <IncomeExpenseDocument {...props} companyDetails={companyDetails} />,
        entry, 'incomeExpenses', entry.id, 'incomeExpenses' 
      );
      window.open(downloadURL, '_blank');
      toast.success('PDF generated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportBulkPDF = async () => {
    try {
      const blob = await generateBulkDocuments(
        IncomeExpenseBulkDocument,
        historicalFilteredEntries,
        { ...companyDetails, shares: filteredSharesForSummary }
      );
      saveAs(blob, 'income_expense_summary.pdf');
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate bulk PDF');
    }
  };

  const handleDownloadProfitSharesPDF = async () => {
    try {
      const companyDetails = await getCompanyDetails();
      const blob = await pdf(
        <ProfitSharesDocument shares={shares} companyDetails={companyDetails} />
      ).toBlob();
      saveAs(blob, 'profit_shares_history.pdf');
      toast.success('PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };
  
  const handleEdit = (entry: IncomeExpenseEntry) => {
    setRecordBeingEdited(entry);
    if (entry.type === 'income') setShowIncome(true);
    else setShowExpense(true);
  };

  const clearModals = () => {
    setShowIncome(false);
    setShowExpense(false);
    setShowShare(false);
    setViewing(null);
    setRecordBeingEdited(null);
    setShareToEdit(null);
  };

  const handleDelete = async () => {
    if (!deletingEntry?.id) return;
    try {
      await deleteDoc(doc(db, 'incomeExpenses', deletingEntry.id));
      toast.success('Entry deleted');
      setDeletingEntry(null);
    } catch {
      toast.error('Delete failed');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
  <div className="space-y-6">
    {!loading && (
      <IncomeExpenseSummary
        entries={historicalFilteredEntries}
        shares={filteredSharesForSummary}
        startDate={filter.dateRange.start}
        endDate={filter.dateRange.end}
      />
    )}

    <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
      {can('incomeExpense', 'create') && (
         <button onClick={() => setShowManageCats(true)} className="px-4 py-2 border bg-white rounded w-[48%] sm:w-auto flex items-center justify-center">
            <Settings className="h-4 w-4 mr-2"/> Cats
         </button>
      )}

      {can('incomeExpense', 'create') && (
        <button onClick={() => { setShowIncome(true); setRecordBeingEdited(null); }} className="px-4 py-2 bg-primary text-white rounded w-[48%] sm:w-auto flex items-center justify-center">
          <Plus className="h-4 w-4 mr-2" /> Income
        </button>
      )}
      {can('incomeExpense', 'create') && (
        <button onClick={() => { setShowExpense(true); setRecordBeingEdited(null); }} className="px-4 py-2 border rounded w-[48%] sm:w-auto flex items-center justify-center">
          <Plus className="h-4 w-4 mr-2" /> Expense
        </button>
      )}
      <button onClick={() => setShowShares(true)} className="px-4 py-2 border rounded w-[48%] sm:w-auto">
        Shares
      </button>
      {can('incomeExpense', 'share') && (
        <button onClick={() => setShowShare(true)} className="px-4 py-2 border rounded w-[48%] sm:w-auto">
          Share Profit
        </button>
      )}
      {user?.role === 'manager' && (
        <>
          <button onClick={handleExportBulkPDF} className="px-4 py-2 border bg-white text-gray-700 rounded hover:bg-gray-50">
            <Download className="h-5 w-5" />
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            <FileSpreadsheet className="h-5 w-5" />
          </button>
        </>
      )}
    </div>

    <IncomeExpenseFilters
      search={filter.search}
      onSearch={filter.setSearch}
      typeFilter={filter.typeFilter}
      onType={filter.setTypeFilter}
      progress={filter.progress}
      onProgress={filter.setProgress}
      dateRange={filter.dateRange}
      onDateRange={filter.setDateRange}
      permissionScope="incomeExpense"
      showHistory={showShareHistory}
      onToggleHistory={setShowShareHistory}
      category={filter.category}
      onCategory={filter.setCategory}
      categoriesCollection="incomeExpenseCategories"
    />

    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <IncomeExpenseTable
        entries={historicalFilteredEntries}
        shares={shares}
        // Pass function to handle splitting logic
        // Ensure IncomeExpenseTable accepts this prop, or it will default to internal range logic
        // If your table doesn't support it yet, you need to update it similar to ShareTable
        isSplitted={(r: any) => isRecordSplitted(r, shares)}
        onView={setViewing}
        onEdit={handleEdit}
        onDelete={setDeletingEntry}
        onGenerateDocument={handleGenerateDocument}
        permissionScope="incomeExpense"
      />
      {historicalFilteredEntries.length === 0 && !showShareHistory && (
          <div className="p-8 text-center text-gray-500">
             No new records found (all records are covered by existing shares). 
             <br/>
             <button onClick={()=>setShowShareHistory(true)} className="text-primary underline mt-2">
               View Full History
             </button>
          </div>
      )}
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
      {viewing && <IncomeExpenseDetails entry={viewing} />}
    </Modal>

    <Modal isOpen={showShares} onClose={() => setShowShares(false)} title="Profit Share History" size="xl">
      <SharesModal
        shares={shares}
        onClose={() => setShowShares(false)}
        onGeneratePDF={handleDownloadProfitSharesPDF}
        collectionName="profitShares"
      />
    </Modal>

    <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md">
       <ManageIECategoriesModal onClose={() => setShowManageCats(false)} collectionName="incomeExpenseCategories"/>
    </Modal>

    <Modal isOpen={showIncome} onClose={clearModals} title={recordBeingEdited ? 'Edit Income' : 'Add Income'} size="xl">
      <IncomeForm
        onClose={clearModals}
        record={recordBeingEdited?.type === 'income' ? recordBeingEdited : undefined}
        collectionName="incomeExpenses"
        categoriesCollection="incomeExpenseCategories"
      />
    </Modal>

    <Modal isOpen={showExpense} onClose={clearModals} title={recordBeingEdited ? 'Edit Expense' : 'Add Expense'} size="xl">
      <ExpenseForm
        onClose={clearModals}
        record={recordBeingEdited?.type === 'expense' ? recordBeingEdited : undefined}
        collectionName="incomeExpenses"
        categoriesCollection="incomeExpenseCategories"
      />
    </Modal>

    <Modal isOpen={showShare} onClose={clearModals} title="Share Profit" size="xl">
      <ProfitShareForm
        onClose={clearModals}
        shareToEdit={shareToEdit}
        onEditRequested={setShareToEdit}
        collectionName="profitShares"
        records={records}
      />
    </Modal>
  </div>
);
}