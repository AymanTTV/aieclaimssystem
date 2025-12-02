// src/pages/Share.tsx

import React, { useState, useMemo } from 'react'
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
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext';
import {
  generateAndUploadDocument,
  generateBulkDocuments
} from '../utils/documentGenerator'
import { ShareDocument, ShareBulkDocument } from '../components/pdf/documents'
import { ShareEntry, SplitRecord } from '../types/share'
import { format } from 'date-fns'

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits()
  const { can } = usePermissions()
  const { companyDetails } = useCompanyDetails()
  const { user } = useAuth();

  // FILTERS
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all') 
  // -- NEW FILTERS --
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  // -----------------
  
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

  // --- FIXED LOGIC: Check if record is splitted ---
  const isRecordSplitted = (record: ShareEntry, splitList: SplitRecord[]) => {
    return splitList.some(sp => {
      // 1. Check Date Range
      const inRange = sp.startDate && sp.endDate && record.date >= sp.startDate && record.date <= sp.endDate;
      if (!inRange) return false;

      // 2. Check Creation Time
      if (!record.createdAt || !sp.createdAt) return true; 

      // Parse Record Time
      let recordTime = 0;
      if ((record.createdAt as any).toMillis) {
         recordTime = (record.createdAt as any).toMillis();
      } else if (record.createdAt instanceof Date) {
         recordTime = record.createdAt.getTime();
      } else {
         recordTime = new Date(record.createdAt).getTime();
      }

      // Parse Split Time
      const splitTime = new Date(sp.createdAt).getTime();

      // The record is only "Splitted" if it existed BEFORE the split happened.
      return recordTime < splitTime;
    })
  }

  // Determine which RECORDS (Income/Expense) to show
  const filteredEntries = useMemo(() => {
    let data = records

    // STEP 1: Filter Scope (History vs Current Pot)
    if (!showHistory) {
      data = data.filter(r => !isRecordSplitted(r, splits))
    }
    
    // STEP 2: Date Filter 
    if (dateRange.start) {
      data = data.filter(r => r.date >= dateRange.start)
    }
    if (dateRange.end) {
      data = data.filter(r => r.date <= dateRange.end)
    }

    // STEP 3: Other Filters (Search, Status, Category, Type)
    data = data.filter(r => {
      const nameMatch = (r.clientName || '').toLowerCase().includes(search.toLowerCase())
      const refMatch = (r.claimRef || '').toLowerCase().includes(search.toLowerCase())
      const vehicleMatch = (r.vehicleName || '').toLowerCase().includes(search.toLowerCase())
      
      const statusMatch = status === 'all' || r.progress === status
      const catMatch = categoryFilter === 'all' || (r.category === categoryFilter)
      
      // -- NEW TYPE FILTER --
      const typeMatch = typeFilter === 'all' || r.type === typeFilter

      return (nameMatch || refMatch || vehicleMatch) && statusMatch && catMatch && typeMatch
    })

    // STEP 4: Sort Order
    return data.sort((a, b) => {
      // Helper to get value for amount sorting
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

  }, [records, showHistory, splits, dateRange, search, status, categoryFilter, typeFilter, sortOrder])


  // Determine which SPLITS to show (for the Summary Cards)
  const filteredSplits = useMemo(() => {
    if (!showHistory) {
      return []
    }
    return splits.filter(sp => {
      if (!dateRange.start || !dateRange.end) return true
      const s = new Date(dateRange.start)
      const e = new Date(dateRange.end)
      const ss = new Date(sp.startDate!)
      const ee = new Date(sp.endDate!)
      return !(ee < s || ss > e)
    })
  }, [splits, showHistory, dateRange])


  // PDF Generation Handlers
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

  // --- EXCEL EXPORT HANDLER ---
  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast.error("No records to export");
      return;
    }

    try {
      const headers = [
        "Date", "Type", "Category", "Client Name", "Client Phone", "Client Email", "Claim Ref", 
        "Vehicle", "Status", "Splitted?", "Total Amount", "Notes", "VD Profit", "Actual Paid", "Legal Fee", 
        "Storage Cost", "Recovery Cost", "PI Cost", "Expense Description"
      ];

      const rows = filteredEntries.map(entry => {
        const isIncome = entry.type === 'income';
        const inc = entry as any;
        const exp = entry as any;
        const isSplittedVal = isRecordSplitted(entry, splits) ? "Yes" : "No";

        let expenseDesc = "";
        if (!isIncome && exp.items) {
          expenseDesc = exp.items.map((i: any) => `${i.type}: ${i.description} (£${i.unitPrice * i.quantity})`).join(" | ");
        }

        return [
          format(new Date(entry.date), 'yyyy-MM-dd'),
          entry.type.toUpperCase(),
          `"${entry.category || ''}"`,
          `"${entry.clientName || ''}"`,
          `"${entry.clientPhone || ''}"`,
          `"${entry.clientEmail || ''}"`,
          `"${entry.claimRef || ''}"`,
          `"${entry.vehicleName || ''}"`,
          entry.progress,
          isSplittedVal, 
          isIncome ? inc.amount.toFixed(2) : exp.totalCost.toFixed(2),
          `"${(entry.notes || '').replace(/"/g, '""')}"`,
          isIncome ? (inc.vdProfit || 0).toFixed(2) : "0.00",
          isIncome ? (inc.actualPaid || 0).toFixed(2) : "0.00",
          isIncome ? (inc.legalFeeCost || 0).toFixed(2) : "0.00",
          isIncome ? (inc.storageCost || 0).toFixed(2) : "0.00",
          isIncome ? (inc.recoveryCost || 0).toFixed(2) : "0.00",
          isIncome ? (inc.piCost || 0).toFixed(2) : "0.00",
          `"${expenseDesc.replace(/"/g, '""')}"`
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `Share_Records_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      toast.success("Export downloaded");
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Failed to export data");
    }
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

      {/* Top Action Buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        {can('share', 'create') && (
           <button onClick={() => setShowManageCats(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
             <Settings className="h-5 w-5 mr-2" /> Cats
           </button>
        )}
        {can('share', 'create') && (
          <button onClick={() => setShowPay(true)} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="h-5 w-5 mr-2" /> Add Income
          </button>
        )}
        {can('share', 'create') && (
          <button onClick={() => setShowExp(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            <FileText className="h-5 w-5 mr-2" /> Record Expense
          </button>
        )}
        {can('share', 'share') && (
          <button onClick={() => setShowSplit(true)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            <FileText className="h-5 w-5 mr-2" /> Split
          </button>
        )}
        {user?.role === 'manager' && (
          <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            <Download className="h-5 w-5 mr-2" /> PDF Report
          </button>
        )}
        {can('share', 'export') && (
          <button onClick={handleExport} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shadow-sm">
            <FileSpreadsheet className="h-5 w-5 mr-2" /> Excel Export
          </button>
        )}
      </div>

      {/* Filters */}
      <ShareFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        // -- NEW PROPS --
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
        // --------------
        dateRange={dateRange}
        onDateRange={setDateRange}
        showHistory={showHistory}
        onToggleHistory={setShowHistory}
        category={categoryFilter}
        onCategory={setCategoryFilter}
      />

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <ShareTable
          entries={filteredEntries}
          // Pass the list of splits AND logic to check them
          splits={splits} 
          isSplitted={(r) => isRecordSplitted(r, splits)}
          onView={setViewing}
          onEdit={setEditing}
          onGenerateDocument={handleGenerateDocument}
          onDelete={setDeleting}
        />
        {filteredEntries.length === 0 && !showHistory && (
          <div className="p-10 text-center">
             <p className="text-gray-500 mb-2">No new records found (all records are covered by existing splits).</p>
             <button onClick={()=>setShowHistory(true)} className="text-primary hover:underline font-medium">
               View History
             </button>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
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
          <p className="text-gray-700">Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setDeleting(null)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
            <button onClick={() => deleting && handleDeleteEntry(deleting)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}