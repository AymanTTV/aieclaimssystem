// src/pages/Share.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, FileText, FileSpreadsheet, Settings, Repeat, LayoutGrid, Users, Upload } from 'lucide-react'
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
import ManageShareholdersModal from '../components/Share/ManageShareholdersModal' 
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FILTERS UPDATED to support array (multi-select)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [recurringFilter, setRecurringFilter] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [showHistory, setShowHistory] = useState(false)

  const [viewing, setViewing] = useState<ShareEntry | null>(null)
  const [recordBeingEdited, setRecordBeingEdited] = useState<ShareEntry | null>(null)
  const [showPay, setShowPay] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [showManageCats, setShowManageCats] = useState(false)
  const [showShareholders, setShowShareholders] = useState(false)
  const [showRecurringSelect, setShowRecurringSelect] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  const [deleting, setDeleting] = useState<ShareEntry | null>(null)
  const [editingSplit, setEditingSplit] = useState<string | null>(null)

  const isRecordSplitted = (record: ShareEntry, splitList: SplitRecord[]) => {
    return splitList.some(sp => {
      const recDate = record.date.slice(0, 10);
      return sp.startDate && sp.endDate && recDate >= sp.startDate && recDate <= sp.endDate;
    });
  }

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

  const filteredEntries = useMemo(() => {
    let data = [...records];

    if (!showHistory) {
      data = data.filter(r => !isRecordSplitted(r, splits));
    }

    if (dateRange.start && dateRange.end) {
      const start = startOfDay(new Date(dateRange.start)).getTime();
      const end = endOfDay(new Date(dateRange.end)).getTime();
      data = data.filter(r => {
        const d = new Date(r.date).getTime();
        return d >= start && d <= end;
      });
    }

    const searchLower = search.toLowerCase();
    data = data.filter(r => {
      const matchesSearch = (r.clientName || '').toLowerCase().includes(searchLower) || (r.claimRef || '').toLowerCase().includes(searchLower);
      const matchesType = typeFilter.length === 0 || typeFilter.includes('all') || typeFilter.includes(r.type);
      const matchesProgress = status.length === 0 || status.includes('all') || status.includes(r.progress);
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes('all') || categoryFilter.includes(r.category || '');
      let recurringMatch = true;
      if (recurringFilter.length > 0 && !recurringFilter.includes('all')) {
        recurringMatch = recurringFilter.some(filter => {
          if (filter === 'non_recurring') return !r.isRecurring;
          if (filter === 'recurring_all') return !!r.isRecurring;
          if (filter === 'active_recurring') return !!r.isRecurring && !!r.nextRecurringDate;
          if (filter === 'recurring_history') return !!r.isRecurring && !r.nextRecurringDate;
          if (filter.startsWith('recurring_')) {
            const targetFreq = filter.replace('recurring_', '');
            return !!r.isRecurring && r.recurringFrequency === targetFreq;
          }
          return false;
        });
      }

      return matchesSearch && matchesType && matchesProgress && matchesCategory && recurringMatch;
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const amountA = a.type === 'income' ? (a as any).amount : (a as any).totalCost;
      const amountB = b.type === 'income' ? (b as any).amount : (b as any).totalCost;

      if (sortOrder === 'oldest') return dateA - dateB;
      if (sortOrder === 'highest') return amountB - amountA;
      if (sortOrder === 'lowest') return amountA - amountB;
      return dateB - dateA;
    });
  }, [records, showHistory, splits, search, status, typeFilter, categoryFilter, recurringFilter, dateRange, sortOrder]);


  const tableEntries = useMemo(() => {
    return filteredEntries.filter(r => {
      if (recurringFilter.length === 0 || recurringFilter.includes('all')) {
        const isMaster = r.isRecurring && r.nextRecurringDate;
        return !isMaster;
      }
      return true;
    });
  }, [filteredEntries, recurringFilter]);


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

  // --- EXPORT CSV ---
  const handleExportCSV = () => {
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

  // --- IMPORT CSV ---
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        
        const batch = writeBatch(db);
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          // Parsing simple CSV export format
          // [Date, Type, Client, Ref, Category, Amount, Status, Recurring]
          const cols = lines[i].split(',');
          if (cols.length < 6) continue;

          const dateStr = cols[0];
          const typeVal = cols[1]?.toLowerCase() === 'expense' ? 'expense' : 'income';
          const clientName = cols[2] || 'Unknown Client';
          const claimRef = cols[3] || '';
          const category = cols[4] !== '-' ? cols[4] : '';
          const amount = parseFloat(cols[5]) || 0;
          const progress = cols[6]?.toLowerCase() === 'completed' ? 'completed' : 'in-progress';
          
          const newDocRef = doc(collection(db, 'shares'));
          
          const baseData = {
            type: typeVal,
            clientName,
            clientId: '',
            claimRef,
            category,
            date: new Date(dateStr).toISOString(),
            progress,
            createdAt: new Date().toISOString(),
            createdBy: user?.id || 'system',
            isRecurring: false,
          };

          if (typeVal === 'income') {
            batch.set(newDocRef, {
              ...baseData,
              payments: [{ ...baseData, amount, reasons: [], vdProfit: 0, actualPaid: amount, legalFeePct: 0, legalFeeCost: 0, commissionPct: 0, commissionCost: 0 }],
              expenses: [],
              recipients: []
            });
          } else {
            batch.set(newDocRef, {
              ...baseData,
              payments: [],
              expenses: [{ ...baseData, items: [{ type: 'Imported', description: 'Imported expense', quantity: 1, unitPrice: amount, vat: false }], totalCost: amount }],
              recipients: []
            });
          }
          count++;
        }
        
        if (count > 0) {
          await batch.commit();
          toast.success(`Imported ${count} CSV records successfully!`);
        } else {
          toast.error("No valid rows found in CSV.");
        }
      } catch (error: any) {
        console.error(error);
        toast.error("Import failed: " + error.message);
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
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
      
      {/* Hidden File Input for CSV Import */}
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />

      

      <ShareSummary
        entries={filteredEntries}
        splits={filteredSplits}
        showHistory={showHistory}
        startDate={dateRange.start}
        endDate={dateRange.end}
      />

     {/* Enhanced Header Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 overflow-hidden">
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Share Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shared income, track expenses, and automate commission splits.</p>
        </div>

        {/* Buttons now wrap on multiple lines and align to the right */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto">
          
          {can('share', 'import') && (
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <Upload className="h-4 w-4 mr-2 text-indigo-500" /> Import CSV
            </button>
          )}

          {can('share', 'export') && (
            <button onClick={handleExportCSV} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" /> Export CSV
            </button>
          )}

          {can('share', 'categories') && (
            <button onClick={() => setShowManageCats(true)} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <LayoutGrid className="h-4 w-4 mr-2 text-gray-500" /> Categories
            </button>
          )}

          {can('share', 'share') && (
            <button onClick={() => setShowShareholders(true)} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm">
              <Users className="h-4 w-4 mr-2 text-indigo-600" /> Shareholders
            </button>
          )}

          {can('share', 'reoccurring') && (
            <button onClick={() => setShowRecurringSelect(true)} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors shadow-sm">
              <Repeat className="h-4 w-4 mr-2 text-indigo-600" /> Recurring
            </button>
          )}

          {can('share', 'share') && (
            <button onClick={() => setShowSplit(true)} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
              <Settings className="h-4 w-4 mr-2 text-blue-500" /> Split Config
            </button>
          )}

          {can('share', 'create') && (
            <button onClick={() => { setShowExp(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">
              <FileText className="h-4 w-4 mr-2" /> Add Expense
            </button>
          )}

          {can('share', 'create') && (
            <button onClick={() => { setShowPay(true); setRecordBeingEdited(null); setIsCreatingRecurring(false); }} className="inline-flex whitespace-nowrap items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add Income
            </button>
          )}
        </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
          <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowPay(true); }} className="p-4 border border-green-200 bg-green-50 rounded-xl hover:bg-green-100 text-green-700 font-bold text-center transition-colors">Income</button>
          <button onClick={() => { setShowRecurringSelect(false); setIsCreatingRecurring(true); setShowExp(true); }} className="p-4 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 text-red-700 font-bold text-center transition-colors">Expense</button>
        </div>
      </Modal>
      <Modal isOpen={showManageCats} onClose={() => setShowManageCats(false)} title="" size="md"><ManageShareCategoriesModal onClose={() => setShowManageCats(false)} /></Modal>
      
      <Modal isOpen={showShareholders} onClose={() => setShowShareholders(false)} title="" size="md">
        <ManageShareholdersModal onClose={() => setShowShareholders(false)} />
      </Modal>

      <Modal isOpen={showSplit} onClose={() => { setShowSplit(false); setEditingSplit(null) }} title="Split Funds" size="xl"><SplitForm onClose={() => { setShowSplit(false); setEditingSplit(null) }} splitToEdit={splits.find(sp => sp.id === editingSplit) || null} onEditRequested={sp => setEditingSplit(sp ? sp.id : null)} /></Modal>
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Confirm Delete">
        <div className="p-4 space-y-4">
          <p className="text-gray-600 text-sm">Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleting(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">Cancel</button>
            <button onClick={async () => {
              await deleteDoc(doc(db, 'shares', deleting!.id));
              toast.success('Deleted');
              setDeleting(null);
            }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}