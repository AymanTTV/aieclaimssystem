// src/pages/Finance.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Updated Import for PDF generation
import { pdf } from '@react-pdf/renderer'; 
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
import { addDays, addWeeks, addMonths, addYears, isBefore } from 'date-fns'; 

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRunRecurringCheck = useRef(false);
  const isProcessingRecurring = useRef(false);

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
  
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteLinkedModal, setShowDeleteLinkedModal] = useState(false); 
  const [linkedTransactionsToDelete, setLinkedTransactionsToDelete] = useState<Transaction[] | null>(null); 
  const [deleteLoading, setDeleteLoading] = useState(false);

  // --- BULK SELECTION STATE ---
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false); 

  const [showCatModal, setShowCatModal] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name'));
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
      .then((docs) => setFinanceCategories(docs.sort((a,b)=> a.name.localeCompare(b.name)))) 
      .catch((err) => { console.error('Failed to load categories:', err); toast.error('Could not load categories'); })
      .finally(() => setLoadingCats(false));
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCatForm = (cat?: { id: string; name: string }) => { if (cat) { setEditCat(cat); setCatName(cat.name); } else { setEditCat(null); setCatName(''); } setShowCatModal(true); };
  const handleCatSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!catName.trim()) { toast.error('Name required'); return; } setLoadingCats(true); try { if (editCat) { await financeCategoryService.update(editCat.id, { name: catName.trim() }); toast.success('Updated'); } else { await financeCategoryService.create({ name: catName.trim() }); toast.success('Created'); } setShowCatModal(false); setEditCat(null); setCatName(''); loadCategories(); } catch (err) { console.error('Err save cat:', err); toast.error('Failed'); } finally { setLoadingCats(false); } };
  const handleCatDelete = async (catId: string) => { const cat = financeCategories.find(c => c.id === catId); if (cat?.name === 'Transfer' || cat?.name === 'Loan Received' || cat?.name === 'Loan Provided') { toast.error(`Cannot delete essential category: "${cat.name}"`); return; } if (!window.confirm(`Delete "${cat?.name || catId}"?`)) return; setLoadingCats(true); try { await financeCategoryService.delete(catId); setFinanceCategories(prev => prev.filter(c => c.id !== catId)); toast.success('Deleted'); } catch (err) { console.error('Err delete cat:', err); toast.error('Failed'); loadCategories(); } finally { setLoadingCats(false); } };

  const visibleTransactions: Transaction[] = useMemo(() => { if (!memberMode) return transactions; const scopeId = memberCustomerId ?? derivedCustomerId; if (!scopeId) return []; return transactions.filter((t) => t.customerId === scopeId); }, [transactions, memberMode, memberCustomerId, derivedCustomerId]);

  const { 
      searchQuery, setSearchQuery, 
      type, setType, 
      category, setCategory, 
      groupFilter, setGroupFilter, 
      paymentStatus, setPaymentStatus, 
      dateRange, setDateRange, 
      selectedCustomerId, setSelectedCustomerId, 
      selectedOwner, setSelectedOwner, 
      owners, filteredTransactions, 
      accountFilter, setAccountFilter, 
      showLinked, setShowLinked, 
      recurringFilter, setRecurringFilter, 
      recurringFrequency, setRecurringFrequency,
      accountSummary, 
      totalOwingFromOwners,
      totalOwingFromAccounts 
  } = useFinanceFilters(visibleTransactions, vehicles, accounts, customers);

  useEffect(() => { setSelectedTransactionIds(new Set()); }, [searchQuery, type, category, paymentStatus, dateRange, selectedCustomerId, selectedOwner, accountFilter, groupFilter, showLinked, recurringFilter]);

  const blockIfMember = (fn: () => void) => { if (!memberMode) return fn(); toast.error('Action disabled.'); };
  const handleViewTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowDetailsModal(true); }, []);
  const handleEditTransaction = useCallback((txn: Transaction) => { blockIfMember(() => { setSelectedTransaction(txn); setShowEditModal(true); }); }, [memberMode]);

  const handleToggleOne = useCallback((id: string) => {
    setSelectedTransactionIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedTransactionIds(checked ? new Set(filteredTransactions.map(t => t.id)) : new Set());
  }, [filteredTransactions]);

  const handleBulkDeleteClick = () => {
    if (selectedTransactionIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteLoading(true);
    const toastId = toast.loading(`Deleting ${selectedTransactionIds.size} transactions...`);

    try {
      const batch = writeBatch(db);
      selectedTransactionIds.forEach(id => {
        batch.delete(doc(db, 'transactions', id));
      });
      await batch.commit();
      
      toast.success('Transactions deleted successfully', { id: toastId });
      setSelectedTransactionIds(new Set()); 
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete transactions', { id: toastId });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDeleteTransaction = useCallback((txn: Transaction) => {
    blockIfMember(() => {
      setSelectedTransaction(txn); 
      if (txn.referenceId) {
        const linkedPair = transactions.filter(t => t.referenceId === txn.referenceId && t.id !== txn.id);
        if (linkedPair.length > 0 && (txn.category === 'Transfer' || linkedPair[0].category === 'Transfer' || (txn.category !== 'Loan Provided' && linkedPair[0].category !== 'Loan Provided'))) {
          setLinkedTransactionsToDelete([txn, ...linkedPair]);
          setShowDeleteLinkedModal(true);
          return; 
        }
      }
      setShowDeleteModal(true);
    });
  }, [memberMode, transactions]);

  const handleConfirmDeleteSingle = async () => {
    if (!selectedTransaction) return;
    setDeleteLoading(true);
    const toastId = toast.loading(`Deleting transaction...`);
    const transactionIdToDelete = selectedTransaction.id;
    try {
      await deleteDoc(doc(db, 'transactions', transactionIdToDelete));
      toast.success("Transaction deleted", { id: toastId });
      setShowDeleteLinkedModal(false); setShowDeleteModal(false);
      setLinkedTransactionsToDelete(null); setSelectedTransaction(null);
    } catch (err) { console.error("Error deleting single:", err); toast.error("Failed", { id: toastId });
    } finally { setDeleteLoading(false); }
  };

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

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  useEffect(() => {
    if (loading || transactions.length === 0 || hasRunRecurringCheck.current || isProcessingRecurring.current) return;
    
    const processRecurring = async () => {
      isProcessingRecurring.current = true;
      hasRunRecurringCheck.current = true; 
      
      const batch = writeBatch(db);
      let updatesCount = 0;
      const now = new Date();

      const dueTransactions = transactions.filter(t => 
        t.isRecurring && 
        t.nextRecurringDate && 
        isBefore(t.nextRecurringDate instanceof Timestamp ? t.nextRecurringDate.toDate() : new Date(t.nextRecurringDate), now)
      );

      const processedThisRun = new Set<string>();

      for (const txn of dueTransactions) {
        if (processedThisRun.has(txn.id)) continue;
        processedThisRun.add(txn.id);

        let currentDate = txn.nextRecurringDate instanceof Timestamp ? txn.nextRecurringDate.toDate() : new Date(txn.nextRecurringDate);
        let loopSafety = 0; 

        while (isBefore(currentDate, now) && loopSafety < 50) {
            updatesCount++;
            loopSafety++;
            
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
            const newTxnRef = doc(collection(db, 'transactions'));
            const newTxnData: any = {
                ...txn,
                id: newTxnRef.id,
                date: currentDate, 
                createdAt: new Date(),
                createdBy: 'System (Recurring)',
                isRecurring: true,
                recurringFrequency: txn.recurringFrequency,
                nextRecurringDate: isLast ? nextDate : null, 
            };
            delete newTxnData.documentUrl; 
            delete newTxnData.receiptUrl;
            batch.set(newTxnRef, newTxnData);
            currentDate = nextDate;
        }
        
        const oldTxnRef = doc(db, 'transactions', txn.id);
        batch.update(oldTxnRef, { nextRecurringDate: null });
      }

      if (updatesCount > 0) {
        try {
            await batch.commit();
            toast.success(`Generated ${updatesCount} recurring transaction(s).`);
        } catch (e) { 
            console.error("Recurring Batch Error", e); 
        }
      }

      isProcessingRecurring.current = false;
    };
    
    processRecurring();
  }, [loading, transactions]); 

  // --- UPDATED PDF GENERATOR FUNCTION ---
  const handleGeneratePDF = useCallback(async () => {
    try {
      toast.loading('Generating financial report...');
      
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      // Use the PDF generator directly with component and data from state
      const blob = await pdf(
        <FinanceDocument
            data={filteredTransactions}
            vehicles={vehicles}
            accounts={accounts}
            customers={customers} // Pass customers!
            companyDetails={companyDetails}
        />
      ).toBlob();

      saveAs(blob, 'finance_report.pdf');
      
      toast.dismiss(); 
      toast.success('PDF generated successfully');
    } catch (err) { 
        console.error('Error generating PDF:', err); 
        toast.dismiss(); 
        toast.error('Failed to generate PDF'); 
    }
  }, [filteredTransactions, vehicles, customers, accounts]);

  const handleGenerateDocument = useCallback(async (transaction: Transaction) => {
    if (!user) { toast.error('You must be logged in to generate documents.'); return; }
    try {
      toast.loading('Generating transaction document...');
      const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);
      const customer = transaction.customerId ? customers.find((c) => c.id === transaction.customerId) : null;
      
      // Pass customers here too for consistency, though 'customer' prop handles specific one
      const url = await generateAndUploadDocument(
        FinanceDocument, 
        { 
            ...transaction, 
            vehicle, 
            customer: customer || { name: transaction.customerName }, 
            accounts,
            customers // Pass full list for lookup consistency if needed
        }, 
        'finance', 
        transaction.id, 
        'transactions'
      );
      
      await updateDoc(doc(db, 'transactions', transaction.id), { documentUrl: url });
      toast.dismiss(); toast.success('Document generated and uploaded'); window.open(url, '_blank'); return url;
    } catch (err) { console.error('Error generating document:', err); toast.dismiss(); toast.error('Failed to generate document'); }
  }, [vehicles, customers, user, accounts]);

  const handlePrintReceipt = useCallback(async (transaction: Transaction) => {
    if (!user) { toast.error('You must be logged in to generate a receipt.'); return; }
    try {
      toast.loading('Generating receipt…');
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
      const customer = transaction.customerId ? customers.find((c) => c.id === transaction.customerId) : null;

      const url = await generateAndUploadDocument(
        ReceiptDocument, 
        { ...transaction, vehicle, customer: customer || { name: transaction.customerName }, }, 
        'finance', 
        transaction.id, 
        'transactions', 
        'receiptUrl'
      );
      
      const txRef = doc(db, 'transactions', transaction.id);
      await updateDoc(txRef, { receiptUrl: url });
      toast.dismiss(); toast.success('Receipt generated and uploaded'); window.open(url, '_blank'); return url;
    } catch (err) { console.error('Error generating receipt:', err); toast.dismiss(); toast.error('Failed to generate receipt'); }
  }, [vehicles, customers, user]);
  
  const handleExport = useCallback(() => {
    try {
      const data = filteredTransactions.map((txn) => {
        const safeFormatDate = (date: any): string => { if (!date) return ''; if (date instanceof Date) return date.toISOString(); if (date.toDate) return date.toDate().toISOString(); try { return new Date(date).toISOString(); } catch { return ''; } };
        const getNames = (ids: string[]) => ids ? ids.map(id => accounts.find(a => a.id === id)?.name || '').filter(Boolean).join('; ') : '';
        
        return {
          'Date (ISO)': safeFormatDate(txn.date),
          'Type': txn.type,
          'Category': txn.category,
          'Amount': txn.amount,
          'Description': txn.description,
          'Payment Method': txn.paymentMethod,
          'Payment Status': txn.paymentStatus,
          'Transaction Status': txn.status || 'completed',
          'Accounts To (Names)': getNames(txn.accountsTo || []),
          'Accounts From (Names)': getNames(txn.accountsFrom || []),
          'Customer Name': customers.find((c) => c.id === txn.customerId)?.name || txn.customerName || '',
          'Vehicle Reg': vehicles.find((v) => v.id === txn.vehicleId)?.registrationNumber || '',
          'Owner Name': txn.vehicleOwner?.name || '',
          'Group': groups.find(g => g.id === txn.groupId)?.name || '',
          'Payment Reference': txn.paymentReference || '',
          'Recurring': txn.isRecurring ? 'Yes' : 'No',
          'Frequency': txn.recurringFrequency || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Report');
      XLSX.writeFile(workbook, 'finance_export.xlsx');
      toast.success('Finance data exported (Excel)');
    } catch (err) { console.error('Error exporting:', err); toast.error('Failed to export.'); }
  }, [filteredTransactions, vehicles, customers, accounts, groups]);

  const handleImportClick = () => {
      if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const toastId = toast.loading('Reading file...');
      const reader = new FileReader();

      reader.onload = async (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json(ws);

              if (!data || data.length === 0) {
                  toast.error("No data found in file", { id: toastId });
                  return;
              }

              const chunkSize = 450; 
              for (let i = 0; i < data.length; i += chunkSize) {
                  const chunk = data.slice(i, i + chunkSize);
                  const batch = writeBatch(db);

                  chunk.forEach((row: any) => {
                       const resolveAccountIds = (namesStr: string) => {
                           if (!namesStr) return [];
                           return namesStr.split(';').map(n => n.trim()).map(name => {
                               const acc = accounts.find(a => a.name === name) || accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
                               return acc ? acc.id : null;
                           }).filter(Boolean) as string[];
                       };

                       const customerName = row['Customer Name'];
                       const customer = customerName ? customers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) : null;
                       
                       const reg = row['Vehicle Reg'];
                       const vehicle = reg ? vehicles.find(v => v.registrationNumber.toLowerCase() === reg.toLowerCase()) : null;

                       const groupName = row['Group'];
                       const group = groupName ? groups.find(g => g.name.toLowerCase() === groupName.toLowerCase()) : null;

                       const ref = doc(collection(db, 'transactions'));
                       
                       const newTxn: any = {
                           id: ref.id,
                           date: row['Date (ISO)'] ? new Date(row['Date (ISO)']) : new Date(),
                           type: (row['Type'] === 'income' || row['Type'] === 'expense') ? row['Type'] : 'expense',
                           category: row['Category'] || 'Uncategorized',
                           amount: parseFloat(row['Amount']) || 0,
                           description: row['Description'] || '',
                           paymentMethod: row['Payment Method'] || 'cash',
                           paymentStatus: row['Payment Status'] || 'paid',
                           status: row['Transaction Status'] || 'completed',
                           
                           accountsTo: resolveAccountIds(row['Accounts To (Names)']),
                           accountsFrom: resolveAccountIds(row['Accounts From (Names)']),
                           
                           customerId: customer ? customer.id : null,
                           customerName: customerName || null,
                           
                           vehicleId: vehicle ? vehicle.id : null,
                           vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : null,
                           vehicleOwner: vehicle ? (vehicle.owner || { name: 'AIE Skyline Limited', isDefault: true }) : null,

                           groupId: group ? group.id : null,
                           paymentReference: row['Payment Reference'] || null,
                           
                           isRecurring: row['Recurring'] === 'Yes',
                           recurringFrequency: row['Frequency'] || null,
                           
                           createdAt: new Date(),
                           createdBy: user?.name || 'Import',
                       };

                       batch.set(ref, newTxn);
                  });
                  
                  await batch.commit();
                  console.log(`Committed batch ${i/chunkSize + 1}`);
              }
              
              toast.success(`Imported ${data.length} transactions successfully`, { id: toastId });
              if (fileInputRef.current) fileInputRef.current.value = ''; 

          } catch (err) {
              console.error("Import Error", err);
              toast.error("Failed to import file. Check format.", { id: toastId });
          }
      };
      reader.readAsBinaryString(file);
  };


  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (error) return <div className="text-center py-10 text-red-600 font-semibold">Error loading financial data: {error}</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      
      <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileImport} />

      <FinancialSummary 
        totalIncome={totalIncome} 
        totalExpenses={totalExpenses} 
        netIncome={netIncome} 
        profitMargin={profitMargin} 
        totalOwingFromOwners={totalOwingFromOwners} 
        totalOwingFromAccounts={totalOwingFromAccounts} 
        accounts={accounts} 
        transactions={filteredTransactions} 
      />
      
      <FinanceHeader 
          onSearch={setSearchQuery} 
          onImport={() => blockIfMember(handleImportClick)} 
          onExport={handleExport} 
          onAddIncome={() => blockIfMember(() => setShowAddIncome(true))} 
          onAddExpense={() => blockIfMember(() => setShowAddExpense(true))} 
          onAddRecurring={() => blockIfMember(() => setShowRecurringModal(true))} 
          onGeneratePDF={handleGeneratePDF} period="month" onPeriodChange={() => {}} type={type} onTypeChange={setType} onManageGroups={() => blockIfMember(() => setManageOpen(true))} onManageCategories={() => blockIfMember(() => setShowCatModal(true))} onManageAccounts={() => blockIfMember(() => setShowManageAccountsModal(true))} 
      />
      
      <FinanceFilters 
          type={type} onTypeChange={setType} searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={paymentStatus} onStatusFilterChange={setPaymentStatus} categoryFilter={category} onCategoryFilterChange={setCategory} dateRange={dateRange} onDateRangeChange={setDateRange} accountFilter={accountFilter} onAccountFilterChange={setAccountFilter} accounts={accounts} owner={selectedOwner} onOwnerChange={setSelectedOwner} owners={owners} customers={customers} selectedCustomerId={selectedCustomerId} onCustomerChange={setSelectedCustomerId} accountSummary={accountSummary} categories={financeCategories.map((c) => c.name)} groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))} showLinked={showLinked} onShowLinkedChange={setShowLinked} 
          
          recurringFilter={recurringFilter} 
          onRecurringFilterChange={setRecurringFilter}
          recurringFrequency={recurringFrequency}
          onRecurringFrequencyChange={setRecurringFrequency}
      />

      {selectedTransactionIds.size > 0 && !memberMode && user?.role === 'manager' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm text-blue-800">{selectedTransactionIds.size} transaction(s) selected</span>
          <button 
            onClick={handleBulkDeleteClick}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete {selectedTransactionIds.size} Records
          </button>
        </div>
      )}

      <TransactionTable 
        transactions={filteredTransactions} 
        vehicles={vehicles} 
        customers={customers} 
        accounts={accounts} 
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        onView={handleViewTransaction} 
        onEdit={handleEditTransaction} 
        onDelete={handleDeleteTransaction} 
        onGenerateDocument={handleGenerateDocument} 
        onViewDocument={(url) => window.open(url, '_blank', 'noopener,noreferrer')} 
        onPrintReceipt={handlePrintReceipt} 
        onAssign={handleAssignTransaction} 
        
        // Removed accountBalances prop

        isManager={user?.role === 'manager'}
        selectedIds={selectedTransactionIds}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
      />

      <Modal isOpen={showAddIncome || showAddExpense} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} title={`Add ${showAddIncome ? 'Income' : 'Expense'}`} size="xl"><TransactionForm type={showAddIncome ? 'income' : 'expense'} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} /></Modal>
      
      <Modal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Add Recurring Transaction" size="xl">
          <TransactionForm type="income" initialIsRecurring={true} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => setShowRecurringModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} title="Edit Transaction" size="xl">{selectedTransaction && (<TransactionForm type={selectedTransaction.type} transaction={selectedTransaction} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} />)}</Modal>
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }} title="Transaction Details" size="xl">{selectedTransaction && ( <TransactionDetails transaction={selectedTransaction} vehicle={vehicles.find(v => v.id === selectedTransaction.vehicleId)} customer={customers.find(c => c.id === selectedTransaction.customerId)} accounts={accounts} /> )}</Modal>
      <ManageGroupsModal open={manageOpen} onClose={() => { setManageOpen(false); loadGroups(); }} />
      <AssignGroupCategoryModal open={showAssignModal} txn={selectedTransaction} groups={groups} categories={financeCategories} accounts={accounts} onClose={() => { setShowAssignModal(false); setSelectedTransaction(null); }} onAssigned={() => { setShowAssignModal(false); setSelectedTransaction(null); }} />
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} title="Delete Transaction" size="sm">{selectedTransaction && ( <TransactionDeleteModal transactionId={selectedTransaction.id} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} onDeleted={handleConfirmDeleteSingle} /> )}</Modal>
      <Modal isOpen={showManageAccountsModal} onClose={() => setShowManageAccountsModal(false)} title="Manage Accounts" size="xl"><ManageAccountsModal onClose={() => setShowManageAccountsModal(false)} accounts={accounts} transactions={transactions} /></Modal>
      <Modal isOpen={showDeleteLinkedModal} onClose={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} title="Delete Linked Transaction?" size="md"><div className="p-1"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="ml-4 mt-0 text-left"><h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3><div className="mt-2"><p className="text-sm text-gray-500">This transaction appears linked to {linkedTransactionsToDelete ? linkedTransactionsToDelete.length - 1 : 0} other(s) (old format). Delete only this one, or all linked parts?</p></div></div></div><div className="mt-6 flex flex-col sm:flex-row-reverse gap-3"><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteLinked} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 sm:w-auto">{deleteLoading ? "Deleting..." : `Delete All ${linkedTransactionsToDelete?.length || 0} Linked`}</button><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteSingle} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:w-auto">{deleteLoading ? "..." : "Delete Only This One"}</button><button type="button" disabled={deleteLoading} onClick={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></Modal>
      <Modal isOpen={showCatModal} onClose={() => { setShowCatModal(false); setEditCat(null); setCatName(''); }} title={editCat ? 'Edit Category' : 'Add Category'} size="md"><form onSubmit={handleCatSubmit} className="flex items-center space-x-2 mb-4"><input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" required className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none" /><button type="submit" disabled={loadingCats} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{loadingCats ? 'Saving...' : (editCat ? 'Update' : 'Add')}</button><button type="button" onClick={() => { setShowCatModal(false); setEditCat(null); setCatName(''); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">Cancel</button></form><div className="max-h-56 overflow-y-auto">{loadingCats ? <div className="text-gray-500 text-sm">Loading…</div> : (<ul className="space-y-2">{financeCategories.map((c) => (<li key={c.id} className="flex justify-between items-center border-b pb-1"><span className="text-gray-700">{c.name}</span><div className="space-x-2"><button onClick={() => openCatForm(c)} disabled={loadingCats}><Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" /></button><button onClick={() => handleCatDelete(c.id)} disabled={loadingCats || c.name === 'Transfer' || c.name === 'Loan Received' || c.name === 'Loan Provided'} className={`${(c.name === 'Transfer' || c.name === 'Loan Received' || c.name === 'Loan Provided') ? 'opacity-50 cursor-not-allowed' : ''}`}><Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" /></button></div></li>))}{financeCategories.length === 0 && <li className="text-gray-500 text-sm">No categories found.</li>}</ul>)}</div></Modal>

      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Confirm Bulk Delete" size="sm">
       <div className="p-1">
         <div className="flex items-start">
           <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
             <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
           </div>
           <div className="ml-4 mt-0 text-left">
             <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Transactions</h3>
             <div className="mt-2">
               <p className="text-sm text-gray-500">
                 Are you sure you want to delete these <span className="font-bold">{selectedTransactionIds.size}</span> transactions? This action cannot be undone.
               </p>
             </div>
           </div>
         </div>
         <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
           <button type="button" disabled={bulkDeleteLoading} onClick={confirmBulkDelete} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto disabled:opacity-50">
             {bulkDeleteLoading ? 'Deleting...' : 'Delete'}
           </button>
           <button type="button" disabled={bulkDeleteLoading} onClick={() => setShowBulkDeleteConfirm(false)} className="mt-3 inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto disabled:opacity-50">
             Cancel
           </button>
         </div>
       </div>
      </Modal>

    </div>
  );
};

export default Finance;