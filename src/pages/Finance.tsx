import React, { useState } from 'react';
import { useFinances } from '../hooks/useFinances';
import Card from '../components/Card';
import FinancialSummary from '../components/FinancialSummary';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import { Plus } from 'lucide-react';

const Finance = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const { transactions, loading } = useFinances(undefined, period);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setFormType('income');
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Income
          </button>
          <button
            onClick={() => {
              setFormType('expense');
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              period === p
                ? 'bg-primary text-white'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <FinancialSummary transactions={transactions} period={period} />

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