import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Edit, Trash2, Eye } from 'lucide-react';
import FinancialSummary from '../components/FinancialSummary';
import FinanceFilters from '../components/finance/FinanceFilters';
import TransactionForm from '../components/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import { exportFinanceData } from '../utils/FinanceExport';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Transaction } from '../types';

const Finance = () => {
  const { transactions, loading } = useFinances();
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
    filteredTransactions
  } = useFinanceFilters(transactions);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  const columns = [
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'MMM dd, yyyy'),
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.type === 'income' ? 'completed' : 'pending'}
        />
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className={row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          £{row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTransaction(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTransaction(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingTransactionId(row.original.id);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => exportFinanceData(filteredTransactions)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={() => {
              setFormType('income');
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
          <button
            onClick={() => {
              setFormType('expense');
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
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
      />

      <FinancialSummary transactions={filteredTransactions} period="custom" />

      <DataTable
        data={filteredTransactions}
        columns={columns}
        onRowClick={(transaction) => setSelectedTransaction(transaction)}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={`Add ${formType === 'income' ? 'Income' : 'Expense'}`}
      >
        <TransactionForm
          type={formType}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
        size="lg"
      >
        {selectedTransaction && (
          <TransactionDetails transaction={selectedTransaction} />
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
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingTransactionId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await deleteDoc(doc(db, 'transactions', deletingTransactionId));
                  toast.success('Transaction deleted successfully');
                  setDeletingTransactionId(null);
                } catch (error) {
                  toast.error('Failed to delete transaction');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;