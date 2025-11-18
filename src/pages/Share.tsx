// src/pages/Share.tsx

import React, { useState, useMemo } from 'react'
import { Plus, FileText, Download } from 'lucide-react'
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

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits()
  const { can } = usePermissions()
  const { companyDetails } = useCompanyDetails()
  const { user } = useAuth();

  // FILTERS
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })
  
  // NEW: Default is FALSE (Only show current pot)
  const [showHistory, setShowHistory] = useState(false) 

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [editing, setEditing] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  // 1. Determine the date of the LAST split (to establish the cutoff)
  const lastSplitDate = useMemo(() => {
    if (splits.length === 0) return null
    // Sort splits by endDate descending
    const sorted = [...splits].sort((a, b) => {
      return new Date(b.endDate || '').getTime() - new Date(a.endDate || '').getTime()
    })
    return sorted[0]?.endDate || null
  }, [splits])

  // 2. Determine which RECORDS (Income/Expense) to show
  const filteredEntries = useMemo(() => {
    let data = records

    // LOGIC A: "Current Pot" Mode (History OFF)
    if (!showHistory && lastSplitDate) {
      // Only show records AFTER the last split
      data = data.filter(r => new Date(r.date) > new Date(lastSplitDate))
    }
    
    // LOGIC B: "History" Mode (History ON)
    // If History is ON, we respect the manual Date Range picker.
    // If History is OFF, we ignore manual dates and just use the "After Last Split" logic above.
    if (showHistory && dateRange.start && dateRange.end) {
      const s = new Date(dateRange.start)
      const e = new Date(dateRange.end)
      data = data.filter(r => {
        const d = new Date(r.date)
        return d >= s && d <= e
      })
    }

    // Common Filters (Search & Status) apply to both modes
    return data.filter(r => {
      const nameMatch = (r.clientName || '').toLowerCase().includes(search.toLowerCase())
      const statusMatch = status === 'all' || r.progress === status
      return nameMatch && statusMatch
    })
  }, [records, showHistory, lastSplitDate, dateRange, search, status])


  // 3. Determine which SPLITS to show (for the Summary Cards)
  const filteredSplits = useMemo(() => {
    // If we are in "Current Pot" mode, we hide all past splits 
    // so the "Shared" card shows 0 and "Balance" shows the full unsplit amount.
    if (!showHistory) {
      return []
    }

    // If History is ON, filter splits by the manual date range
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
      // Note: This will generate a PDF of whatever is currently VISIBLE (Current pot or History)
      const blob = await generateBulkDocuments(ShareBulkDocument, filteredEntries, { ...companyDetails, splits: filteredSplits })
      saveAs(blob, 'share_records.pdf')
      toast.success('Bulk PDF generated')
    } catch { }
  }

  const handleDeleteEntry = async (entry: ShareEntry) => {
    if (!entry.id) return
    try {
      await deleteDoc(doc(db, 'shares', entry.id))
      toast.success('Record deleted')
      setDeleting(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleExport = () => { toast.success('Export not implemented') }

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
          // Only pass dates to summary if we are in History mode
          startDate={showHistory ? dateRange.start : undefined}
          endDate={showHistory ? dateRange.end : undefined}
        />
      )}

      {/* Top Action Buttons */}
      <div className="flex justify-end space-x-2">
        {can('share', 'create') && (
          <button onClick={() => setShowPay(true)} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded">
            <Plus className="h-5 w-5 mr-2" /> Add Income
          </button>
        )}
        {can('share', 'create') && (
          <button onClick={() => setShowExp(true)} className="inline-flex items-center px-4 py-2 border rounded">
            <FileText className="h-5 w-5 mr-2" /> Record Expense
          </button>
        )}
        {can('share', 'share') && (
          <button onClick={() => setShowSplit(true)} className="inline-flex items-center px-4 py-2 border rounded">
            <FileText className="h-5 w-5 mr-2" /> Split
          </button>
        )}
        {user?.role === 'manager' && (
          <button onClick={handleGenerateBulkPDF} className="inline-flex items-center px-4 py-2 border rounded">
            <FileText className="h-5 w-5 mr-2" /> Generate PDF
          </button>
        )}
        {can('share', 'export') && (
          <button onClick={handleExport} className="inline-flex items-center px-4 py-2 border rounded">
            <Download className="h-5 w-5 mr-2" /> Export
          </button>
        )}
      </div>

      {/* Filters */}
      <ShareFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        dateRange={dateRange}
        onDateRange={setDateRange}
        // Pass new toggle props
        showHistory={showHistory}
        onToggleHistory={setShowHistory}
      />

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ShareTable
          entries={filteredEntries}
          onView={setViewing}
          onEdit={setEditing}
          onGenerateDocument={handleGenerateDocument}
          onDelete={setDeleting}
        />
        {/* Helper text for Empty State */}
        {filteredEntries.length === 0 && !showHistory && (
          <div className="p-8 text-center text-gray-500">
             No new records since the last split. 
             <br/>
             <button onClick={()=>setShowHistory(true)} className="text-primary underline mt-2">
               View History
             </button>
          </div>
        )}
      </div>

      {/* --- MODALS (Unchanged) --- */}
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
          <p>Are you sure you want to delete this record?</p>
          <div className="flex justify-end space-x-2">
            <button onClick={() => setDeleting(null)} className="px-4 py-2 border rounded">Cancel</button>
            <button onClick={() => deleting && handleDeleteEntry(deleting)} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}