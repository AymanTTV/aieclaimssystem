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
import AccountManageModal from '../components/finance/AccountManageModal';
import TransferMoneyModal from '../components/finance/TransferMoneyModal';
import Modal from '../components/ui/Modal';
import ManageGroupsModal from '../components/finance/ManageGroupsModal';
import AssignGroupModal from '../components/finance/AssignGroupModal';
import { generateFinancePDF } from '../utils/financePDF';
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { doc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import * as XLSX from 'xlsx';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import financeGroupService, { FinanceGroup } from '../services/financeGroup.service';
import financeCategoryService from '../services/financeCategory.service';
import { Edit2, Trash2 } from 'lucide-react';

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

  // ───────────────── member customerId resolution (no badge needed) ─────────────────
  const [derivedCustomerId, setDerivedCustomerId] = useState<string | null>(null);

  // normalize UK numbers: remove non-digits, convert +44 → leading 0
  const normalizePhone = (raw?: string | null) => {
    if (!raw) return null;
    const digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+44')) return '0' + digits.slice(3);
    if (digits.startsWith('44')) return '0' + digits.slice(2);
    return digits;
  };

  useEffect(() => {
    if (!memberMode) {
      setDerivedCustomerId(null);
      return;
    }
    if (memberCustomerId) {
      setDerivedCustomerId(memberCustomerId);
      return;
    }

    const emailLower = user?.email?.toLowerCase()?.trim() || null;
    const userPhone = normalizePhone((user as any)?.phoneNumber ?? (user as any)?.mobile ?? null);

    // Try to resolve from already-loaded customers list (fast, avoids extra reads)
    const pickFromLocal = () => {
      if (!customers || customers.length === 0) return null;

      if (emailLower) {
        const byEmail = customers.find(
          (c: any) => c?.email && String(c.email).toLowerCase().trim() === emailLower
        );
        if (byEmail) return byEmail.id;
      }

      if (userPhone) {
        const byMobile = customers.find(
          (c: any) => normalizePhone(c?.mobile) === userPhone
        );
        if (byMobile) return byMobile.id;
      }

      return null;
    };

    const local = pickFromLocal();
    setDerivedCustomerId(local); // may be null; filters will handle empty state
  }, [memberMode, memberCustomerId, customers, user]);

  // ───────────────── Groups ─────────────────
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const loadGroups = useCallback(async () => {
    const all = await financeGroupService.getAll();
    setGroups(all);
  }, []);
  useEffect(() => { loadGroups(); }, [loadGroups]);
  const [manageOpen, setManageOpen] = useState(false);

  // ───────────────── Assign Group ─────────────────
  const [assignTxn, setAssignTxn] = useState<Transaction | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // ───────────────── Modals & Selection ─────────────────
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // ───────────────── Categories ─────────────────
  const [showCatModal, setShowCatModal] = useState(false);
  const [financeCategories, setFinanceCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    financeCategoryService
      .getAll()
      .then((docs) => setFinanceCategories(docs))
      .catch((err) => {
        console.error('Failed to load finance categories:', err);
        toast.error('Could not load finance categories');
      })
      .finally(() => setLoadingCats(false));
  }, []);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCatForm = (cat?: { id: string; name: string }) => {
    if (cat) {
      setEditCat(cat);
      setCatName(cat.name);
    } else {
      setEditCat(null);
      setCatName('');
    }
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    try {
      if (editCat) {
        await financeCategoryService.update(editCat.id, { name: catName.trim() });
        toast.success('Category updated');
      } else {
        await financeCategoryService.create({ name: catName.trim() });
        toast.success('Category created');
      }
      setShowCatModal(false);
      setEditCat(null);
      setCatName('');
      loadCategories();
    } catch (err) {
      console.error('Error saving finance category:', err);
      toast.error('Failed to save finance category');
    }
  };

  const handleCatDelete = async (catId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await financeCategoryService.delete(catId);
      setFinanceCategories((prev) => prev.filter((c) => c.id !== catId));
      toast.success('Category deleted');
    } catch (err) {
      console.error('Error deleting finance category:', err);
      toast.error('Failed to delete finance category');
    }
  };

  // ───────────────── Accounts ─────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'accounts')),
      (snapshot) => {
        const accountData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Account),
        }));
        setAccounts(accountData);
      },
      (err) => {
        console.error('Error fetching accounts:', err);
        toast.error('Failed to load accounts');
      }
    );
    return () => unsubscribe();
  }, []);

  // ───────────────── Member-scoped visible transactions ─────────────────
  const visibleTransactions: Transaction[] = useMemo(() => {
    if (!memberMode) return transactions;
    const scopeId = memberCustomerId ?? derivedCustomerId;
    if (!scopeId) return []; // lock down if we can’t resolve
    return transactions.filter((t) => t.customerId === scopeId);
  }, [transactions, memberMode, memberCustomerId, derivedCustomerId]);

  // ───────────────── Filters ─────────────────
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
    accountSummary, totalOwingFromOwners,
  } = useFinanceFilters(visibleTransactions, vehicles, accounts);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  // ───────────────── Generate bulk A4 PDF ─────────────────
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

  // ───────────────── Generate single A4 document ─────────────────
  const handleGenerateDocument = useCallback(
    async (transaction: Transaction) => {
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
    },
    [vehicles, customers, user]
  );

  // ───────────────── Generate POS-style receipt ─────────────────
  const handlePrintReceipt = useCallback(
    async (transaction: Transaction) => {
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
    },
    [vehicles, customers, user]
  );

  // ───────────────── Export to Excel ─────────────────
  const handleExport = useCallback(() => {
    try {
      const data = filteredTransactions.map((txn) => ({
        Date:
          txn.date instanceof Date
            ? txn.date.toLocaleDateString()
            : txn.date.toDate().toLocaleDateString(),
        Type: txn.type,
        Category: txn.category,
        Description: txn.description,
        Amount: txn.amount,
        'Payment Status': txn.paymentStatus,
        'Payment Reference': txn.paymentReference || '',
        'Vehicle Name': txn.vehicleName || '',
        'Vehicle Reg':
          vehicles.find((v) => v.id === txn.vehicleId)?.registrationNumber || '',
        Owner: txn.vehicleOwner?.name || '',
        'Customer Name':
          customers.find((c) => c.id === txn.customerId)?.name || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Finance Report');
      XLSX.writeFile(workbook, 'finance_report.xlsx');
      toast.success('Finance data exported to Excel!');
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      toast.error('Failed to export data to Excel.');
    }
  }, [filteredTransactions, vehicles, customers]);

  // ───────────────── UI: when memberMode, block destructive actions ─────────────────
  const blockIfMember = (fn: () => void) => {
    if (!memberMode) return fn();
    toast.error('This action is disabled in member view.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <FinancialSummary
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netIncome={netIncome}
        profitMargin={profitMargin}
        totalOwingFromOwners={totalOwingFromOwners}
      />

      {/* ── HEADER ── */}
      <FinanceHeader
        onSearch={setSearchQuery}
        onImport={() => {}}
        onExport={handleExport}
        onAddIncome={() => blockIfMember(() => setShowAddIncome(true))}
        onAddExpense={() => blockIfMember(() => setShowAddExpense(true))}
        onGeneratePDF={handleGeneratePDF}
        period="month"
        onPeriodChange={() => {}}
        type={type}
        onTypeChange={setType}
        onManageGroups={() => blockIfMember(() => setManageOpen(true))}
        onManageCategories={() => blockIfMember(() => setShowCatModal(true))}
      />

      {/* ── FILTERS ── */}
      <FinanceFilters
        type={type}
        onTypeChange={setType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={paymentStatus}
        onStatusFilterChange={setPaymentStatus}
        categoryFilter={category}
        onCategoryFilterChange={setCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        accounts={accounts}
        owner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        owners={owners}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        accountSummary={accountSummary}
        categories={financeCategories.map((c) => c.name)}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        groupOptions={groups.map((g) => ({ id: g.id, name: g.name }))}
      />

      {/* ── TABLE ── */}
      <TransactionTable
        transactions={filteredTransactions}
        vehicles={vehicles}
        customers={customers}
        accounts={accounts}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        onView={(txn) => { setSelectedTransaction(txn); setShowDetailsModal(true); }}
        onEdit={(txn) => blockIfMember(() => { setSelectedTransaction(txn); setShowEditModal(true); })}
        onDelete={(txn) => blockIfMember(() => { setSelectedTransaction(txn); setShowDeleteModal(true); })}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={(url) => window.open(url, '_blank')}
        onPrintReceipt={handlePrintReceipt}
        onAssign={(txn) => blockIfMember(() => { setAssignTxn(txn); setAssignOpen(true); })}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        onAssignAccount={(txn) => blockIfMember(() => { setSelectedTransaction(txn); setShowAccountModal(true); })}
      />

      {/* ── ADD / EDIT TRANSACTION MODALS ── */}
      <Modal
        isOpen={showAddIncome || showAddExpense}
        onClose={() => {
          setShowAddIncome(false);
          setShowAddExpense(false);
        }}
        title={`Add ${showAddIncome ? 'Income' : 'Expense'}`}
        size="xl"
      >
        <TransactionForm
          type={showAddIncome ? 'income' : 'expense'}
          accounts={accounts}
          vehicles={vehicles}
          customers={customers}
          onClose={() => {
            setShowAddIncome(false);
            setShowAddExpense(false);
          }}
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        title="Edit Transaction"
        size="xl"
      >
        {selectedTransaction && (
          <TransactionForm
            type={selectedTransaction.type === 'income' ? 'income' : 'expense'}
            transaction={selectedTransaction}
            accounts={accounts}
            vehicles={vehicles}
            customers={customers}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTransaction(null);
            }}
          />
        )}
      </Modal>

      {/* ── DETAILS MODAL ── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
        size="xl"
      >
        {selectedTransaction && (
          <TransactionDetails
            transaction={selectedTransaction}
            vehicle={vehicles.find((v) => v.id === selectedTransaction.vehicleId)}
            customer={
              selectedTransaction.customerId
                ? customers.find((c) => c.id === selectedTransaction.customerId)
                : undefined
            }
            accounts={accounts}
          />
        )}
      </Modal>

      {/* ── MANAGE GROUPS ── */}
      <ManageGroupsModal
        open={manageOpen}
        onClose={() => { setManageOpen(false); loadGroups(); }}
      />

      {/* ── ASSIGN GROUP ── */}
      {assignTxn && (
        <AssignGroupModal
          open={assignOpen}
          txn={assignTxn}
          groups={groups}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false);
            loadGroups();
          }}
        />
      )}

      {/* ── DELETE MODAL ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTransaction(null);
        }}
        title="Delete Transaction"
        size="xl"
      >
        {selectedTransaction && (
          <TransactionDeleteModal
            transactionId={selectedTransaction.id}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedTransaction(null);
            }}
          />
        )}
      </Modal>

      {/* ── MANAGE ACCOUNTS ── */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Manage Accounts"
        size="xl"
      >
        <AccountManageModal
          accounts={accounts}
          onClose={() => setShowAccountModal(false)}
        />
      </Modal>

      {/* ── TRANSFER MONEY ── */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Money"
        size="xl"
      >
        <TransferMoneyModal
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
        />
      </Modal>

      {/* ── MANAGE CATEGORIES ── */}
      <Modal
        isOpen={showCatModal}
        onClose={() => {
          setShowCatModal(false);
          setEditCat(null);
          setCatName('');
        }}
        title={editCat ? 'Edit Category' : 'Add Category'}
        size="md"
      >
        <form onSubmit={handleCatSubmit} className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name"
            required
            className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {editCat ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCatModal(false);
              setEditCat(null);
              setCatName('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </form>

        <div className="max-h-56 overflow-y-auto">
          {loadingCats ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {financeCategories.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between items-center border-b pb-1"
                >
                  <span className="text-gray-700">{c.name}</span>
                  <div className="space-x-2">
                    <button onClick={() => openCatForm(c)}>
                      <Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                    </button>
                    <button onClick={() => handleCatDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
                    </button>
                  </div>
                </li>
              ))}
              {financeCategories.length === 0 && (
                <li className="text-gray-500 text-sm">No categories found.</li>
              )}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
