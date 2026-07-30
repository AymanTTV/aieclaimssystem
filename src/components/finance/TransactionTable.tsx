// src/components/finance/TransactionTable.tsx
import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Account } from '../../types';
import { Eye, Edit, Trash2, FileText, Printer, Tag, Link2, RefreshCw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format, isValid } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  accounts: Account[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onGenerateDocument: (transaction: Transaction) => void;
  onViewDocument: (url: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  onAssign: (transaction: Transaction) => void;
  groups: { id: string; name: string }[];
  isManager: boolean;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions = [], vehicles = [], accounts = [], groups = [],
  onView, onEdit, onDelete, onGenerateDocument, onViewDocument, onPrintReceipt, onAssign,
  isManager, selectedIds, onToggleAll, onToggleOne,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const someSelected = transactions.length > 0 && selectedIds.size > 0 && !allSelected;

  const safeFormatDate = (date: any): string => {
      let dateObj: Date | null = null;
      if (!date) return 'N/A';
      if (date instanceof Date) dateObj = date;
      else if (date.toDate) dateObj = date.toDate();
      else { try { dateObj = new Date(date); } catch { /* ignore */ } }
      return dateObj && isValid(dateObj) ? format(dateObj, 'dd/MM/yyyy') : 'Invalid Date';
  };

  const transactionBalances = useMemo(() => {
    const balanceMap = new Map<string, Record<string, number>>(); 
    const runningTotals = new Map<string, number>(); 
    const chronologicalTxns = [...transactions].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : (a.date as any).toDate();
      const dateB = b.date instanceof Date ? b.date : (b.date as any).toDate();
      return dateA.getTime() - dateB.getTime();
    });

    chronologicalTxns.forEach(txn => {
      const impact: Record<string, number> = {};
      if (txn.type === 'income' && txn.accountsTo) {
        txn.accountsTo.forEach(accId => {
          const current = runningTotals.get(accId) || 0;
          const newBal = current + txn.amount;
          runningTotals.set(accId, newBal);
          impact[accId] = newBal;
        });
      }
      if (txn.type === 'expense' && txn.accountsFrom) {
        txn.accountsFrom.forEach(accId => {
          const current = runningTotals.get(accId) || 0;
          const newBal = current - txn.amount;
          runningTotals.set(accId, newBal);
          impact[accId] = newBal;
        });
      }
      balanceMap.set(txn.id, impact);
    });
    return balanceMap;
  }, [transactions]);

  const ActionBtn = ({ onClick, icon: Icon, colorClass, title }: { onClick: (e: React.MouseEvent) => void, icon: any, colorClass: string, title: string }) => (
    <button onClick={e => { e.stopPropagation(); onClick(e); }} title={title} className={`p-1.5 rounded-md hover:bg-gray-50 hover:shadow-sm transition-all flex items-center justify-center w-8 h-8 ${colorClass}`}>
      <Icon className="h-4 w-4" />
    </button>
  );

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'select',
        header: (
          <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={allSelected} ref={(input) => { if (input) input.indeterminate = someSelected; }} onChange={(e) => onToggleAll(e.target.checked)} />
        ),
        cell: ({ row }: { row: { original: Transaction } }) => (
          <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={selectedIds.has(row.original.id)} onChange={() => onToggleOne(row.original.id)} onClick={(e) => e.stopPropagation()} />
        ),
      },
      {
        header: 'Dates',
        accessorKey: 'date',
        cell: ({ row }: { row: { original: Transaction } }) => (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-gray-900" title="Actual Payment Date">Pay: {safeFormatDate(row.original.date)}</span>
            <span className="text-xs text-gray-500 font-medium" title="System Entry Date">Entry: {safeFormatDate(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        header: 'Type & Status',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const bits = [row.original.type, row.original.paymentStatus].filter(Boolean) as string[];
          const isMultiOrLinked = (row.original.accountsFrom && row.original.accountsFrom.length > 1) || (row.original.accountsTo && row.original.accountsTo.length > 1) || !!row.original.referenceId;
          const isLatestRecurring = row.original.isRecurring && !!row.original.nextRecurringDate;

          return (
            <div className="flex flex-col gap-1 items-start leading-tight min-w-[100px]">
              {isMultiOrLinked && (<div className="flex items-center gap-1 text-xs text-blue-600 whitespace-nowrap" title="Multi-Account / Linked"><Link2 className="h-3 w-3" /><span>Split/Linked</span></div>)}
              {row.original.isRecurring && (
                 <div className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${isLatestRecurring ? 'text-indigo-700 bg-indigo-50 border-indigo-200' : 'text-gray-500 bg-gray-50 border-gray-200' }`}>
                   <RefreshCw className="h-3 w-3" />
                   <span className="capitalize">{row.original.recurringFrequency}{isLatestRecurring && <span className="ml-1 font-bold">(Latest)</span>}</span>
                 </div>
              )}
              {bits.map((s, i) => (<StatusBadge key={i} status={s} />))}
            </div>
          );
        },
      },
      {
        header: 'Category',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const group = row.original.groupId ? groups.find(g => g.id === row.original.groupId) : null;
          return (
             <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-900 font-medium">{row.original.category}</span>
                {group && <span className="text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded w-fit">{group.name}</span>}
             </div>
          );
        }
      },
      {
        header: 'Vehicle',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
          const reg = vehicle ? vehicle.registrationNumber : row.original.vehicleName;
          if (!reg) return <span className="text-gray-400 text-xs">-</span>;
          return (
            <div className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono text-gray-800 w-fit">{reg}</div>
          );
        },
      },
      {
        header: 'Description',
        cell: ({ row }: { row: { original: Transaction } }) => (
          <div className="max-w-[200px] text-sm text-gray-600 font-bold truncate" title={row.original.description}>
             {row.original.description || '-'}
          </div>
        )
      },
      {
        header: 'Credit',
        cell: ({ row }: { row: { original: Transaction } }) => {
          return row.original.type === 'income' ? (
            <div className="flex flex-col">
              <span className="text-green-600 font-bold text-base">{formatCurrency(row.original.amount)}</span>
              {(row.original.vatAmount! > 0 || row.original.netAmount! > 0) && (
                <span className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight">Net: {formatCurrency(row.original.netAmount || 0)}<br/>VAT: {formatCurrency(row.original.vatAmount || 0)}</span>
              )}
            </div>
          ) : <span className="text-gray-300 text-sm">-</span>;
        }
      },
      {
        header: 'Debit',
        cell: ({ row }: { row: { original: Transaction } }) => {
          return row.original.type === 'expense' ? (
            <div className="flex flex-col">
              <span className="text-red-600 font-bold text-base">{formatCurrency(row.original.amount)}</span>
              {(row.original.vatAmount! > 0 || row.original.netAmount! > 0) && (
                <span className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight">Net: {formatCurrency(row.original.netAmount || 0)}<br/>VAT: {formatCurrency(row.original.vatAmount || 0)}</span>
              )}
            </div>
          ) : <span className="text-gray-300 text-sm">-</span>;
        }
      },
      {
        header: 'Balance',
        cell: ({ row }: { row: { original: Transaction } }) => {
           const txnBalances = transactionBalances.get(row.original.id);
           const involvedAccounts = row.original.type === 'income' ? row.original.accountsTo : row.original.accountsFrom;
           if (!involvedAccounts || !txnBalances) return <span className="text-gray-300">-</span>;

           return (
             <div className="flex flex-col gap-1">
               {involvedAccounts.map(accId => {
                  const bal = txnBalances[accId];
                  if (bal === undefined) return null;
                  return (
                    <div key={accId} className="flex flex-col items-end leading-none">
                       <span className={`text-base font-bold ${bal < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(bal)}</span>
                    </div>
                  );
               })}
             </div>
           );
        }
      },
      {
        header: 'Actions',
        cell: ({ row }: { row: { original: Transaction } }) => (
          <div className="flex flex-col gap-1.5 items-center justify-center py-2 min-w-[100px]">
            <div className="flex flex-wrap justify-center gap-1">
              {can('finance', 'view') && <ActionBtn onClick={() => onView(row.original)} icon={Eye} colorClass="text-blue-600" title="View Details" />}
              {can('finance', 'update') && <ActionBtn onClick={() => onEdit(row.original)} icon={Edit} colorClass="text-indigo-600" title="Edit Transaction" />}
              {can('finance', 'assign') && <ActionBtn onClick={() => onAssign(row.original)} icon={Tag} colorClass="text-purple-600" title="Assign Group/Category" />}
            </div>
            {can('finance', 'singleDoc') && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-1.5 border-t border-gray-100">
                {row.original.documentUrl ? (
                    <ActionBtn onClick={() => onViewDocument(row.original.documentUrl!)} icon={FileText} colorClass="text-green-700" title="View Document" />
                ) : (
                    <ActionBtn onClick={() => onGenerateDocument(row.original)} icon={FileText} colorClass="text-gray-400 hover:text-green-700" title="Generate Document" />
                )}
                {onPrintReceipt && <ActionBtn onClick={() => onPrintReceipt(row.original)} icon={Printer} colorClass="text-gray-500 hover:text-gray-900" title="Print Receipt" />}
              </div>
            )}
            {can('finance', 'delete') && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-1">
                <ActionBtn onClick={() => onDelete(row.original)} icon={Trash2} colorClass="text-red-600 hover:bg-red-50" title="Delete Transaction" />
              </div>
            )}
          </div>
        ),
      },
    ];

    if (!isManager) {
      return cols.filter(c => c.id !== 'select');
    }
    return cols;
  }, [allSelected, someSelected, selectedIds, onToggleAll, onToggleOne, groups, accounts, vehicles, onPrintReceipt, can, formatCurrency, isManager, transactionBalances]);

  return (
    <DataTable 
      data={transactions} 
      columns={columns as any} 
      onRowClick={transaction => can('finance', 'view') && onView(transaction)} 
    />
  );
};

export default TransactionTable;