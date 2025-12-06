// src/pages/Share.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, FileText, Download, FileSpreadsheet, Settings, Repeat } from 'lucide-react'
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
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator'
import { ShareDocument, ShareBulkDocument } from '../components/pdf/documents'
import { ShareEntry, SplitRecord } from '../types/share'
import { format, isBefore, addDays, addWeeks, addMonths, addYears, isValid, isSameDay } from 'date-fns'

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits() // Correct variable name
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
  
  // --- RECURRING FILTERS ---
  const [recurringFilter, setRecurringFilter] = useState<string>('all')
  // -------------------------

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  const [showHistory, setShowHistory] = useState(false) 

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [editing, setEditing] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [showManageCats, setShowManageCats] = useState(false) 
  
  // --- RECURRING MODAL STATES ---
  const [showRecurringSelect, setShowRecurringSelect] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  // ------------------------------

  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  // --- RECURRING AUTOMATION ENGINE (FIXED) ---
  useEffect(() => {
    if (loading || records.length === 0 || isProcessingRecurring.current) return;
    
    const processRecurring = async () => {
      isProcessingRecurring.current = true;
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date(); 

      try {
        // 1. Identify Active, Due records
        const dueTransactions = records.filter(t => {
            if (!t.isRecurring || !t.nextRecurringDate) return false;
            
            let nextDate: Date;
            if ((t.nextRecurringDate as any).toDate) {
                nextDate = (t.nextRecurringDate as any).toDate();
            } else {
                nextDate = new Date(t.nextRecurringDate as string);
            }
            
            // Only process if strictly in the past
            return isValid(nextDate) && isBefore(nextDate, now);
        });

        for (const txn of dueTransactions) {
            if (processedRecurringIds.current.has(txn.id)) continue;
            processedRecurringIds.current.add(txn.id);

            let currentDate: Date;
            if ((txn.nextRecurringDate as any).toDate) {
                currentDate = (txn.nextRecurringDate as any).toDate();
            } else {
                currentDate = new Date(txn.nextRecurringDate as string);
            }
            
            // --- DUPLICATE CHECK ---
            // Prevent double-creation on refresh
            const alreadyExists = records.some(r => 
                r.id !== txn.id && 
                r.clientId === txn.clientId && 
                r.type === txn.type &&
                r.isRecurring &&
                isSameDay(new Date(r.date), currentDate)
            );

            const oldTxnRef = doc(db, 'shares', txn.id);

            if (alreadyExists) {
                // Just retire the old one if the new one exists
                batch.update(oldTxnRef, { nextRecurringDate: null });
                updatesCount++; 
                continue; 
            }

            // Loop to catch up
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
                
                const { id, createdAt, updatedAt, nextRecurringDate, isRecurring, recurringFrequency, ...cleanData } = txn as any;

                const recurringFields = {
                    isRecurring: true, 
                    recurringFrequency: txn.recurringFrequency,
                    nextRecurringDate: isLast ? nextDate.toISOString() : null, 
                };

                const innerItem = {
                    ...cleanData,
                    ...recurringFields,
                    date: currentDate.toISOString(),
                    updatedAt: new Date(),
                    createdBy: 'System (Recurring)'
                };

                const newDocData: any = {
                    ...cleanData,
                    ...recurringFields,
                    date: currentDate.toISOString(),
                    createdAt: new Date(),
                    createdBy: 'System (Recurring)',
                    recipients: txn.recipients || [],
                    payments: txn.type === 'income' ? [innerItem] : [],
                    expenses: txn.type === 'expense' ? [innerItem] : [],
                };
                
                batch.set(newTxnRef, newDocData);
                currentDate = nextDate;
            }

            // Retire old record
            batch.update(oldTxnRef, { nextRecurringDate: null });
        }

        if (updatesCount > 0) {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring share(s).`);
        }

      } catch (e) { 
        console.error("Recurring Engine Error:", e); 
      } finally {
        isProcessingRecurring.current = false;
      }
    };
    
    processRecurring();
  }, [loading, records]);


  const isRecordSplitted = (record: ShareEntry, splitList: SplitRecord[]) => {
    return splitList.some(sp => {
       const d = record.date.slice(0, 10);
       const inRange = sp.startDate && sp.endDate && d >= sp.startDate && d <= sp.endDate;
       if (!inRange) return false;
       if (!record.createdAt || !sp.createdAt) return false; 
       let recordTime = 0;
       if ((record.createdAt as any).toMillis) {
          recordTime = (record.createdAt as any).toMillis();
       } else if (record.createdAt instanceof Date) {
          recordTime = record.createdAt.getTime();
       } else {
          recordTime = new Date(record.createdAt).getTime();
       }
       const splitTime = new Date(sp.createdAt).getTime();
       return recordTime < splitTime;
    });
  }

  const filteredEntries = useMemo(() => {
    let data = records;
    if (!showHistory) data = data.filter(r => !isRecordSplitted(r, splits));
    if (dateRange.start && dateRange.end) {
      const s = new Date(dateRange.start).getTime();
      const e = new Date(dateRange.end).getTime();
      data = data.filter(r => {
        const d = new Date(r.date).getTime();
        return d >= s && d <= e;
      });
    }
    const searchLower = search.toLowerCase();
    data = data.filter(r => {
      const matchesSearch = (r.clientName || '').toLowerCase().includes(searchLower) || (r.claimRef || '').toLowerCase().includes(searchLower);
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesProgress = status === 'all' || r.progress === status;
      const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
      
      let recurringMatch = true;
      if (recurringFilter === 'all') recurringMatch = true;
      else if (recurringFilter === 'non_recurring') recurringMatch = !r.isRecurring;
      else if (recurringFilter === 'recurring_all') recurringMatch = !!r.isRecurring;
      else if (recurringFilter === 'active_recurring') recurringMatch = !!r.isRecurring && !!r.nextRecurringDate;
      else if (recurringFilter === 'recurring_history') recurringMatch = !!r.isRecurring && !r.nextRecurringDate;
      else if (recurringFilter.startsWith('recurring_')) {
          const targetFreq = recurringFilter.replace('recurring_', '');
          recurringMatch = !!r.isRecurring && r.recurringFrequency === targetFreq;
      }

      return matchesSearch && matchesType && matchesProgress && matchesCategory && recurringMatch;
    });
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, showHistory, splits, search, status, typeFilter, categoryFilter, recurringFilter, dateRange]);

  const filteredSharesForSummary = useMemo(() => {
    if (!showHistory) return [];
    const { start, end } = dateRange;
    if (start && end) {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      return splits.filter(sp => {
        const ss = new Date(sp.startDate).getTime();
        const ee = new Date(sp.endDate).getTime();
        return !(ee < s || ss > e);
      });
    }
    return splits;
  }, [splits, showHistory, dateRange]);


  const handleGenerateDocument = async (entry: ShareEntry) => {
    if (!companyDetails) { toast.error('Company details not found'); return }
    try {
      const downloadURL = await generateAndUploadDocument(ShareDocument, entry, 'shares', entry.id!, 'shares')
      window.open(downloadURL, '_blank')
      toast.success('PDF generated')
    } catch { }
  }

  const handleGenerateBulkPDF = async () => {
    if (!companyDetails) { toast.error('Company details not found'); return }
    try {
      const blob = await generateBulkDocuments(ShareBulkDocument, filteredEntries, { ...companyDetails, splits: filteredSharesForSummary })
      saveAs(blob, 'share_records.pdf')
      toast.success('Bulk PDF generated')
    } catch { }
  }

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast.error("No records to export");
      return;
    }
    try {
      const headers = ["Date", "Type", "Client", "Ref", "Amount", "Recurring", "Frequency"];
      const rows = filteredEntries.map(entry => {
        const amt = entry.type === 'income' ? (entry as any).amount : (entry as any).totalCost;
        return [
          format(new Date(entry.date), 'yyyy-MM-dd HH:mm'),
          entry.type,
          entry.clientName,
          entry.claimRef,
          amt,
          entry.isRecurring ? 'Yes' : 'No',
          entry.isRecurring ? entry.recurringFrequency : '-'
        ].join(',')
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `Share_Export.csv`);
      toast.success("Export downloaded");
    } catch (error) { toast.error("Export failed"); }
  };

  const handleDeleteEntry = async (entry: ShareEntry) => {
    if (!entry.id) return
    try {
      await deleteDoc(doc(db, 'shares', entry.id))
      toast.success('Record deleted')
      setDeleting(null)
    } catch { toast.error('Failed to delete') }
  }
  
  const handleEdit = (entry: ShareEntry) => {
    setRecordBeingEdited(entry);
    setIsCreatingRecurring(false); 
    if (entry.type === 'income') setShowPay(true);
    else setShowExp(true);
  };

  const clearModals = () => {
    setShowPay(false);
    setShowExp(false);
    setShowSplit(false);
    setShowRecurringSelect(false);
    setViewing(null);
    setRecordBeingEdited(null);
    setShareToEdit(null);
    setIsCreatingRecurring(false);
  };

  if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <ShareSummary entries={filteredEntries} splits={filteredSharesForSummary} startDate={dateRange.start} endDate={dateRange.end} />

      <div className="flex flex-wrap justify-end gap-2">
        {can('share', 'create') && <button onClick={() => setShowManageCats(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><Settings className="h-5 w-5 mr-2" /> Cats</button>}
        
        {can('share', 'create') && (
            <button onClick={() => setShowRecurringSelect(true)} className="inline-flex items-center px-4 py-2 border border-transparent bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm"><Repeat className="h-5 w-5 mr-2" /> Recurring</button>
        )}

        {can('share', 'create') && <button onClick={() => { setShowPay(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark shadow-sm"><Plus className="h-5 w-5 mr-2" /> Add Income</button>}
        {can('share', 'create') && <button onClick={() => { setShowExp(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><FileText className="h-5 w-5 mr-2" /> Record Expense</button>}
        {can('share', 'share') && <button onClick={() => setShowSplit(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><FileText className="h-5 w-5 mr-2" /> Split</button>}
        {user?.role === 'manager' && <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50"><Download className="h-5 w-5 mr-2" /> PDF Report</button>}
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
        <ShareTable
          entries={filteredEntries}
          splits={splits} 
          isSplitted={(r) => isRecordSplitted(r, splits)}
          onView={setViewing}
          onEdit={handleEdit}
          onGenerateDocument={handleGenerateDocument}
          onDelete={setDeleting}
        />
        {filteredEntries.length === 0 && !showHistory && (
          <div className="p-10 text-center"><p className="text-gray-500 mb-2">No new records found.</p><button onClick={()=>setShowHistory(true)} className="text-primary hover:underline font-medium">View History</button></div>
        )}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Details" size="lg">{viewing && <ShareDetails entry={viewing} />}</Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Record" size="xl">{editing?.type === 'income' ? <PaymentForm record={editing} onClose={() => setEditing(null)} /> : <ExpenseForm record={editing} onClose={() => setEditing(null)} />}</Modal>

      <Modal isOpen={showRecurringSelect} onClose={() => setShowRecurringSelect(false)} title="Add Recurring Transaction" size="sm">
        <div className="space-y-4 p-2">
            <p className="text-sm text-gray-600">What type of recurring transaction would you like to create?</p>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowPay(true); }} className="flex flex-col items-center justify-center p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"><span className="text-green-700 font-bold">Income</span></button>
                <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowExp(true); }} className="flex flex-col items-center justify-center p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><span className="text-red-700 font-bold">Expense</span></button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={showPay} onClose={() => setShowPay(false)} title={isCreatingRecurring ? "Add Recurring Income" : "Add Income"} size="xl"><PaymentForm onClose={() => setShowPay(false)} /></Modal>
      <Modal isOpen={showExp} onClose={() => setShowExp(false)} title={isCreatingRecurring ? "Add Recurring Expense" : "Record Expense"} size="xl"><ExpenseForm onClose={() => setShowExp(false)} /></Modal>
      <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md"><ManageShareCategoriesModal onClose={() => setShowManageCats(false)} /></Modal>
      <Modal isOpen={showSplit} onClose={() => { setShowSplit(false); setEditingSplit(null) }} title="Split Funds" size="xl"><SplitForm onClose={() => { setShowSplit(false); setEditingSplit(null) }} splitToEdit={splits.find(sp => sp.id === editingSplit) || null} onEditRequested={sp => setEditingSplit(sp ? sp.id : null)} /></Modal>
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Delete"><div className="space-y-4"><p className="text-gray-700">Are you sure?</p><div className="flex justify-end space-x-2"><button onClick={() => setDeleting(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button><button onClick={() => deleting && handleDeleteEntry(deleting)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button></div></div></Modal>
    </div>
  )
}