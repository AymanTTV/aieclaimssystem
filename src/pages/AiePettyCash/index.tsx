import React, { useState } from 'react';
import { useAiePettyCash } from '../../hooks/useAiePettyCash';
import { usePettyCashFilters } from '../../hooks/usePettyCashFilters';
import PettyCashHeader from '../../components/pettyCash/PettyCashHeader';
import PettyCashFilters from '../../components/pettyCash/PettyCashFilters';
import PettyCashTable from '../../components/pettyCash/PettyCashTable';
import PettyCashForm from '../../components/pettyCash/PettyCashForm';
import PettyCashDetails from '../../components/pettyCash/PettyCashDetails';
import Modal from '../../components/ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import { PettyCashTransaction } from '../../types/pettyCash';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { generateAndUploadDocument } from '../../utils/documentGenerator';
import { PettyCashDocument } from '../../components/pdf/documents';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

const AiePettyCash = () => {
  const { transactions, loading } = useAiePettyCash();
  const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange,
    filteredTransactions
  } = usePettyCashFilters(transactions);

  const [showForm, setShowForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PettyCashTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<PettyCashTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<PettyCashTransaction | null>(null);

  // Calculate summary totals
  const totalIn = filteredTransactions.reduce((sum, t) => sum + Number(t.amountIn || 0), 0);
  const totalOut = filteredTransactions.reduce((sum, t) => sum + Number(t.amountOut || 0), 0);
  const netIncome = totalIn - totalOut;
  const profitMargin = totalIn > 0 ? (netIncome / totalIn) * 100 : 0;
  const { formatCurrency } = useFormattedDisplay();
  const handleDelete = async (transaction: PettyCashTransaction) => {
    try {
      await deleteDoc(doc(db, 'aiePettyCash', transaction.id));
      toast.success('Transaction deleted successfully');
      setDeletingTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleGenerateDocument = async (transaction: PettyCashTransaction) => {
    try {
      await generateAndUploadDocument(
        PettyCashDocument,
        transaction,
        'aiePettyCash',
        transaction.id,
        'aiePettyCash'
      );
      
      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total In</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">{formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Out</h3>
          <p className="mt-2 text-3xl font-semibold text-red-600">{formatCurrency(totalOut)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Balance</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">{formatCurrency(netIncome)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Header */}
      <PettyCashHeader
        onSearch={setSearchQuery}
        onAdd={() => setShowForm(true)}
        title="Petty Cash"
      />

      {/* Filters */}
      <PettyCashFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
      />

      {/* Table */}
      <PettyCashTable
        transactions={filteredTransactions}
        onView={setSelectedTransaction}
        onEdit={setEditingTransaction}
        onDelete={setDeletingTransaction}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        collectionName="aiePettyCash"
      />

      {/* Modals */}
      {can('pettyCash', 'create') && (
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="New Transaction"
      >
        <PettyCashForm 
          onClose={() => setShowForm(false)} 
          collectionName="aiePettyCash"
        />
      </Modal>
      )}

      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
      >
        {selectedTransaction && (
          <PettyCashDetails transaction={selectedTransaction} />
        )}
      </Modal>

      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Edit Transaction"
      >
        {editingTransaction && (
          <PettyCashForm
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
            collectionName="aiePettyCash"
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
        title="Delete Transaction"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingTransaction(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingTransaction && handleDelete(deletingTransaction)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Transaction
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AiePettyCash;