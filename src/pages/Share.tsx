// src/pages/Share.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, FileText, Download, FileSpreadsheet, Settings } from 'lucide-react'
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
import {
  generateAndUploadDocument,
  generateBulkDocuments
} from '../utils/documentGenerator'
import { ShareDocument, ShareBulkDocument } from '../components/pdf/documents'
import { ShareEntry, SplitRecord } from '../types/share'
import { format, isBefore, addDays, addWeeks, addMonths, addYears, isValid, startOfDay } from 'date-fns'

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits()
  const { can } = usePermissions()
  const { companyDetails } = useCompanyDetails()
  const { user } = useAuth();

  // --- RECURRING ENGINE REFS ---
  const isProcessingRecurring = useRef(false);
  const processedRecurringIds = useRef(new Set<string>());

  // FILTERS
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all') 
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [recurringFilter, setRecurringFilter] = useState<string>('all')

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  
  const [showHistory, setShowHistory] = useState(false) 

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [editing, setEditing] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [showManageCats, setShowManageCats] = useState(false) 
  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  // --- RECURRING AUTOMATION ENGINE ---
  useEffect(() => {
    // 1. Basic Guard Clauses
    if (loading || records.length === 0 || isProcessingRecurring.current) return;
    
    const processRecurring = async () => {
      console.log("Starting Recurring Check...");
      isProcessingRecurring.current = true; // Lock
      
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date(); // Right now

      try {
        // 2. Filter for transactions that are Recurring AND Due
        const dueTransactions = records.filter(t => {
            if (!t.isRecurring || !t.nextRecurringDate) return false;
            
            // Safe Date Parsing
            let nextDate: Date;
            if ((t.nextRecurringDate as any).toDate) {
                nextDate = (t.nextRecurringDate as any).toDate();
            } else {
                nextDate = new Date(t.nextRecurringDate as string);
            }
            
            // Check if valid and in the past
            return isValid(nextDate) && isBefore(nextDate, now);
        });

        console.log(`Found ${dueTransactions.length} due recurring transactions.`);

        for (const txn of dueTransactions) {
            // 3. Prevent Double Processing (Critical for refresh bugs)
            if (processedRecurringIds.current.has(txn.id)) {
                console.warn(`Skipping ${txn.id} - already processed in this session.`);
                continue;
            }
            processedRecurringIds.current.add(txn.id);

            // Determine where we start calculating from
            let currentDate: Date;
            if ((txn.nextRecurringDate as any).toDate) {
                currentDate = (txn.nextRecurringDate as any).toDate();
            } else {
                currentDate = new Date(txn.nextRecurringDate as string);
            }
            
            // 4. Catch-up Loop
            // Keep generating records until we pass "Now"
            while (isBefore(currentDate, now)) {
                updatesCount++;
                
                // Calculate NEXT date based on frequency
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

                // Determine if this new record is the one that sits in the Future
                const isLast = !isBefore(nextDate, now);

                const newTxnRef = doc(collection(db, 'shares'));
                
                // 5. Data Preparation
                // Remove system fields from the old record
                const { id, createdAt, updatedAt, nextRecurringDate, isRecurring, recurringFrequency, documentUrl, receiptUrl, ...cleanData } = txn as any;

                // Define recurring fields for the NEW doc
                const recurringFields = {
                    isRecurring: true, 
                    recurringFrequency: txn.recurringFrequency,
                    // Only the future-most transaction gets the next date.
                    nextRecurringDate: isLast ? nextDate.toISOString() : null, 
                };

                // Create the Inner Payload (matches what goes inside payments/expenses array)
                // We MUST include recurring info here so the hook sees it!
                const innerPayload = {
                    ...cleanData,
                    ...recurringFields, 
                    date: currentDate.toISOString(), 
                    updatedAt: new Date(),
                    createdBy: 'System (Recurring)'
                };

                // Create the Wrapper Doc (matches Firestore structure)
                const newDocData: any = {
                    ...cleanData, // Save flat fields for indexing
                    ...recurringFields,
                    date: currentDate.toISOString(),
                    createdAt: new Date(),
                    createdBy: 'System (Recurring)',
                    recipients: txn.recipients || [], 
                };

                // Insert into correct array
                if (txn.type === 'income') {
                    newDocData.payments = [innerPayload]; 
                    newDocData.expenses = [];
                } else {
                    newDocData.expenses = [innerPayload];
                    newDocData.payments = [];
                }
                
                // Queue creation
                batch.set(newTxnRef, newDocData);
                console.log(`Generated new record for ${currentDate.toISOString()}`);
                
                // Advance date
                currentDate = nextDate;

                // Batch safety
                if (updatesCount % 400 === 0) {
                    await batch.commit();
                    batch = writeBatch(db); // reset
                }
            }

            // 6. Stop the OLD transaction
            const oldTxnRef = doc(db, 'shares', txn.id);
            batch.update(oldTxnRef, { nextRecurringDate: null });
            console.log(`Stopped recurrence for old record ${txn.id}`);
        }

        if (updatesCount > 0) {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring share(s).`);
        }

      } catch (e) { 
        console.error("Recurring Engine Error:", e); 
      } finally {
        isProcessingRecurring.current = false; // Always Unlock
      }
    };
    
    processRecurring();
  }, [loading, records]); // Dependency on records ensures it runs when data loads

  // --- VISIBILITY CHECK ---
  const isRecordSplitted = (record: ShareEntry, splitList: SplitRecord[]) => {
    return splitList.some(sp => {
      const inRange = sp.startDate && sp.endDate && record.date >= sp.startDate && record.date <= sp.endDate;
      if (!inRange) return false;

      // FIX: Default to FALSE (visible) if timestamps missing
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
    })
  }

  // --- FILTERING ---
  const filteredEntries = useMemo(() => {
    let data = records

    if (!showHistory) {
      data = data.filter(r => !isRecordSplitted(r, splits))
    }
    
    if (dateRange.start) {
      data = data.filter(r => r.date >= dateRange.start)
    }
    if (dateRange.end) {
      data = data.filter(r => r.date <= dateRange.end)
    }

    data = data.filter(r => {
      const nameMatch = (r.clientName || '').toLowerCase().includes(search.toLowerCase())
      const refMatch = (r.claimRef || '').toLowerCase().includes(search.toLowerCase())
      const vehicleMatch = (r.vehicleName || '').toLowerCase().includes(search.toLowerCase())
      
      const statusMatch = status === 'all' || r.progress === status
      const catMatch = categoryFilter === 'all' || (r.category === categoryFilter)
      const typeMatch = typeFilter === 'all' || r.type === typeFilter

      // Recurring Filter
      let recurringMatch = true;
      if (recurringFilter === 'all') recurringMatch = true;
      else if (recurringFilter === 'non_recurring') recurringMatch = !r.isRecurring;
      else if (recurringFilter === 'recurring_all') recurringMatch = !!r.isRecurring;
      else if (recurringFilter.startsWith('recurring_')) {
          const targetFreq = recurringFilter.replace('recurring_', '');
          recurringMatch = !!r.isRecurring && r.recurringFrequency === targetFreq;
      }

      return (nameMatch || refMatch || vehicleMatch) && statusMatch && catMatch && typeMatch && recurringMatch
    })

    return data.sort((a, b) => {
      const getAmount = (rec: ShareEntry) => 
        rec.type === 'income' ? (rec as any).amount : (rec as any).totalCost;

      if (sortOrder === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      } else if (sortOrder === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortOrder === 'highest') {
        return getAmount(b) - getAmount(a)
      } else if (sortOrder === 'lowest') {
        return getAmount(a) - getAmount(b)
      }
      return 0
    })

  }, [records, showHistory, splits, dateRange, search, status, categoryFilter, typeFilter, sortOrder, recurringFilter])


  const filteredSplits = useMemo(() => {
    if (!showHistory) { return [] }
    return splits.filter(sp => {
      if (!dateRange.start || !dateRange.end) return true
      const s = new Date(dateRange.start)
      const e = new Date(dateRange.end)
      const ss = new Date(sp.startDate!)
      const ee = new Date(sp.endDate!)
      return !(ee < s || ss > e)
    })
  }, [splits, showHistory, dateRange])


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
      const blob = await generateBulkDocuments(ShareBulkDocument, filteredEntries, { ...companyDetails, splits: filteredSplits })
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
        <ShareSummary
          entries={filteredEntries}
          splits={filteredSplits}
          startDate={showHistory ? dateRange.start : undefined}
          endDate={showHistory ? dateRange.end : undefined}
        />
      )}

      {/* Buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        {can('share', 'create') && (
           <button onClick={() => setShowManageCats(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
             <Settings className="h-5 w-5 mr-2" /> Cats
           </button>
        )}
        {can('share', 'create') && (
          <button onClick={() => setShowPay(true)} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark shadow-sm">
            <Plus className="h-5 w-5 mr-2" /> Add Income
          </button>
        )}
        {can('share', 'create') && (
          <button onClick={() => setShowExp(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            <FileText className="h-5 w-5 mr-2" /> Record Expense
          </button>
        )}
        {can('share', 'share') && (
          <button onClick={() => setShowSplit(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            <FileText className="h-5 w-5 mr-2" /> Split
          </button>
        )}
        {user?.role === 'manager' && (
          <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
            <Download className="h-5 w-5 mr-2" /> PDF Report
          </button>
        )}
        {can('share', 'export') && (
          <button onClick={handleExport} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm">
            <FileSpreadsheet className="h-5 w-5 mr-2" /> Export
          </button>
        )}
      </div>

      <ShareFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        recurringFilter={recurringFilter}
        onRecurringFilter={setRecurringFilter}
        dateRange={dateRange}
        onDateRange={setDateRange}
        showHistory={showHistory}
        onToggleHistory={setShowHistory}
        category={categoryFilter}
        onCategory={setCategoryFilter}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <ShareTable
          entries={filteredEntries}
          splits={splits} 
          isSplitted={(r) => isRecordSplitted(r, splits)}
          onView={setViewing}
          onEdit={setEditing}
          onGenerateDocument={handleGenerateDocument}
          onDelete={setDeleting}
        />
        {filteredEntries.length === 0 && !showHistory && (
          <div className="p-10 text-center">
             <p className="text-gray-500 mb-2">No new records found.</p>
             <button onClick={()=>setShowHistory(true)} className="text-primary hover:underline font-medium">
               View History
             </button>
          </div>
        )}
      </div>

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Details" size="lg">
        {viewing && <ShareDetails entry={viewing} />}
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Record" size="xl">
        {editing?.type === 'income' ? (
          <PaymentForm record={editing} onClose={() => setEditing(null)} />
        ) : (
          <ExpenseForm record={editing} onClose={() => setEditing(null)} />
        )}
      </Modal>

      <Modal isOpen={showPay} onClose={() => setShowPay(false)} title="Add Income" size="xl">
        <PaymentForm onClose={() => setShowPay(false)} />
      </Modal>

      <Modal isOpen={showExp} onClose={() => setShowExp(false)} title="Record Expense" size="xl">
        <ExpenseForm onClose={() => setShowExp(false)} />
      </Modal>

      <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md">
        <ManageShareCategoriesModal onClose={() => setShowManageCats(false)} />
      </Modal>

      <Modal
        isOpen={showSplit}
        onClose={() => { setShowSplit(false); setEditingSplit(null) }}
        title="Split Funds"
        size="xl"
      >
        <SplitForm
          onClose={() => { setShowSplit(false); setEditingSplit(null) }}
          splitToEdit={splits.find(sp => sp.id === editingSplit) || null}
          onEditRequested={sp => setEditingSplit(sp ? sp.id : null)}
        />
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure?</p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setDeleting(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={() => deleting && handleDeleteEntry(deleting)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}