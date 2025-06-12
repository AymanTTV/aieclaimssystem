// src/pages/Share.tsx

import React, { useState } from 'react'
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
import { ShareEntry } from '../types/share'
// import { handleShareExport } from '../utils/shareHelpers'  // your own Excel export helper

export default function Share() {
  const { records, loading } = useShares()
  const splits = useSplits()
  const { can } = usePermissions()
  const { companyDetails } = useCompanyDetails()
    const { user } = useAuth();

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'in-progress' | 'completed'>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  })

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [editing, setEditing] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  // Filter entries by name, status, and date
  const filteredEntries = records.filter(r => {
    const nameMatch = (r.clientName || '')
      .toLowerCase()
      .includes(search.toLowerCase())
    const statusMatch = status === 'all' || r.progress === status
    const dateMatch =
      dateRange.start && dateRange.end
        ? new Date(r.date) >= new Date(dateRange.start) &&
          new Date(r.date) <= new Date(dateRange.end)
        : true
    return nameMatch && statusMatch && dateMatch
  })

  // Filter splits by dateRange
  const filteredSplits = splits.filter(sp => {
    if (!dateRange.start || !dateRange.end) return true
    const s = new Date(dateRange.start)
    const e = new Date(dateRange.end)
    const ss = new Date(sp.startDate!)
    const ee = new Date(sp.endDate!)
    return !(ee < s || ss > e)
  })

  // Single-record PDF: upload to storage, update Firestore, then open
  const handleGenerateDocument = async (entry: ShareEntry) => {
    if (!companyDetails) {
      toast.error('Company details not found')
      return
    }
    try {
      const downloadURL = await generateAndUploadDocument(
        ShareDocument,
        entry,
        'shares',
        entry.id!,
        'shares'
      )
      window.open(downloadURL, '_blank')
      toast.success('PDF generated and uploaded')
    } catch {
      // error toast already shown by helper
    }
  }

  // Bulk PDF: generate blob & trigger Save As
  const handleGenerateBulkPDF = async () => {
    if (!companyDetails) {
      toast.error('Company details not found')
      return
    }
    try {
      // 1️⃣ pass the filteredEntries array as the 2nd argument
      // 2️⃣ “smuggle” your filteredSplits into companyDetails
      const blob = await generateBulkDocuments(
        ShareBulkDocument,
        filteredEntries,
        { ...companyDetails, splits: filteredSplits }
      )
      saveAs(blob, 'share_records.pdf')
      toast.success('Bulk PDF generated successfully')
    } catch {
      // any errors are already toast-ed inside generateBulkDocuments
    }
  }
  

  // Delete a record
  const handleDeleteEntry = async (entry: ShareEntry) => {
    if (!entry.id) return
    try {
      await deleteDoc(doc(db, 'shares', entry.id))
      toast.success('Record deleted')
      setDeleting(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Optional: Excel export
  const handleExport = () => {
    // handleShareExport(filteredEntries)
    toast.success('Export to Excel not implemented')
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
          startDate={dateRange.start || undefined}
          endDate={dateRange.end   || undefined}
        />
      )}

      {/* Top Action Buttons */}
      <div className="flex justify-end space-x-2">
        {can('share', 'create') && (
          <button
            onClick={() => setShowPay(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded"
          >
            <Plus className="h-5 w-5 mr-2" /> Add Income
          </button>
        )}
        <button
          onClick={() => setShowExp(true)}
          className="inline-flex items-center px-4 py-2 border rounded"
        >
          <FileText className="h-5 w-5 mr-2" /> Record Expense
        </button>
        <button
          onClick={() => setShowSplit(true)}
          className="inline-flex items-center px-4 py-2 border rounded"
        >
          <FileText className="h-5 w-5 mr-2" /> Split
        </button>
        {user?.role === 'manager' && (
        <button
          onClick={handleGenerateBulkPDF}
          className="inline-flex items-center px-4 py-2 border rounded"
        >
          <FileText className="h-5 w-5 mr-2" /> Generate PDF
        </button>
        )}
        {user?.role === 'manager' && (
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 border rounded"
        >
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
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title="Details"
        size="lg"
      >
        {viewing && <ShareDetails entry={viewing} />}
      </Modal>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Record"
        size="xl"
      >
        {editing?.type === 'income' ? (
          <PaymentForm record={editing} onClose={() => setEditing(null)} />
        ) : (
          <ExpenseForm record={editing} onClose={() => setEditing(null)} />
        )}
      </Modal>

      {/* Add Income */}
      <Modal
        isOpen={showPay}
        onClose={() => setShowPay(false)}
        title="Add Income"
        size="xl"
      >
        <PaymentForm onClose={() => setShowPay(false)} />
      </Modal>

      {/* Record Expense */}
      <Modal
        isOpen={showExp}
        onClose={() => setShowExp(false)}
        title="Record Expense"
        size="lg"
      >
        <ExpenseForm onClose={() => setShowExp(false)} />
      </Modal>

      {/* Split Funds */}
      <Modal
        isOpen={showSplit}
        onClose={() => {
          setShowSplit(false)
          setEditingSplit(null)
        }}
        title="Split Funds"
        size="xl"
      >
        <SplitForm
          onClose={() => {
            setShowSplit(false)
            setEditingSplit(null)
          }}
          splitToEdit={splits.find(sp => sp.id === editingSplit) || null}
          onEditRequested={sp => setEditingSplit(sp ? sp.id : null)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this record?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setDeleting(null)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => deleting && handleDeleteEntry(deleting)}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
