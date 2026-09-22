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

      <div className="rounded-2xl border border-[#2B314E] shadow-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#16192B] text-white">
              <tr className="border-b border-[#2B314E]">
                <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Client</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Total Invoiced</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Total Paid</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Total Outstanding</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">Current</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">1-30 Days</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-white uppercase tracking-wider select-none whitespace-nowrap">31-60 Days</th>
                <th className="px-5 py-4 text-right text-xs font-bold text-rose-300 uppercase tracking-wider select-none whitespace-nowrap">60+ Days</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.map((acc, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
                return (
                  <tr key={acc.customer.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{acc.customer.name}</div>
                      <div className="text-xs text-slate-500">{acc.customer.mobile} | {acc.invoiceCount} invoices</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-slate-800">{formatCurrency(acc.totalInvoiced)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-emerald-600 font-bold">{formatCurrency(acc.totalPaid)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold text-rose-600">{formatCurrency(acc.totalOutstanding)}</td>
                    
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-slate-600">{acc.current > 0 ? formatCurrency(acc.current) : '-'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-amber-600 font-medium">{acc.days30 > 0 ? formatCurrency(acc.days30) : '-'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-orange-600 font-medium">{acc.days60 > 0 ? formatCurrency(acc.days60) : '-'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm text-rose-600 font-bold">
                      {acc.days60Plus > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {formatCurrency(acc.days60Plus)}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">
                    No client account data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Consistent Dark Navy Footer */}
        <div className="bg-[#16192B] border-t border-[#2B314E] px-5 py-3.5 flex items-center justify-between text-xs text-slate-300">
          <div>
            Showing <span className="font-bold text-white">{filteredSummaries.length}</span> client accounts
          </div>
          <div className="text-slate-400">
            Aged Debtors & Accounts Summary
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAccounts;