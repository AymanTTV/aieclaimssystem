import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { Transaction } from '../types';
import FinanceHeader from '../components/finance/FinanceHeader';
import FinanceFilters from '../components/finance/FinanceFilters';
import FinancialSummary from '../components/finance/FinancialSummary';
import TransactionTable from '../components/finance/TransactionTable';
import TransactionForm from '../components/finance/TransactionForm';
import TransactionDetails from '../components/finance/TransactionDetails';
import TransactionDeleteModal from '../components/finance/TransactionDeleteModal';
import Modal from '../components/ui/Modal';
import { generateFinancePDF } from '../utils/financePDF';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { FinanceDocument } from '../components/pdf/documents';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

const Finance = () => {
  const { transactions, loading } = useFinances();
  const { vehicles } = useVehicles();
  const { customers } = useCustomers();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
    filteredTransactions
  } = useFinanceFilters(transactions, vehicles);

  // Calculate summary totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netIncome = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  const handleGeneratePDF = async () => {
    try {
      const pdfBlob = await generateFinancePDF(filteredTransactions, {
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
      const documentUrl = await generateAndUploadDocument(
        FinanceDocument,
        transaction,
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        category={category}
        onCategoryChange={setCategory}
        paymentStatus={paymentStatus}
        onPaymentStatusChange={setPaymentStatus}
        startDate={dateRange.start}
        endDate={dateRange.end}
        setDateRange={setDateRange}
        owner={selectedOwner}
        onOwnerChange={setSelectedOwner}
        owners={owners}
        customers={customers} // Pass customers
        selectedCustomerId={selectedCustomerId} // Pass selectedCustomerId
        onCustomerChange={setSelectedCustomerId} // Pass onCustomerChange
      />

      <TransactionTable
        transactions={filteredTransactions}
        vehicles={vehicles}
        customers={customers}
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
      />

      {/* Add Income Modal */}
      <Modal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        title="Add Income"
      >
        <TransactionForm
          type="income"
          vehicles={vehicles}
          customers={customers}
          onClose={() => setShowAddIncome(false)}
        />
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add Expense"
      >
        <TransactionForm
          type="expense"
          vehicles={vehicles}
          customers={customers}
          onClose={() => setShowAddExpense(false)}
        />
      </Modal>

      {/* Edit Modal */}
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
            type={selectedTransaction.type}
            transaction={selectedTransaction}
            vehicles={vehicles}
            customers={customers}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTransaction(null);
            }}
          />
        )}
      </Modal>

      {/* Details Modal */}
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
            customer={customers.find(c => c.id === selectedTransaction.customerId)}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && selectedTransaction && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTransaction(null);
          }}
          title="Delete Transaction"
        >
          <TransactionDeleteModal
            transactionId={selectedTransaction.id}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedTransaction(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default Finance;