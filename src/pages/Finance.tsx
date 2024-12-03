import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import { useFinanceFilters } from '../hooks/useFinanceFilters';
import Card from '../components/Card';
import FinancialSummary from '../components/FinancialSummary';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import FinanceHeader from '../components/finance/FinanceHeader';
import { exportFinanceData, importFinanceData } from '../utils/FinanceExport';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Finance = () => {
  const { transactions, loading } = useFinances();
  const {
    searchTerm,
    setSearchTerm,
    period,
    setPeriod,
    type,
    setType,
    filteredTransactions
  } = useFinanceFilters(transactions);
  
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleExport = () => {
    try {
      exportFinanceData(filteredTransactions);
      toast.success('Transactions exported successfully');
    } catch (error) {
      toast.error('Failed to export transactions');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const importedTransactions = await importFinanceData(file);
      
      for (const transaction of importedTransactions) {
        await addDoc(collection(db, 'transactions'), {
          ...transaction,
          createdAt: new Date()
        });
      }
      
      toast.success(`${importedTransactions.length} transactions imported successfully`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import transactions');
    }
  };

  const income = filteredTransactions.filter(t => t.type === 'income');
  const expenses = filteredTransactions.filter(t => t.type === 'expense');

  return (
    <div className="space-y-6">
      <FinanceHeader
        onSearch={setSearchTerm}
        onImport={handleImport}
        onExport={handleExport}
        onAddIncome={() => {
          setFormType('income');
          setShowForm(true);
        }}
        onAddExpense={() => {
          setFormType('expense');
          setShowForm(true);
        }}
        period={period}
        onPeriodChange={setPeriod}
        type={type}
        onTypeChange={setType}
      />

      <FinancialSummary transactions={filteredTransactions} period={period} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionList
          transactions={income}
          title="Recent Income"
        />
        <TransactionList
          transactions={expenses}
          title="Recent Expenses"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {formType === 'income' ? 'Record Income' : 'Record Expense'}
            </h2>
            <TransactionForm
              type={formType}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;