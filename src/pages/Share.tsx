// src/pages/Share.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, FileText, FileSpreadsheet, Settings, Repeat } from 'lucide-react'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import ShareSummary from '../components/Share/ShareSummary'
import ShareFilters from '../components/Share/ShareFilters'
import ShareTable from '../components/Share/ShareTable'
import ShareDetails from '../components/Share/ShareDetails'
import PaymentForm from '../components/Share/PaymentForm'
import ExpenseForm from '../components/Share/ExpenseForm'
import SplitForm from '../components/Share/SplitForm'
import ManageShareCategoriesModal from '../components/Share/ManageShareCategoriesModal' 
import { useShares } from '../hooks/useShares'
import { useSplits } from '../hooks/useSplits'
import { usePermissions } from '../hooks/usePermissions'
import { useCompanyDetails } from '../hooks/useCompanyDetails'
import { deleteDoc, doc, writeBatch, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument } from '../utils/documentGenerator'
import { ShareDocument } from '../components/pdf/documents'
import { ShareEntry, SplitRecord } from '../types/share'
import { format, isBefore, addDays, addWeeks, addMonths, addYears, isValid, isSameDay, startOfDay, endOfDay } from 'date-fns'

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits() 
  const { can } = usePermissions()
  const { companyDetails } = useCompanyDetails()
  const { user } = useAuth();

  const isProcessingRecurring = useRef(false);
  const processedRecurringIds = useRef(new Set<string>());

  // FILTERS
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all') 
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [recurringFilter, setRecurringFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showHistory, setShowHistory] = useState(false) 

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [recordBeingEdited, setRecordBeingEdited] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [showManageCats, setShowManageCats] = useState(false) 
  const [showRecurringSelect, setShowRecurringSelect] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  // Helper to check if record is inside an existing split
  const isRecordSplitted = (record: ShareEntry, splitList: SplitRecord[]) => {
    return splitList.some(sp => {
       const recDate = record.date.slice(0, 10);
       return sp.startDate && sp.endDate && recDate >= sp.startDate && recDate <= sp.endDate;
    });
  }

  // --- RECURRING AUTOMATION ENGINE ---
  useEffect(() => {
    if (loading || records.length === 0 || isProcessingRecurring.current) return;
    
    const processRecurring = async () => {
      isProcessingRecurring.current = true;
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date(); 

      try {
        const dueTransactions = records.filter(t => {
            if (!t.isRecurring || !t.nextRecurringDate) return false;
            const nextDate = (t.nextRecurringDate as any).toDate ? (t.nextRecurringDate as any).toDate() : new Date(t.nextRecurringDate as string);
            return isValid(nextDate) && isBefore(nextDate, now);
        });

        for (const txn of dueTransactions) {
            if (processedRecurringIds.current.has(txn.id)) continue;
            processedRecurringIds.current.add(txn.id);

            let currentDate = (txn.nextRecurringDate as any).toDate ? (txn.nextRecurringDate as any).toDate() : new Date(txn.nextRecurringDate as string);
            
            const alreadyExists = records.some(r => 
                r.id !== txn.id && r.clientId === txn.clientId && r.type === txn.type && r.isRecurring && isSameDay(new Date(r.date), currentDate)
            );

            if (alreadyExists) {
                batch.update(doc(db, 'shares', txn.id), { nextRecurringDate: null });
                updatesCount++; 
                continue; 
            }

            while (isBefore(currentDate, now)) {
                updatesCount++;
                let nextDate: Date;
                switch (txn.recurringFrequency) {
                    case 'daily': nextDate = addDays(currentDate, 1); break;
                    case 'weekly': nextDate = addWeeks(currentDate, 1); break;
                    case 'monthly': nextDate = addMonths(currentDate, 1); break;
                    case 'quarterly': nextDate = addMonths(currentDate, 3); break;
                    case 'biannually': nextDate = addMonths(currentDate, 6); break;
                    case 'yearly': nextDate = addYears(currentDate, 1); break;
                    default: nextDate = addMonths(currentDate, 1);
                }

                const isLast = !isBefore(nextDate, now);
                const newTxnRef = doc(collection(db, 'shares'));
                const { id, createdAt, updatedAt, nextRecurringDate, ...cleanData } = txn as any;

                const recurringFields = {
                    isRecurring: true, 
                    recurringFrequency: txn.recurringFrequency,
                    nextRecurringDate: isLast ? nextDate.toISOString() : null, 
                };

                const newDocData = {
                    ...cleanData,
                    ...recurringFields,
                    date: currentDate.toISOString(),
                    createdAt: new Date(),
                    createdBy: 'System (Recurring)',
                    payments: txn.type === 'income' ? [{...cleanData, ...recurringFields, date: currentDate.toISOString()}] : [],
                    expenses: txn.type === 'expense' ? [{...cleanData, ...recurringFields, date: currentDate.toISOString()}] : [],
                };
                
                batch.set(newTxnRef, newDocData);
                currentDate = nextDate;
            }
            batch.update(doc(db, 'shares', txn.id), { nextRecurringDate: null });
        }
        if (updatesCount > 0) {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring share(s).`);
        }
      } catch (e) { console.error(e); } finally { isProcessingRecurring.current = false; }
    };
    processRecurring();
  }, [loading, records]);

  // --- FILTERING LOGIC ---

  // 1. BASE DATA (Used for Summary)
  // Includes Active Recurring Masters (so Summary calculation is correct)
  // Excludes Splitted records IF History is OFF
  const filteredEntries = useMemo(() => {
    let data = [...records];

    // History Filter: If history is OFF, hide records that are already in a split
    if (!showHistory) {
      data = data.filter(r => !isRecordSplitted(r, splits));
    }

    // Date Range Filter
    if (dateRange.start && dateRange.end) {
      const start = startOfDay(new Date(dateRange.start)).getTime();
      const end = endOfDay(new Date(dateRange.end)).getTime();
      data = data.filter(r => {
        const d = new Date(r.date).getTime();
        return d >= start && d <= end;
      });
    }

    // Search & Other Filters
    const searchLower = search.toLowerCase();
    data = data.filter(r => {
      const matchesSearch = (r.clientName || '').toLowerCase().includes(searchLower) || (r.claimRef || '').toLowerCase().includes(searchLower);
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesProgress = status === 'all' || r.progress === status;
      const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
      
      let recurringMatch = true;
      // Handle the different recurring filter states
      if (recurringFilter === 'all') {
          recurringMatch = true; 
      } 
      else if (recurringFilter === 'non_recurring') {
          recurringMatch = !r.isRecurring;
      } 
      else if (recurringFilter === 'recurring_all') {
          recurringMatch = !!r.isRecurring;
      } 
      else if (recurringFilter === 'active_recurring') {
          recurringMatch = !!r.isRecurring && !!r.nextRecurringDate;
      } 
      else if (recurringFilter === 'recurring_history') {
          recurringMatch = !!r.isRecurring && !r.nextRecurringDate;
      } 
      else if (recurringFilter.startsWith('recurring_')) {
          const targetFreq = recurringFilter.replace('recurring_', '');
          recurringMatch = !!r.isRecurring && r.recurringFrequency === targetFreq;
      }

      return matchesSearch && matchesType && matchesProgress && matchesCategory && recurringMatch;
    });

    // Sort
    return data.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        // Fallback amounts
        const amountA = a.type === 'income' ? (a as any).amount : (a as any).totalCost;
        const amountB = b.type === 'income' ? (b as any).amount : (b as any).totalCost;

        if (sortOrder === 'oldest') return dateA - dateB;
        if (sortOrder === 'highest') return amountB - amountA;
        if (sortOrder === 'lowest') return amountA - amountB;
        return dateB - dateA; // newest default
    });
  }, [records, showHistory, splits, search, status, typeFilter, categoryFilter, recurringFilter, dateRange, sortOrder]);


  // 2. TABLE DATA (Visual only)
  // Takes the base data but HIDES "Active Master Recurring" records IF the filter is "All".
  // This keeps the table clean unless the user explicitly asks for recurring items.
  const tableEntries = useMemo(() => {
    return filteredEntries.filter(r => {
        // If the user hasn't touched the recurring filter (default 'all'),
        // we hide the "Master" docs (future templates) to avoid clutter.
        if (recurringFilter === 'all') {
             const isMaster = r.isRecurring && r.nextRecurringDate;
             return !isMaster; 
        }
        // If they selected a specific recurring filter, we show them.
        return true;
    });
  }, [filteredEntries, recurringFilter]);


  // Splits for Summary breakdown
  const filteredSplits = useMemo(() => {
    if (dateRange.start && dateRange.end) {
      const s = dateRange.start;
      const e = dateRange.end;
      return splits.filter(sp => {
        return sp.startDate && sp.endDate && !(sp.endDate < s || sp.startDate > e);
      });
    }
    return splits;
  }, [splits, dateRange]);

  const handleGenerateDocument = async (entry: ShareEntry) => {
    if (!companyDetails) { toast.error('Company details not found'); return }
    try {
      const downloadURL = await generateAndUploadDocument(ShareDocument, entry, 'shares', entry.id!, 'shares')
      window.open(downloadURL, '_blank')
    } catch { }
  }

  const handleExport = () => {
    if (filteredEntries.length === 0) return toast.error("No records to export");
    const headers = ["Date", "Type", "Client", "Ref", "Category", "Amount", "Status", "Recurring"];
    const rows = filteredEntries.map(e => [
      format(new Date(e.date), 'yyyy-MM-dd HH:mm'),
      e.type, e.clientName, e.claimRef, e.category || '-',
      e.type === 'income' ? (e as any).amount : (e as any).totalCost,
      e.progress, e.isRecurring ? 'Yes' : 'No'
    ].join(','));
    const csvContent = [headers.join(","), ...rows].join("\n");
    saveAs(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), `Export_${format(new Date(), 'yyyyMMdd')}.csv`);
  };

  const handleEdit = (entry: ShareEntry) => {
    setRecordBeingEdited(entry);
    setIsCreatingRecurring(false); 
    if (entry.type === 'income') setShowPay(true);
    else setShowExp(true);
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      {/* SUMMARY: Uses 'filteredEntries' (Includes Active Masters) */}
      <ShareSummary 
        entries={filteredEntries} 
        splits={filteredSplits} 
        showHistory={showHistory}
        startDate={dateRange.start} 
        endDate={dateRange.end} 
      />

      <div className="flex flex-wrap justify-end gap-2">
        {can('share', 'categories') && <button onClick={() => setShowManageCats(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><Settings className="h-5 w-5 mr-2" /> Categories</button>}
        {can('share', 'reoccurring') && <button onClick={() => setShowRecurringSelect(true)} className="inline-flex items-center px-4 py-2 border border-transparent bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm"><Repeat className="h-5 w-5 mr-2" /> Recurring</button>}
        {can('share', 'create') && <button onClick={() => { setShowPay(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark shadow-sm"><Plus className="h-5 w-5 mr-2" /> Add Income</button>}
        {can('share', 'create') && <button onClick={() => { setShowExp(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><FileText className="h-5 w-5 mr-2" /> Record Expense</button>}
        {can('share', 'share') && <button onClick={() => setShowSplit(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><FileText className="h-5 w-5 mr-2" /> Split</button>}
        {can('share', 'export') && <button onClick={handleExport} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"><FileSpreadsheet className="h-5 w-5 mr-2" /> Export</button>}
      </div>

      <ShareFilters
        search={search} onSearch={setSearch}
        status={status} onStatus={setStatus}
        typeFilter={typeFilter} onTypeFilter={setTypeFilter}
        sortOrder={sortOrder} onSortOrder={setSortOrder}
        recurringFilter={recurringFilter} onRecurringFilter={setRecurringFilter}
        dateRange={dateRange} onDateRange={setDateRange}
        showHistory={showHistory} onToggleHistory={setShowHistory}
        category={categoryFilter} onCategory={setCategoryFilter}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* TABLE: Uses 'tableEntries' (Hides Active Masters on default view) */}
        <ShareTable
          entries={tableEntries}
          splits={splits} 
          isSplitted={(r) => isRecordSplitted(r, splits)}
          onView={setViewing}
          onEdit={handleEdit}
          onGenerateDocument={handleGenerateDocument}
          onDelete={setDeleting}
        />
        {filteredEntries.length === 0 && (
          <div className="p-10 text-center"><p className="text-gray-500 mb-2">No records found matching filters.</p></div>
        )}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Details" size="lg">{viewing && <ShareDetails entry={viewing} />}</Modal>
      <Modal isOpen={showPay} onClose={() => setShowPay(false)} title={recordBeingEdited ? "Edit Income" : (isCreatingRecurring ? "Add Recurring Income" : "Add Income")} size="xl">
          <PaymentForm onClose={() => setShowPay(false)} record={recordBeingEdited || undefined} />
      </Modal>
      <Modal isOpen={showExp} onClose={() => setShowExp(false)} title={recordBeingEdited ? "Edit Expense" : (isCreatingRecurring ? "Add Recurring Expense" : "Record Expense")} size="xl">
          <ExpenseForm onClose={() => setShowExp(false)} record={recordBeingEdited || undefined} />
      </Modal>
      <Modal isOpen={showRecurringSelect} onClose={() => setShowRecurringSelect(false)} title="Select Type" size="sm">
        <div className="grid grid-cols-2 gap-4 p-4">
            <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowPay(true); }} className="p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 text-green-700 font-bold text-center">Income</button>
            <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowExp(true); }} className="p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 text-red-700 font-bold text-center">Expense</button>
        </div>
      </Modal>
      <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md"><ManageShareCategoriesModal onClose={() => setShowManageCats(false)} /></Modal>
      <Modal isOpen={showSplit} onClose={() => { setShowSplit(false); setEditingSplit(null) }} title="Split Funds" size="xl"><SplitForm onClose={() => { setShowSplit(false); setEditingSplit(null) }} splitToEdit={splits.find(sp => sp.id === editingSplit) || null} onEditRequested={sp => setEditingSplit(sp ? sp.id : null)} /></Modal>
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Delete">
          <div className="p-4 space-y-4">
              <p>Are you sure you want to delete this record?</p>
              <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleting(null)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={async () => { 
                      await deleteDoc(doc(db, 'shares', deleting!.id)); 
                      toast.success('Deleted'); 
                      setDeleting(null); 
                  }} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
              </div>
          </div>
      </Modal>
    </div>
  )
}