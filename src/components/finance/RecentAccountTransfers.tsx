// src/components/finance/RecentAccountTransfers.tsx
import React, { useMemo } from 'react';
import { ArrowLeftRight, Calendar, ArrowRight, Eye, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { Account, Transaction } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface RecentAccountTransfersProps {
  accounts: Account[];
  transactions: Transaction[];
  onViewTransaction?: (txn: Transaction) => void;
  onEditTransaction?: (txn: Transaction) => void;
  onNewTransfer?: () => void;
}

export const RecentAccountTransfers: React.FC<RecentAccountTransfersProps> = ({
  accounts = [],
  transactions = [],
  onViewTransaction,
  onEditTransaction,
  onNewTransfer,
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => {
      map.set(acc.id, acc.name);
    });
    return map;
  }, [accounts]);

  const transferTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const cat = String(t.category || '').toLowerCase();
        const desc = String(t.description || '').toLowerCase();
        return (
          cat === 'transfer' ||
          cat === 'internal transfer' ||
          desc.includes('transfer to') ||
          desc.includes('transferred from') ||
          desc.includes('transfer between') ||
          (t.accountsFrom && t.accountsFrom.length > 0 && t.accountsTo && t.accountsTo.length > 0)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, [transactions]);

  const resolveAccountName = (accId?: string | null): string => {
    if (!accId) return '—';
    return accountMap.get(accId) || accId;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Recent Account Transfers
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {transferTransactions.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of internal balance movements between bank, cash, and reserve accounts.
            </p>
          </div>
        </div>

        {onNewTransfer && (
          <button
            type="button"
            onClick={onNewTransfer}
            className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Transfer Funds
          </button>
        )}
      </div>

      {transferTransactions.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No account transfers recorded yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Internal movements between accounts (e.g. transfers from Operating Account to Tax Reserve) will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description / Reference</th>
                <th className="py-2.5 px-3">Source (From)</th>
                <th className="py-2.5 px-3 text-center"></th>
                <th className="py-2.5 px-3">Destination (To)</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {(onViewTransaction || onEditTransaction) && (
                  <th className="py-2.5 px-3 text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {transferTransactions.map((tx) => {
                const fromName = tx.accountsFrom && tx.accountsFrom.length > 0
                  ? resolveAccountName(tx.accountsFrom[0])
                  : 'Operating Account';
                const toName = tx.accountsTo && tx.accountsTo.length > 0
                  ? resolveAccountName(tx.accountsTo[0])
                  : resolveAccountName(tx.accountId);
                const displayDate = tx.date
                  ? format(new Date(tx.date), 'dd MMM yyyy')
                  : '—';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {displayDate}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate font-medium text-slate-900">
                      {tx.description || tx.referenceId || 'Internal Balance Transfer'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                        {fromName}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400">
                      <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {toName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold font-mono text-slate-900 text-sm">
                      {formatCurrency(tx.amount || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {tx.status || 'Completed'}
                      </span>
                    </td>
                    {(onViewTransaction || onEditTransaction) && (
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {onViewTransaction && (
                            <button
                              type="button"
                              onClick={() => onViewTransaction(tx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onEditTransaction && (
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-md hover:bg-slate-100 transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentAccountTransfers;
