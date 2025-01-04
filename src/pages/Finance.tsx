import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import FinanceFilters from '../components/finance/FinanceFilters';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal';
import FinancialSummary from '../components/finance/FinancialSummary';
import InvoiceTable from '../components/finance/InvoiceTable';
import InvoiceForm from '../components/finance/InvoiceForm';
import InvoiceDetails from '../components/finance/InvoiceDetails';
import InvoiceEditModal from '../components/finance/InvoiceEditModal';
import InvoiceDeleteModal from '../components/finance/InvoiceDeleteModal';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportFinanceData } from '../utils/FinanceExport';
import { Transaction, Invoice } from '../types';
import { markInvoiceAsPaid } from '../utils/invoiceUtils';
import toast from 'react-hot-toast';

const Finance = () => {
  // Data hooks
  const { transactions, loading: transactionsLoading } = useFinances();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();

  // Filter hooks
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

  const {
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    filteredInvoices
  } = useInvoiceFilters(invoices);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);

  // Loading state
  if (transactionsLoading || vehiclesLoading || invoicesLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handlers
  const handleExport = () => {
    try {
      exportFinanceData(filteredTransactions);
      toast.success('Finance data exported successfully');
    } catch (error) {
      console.error('Error exporting finance data:', error);
      toast.error('Failed to export finance data');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      await markInvoiceAsPaid(invoice);
      toast.success('Invoice marked as paid successfully');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
        <div className="flex space-x-2">
          <button onClick={handleExport} className="btn btn-outline">
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button onClick={() => setShowInvoiceForm(true)} className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
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
        </div>
      </div>

      {/* Filters */}
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

      {/* Financial Summary */}
      <FinancialSummary transactions={filteredTransactions} period="custom" />

      {/* Transactions Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Transactions</h2>
        <TransactionTable
          transactions={filteredTransactions}
          vehicles={vehicles}
          onView={setSelectedTransaction}
          onEdit={setEditingTransaction}
          onDelete={(transaction) => setDeletingTransactionId(transaction.id)}
        />
      </div>

      {/* Invoices Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Invoices</h2>
        <InvoiceTable
          invoices={filteredInvoices}
          vehicles={vehicles}
          customers={customers}
          onView={setSelectedInvoice}
          onEdit={setEditingInvoice}
          onDelete={(invoice) => setDeletingInvoiceId(invoice.id)}
          onDownload={(invoice) => window.open(invoice.documentUrl, '_blank')}
          onMarkAsPaid={handleMarkAsPaid}
        />
      </div>

      {/* Transaction Modals */}
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

      {/* Invoice Modals */}
      <Modal
        isOpen={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        title="Create Invoice"
      >
        <InvoiceForm
          vehicles={vehicles}
          customers={customers}
          onClose={() => setShowInvoiceForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Invoice Details"
      >
        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            vehicle={vehicles.find((v) => v.id === selectedInvoice.vehicleId)}
            customer={customers.find((c) => c.id === selectedInvoice.customerId)}
            onDownload={() => window.open(selectedInvoice.documentUrl, '_blank')}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title="Edit Invoice"
      >
        {editingInvoice && (
          <InvoiceEditModal
            invoice={editingInvoice}
            vehicles={vehicles}
            customers={customers}
            onClose={() => setEditingInvoice(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingInvoiceId}
        onClose={() => setDeletingInvoiceId(null)}
        title="Delete Invoice"
      >
        {deletingInvoiceId && (
          <InvoiceDeleteModal
            invoiceId={deletingInvoiceId}
            onClose={() => setDeletingInvoiceId(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Finance;
