import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useVehicles } from '../hooks/useVehicles';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import FinanceFilters from '../components/finance/FinanceFilters';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal';
import FinancialSummary from '../components/finance/FinancialSummary';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportFinanceData } from '../utils/FinanceExport';
import { Transaction } from '../types';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

const Finance = () => {
  const { transactions, loading: transactionsLoading } = useFinances();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    type,
    setType,
    category,
    setCategory,
    paymentStatus,
    setPaymentStatus,
    owner,
    setOwner,
    uniqueOwners,
    filteredTransactions
  } = useFinanceFilters(transactions, vehicles);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  if (transactionsLoading || vehiclesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance Overview</h1>
        <div className="flex space-x-2">
          
          {user?.role === 'manager' && (
  <button
    onClick={() => exportFinanceData(filteredTransactions)}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    <Download className="h-5 w-5 mr-2" />
    Export
  </button>
)}

          {can('finance', 'create') && (
      <>
          <button
            onClick={() => {
              setFormType('income');
              setShowForm(true);
            }}
            className="btn btn-secondary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
          <button
            onClick={() => {
              setFormType('expense');
              setShowForm(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
      </>
          )}
        </div>
      </div>

      <FinanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        type={type}
        onTypeChange={setType}
        category={category}
        onCategoryChange={setCategory}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={setPaymentStatus}
        owner={owner}
        onOwnerChange={setOwner}
        owners={uniqueOwners}
      />

      <FinancialSummary transactions={filteredTransactions} period="custom" />

      <TransactionTable
        transactions={filteredTransactions}
        vehicles={vehicles}
        onView={setSelectedTransaction}
        onEdit={setEditingTransaction}
        onDelete={(transaction) => setDeletingTransactionId(transaction.id)}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={`Add ${formType === 'income' ? 'Income' : 'Expense'}`}
      >
        <TransactionForm type={formType} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <TransactionDetails
            transaction={selectedTransaction}
            vehicle={vehicles.find((v) => v.id === selectedTransaction.vehicleId)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Edit Transaction"
      >
        {editingTransaction && (
          <TransactionForm
            type={editingTransaction.type}
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingTransactionId}
        onClose={() => setDeletingTransactionId(null)}
        title="Delete Transaction"
      >
        {deletingTransactionId && (
          <TransactionDeleteModal
            transactionId={deletingTransactionId}
            onClose={() => setDeletingTransactionId(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Finance;