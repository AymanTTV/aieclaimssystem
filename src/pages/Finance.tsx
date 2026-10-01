// src/pages/Finance.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useInvoices } from '../hooks/useInvoices';
import { Account, Transaction } from '../types';
import FinanceHeader from '../components/finance/FinanceHeader';
import FinanceFilters from '../components/finance/FinanceFilters';
import FinancialSummary from '../components/finance/FinancialSummary';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal'; 
import ManageAccountsModal from '../components/finance/ManageAccountsModal';
import ManageCategoriesModal from '../components/finance/ManageCategoriesModal';
import Modal from '../components/ui/Modal'; 
import ManageGroupsModal from '../components/finance/ManageGroupsModal';
import AssignGroupCategoryModal from '../components/finance/AssignGroupCategoryModal';
import ManageFinanceDepartmentsModal from '../components/finance/ManageFinanceDepartmentsModal';
import AssignFinanceDepartmentModal from '../components/finance/AssignFinanceDepartmentModal';
import AssignFinanceGroupModal from '../components/finance/AssignFinanceGroupModal';
import { AssignFinanceAccountModal } from '../components/finance/AssignFinanceAccountModal';
import { FleetBIReportModal } from '../components/finance/FleetBIReportModal';
import { ProfitPayoutActionBar } from '../components/finance/ProfitPayoutActionBar';
import { ProfitPayoutModal } from '../components/finance/ProfitPayoutModal';
import RecentAccountTransfers from '../components/finance/RecentAccountTransfers';
import { AccountStatementModal } from '../components/finance/AccountStatementModal';

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
import { useSharedAccounts } from '../hooks/useSharedAccounts';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';
import financeCategoryService from '../services/financeCategory.service';
import { Edit2, Trash2, AlertTriangle, FileUp, Layers, Receipt, Wallet, PieChart, ArrowLeftRight } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears, isBefore, format } from 'date-fns'; 
import { v4 as uuidv4 } from 'uuid';
import {
  calculateProfitMetrics,
  calculateAggregateProfitMetrics,
  calculateFinanceSummaryCards,
  calculatePnLSummaryMetrics,
  calculateDeduplicatedSummaryMetrics,
} from '../utils/profitCalculator';
import {
  enrichTransactionWithMaintenance,
  isMaintenanceOrderMatch,
} from '../utils/maintenanceFinanceLink';
import { purgeOrphanedMaintenanceIncomeEntries, sanitizeForFirestore } from '../services/unifiedSync.service';

const normalizeOrderRef = (val?: string | null): string => {
  if (!val) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/^order\s*#?/i, '')
    .replace(/^inv(?:oice)?\s*#?/i, '')
    .replace(/^#/, '')
    .trim();
};

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

const TransferToInvoiceModalContent = ({ selectedTxns, customers, vehicles, accounts, groups, departments, user, onClose, onSuccess }: any) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultCustomerId = useMemo(() => selectedTxns.find((t: any) => t.customerId)?.customerId || '', [selectedTxns]);
  const defaultVehicleId = useMemo(() => selectedTxns.find((t: any) => t.vehicleId)?.vehicleId || '', [selectedTxns]);
  const defaultCategory = useMemo(() => selectedTxns.find((t: any) => t.category)?.category || '', [selectedTxns]);
  const defaultGroupId = useMemo(() => selectedTxns.find((t: any) => t.groupId)?.groupId || '', [selectedTxns]);
  const defaultDepartmentId = useMemo(() => selectedTxns.find((t: any) => t.departmentId)?.departmentId || '', [selectedTxns]);
  const defaultAccountFrom = useMemo(() => selectedTxns.find((t: any) => t.accountsFrom && t.accountsFrom.length > 0)?.accountsFrom[0] || '', [selectedTxns]);
  const defaultAccountTo = useMemo(() => selectedTxns.find((t: any) => t.accountsTo && t.accountsTo.length > 0)?.accountsTo[0] || '', [selectedTxns]);
  
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [category, setCategory] = useState(defaultCategory);
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId);
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
      const dept = departments?.find((d: any) => d.id === departmentId);
      const grp = groups?.find((g: any) => g.id === groupId); // ✅ Lookup explicit group name

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

        const billed = t.customerBilled !== undefined ? Number(t.customerBilled) : (t.amount || 0);
        const subCost = t.subcontractorCost !== undefined ? Number(t.subcontractorCost) : 0;
        const profitMetrics = calculateProfitMetrics(billed, subCost);

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
          subcontractorCost: profitMetrics.subcontractorCost,
          customerBilled: billed,
          netProfit: profitMetrics.netProfit,
          profitMarginPercent: profitMetrics.profitMarginPercent,
          orderId: t.orderId || t.orderNumber || null,
          orderNumber: t.orderNumber || t.orderId || null,
          referenceId: t.referenceId || t.id,
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
          groupName: grp ? grp.name : t.groupName || null, // ✅ Save explicit Group Name
          departmentId: departmentId || t.departmentId || null,
          departmentName: dept ? dept.name : t.departmentName || null,
          createdAt: new Date(),
          updatedAt: new Date(), 
          createdBy: user?.id || 'system'
        };

        batch.set(invoiceRef, invoiceData);

        if (deleteOriginals) {
          batch.delete(doc(db, 'transactions', t.id));
        } else {
          batch.update(doc(db, 'transactions', t.id), { 
            referenceId: invoiceRef.id,
            invoiceNumber: invNumber,
            paymentReference: invNumber,
            orderId: t.orderId || t.orderNumber || null,
            orderNumber: t.orderNumber || t.orderId || null,
            subcontractorCost: profitMetrics.subcontractorCost,
            customerBilled: billed,
            netProfit: profitMetrics.netProfit,
            profitMarginPercent: profitMetrics.profitMarginPercent,
            departmentId: departmentId || t.departmentId || null, 
            departmentName: dept ? dept.name : t.departmentName || null,
            groupId: groupId || t.groupId || null,
            groupName: grp ? grp.name : t.groupName || null // ✅ Save explicit Group Name to ledger
          });
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

         <SearchableSelect
           label="Assign Department (Optional)"
           options={(departments || []).map((d: any) => ({ id: d.id, label: d.name }))}
           value={departmentId}
           onChange={(val) => setDepartmentId(val || '')}
           placeholder="Search departments..."
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
        <Modal isOpen={showLoanConfirm} onClose={() => setShowLoanConfirm(false)} title="Confirm Loan Classification">
          <div className="space-y-4">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
              <div className="flex"><div className="ml-3"><p className="text-sm text-amber-700 font-medium">Are you sure you want to mark these as loans?</p><p className="text-sm text-amber-600 mt-1">This will automatically mark all selected transferred records as loans.</p></div></div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowLoanConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="button" onClick={() => { setIsLoan(true); setShowLoanConfirm(false); }} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 transition-colors">Yes, mark as Loan</button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
};


const Finance: React.FC = () => {
  const { transactions, loading, error, refetchTransactions } = useFinances();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { invoices } = useInvoices();
  const { accounts, loading: accountsLoading } = useSharedAccounts();
  const { can } = usePermissions();
  const { user } = useAuth();
  const currentUser = user;

  const canManageProfitDistribution = Boolean(
    currentUser?.permissions?.canManageProfitDistribution === true ||
    currentUser?.canManageProfitDistribution === true ||
    currentUser?.canAccessCommissionSplits === true ||
    currentUser?.permissions?.finance?.canManageProfitDistribution === true ||
    (currentUser?.permissions as any)?.canAccessCommissionSplits === true ||
    can('canManageProfitDistribution') ||
    ['superadmin', 'owner'].includes(currentUser?.role?.toLowerCase() || '')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-refresh finance ledger and recalculate summary metrics on cache invalidation
  useEffect(() => {
    const handleFinanceUpdate = (e: any) => {
      if (e?.detail?.deletedPaymentId || e?.detail?.action === 'DELETE_PAYMENT') {
        refetchTransactions?.();
      }
    };
    window.addEventListener('financeRecordUpdated', handleFinanceUpdate);
    return () => {
      window.removeEventListener('financeRecordUpdated', handleFinanceUpdate);
    };
  }, [refetchTransactions]);

  const hasRunRecurringCheck = useRef(false);
  const isProcessingRecurring = useRef(false);

  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const loadGroups = useCallback(async () => { try { const all = await financeGroupService.getAll(); setGroups(all.sort((a,b) => a.name.localeCompare(b.name))); } catch (err) { toast.error("Could not load groups."); } }, []);
  useEffect(() => { loadGroups(); }, [loadGroups]);
  const [manageOpen, setManageOpen] = useState(false);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'financeDepartments'), snap => {
      setDepartments(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);
  const [showManageDepartments, setShowManageDepartments] = useState(false);
  const [showAssignDepartmentModal, setShowAssignDepartmentModal] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [showAssignAccountModal, setShowAssignAccountModal] = useState(false);

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

  // Tabbed layout state: 'ledger' (default), 'accounts', or 'distribution'
  const [activeFinanceTab, setActiveFinanceTab] = useState<'ledger' | 'accounts' | 'distribution'>(() => {
    try {
      const saved = localStorage.getItem('finance_active_tab');
      if (saved === 'ledger' || saved === 'accounts' || saved === 'distribution') {
        return saved;
      }
    } catch {}
    return 'ledger';
  });

  const handleTabChange = useCallback((tab: 'ledger' | 'accounts' | 'distribution') => {
    if (tab === 'distribution' && !currentUser?.permissions?.canManageProfitDistribution) {
      toast.error('You do not have permission to access Profit Distribution.');
      return;
    }
    setActiveFinanceTab(tab);
    try {
      localStorage.setItem('finance_active_tab', tab);
    } catch {}
  }, [currentUser?.permissions?.canManageProfitDistribution]);

  // Route guard: if active tab is distribution but user lacks permission, fallback to ledger
  useEffect(() => {
    if (activeFinanceTab === 'distribution' && !currentUser?.permissions?.canManageProfitDistribution) {
      setActiveFinanceTab('ledger');
    }
  }, [activeFinanceTab, currentUser?.permissions?.canManageProfitDistribution]);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showBIReportModal, setShowBIReportModal] = useState(false);
  const [showAccountStatementModal, setShowAccountStatementModal] = useState<boolean>(false);
  const [statementInitialAccountId, setStatementInitialAccountId] = useState<string | undefined>(undefined);
  const [statementInitialPeriodType, setStatementInitialPeriodType] = useState<'monthly' | 'quarterly' | 'custom'>('monthly');
  const [statementInitialStartDate, setStatementInitialStartDate] = useState<string | undefined>(undefined);
  const [statementInitialEndDate, setStatementInitialEndDate] = useState<string | undefined>(undefined);
  const [statementInitialOpenPreview, setStatementInitialOpenPreview] = useState<boolean>(false);

  const [showProfitPayoutModal, setShowProfitPayoutModal] = useState(false);
  const [payoutVehicleId, setPayoutVehicleId] = useState<string | undefined>(undefined);
  const [payoutAccountId, setPayoutAccountId] = useState<string | undefined>(undefined);
  const [payoutTab, setPayoutTab] = useState<'payout' | 'history'>('payout');

  const handleOpenPayoutModal = useCallback((vehicleId?: string, accountId?: string, tab: 'payout' | 'history' = 'payout') => {
    setPayoutVehicleId(vehicleId);
    setPayoutAccountId(accountId);
    setPayoutTab(tab);
    setShowProfitPayoutModal(true);
  }, []);

  const [showCatModal, setShowCatModal] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  useEffect(() => {
    setLoadingCats(true);
    const unsubscribe = financeCategoryService.subscribe((cats) => {
      setFinanceCategories(cats);
      setLoadingCats(false);
    });
    return () => unsubscribe();
  }, []);

  const enrichedTransactions = useMemo(() => {
    return transactions.map((txn) => {
      let enriched = enrichTransactionWithMaintenance(txn, maintenanceLogs);
      // Link with invoice if applicable
      const linkedInvoice = invoices.find(inv =>
        inv.id === txn.invoiceId ||
        inv.id === txn.linkedInvoiceRef ||
        inv.id === txn.referenceId ||
        inv.id === txn.entityId ||
        (txn.invoiceNumber && inv.invoiceNumber === txn.invoiceNumber) ||
        (txn.paymentReference && inv.invoiceNumber && txn.paymentReference.includes(inv.invoiceNumber))
      );

      if (linkedInvoice) {
        const invDealer = linkedInvoice.subcontractorCost !== undefined && Number(linkedInvoice.subcontractorCost) > 0
          ? Number(linkedInvoice.subcontractorCost)
          : (linkedInvoice.dealerCost !== undefined && Number(linkedInvoice.dealerCost) > 0 ? Number(linkedInvoice.dealerCost) : undefined);
        const invBilled = linkedInvoice.customerBilled !== undefined
          ? Number(linkedInvoice.customerBilled)
          : (linkedInvoice.total || enriched.amount);
        const invProfit = linkedInvoice.netProfit !== undefined
          ? Number(linkedInvoice.netProfit)
          : (invDealer !== undefined ? Number((invBilled - invDealer).toFixed(2)) : undefined);
        const invMargin = linkedInvoice.profitMarginPercent !== undefined
          ? Number(linkedInvoice.profitMarginPercent)
          : (invBilled > 0 && invProfit !== undefined ? Number(((invProfit / invBilled) * 100).toFixed(1)) : undefined);

        if (invDealer !== undefined) {
          enriched = {
            ...enriched,
            dealerCost: invDealer,
            subcontractorCost: invDealer,
            customerBilled: invBilled,
            netProfit: invProfit ?? enriched.netProfit,
            profitMarginPercent: invMargin ?? enriched.profitMarginPercent,
            isProfitEdited: true,
            isEdited: true,
            linkedInvoiceRef: linkedInvoice.id,
            invoiceNumber: enriched.invoiceNumber || linkedInvoice.invoiceNumber,
          };
        }
      }

      const grossVal = Number(enriched.grossBilling ?? enriched.customerBilled ?? (enriched.type === 'income' ? enriched.amount : enriched.amount) ?? 0);
      const paidVal = Number(
        enriched.paid !== undefined
          ? enriched.paid
          : enriched.paidAmount !== undefined
          ? enriched.paidAmount
          : enriched.paymentStatus === 'paid'
          ? grossVal
          : 0
      );
      const owingVal = Math.max(0, grossVal - paidVal);

      // Check for explicit dealer / subcontractor cost figure on the row
      const rawCost = enriched.dealerCost !== undefined && enriched.dealerCost !== null && enriched.dealerCost !== ''
        ? Number(enriched.dealerCost)
        : (enriched.subcontractorCost !== undefined && enriched.subcontractorCost !== null && enriched.subcontractorCost !== '' ? Number(enriched.subcontractorCost) : undefined);
      
      const hasExplicitCost = rawCost !== undefined && !isNaN(rawCost) && rawCost > 0;
      const isSubMode = (enriched.isEdited === true || enriched.isProfitEdited === true) && hasExplicitCost;
      const dCost = hasExplicitCost ? rawCost : 0;

      // CASH-BASIS / REALIZED PROFIT MODEL FOR ROW ENTRIES:
      // Formula strictly equal: Collected Amount (Paid) - Dealer Cost (Do NOT use Gross Billed)
      const statusStr = String(enriched.paymentStatus || '').toLowerCase();
      let realizedNetProfit: number | undefined = undefined;
      let realizedMargin: number | undefined = undefined;

      if (hasExplicitCost) {
        if (paidVal <= 0 || statusStr === 'unpaid') {
          realizedNetProfit = 0;
          realizedMargin = 0;
        } else {
          // Strictly equal: Collected Amount (Paid) - Dealer Cost
          realizedNetProfit = Number((paidVal - dCost).toFixed(2));
          realizedMargin = paidVal > 0 ? Number(((realizedNetProfit / paidVal) * 100).toFixed(1)) : 0;
        }
      }

      return {
        ...enriched,
        grossBilling: Number(grossVal || 0),
        paid: Number(paidVal || 0),
        owing: Number(owingVal || 0),
        dealerCost: hasExplicitCost ? dCost : undefined,
        subcontractorCost: hasExplicitCost ? dCost : undefined,
        netProfit: realizedNetProfit,
        profitMarginPercent: realizedMargin,
        realizedProfit: realizedNetProfit,
        isProfitEdited: isSubMode,
        isEdited: isSubMode,
      };
    }).filter((txn) => {
      const typeStr = (txn.type || '').toLowerCase();
      const txTypeStr = (txn.transactionType || '').toUpperCase();
      const entryTypeStr = (txn.entryType || '').toUpperCase();
      if (typeStr !== 'income' && txTypeStr !== 'INCOME' && entryTypeStr !== 'CREDIT') return true;

      // ALWAYS retain legitimate invoice payment entries
      if (txn.paymentId || txn.entityType === 'INVOICE' || (txn as any).isInvoicePayment || txn.invoiceId) {
        return true;
      }

      const desc = String(txn.description || '').toLowerCase();
      const isMaintOrder =
        txn.category?.toLowerCase() === 'maintenance' ||
        txn.entityType === 'MAINTENANCE' ||
        desc.includes('maintenance job') ||
        desc.includes('maintenance expense') ||
        (Array.isArray(maintenanceLogs) && maintenanceLogs.some(log => isMaintenanceOrderMatch(txn, log)));

      if (isMaintOrder) {
        // Discard any paired/orphaned Income entries tied to maintenance orders
        return false;
      }
      return true;
    });
  }, [transactions, maintenanceLogs, invoices]);

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
      profitTrackingFilter, setProfitTrackingFilter,
      accountSummary, 
      totalOwingFromOwners,
      totalOwingFromAccounts 
  } = useFinanceFilters(
    enrichedTransactions,
    vehicles,
    accounts
  );

  // Apply Department Filter
  const finalFilteredTransactions = useMemo(() => {
    return filteredTransactions.filter((txn) => {
      if (departmentFilter.length > 0) {
        const dId = txn.departmentId || 'none';
        if (!departmentFilter.includes(dId)) return false;
      }
      return true;
    });
  }, [filteredTransactions, departmentFilter]);

  const handleOpenStatementModal = useCallback((customRange?: { start: Date | null; end: Date | null }, accId?: string, openPreview: boolean = false) => {
    if (accId) {
      setStatementInitialAccountId(accId);
    } else if (typeof accountFilter === 'string' && accountFilter !== 'all') {
      setStatementInitialAccountId(accountFilter);
    } else if (Array.isArray(accountFilter) && accountFilter.length === 1 && accountFilter[0] !== 'all') {
      setStatementInitialAccountId(accountFilter[0]);
    } else {
      setStatementInitialAccountId(undefined);
    }

    const rangeToUse = customRange || dateRange;
    if (rangeToUse?.start && rangeToUse?.end) {
      setStatementInitialPeriodType('custom');
      setStatementInitialStartDate(format(rangeToUse.start, 'yyyy-MM-dd'));
      setStatementInitialEndDate(format(rangeToUse.end, 'yyyy-MM-dd'));
    } else {
      setStatementInitialPeriodType('monthly');
      setStatementInitialStartDate(undefined);
      setStatementInitialEndDate(undefined);
    }
    setStatementInitialOpenPreview(openPreview);
    setShowAccountStatementModal(true);
  }, [accountFilter, dateRange]);

  useEffect(() => { setSelectedTransactionIds(new Set()); }, [searchQuery, type, category, paymentStatus, dateRange, selectedOwner, accountFilter, groupFilter, departmentFilter, showLinked, recurringFilter, profitTrackingFilter]);

  const handleViewTransaction = useCallback((txn: Transaction) => {
    const enriched = enrichedTransactions.find(t => t.id === txn.id) || enrichTransactionWithMaintenance(txn, maintenanceLogs);
    setSelectedTransaction(enriched);
    setShowDetailsModal(true);
  }, [enrichedTransactions, maintenanceLogs]);

  const handleEditTransaction = useCallback((txn: Transaction) => {
    const enriched = enrichedTransactions.find(t => t.id === txn.id) || enrichTransactionWithMaintenance(txn, maintenanceLogs);
    setSelectedTransaction(enriched);
    setShowEditModal(true);
  }, [enrichedTransactions, maintenanceLogs]);

  // Keep selectedTransaction dynamically updated with real-time maintenance log state
  useEffect(() => {
    if (selectedTransaction) {
      const refreshed = enrichedTransactions.find(t => t.id === selectedTransaction.id) || enrichTransactionWithMaintenance(selectedTransaction, maintenanceLogs);
      if (
        refreshed.dealerCost !== selectedTransaction.dealerCost ||
        refreshed.netProfit !== selectedTransaction.netProfit ||
        refreshed.customerBilled !== selectedTransaction.customerBilled ||
        refreshed.isProfitEdited !== selectedTransaction.isProfitEdited
      ) {
        setSelectedTransaction(refreshed);
      }
    }
  }, [enrichedTransactions, maintenanceLogs, selectedTransaction]);

  const handleToggleOne = useCallback((id: string) => {
    setSelectedTransactionIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleToggleAll = useCallback((checked: boolean) => {
    setSelectedTransactionIds(checked ? new Set(finalFilteredTransactions.map(t => t.id)) : new Set());
  }, [finalFilteredTransactions]);

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
    const txToDelete = selectedTransaction;
    setShowDeleteLinkedModal(false);
    setShowDeleteModal(false);
    setLinkedTransactionsToDelete(null);
    setSelectedTransaction(null);
    toast.success("Transaction deleted");

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            id: txToDelete.id,
            entityId: txToDelete.id,
            action: 'DELETE_TRANSACTION',
            deletedPaymentId: txToDelete.paymentId || txToDelete.id,
            timestamp: Date.now(),
          },
        })
      );
      window.dispatchEvent(new CustomEvent('finance_updated'));
    }

    (async () => {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'transactions', txToDelete.id));
        batch.delete(doc(db, 'finance_ledger', txToDelete.id));
        await batch.commit();
      } catch (err) {
        console.error("Background delete transaction error:", err);
        toast.error("Failed to delete transaction on server");
      }
    })();
  };

  const handleConfirmDeleteLinked = async () => {
    if (!linkedTransactionsToDelete || linkedTransactionsToDelete.length === 0) return;
    const toDelete = [...linkedTransactionsToDelete];
    const count = toDelete.length;
    setShowDeleteLinkedModal(false);
    setLinkedTransactionsToDelete(null);
    setSelectedTransaction(null);
    toast.success(`${count} linked transactions deleted`);

    if (typeof window !== 'undefined') {
      toDelete.forEach((txn) => {
        window.dispatchEvent(
          new CustomEvent('financeRecordUpdated', {
            detail: {
              id: txn.id,
              entityId: txn.id,
              action: 'DELETE_TRANSACTION',
              deletedPaymentId: txn.paymentId || txn.id,
              timestamp: Date.now(),
            },
          })
        );
      });
      window.dispatchEvent(new CustomEvent('finance_updated'));
    }

    (async () => {
      try {
        const batch = writeBatch(db);
        toDelete.forEach((txn) => {
          batch.delete(doc(db, 'transactions', txn.id));
          batch.delete(doc(db, 'finance_ledger', txn.id));
        });
        await batch.commit();
      } catch (err) {
        console.error("Background delete linked transactions error:", err);
        toast.error("Failed to delete linked transactions on server");
      }
    })();
  };

  const handleAssignTransaction = useCallback((txn: Transaction) => { setSelectedTransaction(txn); setShowAssignModal(true); }, []);

  // Standard 3-Card Profit & Loss (P&L) Summary Metrics:
  // 1. CARD 1: "TOTAL INCOME" (Soft Green) - Sum of all credit/income
  // 2. CARD 2: "TOTAL EXPENSES" (Soft Red) - Sum of all debit/expenses + ALL subcontractor/dealer costs
  // 3. CARD 3: "NET PROFIT" (Emerald Green / Red, Formula: Total Income - Total Expenses)
  const summaryMetrics = useMemo(() => {
    // Check if the current filter is strictly showing only expenses
    const isExpenseFilterActive =
      String(type || '').toUpperCase() === 'EXPENSE' ||
      (finalFilteredTransactions.length > 0 &&
        finalFilteredTransactions.every((t: any) => {
          const isExp =
            t.type === 'EXPENSE' ||
            String(t.type || '').toUpperCase() === 'EXPENSE' ||
            String(t.entryType || '').toUpperCase() === 'DEBIT' ||
            String(t.transactionType || '').toUpperCase() === 'EXPENSE';
          return isExp;
        }));

    // 1. Identify all order/job reference keys for Income rows
    const incomeJobKeys = new Set<string>();
    finalFilteredTransactions.forEach((t: any) => {
      const isInc =
        t.type === 'INCOME' ||
        String(t.type || '').toUpperCase() === 'INCOME' ||
        String(t.entryType || '').toUpperCase() === 'CREDIT' ||
        String(t.transactionType || '').toUpperCase() === 'INCOME';
      if (isInc) {
        const ref = (t.referenceId || t.orderId || t.orderNumber || t.linkedInvoiceRef || t.maintenanceOrderId || t.maintenanceJobId || '')
          .toString().trim().toUpperCase();
        if (ref) incomeJobKeys.add(ref);
      }
    });

    const talliedDealerCostOrders = new Set<string>();

    const metrics = finalFilteredTransactions.reduce((acc, item: any) => {
      const amount = Number(item.amount || item.customerBilled || item.billed || 0);
      const dealerCost = item.dealerCost != null ? Number(item.dealerCost) : (item.subcontractorCost != null ? Number(item.subcontractorCost) : 0); 
      
      const isIncome =
        item.type === 'INCOME' ||
        String(item.type || '').toUpperCase() === 'INCOME' ||
        String(item.entryType || '').toUpperCase() === 'CREDIT' ||
        String(item.transactionType || '').toUpperCase() === 'INCOME';

      const isExpense =
        item.type === 'EXPENSE' ||
        String(item.type || '').toUpperCase() === 'EXPENSE' ||
        String(item.entryType || '').toUpperCase() === 'DEBIT' ||
        String(item.transactionType || '').toUpperCase() === 'EXPENSE';

      const orderKey = (item.referenceId || item.orderId || item.orderNumber || item.linkedInvoiceRef || item.maintenanceOrderId || item.maintenanceJobId || '')
        .toString().trim().toUpperCase();

      if (isIncome) {
        acc.totalIncome += Math.abs(amount);
        // Subcontractor costs tied to income are just expenses
        if (dealerCost > 0) {
          if (!orderKey || !talliedDealerCostOrders.has(orderKey)) {
            acc.totalExpenses += dealerCost;
            acc.subcontractorCost += dealerCost;
            if (orderKey) talliedDealerCostOrders.add(orderKey);
          }
        }
      } else if (isExpense) {
        const isLinkedDuplicate = Boolean(
          item.isLinkedExpense ||
          item.isSplitLinked ||
          item.isSplit ||
          item.linkedExpense ||
          item.description?.includes('Maintenance Expense') ||
          (orderKey && incomeJobKeys.has(orderKey))
        );

        // If we are strictly viewing expenses OR it's a regular standalone expense, count it.
        // We only ignore linked duplicates if we are looking at the combined ledger (to protect Net Profit).
        if (isExpenseFilterActive || !isLinkedDuplicate) {
          acc.totalExpenses += Math.abs(amount);

          // Only add dealer cost if it wasn't already added by a paired income row
          if (!isLinkedDuplicate) {
            if (dealerCost > 0) {
              if (!orderKey || (!incomeJobKeys.has(orderKey) && !talliedDealerCostOrders.has(orderKey))) {
                acc.totalExpenses += dealerCost;
                acc.subcontractorCost += dealerCost;
                if (orderKey) talliedDealerCostOrders.add(orderKey);
              }
            }
          }
        }
      } else if (amount >= 0) {
        acc.totalIncome += amount;
        if (dealerCost > 0) {
          if (!orderKey || !talliedDealerCostOrders.has(orderKey)) {
            acc.totalExpenses += dealerCost;
            acc.subcontractorCost += dealerCost;
            if (orderKey) talliedDealerCostOrders.add(orderKey);
          }
        }
      } else {
        const isLinkedDuplicate = Boolean(
          item.isLinkedExpense ||
          item.isSplitLinked ||
          item.isSplit ||
          item.linkedExpense ||
          item.description?.includes('Maintenance Expense') ||
          (orderKey && incomeJobKeys.has(orderKey))
        );
        if (isExpenseFilterActive || !isLinkedDuplicate) {
          acc.totalExpenses += Math.abs(amount);
          if (!isLinkedDuplicate && dealerCost > 0) {
            if (!orderKey || (!incomeJobKeys.has(orderKey) && !talliedDealerCostOrders.has(orderKey))) {
              acc.totalExpenses += dealerCost;
              acc.subcontractorCost += dealerCost;
              if (orderKey) talliedDealerCostOrders.add(orderKey);
            }
          }
        }
      }

      return acc;
    }, { totalIncome: 0, totalExpenses: 0, subcontractorCost: 0 });

    const totalIncome = Number(metrics.totalIncome.toFixed(2));
    const totalExpenses = Number(metrics.totalExpenses.toFixed(2));
    const netProfit = Number((totalIncome - totalExpenses).toFixed(2));

    return {
      totalIncome,
      totalExpenses,
      subcontractorCost: Number(metrics.subcontractorCost.toFixed(2)),
      dealerCost: Number(metrics.subcontractorCost.toFixed(2)),
      netProfit,
    };
  }, [finalFilteredTransactions, type]);

  // Simplified overall profit formula: Total Income - Total Expenses
  const netProfit = summaryMetrics.totalIncome - summaryMetrics.totalExpenses;

  const profitMargin = summaryMetrics.totalIncome > 0 
    ? ((summaryMetrics.netProfit / summaryMetrics.totalIncome) * 100).toFixed(1) 
    : "0.0";

  const legacySummaryMetrics = useMemo(() => {
    return calculateFinanceSummaryCards(finalFilteredTransactions, maintenanceLogs, invoices);
  }, [finalFilteredTransactions, maintenanceLogs, invoices]);

  const {
    totalRevenue,
    totalIncomeNet,
    totalIncomeVat,
    totalCombinedExpenses,
    standardOperatingExpenses,
    verifiedSubcontractorExpenses,
    totalGrossExpenses,
    totalExpenseNet,
    totalExpenseVat,
    netProfit: totalSubcontractorNetProfit,
    profitMarginPercent: subcontractorProfitMargin,
    totalVatLiability,
  } = legacySummaryMetrics;

  const totalIncomeGross = totalRevenue;
  const totalExpenseGross = totalCombinedExpenses;
  const netProfitGross = totalSubcontractorNetProfit;
  const netProfitNet = totalSubcontractorNetProfit;

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
                orderId: txn.orderId || txn.orderNumber || null,
                orderNumber: txn.orderNumber || txn.orderId || null,
                invoiceNumber: txn.invoiceNumber || txn.paymentReference || null,
                subcontractorCost: txn.subcontractorCost ?? null,
                dealerCost: txn.dealerCost ?? null,
                netProfit: txn.netProfit ?? null,
                profitMarginPercent: txn.profitMarginPercent ?? null,
            };
            delete newTxnData.documentUrl; 
            delete newTxnData.receiptUrl;
            batch.set(newTxnRef, sanitizeForFirestore(newTxnData));
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
            data={finalFilteredTransactions}
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
  }, [finalFilteredTransactions, vehicles, accounts]);

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
      const data = finalFilteredTransactions.map((txn) => {
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
          'Department Name': txn.departmentName || '',
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
  }, [finalFilteredTransactions, vehicles, accounts, groups]);

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

                       const deptName = row['Department Name'] || row['Department'];
                       const department = deptName ? departments.find(d => d.name.toLowerCase() === deptName.toLowerCase()) : null;

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
                           departmentId: department ? department.id : null,
                           departmentName: department ? department.name : null,
                           paymentReference: row['Payment Reference'] || null,
                           
                           isRecurring: row['Recurring'] === 'Yes',
                           recurringFrequency: row['Frequency'] || null,
                           
                           updatedAt: new Date(),
                       };
                       
                       if (!isUpdate) {
                           newTxn.createdAt = new Date();
                           newTxn.createdBy = user?.name || 'Import System';
                       }

                       batch.set(ref, sanitizeForFirestore(newTxn), { merge: true });
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      
      <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileImport} />

      <FinancialSummary 
        displayMode="top_cards_only"
        summaryMetrics={summaryMetrics}
        totalIncome={totalIncomeGross} 
        totalIncomeNet={totalIncomeNet}
        totalIncomeVat={totalIncomeVat}
        totalExpenses={totalExpenseGross} 
        standardExpenses={standardOperatingExpenses}
        verifiedSubcontractorExpenses={verifiedSubcontractorExpenses}
        totalCombinedExpenses={totalCombinedExpenses}
        totalExpenseNet={totalExpenseNet}
        totalExpenseVat={totalExpenseVat}
        netIncome={netProfitGross} 
        netIncomeNet={netProfitNet}
        totalVatLiability={totalVatLiability}
        profitMargin={profitMargin} 
        totalOwingFromOwners={totalOwingFromOwners} 
        totalOwingFromAccounts={totalOwingFromAccounts} 
        accounts={accounts} 
        transactions={finalFilteredTransactions}
        totalRevenue={totalRevenue}
        totalSubcontractorExpenses={verifiedSubcontractorExpenses}
        totalSubcontractorNetProfit={totalSubcontractorNetProfit}
        subcontractorProfitMargin={subcontractorProfitMargin}
        onOpenStatementModal={(accId) => handleOpenStatementModal(dateRange, accId)}
      />

      {/* HORIZONTAL TAB / PILL NAVIGATION MENU */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 -mx-4 px-4 sm:-mx-6 sm:px-6 shadow-xs">
        <div className="flex items-center justify-between">
          <nav className="flex space-x-4 sm:space-x-8 -mb-px overflow-x-auto no-scrollbar" aria-label="Finance navigation tabs">
            {/* Tab 1: Ledger & Transactions */}
            <button
              type="button"
              onClick={() => handleTabChange('ledger')}
              className={`group inline-flex items-center py-3.5 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                activeFinanceTab === 'ledger'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Receipt className={`mr-2.5 h-4 w-4 ${activeFinanceTab === 'ledger' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>Ledger &amp; Transactions</span>
              <span
                className={`ml-2.5 py-0.5 px-2 rounded-full text-xs font-bold font-mono ${
                  activeFinanceTab === 'ledger'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {finalFilteredTransactions.length}
              </span>
            </button>

            {/* Tab 2: Accounts & Balances */}
            <button
              type="button"
              onClick={() => handleTabChange('accounts')}
              className={`group inline-flex items-center py-3.5 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                activeFinanceTab === 'accounts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Wallet className={`mr-2.5 h-4 w-4 ${activeFinanceTab === 'accounts' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>Accounts &amp; Balances</span>
              <span
                className={`ml-2.5 py-0.5 px-2 rounded-full text-xs font-bold font-mono ${
                  activeFinanceTab === 'accounts'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {accounts.length}
              </span>
            </button>

            {/* Tab 3: Profit Distribution - Restricted to users with canManageProfitDistribution */}
            {currentUser?.permissions?.canManageProfitDistribution && (
              <button
                type="button"
                onClick={() => handleTabChange('distribution')}
                className={`group inline-flex items-center py-3.5 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  activeFinanceTab === 'distribution'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <PieChart className={`mr-2.5 h-4 w-4 ${activeFinanceTab === 'distribution' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>Profit Distribution</span>
                <span
                  className={`ml-2.5 py-0.5 px-2 rounded-full text-[10px] font-extrabold uppercase ${
                    activeFinanceTab === 'distribution'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Commission Split
                </span>
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* TAB CONTENT ROUTING */}
      {/* 1. WHEN 'Ledger & Transactions' IS ACTIVE */}
      {activeFinanceTab === 'ledger' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <FinanceHeader 
            onSearch={setSearchQuery} 
            onImport={handleImportClick} 
            onExport={handleExport} 
            onAddIncome={() => setShowAddIncome(true)} 
            onAddExpense={() => setShowAddExpense(true)} 
            onAddRecurring={() => setShowRecurringModal(true)} 
            onOpenBIReport={() => setShowBIReportModal(true)}
            onOpenStatementModal={() => handleOpenStatementModal(dateRange)}
            onOpenStatementPreview={() => handleOpenStatementModal(dateRange, undefined, true)}
            onGeneratePDF={handleGeneratePDF} period="month" onPeriodChange={() => {}} type={type} onTypeChange={setType} 
            onManageGroups={() => setManageOpen(true)} 
            onManageDepartments={() => setShowManageDepartments(true)}
            onManageCategories={() => setShowCatModal(true)} 
            onManageAccounts={() => setShowManageAccountsModal(true)} 
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
            departmentFilter={departmentFilter} onDepartmentFilterChange={setDepartmentFilter}
            departments={departments}
            customerFilter={customerFilter} onCustomerFilterChange={setCustomerFilter} customers={customers} 
            vehicleFilter={vehicleFilter} onVehicleFilterChange={setVehicleFilter} vehicles={vehicles} 
            showLinked={showLinked} onShowLinkedChange={setShowLinked} 
            recurringFilter={recurringFilter} onRecurringFilterChange={setRecurringFilter}
            recurringFrequency={recurringFrequency} onRecurringFrequencyChange={setRecurringFrequency}
            profitTrackingFilter={profitTrackingFilter} onProfitTrackingFilterChange={setProfitTrackingFilter}
            onOpenStatementModal={handleOpenStatementModal}
          />

          {selectedTransactionIds.size > 0 && (can('finance', 'assign') || can('finance', 'delete')) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 my-4 flex items-center justify-between shadow-sm">
              <span className="font-medium text-sm text-indigo-800">{selectedTransactionIds.size} transaction(s) selected</span>
              <div className="flex flex-wrap gap-2">
                {can('finance', 'assign') && (
                  <>
                    <button 
                      onClick={() => setShowAssignAccountModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors cursor-pointer"
                    >
                      Assign Account
                    </button>
                    <button 
                      onClick={() => setShowAssignGroupModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-sm transition-colors"
                    >
                      Assign Group
                    </button>
                    <button 
                      onClick={() => setShowAssignDepartmentModal(true)}
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-sm transition-colors"
                    >
                      Assign Dept
                    </button>
                    <button 
                      onClick={() => setShowTransferModal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
                    >
                      <FileUp className="h-4 w-4 inline-block mr-1.5" />
                      Transfer to Invoice
                    </button>
                  </>
                )}
                {can('finance', 'delete') && (
                  <button 
                    onClick={handleBulkDeleteClick}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm transition-colors"
                  >
                    Delete {selectedTransactionIds.size} Records
                  </button>
                )}
              </div>
            </div>
          )}

          <TransactionTable 
            transactions={finalFilteredTransactions} 
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
            onAssignDepartment={(txn) => { setSelectedTransaction(txn); setShowAssignDepartmentModal(true); }}
            
            isManager={can('finance', 'assign') || can('finance', 'delete')}
            selectedIds={selectedTransactionIds}
            onToggleOne={handleToggleOne}
            onToggleAll={handleToggleAll}
          />
        </div>
      )}

      {/* 2. WHEN 'Accounts & Balances' IS ACTIVE */}
      {activeFinanceTab === 'accounts' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <FinancialSummary 
            displayMode="accounts_only"
            summaryMetrics={summaryMetrics}
            totalIncome={totalIncomeGross} 
            totalIncomeNet={totalIncomeNet}
            totalIncomeVat={totalIncomeVat}
            totalExpenses={totalExpenseGross} 
            standardExpenses={standardOperatingExpenses}
            verifiedSubcontractorExpenses={verifiedSubcontractorExpenses}
            totalCombinedExpenses={totalCombinedExpenses}
            totalExpenseNet={totalExpenseNet}
            totalExpenseVat={totalExpenseVat}
            netIncome={netProfitGross} 
            netIncomeNet={netProfitNet}
            totalVatLiability={totalVatLiability}
            profitMargin={profitMargin} 
            totalOwingFromOwners={totalOwingFromOwners} 
            totalOwingFromAccounts={totalOwingFromAccounts} 
            accounts={accounts} 
            transactions={finalFilteredTransactions}
            totalRevenue={totalRevenue}
            totalSubcontractorExpenses={verifiedSubcontractorExpenses}
            totalSubcontractorNetProfit={totalSubcontractorNetProfit}
            subcontractorProfitMargin={subcontractorProfitMargin}
            onOpenStatementModal={(accId) => handleOpenStatementModal(dateRange, accId)}
          />

          {/* RECENT ACCOUNT TRANSFERS AUDIT LOG */}
          <RecentAccountTransfers
            accounts={accounts}
            transactions={transactions}
            onViewTransaction={handleViewTransaction}
            onEditTransaction={handleEditTransaction}
            onNewTransfer={() => setShowAddExpense(true)}
          />
        </div>
      )}

      {/* 3. WHEN 'Profit Distribution' IS ACTIVE */}
      {activeFinanceTab === 'distribution' && currentUser?.permissions?.canManageProfitDistribution && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <ProfitPayoutActionBar
            accounts={accounts}
            vehicles={vehicles}
            transactions={transactions}
            onOpenPayoutModal={handleOpenPayoutModal}
            onOpenManageAccounts={() => setShowManageAccountsModal(true)}
          />
        </div>
      )}

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer to Invoice" size="xl">
         <TransferToInvoiceModalContent 
            selectedTxns={finalFilteredTransactions.filter(t => selectedTransactionIds.has(t.id))}
            customers={customers}
            vehicles={vehicles}
            accounts={accounts} 
            groups={groups}
            departments={departments}
            user={user}
            onClose={() => setShowTransferModal(false)}
            onSuccess={() => {
              setShowTransferModal(false);
              setSelectedTransactionIds(new Set());
            }}
         />
      </Modal>

      <ManageFinanceDepartmentsModal isOpen={showManageDepartments} onClose={() => setShowManageDepartments(false)} />
      
      <AssignFinanceDepartmentModal
        isOpen={showAssignDepartmentModal}
        onClose={() => setShowAssignDepartmentModal(false)}
        selectedIds={selectedTransactionIds}
        departments={departments}
        collectionName="transactions"
        onSuccess={() => {
          setShowAssignDepartmentModal(false);
          setSelectedTransactionIds(new Set()); 
        }}
      />
      
      <AssignFinanceGroupModal
        isOpen={showAssignGroupModal}
        onClose={() => setShowAssignGroupModal(false)}
        selectedIds={selectedTransactionIds}
        groups={groups}
        collectionName="transactions"
        onSuccess={() => {
          setShowAssignGroupModal(false);
          setSelectedTransactionIds(new Set()); 
        }}
      />

      <AssignFinanceAccountModal
        isOpen={showAssignAccountModal}
        onClose={() => setShowAssignAccountModal(false)}
        selectedIds={selectedTransactionIds}
        accounts={accounts}
        transactions={transactions}
        collectionName="transactions"
        onSuccess={() => {
          setShowAssignAccountModal(false);
          setSelectedTransactionIds(new Set());
        }}
      />

      <Modal isOpen={showAddIncome || showAddExpense} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} title={`Add ${showAddIncome ? 'Income' : 'Expense'}`} size="xl">
        <TransactionForm type={showAddIncome ? 'income' : 'expense'} accounts={accounts} vehicles={vehicles} customers={customers} departments={departments} transactions={transactions} onClose={() => { setShowAddIncome(false); setShowAddExpense(false); }} />
      </Modal>
      
      <Modal isOpen={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Add Recurring Transaction" size="xl">
          <TransactionForm type="income" initialIsRecurring={true} accounts={accounts} vehicles={vehicles} customers={customers} departments={departments} transactions={transactions} onClose={() => setShowRecurringModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} title="Edit Transaction" size="xl">{selectedTransaction && (<TransactionForm type={selectedTransaction.type} transaction={selectedTransaction} accounts={accounts} vehicles={vehicles} customers={customers} departments={departments} transactions={transactions} onClose={() => { setShowEditModal(false); setSelectedTransaction(null); }} />)}</Modal>
      <Modal 
        isOpen={showDetailsModal} 
        onClose={() => { setShowDetailsModal(false); setSelectedTransaction(null); }} 
        title="Transaction Details" 
        size="2xl"
        contentClassName="p-0 flex flex-col flex-1 overflow-hidden min-h-0"
      >
        {selectedTransaction && ( 
          <TransactionDetails 
            transaction={selectedTransaction} 
            vehicle={vehicles.find(v => v.id === selectedTransaction.vehicleId)} 
            customer={customers.find(c => c.id === selectedTransaction.customerId)}
            accounts={accounts} 
            groups={groups} 
            departments={departments} 
          /> 
        )}
      </Modal>
      <ManageGroupsModal open={manageOpen} onClose={() => { setManageOpen(false); loadGroups(); }} />
      <AssignGroupCategoryModal open={showAssignModal} txn={selectedTransaction} groups={groups} categories={financeCategories} accounts={accounts} onClose={() => { setShowAssignModal(false); setSelectedTransaction(null); }} onAssigned={() => { setShowAssignModal(false); setSelectedTransaction(null); }} />
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} title="Delete Transaction" size="sm">{selectedTransaction && ( <TransactionDeleteModal transactionId={selectedTransaction.id} onClose={() => { setShowDeleteModal(false); setSelectedTransaction(null); }} onDeleted={handleConfirmDeleteSingle} /> )}</Modal>
      <Modal isOpen={showManageAccountsModal} onClose={() => setShowManageAccountsModal(false)} title="Manage Accounts" size="xl">
        <ManageAccountsModal 
          onClose={() => setShowManageAccountsModal(false)} 
          accounts={accounts} 
          transactions={transactions} 
          vehicles={vehicles}
          onOpenPayout={(vId, accId) => handleOpenPayoutModal(vId, accId, 'payout')}
        />
      </Modal>
      <Modal isOpen={showDeleteLinkedModal} onClose={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} title="Delete Linked Transaction?" size="md"><div className="p-1"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="ml-4 mt-0 text-left"><h3 className="text-lg leading-6 font-medium text-gray-900">Confirm Deletion</h3><div className="mt-2"><p className="text-sm text-gray-500">This transaction appears linked to {linkedTransactionsToDelete ? linkedTransactionsToDelete.length - 1 : 0} other(s). Delete only this one, or all linked parts?</p></div></div></div><div className="mt-6 flex flex-col sm:flex-row-reverse gap-3"><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteLinked} className="inline-flex w-full justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 sm:w-auto">{deleteLoading ? "Deleting..." : `Delete All ${linkedTransactionsToDelete?.length || 0} Linked`}</button><button type="button" disabled={deleteLoading} onClick={handleConfirmDeleteSingle} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:w-auto">{deleteLoading ? "..." : "Delete Only This One"}</button><button type="button" disabled={deleteLoading} onClick={() => { setShowDeleteLinkedModal(false); setLinkedTransactionsToDelete(null); setSelectedTransaction(null); }} className="inline-flex w-full justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto">Cancel</button></div></div></Modal>
      
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Manage Categories" size="lg">
        <ManageCategoriesModal onClose={() => setShowCatModal(false)} onCategoriesChanged={setFinanceCategories} />
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

      <FleetBIReportModal
        isOpen={showBIReportModal}
        onClose={() => setShowBIReportModal(false)}
        transactions={transactions}
        vehicles={vehicles}
        accounts={accounts}
        totalOwingFromOwners={totalOwingFromOwners}
        totalOwingFromAccounts={totalOwingFromAccounts}
      />

      <ProfitPayoutModal
        isOpen={showProfitPayoutModal}
        onClose={() => setShowProfitPayoutModal(false)}
        accounts={accounts}
        transactions={transactions}
        vehicles={vehicles}
        initialVehicleId={payoutVehicleId}
        initialAccountId={payoutAccountId}
        initialTab={payoutTab}
      />

      <AccountStatementModal
        isOpen={showAccountStatementModal}
        onClose={() => setShowAccountStatementModal(false)}
        accounts={accounts}
        transactions={transactions}
        initialAccountId={statementInitialAccountId}
        initialPeriodType={statementInitialPeriodType}
        initialStartDate={statementInitialStartDate}
        initialEndDate={statementInitialEndDate}
        initialOpenPreview={statementInitialOpenPreview}
      />

    </div>
  );
};

export default Finance;