import React, { useState, useEffect, useMemo } from 'react';
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
import AccountBalanceCards from '../components/finance/AccountBalanceCards';
import AccountManageModal from '../components/finance/AccountManageModal';
import TransferMoneyModal from '../components/finance/TransferMoneyModal';
import Modal from '../components/ui/Modal';
import { generateFinancePDF } from '../utils/financePDF';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { doc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Finance = () => {
  const { transactions, loading } = useFinances();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'accounts')),
      (snapshot) => {
        const accountData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Account[];
        setAccounts(accountData);
      },
      (error) => {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load accounts');
      }
    );

    return () => unsubscribe();
  }, []);

  const {
    searchQuery,
    setSearchQuery,
    type,
    setType,
    category,
    setCategory,
    paymentStatus,
    setPaymentStatus,
    dateRange,
    setDateRange,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedOwner,
    setSelectedOwner,
    owners,
    filteredTransactions,
    accountFilter,
    setAccountFilter,
    accountFromFilter,
    setAccountFromFilter,
    accountToFilter,
    setAccountToFilter,
    accountSummary
  } = useFinanceFilters(transactions, vehicles, accounts);

  const memoizedFilteredTransactions = useMemo(() => filteredTransactions, [
    searchQuery,
    type,
    category,
    paymentStatus,
    dateRange,
    selectedCustomerId,
    selectedOwner,
    accountFilter,
    accountFromFilter,
    accountToFilter,
  ]);

  const totalIncome = memoizedFilteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = memoizedFilteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  const handleGeneratePDF = async () => {
    try {
      const pdfBlob = await generateFinancePDF(memoizedFilteredTransactions, {
        totalIncome,
        totalExpenses,
        netIncome,
        profitMargin
      });
      saveAs(pdfBlob, 'finance_report.pdf');
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleGenerateDocument = async (transaction: Transaction) => {
    try {
      // Get the vehicle and customer for this transaction
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
      const customer = transaction.customerId 
        ? customers.find(c => c.id === transaction.customerId) 
        : null;
        
      const documentUrl = await generateAndUploadDocument(
        FinanceDocument,
        {
          ...transaction,
          vehicle,
          customer: customer || { name: transaction.customerName }
        },
        'finance',
        transaction.id,
        'transactions'
      );
      
      toast.success('Document generated successfully');
      return documentUrl;
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', updatedTransaction.id), updatedTransaction);
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <AccountBalanceCards accounts={accounts} />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Manage Accounts
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Transfer Money
          </button>
        </div>
      </div> */}

      <FinanceHeader
        onSearch={setSearchQuery}
        onImport={() => {}}
        onExport={() => {}}
        
        onAddIncome={() => setShowAddIncome(true)}
        onAddExpense={() => setShowAddExpense(true)}
        onGeneratePDF={handleGeneratePDF}
        period="month"
        onPeriodChange={() => {}}
        type={type}
        onTypeChange={setType}
      />

      <FinancialSummary
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netIncome={netIncome}
        profitMargin={profitMargin}
      />

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
        accountFromFilter={accountFromFilter}
        onAccountFromFilterChange={setAccountFromFilter}
        accountToFilter={accountToFilter}
        onAccountToFilterChange={setAccountToFilter}
        accounts={accounts}
        owner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        owners={owners}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        accountSummary={accountSummary}
      />

      <TransactionTable
        transactions={memoizedFilteredTransactions}
        vehicles={vehicles}
        customers={customers}
        accounts={accounts}
        selectedCustomerId={selectedCustomerId}
        onCustomerChange={setSelectedCustomerId}
        onView={(transaction) => {
          setSelectedTransaction(transaction);
          setShowDetailsModal(true);
        }}
        onEdit={(transaction) => {
          setSelectedTransaction(transaction);
          setShowEditModal(true);
        }}
        onDelete={(transaction) => {
          setSelectedTransaction(transaction);
          setShowDeleteModal(true);
        }}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={(url) => window.open(url, '_blank')}
        onAssignAccount={(transaction) => {
          setSelectedTransaction(transaction);
          setShowAccountModal(true);
        }}
      />

      {/* Modals */}
      <Modal
        isOpen={showAddIncome || showAddExpense}
        onClose={() => {
          setShowAddIncome(false);
          setShowAddExpense(false);
        }}
        title={`Add ${showAddIncome ? 'Income' : 'Expense'}`}
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
            onUpdateTransaction={handleUpdateTransaction}
          />
        )}
      </Modal>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTransaction(null);
        }}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <TransactionDetails
            transaction={selectedTransaction}
            vehicle={vehicles.find(v => v.id === selectedTransaction.vehicleId)}
            customer={selectedTransaction.customerId ? customers.find(c => c.id === selectedTransaction.customerId) : undefined}
            accounts={accounts}
          />
        )}
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTransaction(null);
        }}
        title="Delete Transaction"
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

      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Manage Accounts"
      >
        <AccountManageModal
          accounts={accounts}
          onClose={() => setShowAccountModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Money"
      >
        <TransferMoneyModal
          accounts={accounts}
          onClose={() => setShowTransferModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Finance;