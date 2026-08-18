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
import SearchableSelect from '../components/ui/SearchableSelect';
import { pdf } from '@react-pdf/renderer'; 
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { doc, updateDoc, collection, query, onSnapshot, writeBatch, deleteDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx'; 
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';
import financeCategoryService from '../services/financeCategory.service';
import { Edit2, Trash2, AlertTriangle, FileUp, Layers } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears, isBefore, format } from 'date-fns'; 
import { v4 as uuidv4 } from 'uuid';

const getNextInvoiceNumber = async (): Promise<string> => {
  const invoicesRef = collection(db, 'invoices');
  const q = query(invoicesRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  let maxNum = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data() as any;
    if (data.invoiceNumber && data.invoiceNumber.startsWith('INV')) {
      const numPart = data.invoiceNumber.substring(3);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `INV${String(nextNum).padStart(4, '0')}`;
};

const TransferToInvoiceModalContent = ({ selectedTxns, customers, vehicles, accounts, groups, user, onClose, onSuccess }: any) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultCustomerId = useMemo(() => selectedTxns.find((t: any) => t.customerId)?.customerId || '', [selectedTxns]);
  const defaultVehicleId = useMemo(() => selectedTxns.find((t: any) => t.vehicleId)?.vehicleId || '', [selectedTxns]);
  const defaultCategory = useMemo(() => selectedTxns.find((t: any) => t.category)?.category || '', [selectedTxns]);
  const defaultGroupId = useMemo(() => selectedTxns.find((t: any) => t.groupId)?.groupId || '', [selectedTxns]);
  const defaultAccountFrom = useMemo(() => selectedTxns.find((t: any) => t.accountsFrom && t.accountsFrom.length > 0)?.accountsFrom[0] || '', [selectedTxns]);
  const defaultAccountTo = useMemo(() => selectedTxns.find((t: any) => t.accountsTo && t.accountsTo.length > 0)?.accountsTo[0] || '', [selectedTxns]);
  
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [category, setCategory] = useState(defaultCategory);
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [accountFrom, setAccountFrom] = useState(defaultAccountFrom);
  const [accountTo, setAccountTo] = useState(defaultAccountTo);
  const [isLoan, setIsLoan] = useState(true);
  
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [showLoanConfirm, setShowLoanConfirm] = useState(false);
  
  const [invoiceCategories, setInvoiceCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'invoiceCategories'));
        const cats: string[] = [];
        snap.forEach(s => cats.push((s.data() as any).name));
        cats.sort((a, b) => a.localeCompare(b));
        setInvoiceCategories(cats);
        if (cats.length > 0 && !defaultCategory) {
            setCategory(cats[0]);
        }
      } catch (error) {
        console.error('Error fetching invoice categories:', error);
      }
    };
    fetchCategories();
  }, [defaultCategory]);

  const totalAmount = useMemo(() => selectedTxns.reduce((sum: number, t: any) => sum + (t.amount || 0), 0), [selectedTxns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Transferring to Invoices...');
    try {
      const cust = customers.find((c: any) => c.id === customerId);
      const veh = vehicles.find((v: any) => v.id === vehicleId);

      let currentMaxStr = await getNextInvoiceNumber(); 
      let currentMaxNum = parseInt(currentMaxStr.substring(3), 10);

      const batch = writeBatch(db);

      selectedTxns.forEach((t: any) => {
        const invoiceRef = doc(collection(db, 'invoices'));
        const invNumber = `INV${String(currentMaxNum).padStart(4, '0')}`;
        currentMaxNum++; 

        const recordDesc = t.description || t.category || 'Finance Record';
        const hasVat = (t.vatAmount && t.vatAmount > 0) ? true : false;
        const lineItemUnitPrice = hasVat ? (t.netAmount || t.amount) : (t.amount || 0);

        const lineItems = [{
          id: uuidv4(),
          description: recordDesc, 
          quantity: 1,
          unitPrice: lineItemUnitPrice, 
          discount: 0,
          includeVAT: hasVat
        }];

        let finalCategory = category || t.category || 'General';
        let customCat = null;
        if (finalCategory !== 'Other' && !invoiceCategories.includes(finalCategory)) {
           customCat = finalCategory;
           finalCategory = 'Other';
        }

        const invoiceData = {
          invoiceNumber: invNumber, 
          date: t.date instanceof Timestamp ? t.date.toDate() : (t.date ? new Date(t.date) : new Date()),
          dueDate: new Date(dueDate),
          customerId: cust?.id || t.customerId || null,
          customerName: cust?.name || t.customerName || 'Manual Customer',
          customerPhone: cust?.mobile || '',
          vehicleId: veh?.id || t.vehicleId || null,
          vehicleName: veh ? `${veh.make} ${veh.model} (${veh.registrationNumber})` : (t.vehicleName || null),
          lineItems, 
          subTotal: t.netAmount || t.amount || 0,
          vatAmount: t.vatAmount || 0,
          total: t.amount || 0,
          amount: t.amount || 0,
          paidAmount: 0,
          remainingAmount: t.amount || 0,
          paymentStatus: 'unpaid',
          category: finalCategory,
          customCategory: customCat,
          description: recordDesc, 
          payments: [], 
          isLoan, 
          accountFrom: accountFrom || (t.accountsFrom && t.accountsFrom.length > 0 ? t.accountsFrom[0] : null), 
          accountTo: accountTo || (t.accountsTo && t.accountsTo.length > 0 ? t.accountsTo[0] : null),     
          groupId: groupId || t.groupId || null,
          createdAt: new Date(),
          updatedAt: new Date(), 
          createdBy: user?.id || 'system'
        };

        batch.set(invoiceRef, invoiceData);

        if (deleteOriginals) {
          batch.delete(doc(db, 'transactions', t.id));
        } else {
          batch.update(doc(db, 'transactions', t.id), { referenceId: invoiceRef.id });
        }
      });

      await batch.commit();
      toast.success('Successfully transferred to Invoices!', { id: toastId });
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create invoices.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-end mb-2">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isLoan}
            onChange={e => {
              if (e.target.checked) {
                setShowLoanConfirm(true);
              } else {
                setIsLoan(false);
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-700">Is it a Loan?</span>
        </label>
      </div>

      <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100 mb-4">
         <p className="text-sm text-indigo-800 font-medium">You are transferring {selectedTxns.length} record(s). Each will generate a separate Invoice.</p>
         <p className="text-xl font-bold text-indigo-900 mt-1">Total Value: £{totalAmount.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <SearchableSelect
           label="Account From (Debit)"
           options={(accounts || []).map((a: any) => ({ id: a.id, label: a.name }))}
           value={accountFrom}
           onChange={(val) => setAccountFrom(val || '')}
           placeholder="Select source account..."
         />
         <SearchableSelect
           label="Account To (Credit)"
           options={(accounts || []).map((a: any) => ({ id: a.id, label: a.name }))}
           value={accountTo}
           onChange={(val) => setAccountTo(val || '')}
           placeholder="Select destination account..."
         />

         <SearchableSelect
           label="Assign Customer"
           options={customers.map((c: any) => ({ id: c.id, label: c.name, subLabel: c.mobile }))}
           value={customerId}
           onChange={(val) => setCustomerId(val || '')}
           placeholder="Search customers..."
         />
         <SearchableSelect
           label="Assign Vehicle (Optional)"
           options={vehicles.map((v: any) => ({ 
               id: v.id, 
               label: `${v.make} ${v.model} (${v.registrationNumber})`, 
               subLabel: v.registrationNumber 
           }))}
           value={vehicleId}
           onChange={(val) => setVehicleId(val || '')}
           placeholder="Search vehicles..."
         />
         
         <div>
            <label className="block text-sm font-medium text-gray-700">Invoice Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
              required
            >
              <option value="" disabled>Select Category...</option>
              {invoiceCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Other">Other</option>
            </select>
         </div>

         <SearchableSelect
           label="Assign Group (Optional)"
           options={(groups || []).map((g: any) => ({ id: g.id, label: g.name }))}
           value={groupId}
           onChange={(val) => setGroupId(val || '')}
           placeholder="Search groups..."
         />

         <div>
           <label className="block text-sm font-medium text-gray-700">Due Date</label>
           <input 
             type="date" 
             value={dueDate} 
             onChange={(e) => setDueDate(e.target.value)} 
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" 
             required 
           />
         </div>
      </div>

      <div className="mt-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
         <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-1">Records Preview</h4>
         {selectedTxns.map((t: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm py-1.5 px-2 border-b last:border-0 border-gray-200 hover:bg-gray-100">
               <span className="truncate pr-4">{t.description || t.category || 'Unnamed Record'}</span>
               <span className="font-medium whitespace-nowrap">£{(t.amount || 0).toFixed(2)}</span>
            </div>
         ))}
      </div>

      <div className="pt-4 border-t border-gray-100 flex flex-col space-y-4">
         <label className="flex items-center space-x-2 cursor-pointer bg-red-50 p-3 rounded-md border border-red-100">
            <input 
              type="checkbox" 
              checked={deleteOriginals} 
              onChange={(e) => setDeleteOriginals(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-800">Delete original records from Finance Ledger</span>
              <span className="text-xs text-red-600">If unchecked, the original records will be kept and visually linked to the new Invoice.</span>
            </div>
         </label>

         <div className="flex justify-end gap-3 pt-2">
           <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md shadow-sm">Cancel</button>
           <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 rounded-md shadow-sm disabled:opacity-50">
             {isSubmitting ? 'Transferring...' : `Create ${selectedTxns.length} Invoice(s)`}
           </button>
         </div>
      </div>

      {showLoanConfirm && (
        <Modal
          isOpen={showLoanConfirm}
          onClose={() => setShowLoanConfirm(false)}
          title="Confirm Loan Classification"
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-amber-700 font-medium">
                    Are you sure you want to mark these as loans?
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    This will automatically mark all selected transferred records as loans.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setShowLoanConfirm(false)} 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsLoan(true);
                  setShowLoanConfirm(false);
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 transition-colors"
              >
                Yes, mark as Loan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
};


const Finance: React.FC = () => {
  const { transactions, loading, error } = useFinances();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { can } = usePermissions();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRunRecurringCheck = useRef(false);
  const isProcessingRecurring = useRef(false);

  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const loadGroups = useCallback(async () => { try { const all = await financeGroupService.getAll(); setGroups(all.sort((a,b) => a.name.localeCompare(b.name))); } catch (err) { toast.error("Could not load groups."); } }, []);
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

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false); 
  
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');
  
  const [isBulkCatAdd, setIsBulkCatAdd] = useState(false);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

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
      }, (err) => { toast.error('Failed to load accounts'); });
    return () => unsubscribe();
  }, []);

  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    financeCategoryService.getAll()
      .then((docs) => setFinanceCategories(docs.sort((a,b)=> a.name.localeCompare(b.name)))) 
      .catch((err) => { toast.error('Could not load categories'); })
      .finally(() => setLoadingCats(false));
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const resetCatForm = () => {
      setShowCatModal(false);
      setEditCat(null);
      setCatName('');
      setIsBulkCatAdd(false);
      setSelectedCatIds(new Set());
  }

  const openCatForm = (cat?: { id: string; name: string }) => { 
      if (cat) { setEditCat(cat); setCatName(cat.name); } 
      else { setEditCat(null); setCatName(''); } 
      setShowCatModal(true); 
  };

  const handleCatSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!catName.trim()) { toast.error('Name required'); return; } 
      setLoadingCats(true); 
      try { 
          if (editCat) { 
              await financeCategoryService.update(editCat.id, { name: catName.trim() }); 
              toast.success('Updated'); 
          } else { 
              if (isBulkCatAdd) {
                  const names = catName.split(',').map(n => n.trim()).filter(Boolean);
                  const uniqueNames = Array.from(new Set(names));
                  await Promise.all(uniqueNames.map(name => financeCategoryService.create({ name })));
                  toast.success(`Created ${uniqueNames.length} categories`);
              } else {
                  await financeCategoryService.create({ name: catName.trim() }); 
                  toast.success('Created'); 
              }
          } 
          resetCatForm();
          loadCategories(); 
      } catch (err) { toast.error('Failed'); } 
      finally { setLoadingCats(false); } 
  };
  
  const handleCatDelete = async (catId: string) => { 
      const cat = financeCategories.find(c => c.id === catId); 
      if (cat?.name === 'Transfer' || cat?.name === 'Loan Received' || cat?.name === 'Loan Provided') { toast.error(`Cannot delete essential category: "${cat.name}"`); return; } 
      if (!window.confirm(`Delete "${cat?.name || catId}"?`)) return; 
      setLoadingCats(true); 
      try { 
          await financeCategoryService.delete(catId); 
          setFinanceCategories(prev => prev.filter(c => c.id !== catId));
          setSelectedCatIds(prev => { const s = new Set(prev); s.delete(catId); return s; });
          toast.success('Deleted'); 
      } catch (err) { toast.error('Failed'); loadCategories(); } 
      finally { setLoadingCats(false); } 
  };

  const handleBulkCatDelete = async () => {
      if (selectedCatIds.size === 0) return;
      const essential = ['Transfer', 'Loan Received', 'Loan Provided'];
      const toDelete = financeCategories.filter(c => selectedCatIds.has(c.id));
      const hasEssential = toDelete.some(c => essential.includes(c.name));
      
      if (hasEssential) {
          toast.error("Cannot delete essential categories (Transfer, Loan Received, Loan Provided). Please unselect them.");
          return;
      }
      if (!window.confirm(`Delete ${selectedCatIds.size} categories?`)) return;
      
      setLoadingCats(true);
      try {
          await Promise.all(Array.from(selectedCatIds).map(id => financeCategoryService.delete(id)));
          toast.success(`Deleted ${selectedCatIds.size} categories`);
          setSelectedCatIds(new Set());
          loadCategories();
      } catch (err) { 
          toast.error('Failed to delete categories'); 
      } finally { 
          setLoadingCats(false); 
      }
  };

  const { 
      searchQuery, setSearchQuery, 
      type, setType, 
      category, setCategory, 
      groupFilter, setGroupFilter, 
      paymentStatus, setPaymentStatus, 
      dateRange, setDateRange, 
      selectedOwner, setSelectedOwner, 
      owners, filteredTransactions, 
      accountFilter, setAccountFilter,
      customerFilter, setCustomerFilter, 
      vehicleFilter, setVehicleFilter, 
      showLinked, setShowLinked, 
      recurringFilter, setRecurringFilter, 
      recurringFrequency, setRecurringFrequency,
      accountSummary, 
      totalOwingFromOwners,
      totalOwingFromAccounts 
  } = useFinanceFilters(transactions, vehicles, accounts);

  useEffect(() => { setSelectedTransactionIds(new Set()); }, [searchQuery, type, category, paymentStatus, dateRange, selectedOwner, accountFilter, groupFilter, showLinked, recurringFilter]);

  const handleViewTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowDetailsModal(true); }, []);
  const handleEditTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowEditModal(true); }, []);

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
      toast.error('Failed to delete transactions', { id: toastId });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDeleteTransaction = useCallback((txn: Transaction) => {
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
  }, [transactions]);

  const handleConfirmDeleteSingle = async () => {
    if (!selectedTransaction) return;
    setDeleteLoading(true);
    const toastId = toast.loading(`Deleting transaction...`);
    try {
      await deleteDoc(doc(db, 'transactions', selectedTransaction.id));
      toast.success("Transaction deleted", { id: toastId });
      setShowDeleteLinkedModal(false); setShowDeleteModal(false);
      setLinkedTransactionsToDelete(null); setSelectedTransaction(null);
    } catch (err) { toast.error("Failed", { id: toastId });
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
    } catch (err) { toast.error(`Failed`, { id: toastId });
    } finally { setDeleteLoading(false); }
  };

  const handleAssignTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowAssignModal(true); }, []);

  const totalIncomeGross = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalIncomeNet = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.netAmount ?? t.amount), 0);
  const totalIncomeVat = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.vatAmount ?? 0), 0);

  const totalExpenseGross = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenseNet = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.netAmount ?? t.amount), 0);
  const totalExpenseVat = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.vatAmount ?? 0), 0);

  const netProfitGross = totalIncomeGross - totalExpenseGross;
  const netProfitNet = totalIncomeNet - totalExpenseNet;
  const totalVatLiability = totalIncomeVat - totalExpenseVat; 
  const profitMargin = totalIncomeGross > 0 ? (netProfitGross / totalIncomeGross) * 100 : 0;

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

  const handleGeneratePDF = useCallback(async () => {
    try {
      toast.loading('Generating financial report...');
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      const blob = await pdf(
        <FinanceDocument
            data={filteredTransactions}
            vehicles={vehicles}
            accounts={accounts}
            companyDetails={companyDetails}
        />
      ).toBlob();

      saveAs(blob, 'finance_report.pdf');
      toast.dismiss(); 
      toast.success('PDF generated successfully');
    } catch (err) { 
        toast.dismiss(); 
        toast.error('Failed to generate PDF'); 
    }
  }, [filteredTransactions, vehicles, accounts]);

  const handleGenerateDocument = useCallback(async (transaction: Transaction) => {
    if (!user) { toast.error('You must be logged in to generate documents.'); return; }
    try {
      toast.loading('Generating transaction document...');
      const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);
      const url = await generateAndUploadDocument(
        FinanceDocument, 
        { ...transaction, vehicle, customer: { name: transaction.customerName }, accounts }, 
        'finance', 
        transaction.id, 
        'transactions'
      );
      
      await updateDoc(doc(db, 'transactions', transaction.id), { documentUrl: url });
      toast.dismiss(); toast.success('Document generated and uploaded'); window.open(url, '_blank'); return url;
    } catch (err) { toast.dismiss(); toast.error('Failed to generate document'); }
  }, [vehicles, user, accounts]);

  const handlePrintReceipt = useCallback(async (transaction: Transaction) => {
    if (!user) { toast.error('You must be logged in to generate a receipt.'); return; }
    try {
      toast.loading('Generating receipt…');
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
      const url = await generateAndUploadDocument(
        ReceiptDocument, 
        { ...transaction, vehicle, customer: { name: transaction.customerName } }, 
        'finance', 
        transaction.id, 
        'transactions', 
        'receiptUrl'
      );
      
      const txRef = doc(db, 'transactions', transaction.id);
      await updateDoc(txRef, { receiptUrl: url });
      toast.dismiss(); toast.success('Receipt generated and uploaded'); window.open(url, '_blank'); return url;
    } catch (err) { toast.dismiss(); toast.error('Failed to generate receipt'); }
  }, [vehicles, user]);
  
  const handleExport = useCallback(() => {
    try {
      const data = filteredTransactions.map((txn) => {
        const safeFormatDate = (date: any): string => { if (!date) return ''; if (date instanceof Date) return date.toISOString(); if (date.toDate) return date.toDate().toISOString(); try { return new Date(date).toISOString(); } catch { return ''; } };
        const getNames = (ids: string[]) => ids ? ids.map(id => accounts.find(a => a.id === id)?.name || '').filter(Boolean).join('; ') : '';
        
        return {
          'Transaction ID': txn.id,
          'Date (ISO)': safeFormatDate(txn.date),
          'Type': txn.type || '',
          'Category': txn.category || '',
          'Amount': txn.amount || 0,
          'Net Amount': txn.netAmount || 0,
          'VAT Amount': txn.vatAmount || 0,
          'Description': txn.description || '',
          'Payment Method': txn.paymentMethod || '',
          'Payment Status': txn.paymentStatus || '',
          'Transaction Status': txn.status || 'completed',
          'Accounts To (Names)': getNames(txn.accountsTo || []),
          'Accounts From (Names)': getNames(txn.accountsFrom || []),
          'Vehicle Reg': vehicles.find((v) => v.id === txn.vehicleId)?.registrationNumber || '',
          'Vehicle Name': txn.vehicleName || '',
          'Owner Name': txn.vehicleOwner?.name || '',
          'Customer Name': txn.customerName || '',
          'Group Name': groups.find(g => g.id === txn.groupId)?.name || '',
          'Payment Reference': txn.paymentReference || '',
          'Recurring': txn.isRecurring ? 'Yes' : 'No',
          'Frequency': txn.recurringFrequency || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Ledger');
      XLSX.writeFile(workbook, 'finance_ledger_export.xlsx');
      toast.success('Finance data exported (Excel)');
    } catch (err) { toast.error('Failed to export.'); }
  }, [filteredTransactions, vehicles, accounts, groups]);

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
                       
                       const reg = row['Vehicle Reg'];
                       const vehicle = reg ? vehicles.find(v => v.registrationNumber.toLowerCase() === reg.toLowerCase()) : null;

                       const groupName = row['Group Name'] || row['Group'];
                       const group = groupName ? groups.find(g => g.name.toLowerCase() === groupName.toLowerCase()) : null;

                       const isUpdate = !!row['Transaction ID'];
                       const ref = isUpdate ? doc(db, 'transactions', row['Transaction ID']) : doc(collection(db, 'transactions'));
                       
                       const newTxn: any = {
                           id: ref.id,
                           date: row['Date (ISO)'] ? new Date(row['Date (ISO)']) : new Date(),
                           type: (row['Type'] === 'income' || row['Type'] === 'expense') ? row['Type'] : 'expense',
                           category: row['Category'] || 'Uncategorized',
                           amount: parseFloat(row['Amount']) || 0,
                           netAmount: parseFloat(row['Net Amount']) || 0,
                           vatAmount: parseFloat(row['VAT Amount']) || 0,
                           description: row['Description'] || '',
                           paymentMethod: row['Payment Method'] || 'cash',
                           paymentStatus: row['Payment Status'] || 'paid',
                           status: row['Transaction Status'] || 'completed',
                           
                           accountsTo: resolveAccountIds(row['Accounts To (Names)']),
                           accountsFrom: resolveAccountIds(row['Accounts From (Names)']),
                           
                           vehicleId: vehicle ? vehicle.id : null,
                           vehicleName: row['Vehicle Name'] || (vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : null),
                           vehicleOwner: vehicle ? (vehicle.owner || { name: 'AIE Skyline Limited', isDefault: true }) : (row['Owner Name'] ? { name: row['Owner Name'], isDefault: false } : null),
                           
                           customerName: row['Customer Name'] || null,
                           customerId: customers.find(c => c.name.toLowerCase() === (row['Customer Name'] || '').toLowerCase())?.id || null,

                           groupId: group ? group.id : null,
                           paymentReference: row['Payment Reference'] || null,
                           
                           isRecurring: row['Recurring'] === 'Yes',
                           recurringFrequency: row['Frequency'] || null,
                           
                           updatedAt: new Date(),
                       };
                       
                       if (!isUpdate) {
                           newTxn.createdAt = new Date();
                           newTxn.createdBy = user?.name || 'Import System';
                       }

                       batch.set(ref, newTxn, { merge: true });
                  });
                  
                  await batch.commit();
              }
              
              toast.success(`Imported ${data.length} transactions successfully`, { id: toastId });
              if (fileInputRef.current) fileInputRef.current.value = ''; 

          } catch (err) {
              toast.error("Failed to import file. Check format.", { id: toastId });
          }
      };
      reader.readAsBinaryString(file);
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (error) return <div className="text-center py-10 text-red-600 font-semibold">Error loading financial data: {error}</div>;

  // Derive the active search query for the inline category modal
  const currentCatSearch = (isBulkCatAdd ? catName.split(',').pop()?.trim() : catName.trim()) || '';

  // Filter and prioritize sort based on exact / startsWith matches
  const filteredFinanceCategories = financeCategories
    .filter((cat) => cat.name.toLowerCase().includes(currentCatSearch.toLowerCase()))
    .sort((a, b) => {
      if (!currentCatSearch) return 0; // Maintain alphabetical order if blank
      const query = currentCatSearch.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      if (aName === query && bName !== query) return -1;
      if (aName !== query && bName === query) return 1;

      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return aName.localeCompare(bName);
    });

  return (
    <div className="space-y-6 p-4 md:p-6">
      
      <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileImport} />

      <FinancialSummary 
        totalIncome={totalIncomeGross} 
        totalIncomeNet={totalIncomeNet}
        totalIncomeVat={totalIncomeVat}
        totalExpenses={totalExpenseGross} 
        totalExpenseNet={totalExpenseNet}
        totalExpenseVat={totalExpenseVat}
        netIncome={netProfitGross} 
        netIncomeNet={netProfitNet}
        totalVatLiability={totalVatLiability}
        profitMargin={profitMargin} 
        totalOwingFromOwners={totalOwingFromOwners} 
        totalOwingFromAccounts={totalOwingFromAccounts} 
        accounts={accounts} 
        transactions={filteredTransactions} 
      />
      
      <FinanceHeader 
          onSearch={setSearchQuery} 
          onImport={handleImportClick} 
          onExport={handleExport} 
          onAddIncome={() => setShowAddIncome(true)} 
          onAddExpense={() => setShowAddExpense(true)} 
          onAddRecurring={() => setShowRecurringModal(true)} 
          onGeneratePDF={handleGeneratePDF} period="month" onPeriodChange={() => {}} type={type} onTypeChange={setType} onManageGroups={() => setManageOpen(true)} onManageCategories={() => setShowCatModal(true)} onManageAccounts={() => setShowManageAccountsModal(true)} 
      />
      
      <FinanceFilters 
          type={type} onTypeChange={setType} 
          searchQuery={searchQuery} onSearchChange={setSearchQuery} 
          statusFilter={paymentStatus} onStatusFilterChange={setPaymentStatus} 
          categoryFilter={category} onCategoryFilterChange={setCategory} 
          dateRange={dateRange} onDateRangeChange={setDateRange} 
          accountFilter={accountFilter} onAccountFilterChange={setAccountFilter} 
          accounts={accounts} 
          owner={selectedOwner} onOwnerChange={setSelectedOwner} owners={owners} 
          accountSummary={accountSummary} 
          categories={financeCategories.map((c) => c.name)} 
          groupFilter={groupFilter} onGroupFilterChange={setGroupFilter} 
          groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))} 
          customerFilter={customerFilter} onCustomerFilterChange={setCustomerFilter} customers={customers} 
          vehicleFilter={vehicleFilter} onVehicleFilterChange={setVehicleFilter} vehicles={vehicles} 
          showLinked={showLinked} onShowLinkedChange={setShowLinked} 
          recurringFilter={recurringFilter} onRecurringFilterChange={setRecurringFilter}
          recurringFrequency={recurringFrequency} onRecurringFrequencyChange={setRecurringFrequency}
      />

      {selectedTransactionIds.size > 0 && user?.role === 'manager' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
          <span className="font-medium text-sm text-indigo-800">{selectedTransactionIds.size} transaction(s) selected</span>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
            >
              <FileUp className="h-4 w-4 inline-block mr-1.5" />
              Transfer to Invoice
            </button>
            <button 
              onClick={handleBulkDeleteClick}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors"
            >
              Delete {selectedTransactionIds.size} Records
            </button>
          </div>
        </div>
      )}

      <TransactionTable 
        transactions={filteredTransactions} 
        vehicles={vehicles} 
        accounts={accounts} 
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        onView={handleViewTransaction} 
        onEdit={handleEditTransaction} 
        onDelete={handleDeleteTransaction} 
        onGenerateDocument={handleGenerateDocument} 
        onViewDocument={(url) => window.open(url, '_blank', 'noopener,noreferrer')} 
        onPrintReceipt={handlePrintReceipt} 
        onAssign={handleAssignTransaction} 
        
        isManager={user?.role === 'manager'}
        selectedIds={selectedTransactionIds}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
        customers={customers} 
      />

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer to Invoice" size="xl">
         <TransferToInvoiceModalContent 
            selectedTxns={filteredTransactions.filter(t => selectedTransactionIds.has(t.id))}
            customers={customers}
            vehicles={vehicles}
            accounts={accounts} 
            groups={groups}
            user={user}
            onClose={() => setShowTransferModal(false)}
            onSuccess={() => {
              setShowTransferModal(false);
              setSelectedTransactionIds(new Set());
            }}
         />
      </Modal>

      <Modal isOpen={showAddIncome || showAddExpense} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} title={`Add ${showAddIncome ? 'Income' : 'Expense'}`} size="xl">
        <TransactionForm type={showAddIncome ? 'income' : 'expense'} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} />
      </Modal>
      
      <Modal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Add Recurring Transaction" size="xl">
          <TransactionForm type="income" initialIsRecurring={true} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => setShowRecurringModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} title="Edit Transaction" size="xl">{selectedTransaction && (<TransactionForm type={selectedTransaction.type} transaction={selectedTransaction} accounts={accounts} vehicles={vehicles} customers={customers} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} />)}</Modal>
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }} title="Transaction Details" size="xl">{selectedTransaction && ( <TransactionDetails transaction={selectedTransaction} vehicle={vehicles.find(v => v.id === selectedTransaction.vehicleId)} accounts={accounts} /> )}</Modal>
      <ManageGroupsModal open={manageOpen} onClose={() => { setManageOpen(false); loadGroups(); }} />
      <AssignGroupCategoryModal open={showAssignModal} txn={selectedTransaction} groups={groups} categories={financeCategories} accounts={accounts} onClose={() => { setShowAssignModal(false); setSelectedTransaction(null); }} onAssigned={() => { setShowAssignModal(false); setSelectedTransaction(null); }} />
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} title="Delete Transaction" size="sm">{selectedTransaction && ( <TransactionDeleteModal transactionId={selectedTransaction.id} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} onDeleted={handleConfirmDeleteSingle} /> )}</Modal>
      <Modal isOpen={showManageAccountsModal} onClose={() => setShowManageAccountsModal(false)} title="Manage Accounts" size="xl"><ManageAccountsModal onClose={() => setShowManageAccountsModal(false)} accounts={accounts} transactions={transactions} /></Modal>
      <Modal isOpen={showDeleteLinkedModal} onClose={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} title="Delete Linked Transaction?" size="md"><div className="p-1"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="ml-4 mt-0 text-left"><h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3><div className="mt-2"><p className="text-sm text-gray-500">This transaction appears linked to {linkedTransactionsToDelete ? linkedTransactionsToDelete.length - 1 : 0} other(s). Delete only this one, or all linked parts?</p></div></div></div><div className="mt-6 flex flex-col sm:flex-row-reverse gap-3"><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteLinked} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 sm:w-auto">{deleteLoading ? "Deleting..." : `Delete All ${linkedTransactionsToDelete?.length || 0} Linked`}</button><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteSingle} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:w-auto">{deleteLoading ? "..." : "Delete Only This One"}</button><button type="button" disabled={deleteLoading} onClick={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></Modal>
      
      {/* Dynamic Finance Categories Modal */}
      <Modal isOpen={showCatModal} onClose={resetCatForm} title={editCat ? 'Edit Category' : (isBulkCatAdd ? 'Bulk Add Categories' : 'Add Category')} size="md">
        <form onSubmit={handleCatSubmit} className="flex flex-col space-y-3 mb-4">
          {!editCat && (
             <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Category Details</label>
                <button type="button" onClick={() => setIsBulkCatAdd(!isBulkCatAdd)} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                    <Layers className="h-3 w-3 mr-1" />
                    {isBulkCatAdd ? 'Switch to Single Add' : 'Switch to Bulk Add'}
                </button>
             </div>
          )}
          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              value={catName} 
              onChange={(e) => setCatName(e.target.value)} 
              placeholder={isBulkCatAdd ? "cat1, cat2, cat3..." : "Type category name..."} 
              required 
              className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
            <button type="submit" disabled={loadingCats || !catName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loadingCats ? 'Saving...' : (editCat ? 'Update' : 'Add')}
            </button>
            <button type="button" onClick={resetCatForm} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700">Cancel</button>
          </div>
          {isBulkCatAdd && <p className="text-xs text-gray-500">Separate multiple categories using a comma (,)</p>}
        </form>

        <div className="pt-2 border-t border-gray-100">
            {selectedCatIds.size > 0 && (
                <div className="bg-red-50 p-2 mb-3 rounded-md flex justify-between items-center border border-red-100">
                    <span className="text-sm text-red-800 font-medium">{selectedCatIds.size} selected</span>
                    <button onClick={handleBulkCatDelete} disabled={loadingCats} className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50">
                        Delete Selected
                    </button>
                </div>
            )}

            <div className="max-h-56 overflow-y-auto border rounded-md bg-white">
              {loadingCats ? <div className="text-gray-500 text-sm p-4 text-center">Loading…</div> : (
                <ul>
                  {filteredFinanceCategories.map((c) => {
                    const isEssential = c.name === 'Transfer' || c.name === 'Loan Received' || c.name === 'Loan Provided';
                    return (
                        <li key={c.id} className="flex justify-between items-center px-4 py-2 border-b last:border-0 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                              <input 
                                  type="checkbox" 
                                  disabled={isEssential} 
                                  checked={selectedCatIds.has(c.id)} 
                                  onChange={(e) => {
                                      const newSet = new Set(selectedCatIds);
                                      if (e.target.checked) newSet.add(c.id); else newSet.delete(c.id);
                                      setSelectedCatIds(newSet);
                                  }} 
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 disabled:opacity-50 disabled:cursor-not-allowed" 
                              />
                              <span className={`text-sm ${isEssential ? 'text-gray-500 italic' : (currentCatSearch && c.name.toLowerCase() === currentCatSearch.toLowerCase() ? 'font-bold text-indigo-700' : 'text-gray-800')}`}>{c.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => openCatForm(c)} disabled={loadingCats}><Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" /></button>
                            <button 
                                onClick={() => handleCatDelete(c.id)} 
                                disabled={loadingCats || isEssential} 
                                className={isEssential ? 'opacity-30 cursor-not-allowed' : ''}
                            >
                                <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
                            </button>
                          </div>
                        </li>
                    )
                  })}
                  {filteredFinanceCategories.length === 0 && <li className="text-gray-500 text-sm p-4 text-center">{currentCatSearch ? 'No matching categories found. Ready to add!' : 'No categories found.'}</li>}
                </ul>
              )}
            </div>
        </div>
      </Modal>

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