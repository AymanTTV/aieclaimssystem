// src/components/finance/CustomerAccounts.tsx
import React, { useMemo, useState } from 'react';
import { Invoice, Customer } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Search, User, AlertCircle } from 'lucide-react';

interface CustomerAccountsProps {
  invoices: Invoice[];
  customers: Customer[];
}

const CustomerAccounts: React.FC<CustomerAccountsProps> = ({ invoices, customers }) => {
  const { formatCurrency } = useFormattedDisplay();
  const [searchTerm, setSearchTerm] = useState('');

  const accountSummaries = useMemo(() => {
    const now = new Date();

    const summaries = customers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
      
      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let current = 0, days30 = 0, days60 = 0, days60Plus = 0;

      customerInvoices.forEach(inv => {
        totalInvoiced += (inv.total || 0);
        totalPaid += (inv.paidAmount || 0);
        
        const remaining = inv.remainingAmount || 0;
        if (remaining > 0.001) {
          totalOutstanding += remaining;
          
          const dueDate = inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate);
          const diffTime = now.getTime() - dueDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) current += remaining;
          else if (diffDays <= 30) days30 += remaining;
          else if (diffDays <= 60) days60 += remaining;
          else days60Plus += remaining;
        }
      });

      return {
        customer,
        invoiceCount: customerInvoices.length,
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        current,
        days30,
        days60,
        days60Plus
      };
    }).filter(acc => acc.invoiceCount > 0); // Only show customers who have actual invoices

    return summaries.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [invoices, customers]);

  const filteredSummaries = accountSummaries.filter(acc => 
    acc.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <User className="w-5 h-5 mr-2 text-primary" />
          Client Account Balances
        </h2>
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 focus:bg-white focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider bg-red-50">Total Outstanding</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Current</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">1-30 Days</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">31-60 Days</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider text-red-600">60+ Days</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSummaries.map((acc) => (
                <tr key={acc.customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{acc.customer.name}</div>
                    <div className="text-xs text-gray-500">{acc.customer.mobile} | {acc.invoiceCount} invoices</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">{formatCurrency(acc.totalInvoiced)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-medium">{formatCurrency(acc.totalPaid)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold bg-red-50 text-red-700">{formatCurrency(acc.totalOutstanding)}</td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{acc.current > 0 ? formatCurrency(acc.current) : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-amber-600">{acc.days30 > 0 ? formatCurrency(acc.days30) : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">{acc.days60 > 0 ? formatCurrency(acc.days60) : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-bold">
                    {acc.days60Plus > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {formatCurrency(acc.days60Plus)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No client account data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccounts;