// src/pages/Finance.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { Account, Transaction } from '../types';
import FinanceHeader from '../components/finance/FinanceHeader';
import FinanceFilters from '../components/finance/FinanceFilters';
import FinancialSummary from '../components/finance/FinancialSummary';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal'; 
import ManageAccountsModal from '../components/finance/ManageAccountsModal';
import Modal from '../components/ui/Modal'; 
import ManageGroupsModal from '../components/finance/ManageGroupsModal';
import AssignGroupCategoryModal from '../components/finance/AssignGroupCategoryModal';

import { generateFinancePDF } from '../utils/financePDF';
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { doc, updateDoc, collection, query, onSnapshot, writeBatch, deleteDoc, Timestamp, orderBy } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';
import financeCategoryService from '../services/financeCategory.service';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react';
// --- NEW IMPORTS ---
import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay } from 'date-fns'; 

interface MemberPageProps {
  memberMode?: boolean;
  memberCustomerId?: string | null;
}

const Finance: React.FC<MemberPageProps> = ({
  memberMode = false,
  memberCustomerId = null,
}: MemberPageProps) => {
  const { transactions, loading, error } = useFinances();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { can } = usePermissions();
  const { user } = useAuth();

  const [derivedCustomerId, setDerivedCustomerId] = useState<string | null>(null);
  const normalizePhone = (raw?: string | null) => { if (!raw) return null; const digits = raw.replace(/[^\d+]/g, ''); if (digits.startsWith('+44')) return '0' + digits.slice(3); if (digits.startsWith('44')) return '0' + digits.slice(2); return digits; };
  useEffect(() => { if (!memberMode) { setDerivedCustomerId(null); return; } if (memberCustomerId) { setDerivedCustomerId(memberCustomerId); return; } const emailLower = user?.email?.toLowerCase()?.trim() || null; const userPhone = normalizePhone((user as any)?.phoneNumber ?? (user as any)?.mobile ?? null); const pickFromLocal = () => { if (!customers || customers.length === 0) return null; if (emailLower) { const byEmail = customers.find((c: any) => c?.email && String(c.email).toLowerCase().trim() === emailLower); if (byEmail) return byEmail.id; } if (userPhone) { const byMobile = customers.find((c: any) => normalizePhone(c?.mobile) === userPhone); if (byMobile) return byMobile.id; } return null; }; setDerivedCustomerId(pickFromLocal()); }, [memberMode, memberCustomerId, customers, user]);

  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const loadGroups = useCallback(async () => { try { const all = await financeGroupService.getAll(); setGroups(all.sort((a,b) => a.name.localeCompare(b.name))); } catch (err) { console.error("Failed to load groups:", err); toast.error("Could not load groups."); } }, []);
  useEffect(() => { loadGroups(); }, [loadGroups]);
  const [manageOpen, setManageOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // --- NEW STATE for Recurring Modal ---
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  // -------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // For single deletes
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignAccountModal, setShowAssignAccountModal] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [showDeleteLinkedModal, setShowDeleteLinkedModal] = useState(false); // For OLD linked pairs
  const [linkedTransactionsToDelete, setLinkedTransactionsToDelete] = useState<Transaction[] | null>(null); // For OLD linked pairs
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name')); // Order accounts by name
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const accountData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Account, 'id'>)
        }));
        accountData.forEach(acc => {
            if ((acc as any).createdAt?.toDate) acc.createdAt = (acc as any).createdAt.toDate();
            if ((acc as any).updatedAt?.toDate) acc.updatedAt = (acc as any).updatedAt.toDate();
        });
        setAccounts(accountData as Account[]);
      }, (err) => { console.error('Error fetching accounts:', err); toast.error('Failed to load accounts'); });
    return () => unsubscribe();
  }, []);

  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    financeCategoryService.getAll()
      .then((docs) => setFinanceCategories(docs.sort((a,b)=> a.name.localeCompare(b.name)))) // Sort categories
      .catch((err) => { console.error('Failed to load categories:', err); toast.error('Could not load categories'); })
      .finally(() => setLoadingCats(false));
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCatForm = (cat?: { id: string; name: string }) => { if (cat) { setEditCat(cat); setCatName(cat.name); } else { setEditCat(null); setCatName(''); } setShowCatModal(true); };
  const handleCatSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!catName.trim()) { toast.error('Name required'); return; } setLoadingCats(true); try { if (editCat) { await financeCategoryService.update(editCat.id, { name: catName.trim() }); toast.success('Updated'); } else { await financeCategoryService.create({ name: catName.trim() }); toast.success('Created'); } setShowCatModal(false); setEditCat(null); setCatName(''); loadCategories(); } catch (err) { console.error('Err save cat:', err); toast.error('Failed'); } finally { setLoadingCats(false); } };
  const handleCatDelete = async (catId: string) => { const cat = financeCategories.find(c => c.id === catId); if (cat?.name === 'Transfer' || cat?.name === 'Loan Received' || cat?.name === 'Loan Provided') { toast.error(`Cannot delete essential category: "${cat.name}"`); return; } if (!window.confirm(`Delete "${cat?.name || catId}"?`)) return; setLoadingCats(true); try { await financeCategoryService.delete(catId); setFinanceCategories(prev => prev.filter(c => c.id !== catId)); toast.success('Deleted'); } catch (err) { console.error('Err delete cat:', err); toast.error('Failed'); loadCategories(); } finally { setLoadingCats(false); } };

  const visibleTransactions: Transaction[] = useMemo(() => { if (!memberMode) return transactions; const scopeId = memberCustomerId ?? derivedCustomerId; if (!scopeId) return []; return transactions.filter((t) => t.customerId === scopeId); }, [transactions, memberMode, memberCustomerId, derivedCustomerId]);

  const { searchQuery, setSearchQuery, type, setType, category, setCategory, groupFilter, setGroupFilter, paymentStatus, setPaymentStatus, dateRange, setDateRange, selectedCustomerId, setSelectedCustomerId, selectedOwner, setSelectedOwner, owners, filteredTransactions, accountFilter, setAccountFilter, showLinked, setShowLinked, recurringFilter, setRecurringFilter, accountSummary, totalOwingFromOwners } = useFinanceFilters(visibleTransactions, vehicles, accounts, customers);

  useEffect(() => { setSelectedTransactionIds(new Set()); }, [searchQuery, type, category, paymentStatus, dateRange, selectedCustomerId, selectedOwner, accountFilter, groupFilter, showLinked, recurringFilter]);

  const blockIfMember = (fn: () => void) => { if (!memberMode) return fn(); toast.error('Action disabled.'); };
  const handleViewTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowDetailsModal(true); }, []);
  const handleEditTransaction = useCallback((txn: Transaction) => { blockIfMember(() => { setSelectedTransaction(txn); setShowEditModal(true); }); }, [memberMode]);

  // Updated Delete Logic
  const handleDeleteTransaction = useCallback((txn: Transaction) => {
    blockIfMember(() => {
      setSelectedTransaction(txn); // Set the one clicked first

      // Check specifically for the OLD link structure (referenceId exists AND it's likely a pair)
      if (txn.referenceId) {
        const linkedPair = transactions.filter(t => t.referenceId === txn.referenceId && t.id !== txn.id);
        if (linkedPair.length > 0 && (txn.category === 'Transfer' || linkedPair[0].category === 'Transfer' || (txn.category !== 'Loan Provided' && linkedPair[0].category !== 'Loan Provided'))) {
          // It looks like an old Transfer/Split pair, show the specific modal
          setLinkedTransactionsToDelete([txn, ...linkedPair]);
          setShowDeleteLinkedModal(true);
          return; // Modal handles deletion choice
        }
      }

      // For single records, multi-account records, invoice links, or orphan old links
      setShowDeleteModal(true);
    });
  }, [memberMode, transactions]);

  // Handles deleting ONLY the selectedTransaction
  const handleConfirmDeleteSingle = async () => {
    if (!selectedTransaction) return;
    setDeleteLoading(true);
    const toastId = toast.loading(`Deleting transaction...`);
    const transactionIdToDelete = selectedTransaction.id;
    try {
      await deleteDoc(doc(db, 'transactions', transactionIdToDelete));
      toast.success("Transaction deleted", { id: toastId });
      setShowDeleteLinkedModal(false); setShowDeleteModal(false); // Close either modal
      setLinkedTransactionsToDelete(null); setSelectedTransaction(null); // Clear state
    } catch (err) { console.error("Error deleting single:", err); toast.error("Failed", { id: toastId });
    } finally { setDeleteLoading(false); }
  };

  // Handles deleting BOTH parts of an OLD linked pair
  const handleConfirmDeleteLinked = async () => {
    if (!linkedTransactionsToDelete || linkedTransactionsToDelete.length === 0) return;
    setDeleteLoading(true);
    const count = linkedTransactionsToDelete.length;
    const toastId = toast.loading(`Deleting ${count} linked...`);
    try {
      const batch = writeBatch(db);
      linkedTransactionsToDelete.forEach(txn => batch.delete(doc(db, 'transactions', txn.id)));
      await batch.commit();
      toast.success(`${count} linked deleted`, { id: toastId });
      setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null);
    } catch (err) { console.error("Error deleting linked:", err); toast.error(`Failed`, { id: toastId });
    } finally { setDeleteLoading(false); }
  };

  const handleAssignTransaction = useCallback((txn: Transaction) => { blockIfMember(() => { setSelectedTransaction(txn); setShowAssignModal(true); }); }, [memberMode]);
  const handleToggleOne = useCallback((id: string) => { setSelectedTransactionIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const handleToggleAll = useCallback((checked: boolean) => { setSelectedTransactionIds(checked ? new Set(filteredTransactions.map(t => t.id)) : new Set()); }, [filteredTransactions]);
  const handleBulkAssignAccount = async (accountFrom: string | null, accountTo: string | null) => {
      // Logic uses accountsFrom/To arrays
      if (selectedTransactionIds.size === 0) return toast.error('No transactions selected.');
      if (!accountFrom && !accountTo) return toast.error('Please select an account.');
      const toastId = toast.loading(`Assigning accounts...`);
      let skippedCount = 0; let assignedCount = 0;
      try {
          const batch = writeBatch(db);
          const transactionsToUpdate = transactions.filter(t => selectedTransactionIds.has(t.id));
          transactionsToUpdate.forEach(txn => {
              const isMultiFrom = txn.accountsFrom && txn.accountsFrom.length > 1;
              const isMultiTo = txn.accountsTo && txn.accountsTo.length > 1;
              if (isMultiFrom || isMultiTo || txn.referenceId) { skippedCount++; return; } // Skip multi-account or linked
              const txnRef = doc(db, 'transactions', txn.id);
              if (txn.type === 'income' && accountTo) { batch.update(txnRef, { accountsTo: [accountTo], accountsFrom: [] }); assignedCount++; }
              else if (txn.type === 'expense' && accountFrom) { batch.update(txnRef, { accountsFrom: [accountFrom], accountsTo: [] }); assignedCount++; }
              else { skippedCount++; }
          });
          if (assignedCount > 0) await batch.commit();
          else if (skippedCount > 0 && assignedCount === 0) { toast.error('Cannot assign (multi/linked/type mismatch).', { id: toastId }); /* ... cleanup ... */ return; }
          if (skippedCount > 0) toast.success(`Assigned ${assignedCount}. ${skippedCount} skipped.`, { id: toastId, duration: 4000 });
          else toast.success('Updated!', { id: toastId });
          setShowAssignAccountModal(false); setSelectedTransactionIds(new Set());
      } catch (err) { console.error('Bulk assign err:', err); toast.error('Failed.', { id: toastId }); }
  };

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  // --- NEW: Recurring Engine Logic (With Catch-up & Auto-Run) ---
  useEffect(() => {
    if (loading || !transactions.length) return;
    
    const processRecurring = async () => {
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date();

      // Filter for transactions that are recurring AND due
      const dueTransactions = transactions.filter(t => 
        t.isRecurring && 
        t.nextRecurringDate && 
        isBefore(t.nextRecurringDate instanceof Timestamp ? t.nextRecurringDate.toDate() : new Date(t.nextRecurringDate), now)
      );

      if (dueTransactions.length === 0) return;

      for (const txn of dueTransactions) {
        let currentDate = txn.nextRecurringDate instanceof Timestamp ? txn.nextRecurringDate.toDate() : new Date(txn.nextRecurringDate);
        
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

            const newTxnRef = doc(collection(db, 'transactions'));
            
            // Determine if this is the future transaction
            const isLast = !isBefore(nextDate, now);

            const newTxnData: any = {
                ...txn,
                id: newTxnRef.id,
                date: currentDate, 
                createdAt: new Date(),
                createdBy: 'System (Recurring)',
                isRecurring: true, // Keep it true for all history items so badge shows
                recurringFrequency: txn.recurringFrequency,
                nextRecurringDate: isLast ? nextDate : null, // Only the future one triggers next time
            };
            
            delete newTxnData.documentUrl; 
            delete newTxnData.receiptUrl;
            
            batch.set(newTxnRef, newTxnData);
            currentDate = nextDate;
        }

        // Update old transaction: Keep isRecurring=true, but remove trigger date
        const oldTxnRef = doc(db, 'transactions', txn.id);
        batch.update(oldTxnRef, { nextRecurringDate: null });
      }

      if (updatesCount > 0) {
        try {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring transaction(s).`);
        } catch (e) { console.error("Recurring Batch Error", e); }
      }
    };
    
    processRecurring();
  }, [loading, transactions]); // Added 'transactions' dependency to auto-run on change
  // -------------------------------------

  // --- ⬇️ FIXED PDF FUNCTION ⬇️ ---
  const handleGeneratePDF = useCallback(async () => {
    try {
      toast.loading('Generating financial report...');
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const pdfBlob = await generateFinancePDF(
        filteredTransactions,
        vehicles,
        customers,
        accounts,
        totalIncome,
        totalExpenses,
        netIncome,
        profitMargin,
        totalOwingFromOwners,
        selectedOwner,
        dateRange.start,
        dateRange.end,
        companyDetails
      );
      saveAs(pdfBlob, 'finance_report.pdf');
      toast.dismiss();
      toast.success('PDF generated successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  }, [
    filteredTransactions, vehicles, customers, accounts,
    totalIncome, totalExpenses, netIncome, profitMargin,
    totalOwingFromOwners, selectedOwner, dateRange,
  ]);
  // --- ⬆️ END FIXED PDF FUNCTION ⬆️ ---

  // --- ⬇️ FIXED DOCUMENT FUNCTION ⬇️ ---
  const handleGenerateDocument = useCallback(async (transaction: Transaction) => {
    if (!user) {
      toast.error('You must be logged in to generate documents.');
      return;
    }
    try {
      toast.loading('Generating transaction document...');
      const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);
      const customer = transaction.customerId
        ? customers.find((c) => c.id === transaction.customerId)
        : null;

      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const url = await generateAndUploadDocument(
        FinanceDocument,
        {
          ...transaction,
          vehicle,
          customer: customer || { name: transaction.customerName },
        },
        'finance',
        transaction.id,
        'transactions',
        companyDetails
      );

      await updateDoc(doc(db, 'transactions', transaction.id), { documentUrl: url });

      toast.dismiss();
      toast.success('Document generated and uploaded');
      window.open(url, '_blank');
      return url;
    } catch (err) {
      console.error('Error generating document:', err);
      toast.dismiss();
      toast.error('Failed to generate document');
    }
  }, [vehicles, customers, user]);
  // --- ⬆️ END FIXED DOCUMENT FUNCTION ⬆️ ---

  // --- ⬇️ FIXED RECEIPT FUNCTION ⬇️ ---
  const handlePrintReceipt = useCallback(async (transaction: Transaction) => {
    if (!user) {
      toast.error('You must be logged in to generate a receipt.');
      return;
    }
    try {
      toast.loading('Generating receipt…');
      const vehicle    = vehicles.find(v => v.id === transaction.vehicleId);
      const customer   = transaction.customerId
                          ? customers.find(c => c.id === transaction.customerId)
                          : null;
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const url = await generateAndUploadDocument(
        ReceiptDocument,
        {
          ...transaction,
          vehicle,
          customer: customer || { name: transaction.customerName },
        },
        'finance',
        transaction.id,
        'transactions',
        companyDetails
      );

      const txRef = doc(db, 'transactions', transaction.id);
      await updateDoc(txRef, { receiptUrl: url });

      toast.dismiss();
      toast.success('Receipt generated and uploaded');
      window.open(url, '_blank');
      return url;
    } catch (err) {
      console.error('Error generating receipt:', err);
      toast.dismiss();
      toast.error('Failed to generate receipt');
    }
  }, [vehicles, customers, user]);
  // --- ⬆️ END FIXED RECEIPT FUNCTION ⬆️ ---
  
  // --- ⬇️ FIXED EXPORT FUNCTION (WITH UPGRADES) ⬇️ ---
  const handleExport = useCallback(() => {
    try {
      const data = filteredTransactions.map((txn) => {
        // Helper to format dates safely
        const safeFormatDate = (date: any): string => {
            if (!date) return '';
            if (date instanceof Date) return date.toLocaleDateString();
            if (date.toDate) return date.toDate().toLocaleDateString();
            try { return new Date(date).toLocaleDateString(); } catch { return 'Invalid Date'; }
        };

        return {
          'Date': safeFormatDate(txn.date),
          'Type': txn.type,
          'Category': txn.category,
          'Description': txn.description,
          'Amount': txn.amount,
          'Payment Status': txn.paymentStatus,
          'Account From': (txn.accountsFrom || []).map(id => accounts.find(a => a.id === id)?.name || id).join(', '),
          'Account To': (txn.accountsTo || []).map(id => accounts.find(a => a.id === id)?.name || id).join(', '),
          'Group': groups.find(g => g.id === txn.groupId)?.name || '',
          'Payment Reference': txn.paymentReference || '',
          'Vehicle Name': txn.vehicleName || '',
          'Vehicle Reg': vehicles.find((v) => v.id === txn.vehicleId)?.registrationNumber || '',
          'Owner': txn.vehicleOwner?.name || '',
          'Customer Name': customers.find((c) => c.id === txn.customerId)?.name || txn.customerName || '',
          // --- NEW EXPORT FIELD ---
          'Recurring': txn.isRecurring ? `Yes (${txn.recurringFrequency})` : 'No',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Report');
      XLSX.writeFile(workbook, 'finance_report.xlsx');
      toast.success('Finance data exported to Excel!');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      toast.error('Failed to export data to Excel.');
    }
  }, [filteredTransactions, vehicles, customers, accounts, groups]); // Added groups and accounts
  // --- ⬆️ END FIXED EXPORT FUNCTION ⬆️ ---

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>; // Enhanced loading indicator
  if (error) return <div className="text-center py-10 text-red-600 font-semibold">Error loading financial data: {error}</div>; // Enhanced error message

  return (
    <div className="space-y-6 p-4 md:p-6"> {/* Added padding */}
      
      {/* --- ⬇️ FIXED DATA PROP ⬇️ --- */}
      <FinancialSummary 
        totalIncome={totalIncome} 
        totalExpenses={totalExpenses} 
        netIncome={netIncome} 
        profitMargin={profitMargin} 
        totalOwingFromOwners={totalOwingFromOwners} 
        accounts={accounts} 
        transactions={filteredTransactions} // <-- THIS IS THE FIX
      />
      {/* --- ⬆️ END FIXED DATA PROP ⬆️ --- */}

      <FinanceHeader 
          onSearch={setSearchQuery} 
          onImport={() => toast.error('Import not implemented.')} 
          onExport={handleExport} 
          onAddIncome={() => blockIfMember(() => setShowAddIncome(true))} 
          onAddExpense={() => blockIfMember(() => setShowAddExpense(true))} 
          onGeneratePDF={handleGeneratePDF} period="month" onPeriodChange={() => {}} type={type} onTypeChange={setType} onManageGroups={() => blockIfMember(() => setManageOpen(true))} onManageCategories={() => blockIfMember(() => setShowCatModal(true))} onManageAccounts={() => blockIfMember(() => setShowManageAccountsModal(true))} 
          // --- NEW PROP ---
          onAddRecurring={() => blockIfMember(() => setShowRecurringModal(true))}
      />
      
      <FinanceFilters 
          type={type} onTypeChange={setType} searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={paymentStatus} onStatusFilterChange={setPaymentStatus} categoryFilter={category} onCategoryFilterChange={setCategory} dateRange={dateRange} onDateRangeChange={setDateRange} accountFilter={accountFilter} onAccountFilterChange={setAccountFilter} accounts={accounts} owner={selectedOwner} onOwnerChange={setSelectedOwner} owners={owners} customers={customers} selectedCustomerId={selectedCustomerId} onCustomerChange={setSelectedCustomerId} accountSummary={accountSummary} categories={financeCategories.map((c) => c.name)} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))} showLinked={showLinked} onShowLinkedChange={setShowLinked} 
          // --- NEW PROPS ---
          recurringFilter={recurringFilter} 
          onRecurringFilterChange={setRecurringFilter}
      />

      {selectedTransactionIds.size > 0 && !memberMode && ( <div className="bg-blue-50 border border-blue-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm"> <span className="font-medium text-sm text-blue-800">{selectedTransactionIds.size} transaction(s) selected</span> <button onClick={() => setShowAssignAccountModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"> Assign Account </button> </div> )}

      <TransactionTable transactions={filteredTransactions} vehicles={vehicles} customers={customers} accounts={accounts} onView={handleViewTransaction} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} onGenerateDocument={handleGenerateDocument} onViewDocument={(url) => window.open(url, '_blank', 'noopener,noreferrer')} onPrintReceipt={handlePrintReceipt} onAssign={handleAssignTransaction} groups={groups.map((g) => ({ id: g.id, name: g.name }))} selectedIds={selectedTransactionIds} onToggleOne={handleToggleOne} onToggleAll={handleToggleAll} />

      {/* --- Modals --- */}
      <Modal isOpen={showAddIncome || showAddExpense} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} title={`Add ${showAddIncome ? 'Income' : 'Expense'}`} size="xl"><TransactionForm type={showAddIncome ? 'income' : 'expense'} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} /></Modal>
      
      {/* --- NEW: Recurring Modal --- */}
      <Modal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Add Recurring Transaction" size="xl">
          <TransactionForm 
              type="income" // Default, but form handles switching
              initialIsRecurring={true} // Forces recurring logic in form
              accounts={accounts} 
              vehicles={vehicles} 
              customers={customers} 
              onClose={() => setShowRecurringModal(false)} 
          />
      </Modal>
      {/* --------------------------- */}

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} title="Edit Transaction" size="xl">{selectedTransaction && (<TransactionForm type={selectedTransaction.type} transaction={selectedTransaction} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} />)}</Modal>
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }} title="Transaction Details" size="xl">{selectedTransaction && ( <TransactionDetails transaction={selectedTransaction} vehicle={vehicles.find(v => v.id === selectedTransaction.vehicleId)} customer={customers.find(c => c.id === selectedTransaction.customerId)} accounts={accounts} /> )}</Modal>
      <ManageGroupsModal open={manageOpen} onClose={() => { setManageOpen(false); loadGroups(); }} />
      <AssignGroupCategoryModal
        open={showAssignModal}
        txn={selectedTransaction}
        groups={groups}
        categories={financeCategories}
        accounts={accounts} // Pass accounts here
        onClose={() => { setShowAssignModal(false); setSelectedTransaction(null); }}
        onAssigned={() => { setShowAssignModal(false); setSelectedTransaction(null); /* Consider refresh */ }}
      />
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} title="Delete Transaction" size="sm">{selectedTransaction && ( <TransactionDeleteModal transactionId={selectedTransaction.id} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} onDeleted={handleConfirmDeleteSingle} /> )}</Modal>
      <Modal isOpen={showManageAccountsModal} onClose={() => setShowManageAccountsModal(false)} title="Manage Accounts" size="xl"><ManageAccountsModal onClose={() => setShowManageAccountsModal(false)} accounts={accounts} transactions={transactions} /></Modal>
      <Modal isOpen={showAssignAccountModal} onClose={() => setShowAssignAccountModal(false)} title="Assign Account to Selected Transactions" size="md"><BulkAssignAccountForm accounts={accounts} onClose={() => setShowAssignAccountModal(false)} onAssign={handleBulkAssignAccount} transactionCount={selectedTransactionIds.size} /></Modal>
      {/* Updated Delete Modal for OLD linked records */}
      <Modal isOpen={showDeleteLinkedModal} onClose={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} title="Delete Linked Transaction?" size="md"><div className="p-1"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="ml-4 mt-0 text-left"><h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3><div className="mt-2"><p className="text-sm text-gray-500">This transaction appears linked to {linkedTransactionsToDelete ? linkedTransactionsToDelete.length - 1 : 0} other(s) (old format). Delete only this one, or all linked parts?</p></div></div></div><div className="mt-6 flex flex-col sm:flex-row-reverse gap-3"><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteLinked} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 sm:w-auto">{deleteLoading ? "Deleting..." : `Delete All ${linkedTransactionsToDelete?.length || 0} Linked`}</button><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteSingle} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:w-auto">{deleteLoading ? "..." : "Delete Only This One"}</button><button type="button" disabled={deleteLoading} onClick={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></Modal>
      <Modal isOpen={showCatModal} onClose={() => { setShowCatModal(false); setEditCat(null); setCatName(''); }} title={editCat ? 'Edit Category' : 'Add Category'} size="md"><form onSubmit={handleCatSubmit} className="flex items-center space-x-2 mb-4"><input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" required className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none" /><button type="submit" disabled={loadingCats} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{loadingCats ? 'Saving...' : (editCat ? 'Update' : 'Add')}</button><button type="button" onClick={() => { setShowCatModal(false); setEditCat(null); setCatName(''); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">Cancel</button></form><div className="max-h-56 overflow-y-auto">{loadingCats ? <div className="text-gray-500 text-sm">Loading…</div> : (<ul className="space-y-2">{financeCategories.map((c) => (<li key={c.id} className="flex justify-between items-center border-b pb-1"><span className="text-gray-700">{c.name}</span><div className="space-x-2"><button onClick={() => openCatForm(c)} disabled={loadingCats}><Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" /></button><button onClick={() => handleCatDelete(c.id)} disabled={loadingCats || c.name === 'Transfer' || c.name === 'Loan Received' || c.name === 'Loan Provided'} className={`${(c.name === 'Transfer' || c.name === 'Loan Received' || c.name === 'Loan Provided') ? 'opacity-50 cursor-not-allowed' : ''}`}><Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" /></button></div></li>))}{financeCategories.length === 0 && <li className="text-gray-500 text-sm">No categories found.</li>}</ul>)}</div></Modal>

    </div>
  );
};

const BulkAssignAccountForm: React.FC<{ accounts: Account[]; onClose: () => void; onAssign: (accountFrom: string | null, accountTo: string | null) => void; transactionCount: number; }> = ({ accounts, onClose, onAssign, transactionCount }) => {
  const [selectedAccountFrom, setSelectedAccountFrom] = useState<string>('');
  const [selectedAccountTo, setSelectedAccountTo] = useState<string>('');
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onAssign(selectedAccountFrom || null, selectedAccountTo || null); };
  return (
    <form onSubmit={handleSubmit} className="p-1">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Assign accounts to the <strong className="text-gray-800">{transactionCount}</strong> selected transaction(s). Multi-account or linked transactions will be skipped.<br />Expenses will be assigned 'Account From', and Incomes will be assigned 'Account To'.</p>
        <div><label htmlFor="bulk-account-from" className="block text-sm font-medium text-gray-700">Account From (for Expenses)</label><select id="bulk-account-from" value={selectedAccountFrom} onChange={(e) => setSelectedAccountFrom(e.target.value)} className="form-select mt-1 w-full"><option value="">-- Optional --</option>{accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}</select></div>
        <div><label htmlFor="bulk-account-to" className="block text-sm font-medium text-gray-700">Account To (for Incomes)</label><select id="bulk-account-to" value={selectedAccountTo} onChange={(e) => setSelectedAccountTo(e.target.value)} className="form-select mt-1 w-full"><option value="">-- Optional --</option>{accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}</select></div>
      </div>
      <div className="flex justify-end space-x-3 pt-6"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={!selectedAccountFrom && !selectedAccountTo} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">Assign</button></div>
    </form>
  );
};

export default Finance;