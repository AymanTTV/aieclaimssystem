// src/components/finance/TransactionTable.tsx
import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Account } from '../../types';
import { Eye, Edit, Trash2, FileText, Printer, Tag, Link2, RefreshCw, Briefcase } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { derivePaymentStatus } from '../../utils/paymentStatusHelper';
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
  onAssignDepartment: (transaction: Transaction) => void;
  groups: { id: string; name: string }[];
  isManager: boolean;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions = [], vehicles = [], accounts = [], groups = [],
  onView, onEdit, onDelete, onGenerateDocument, onViewDocument, onPrintReceipt, onAssign, onAssignDepartment,
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
        Array.from(new Set(txn.accountsTo.filter(Boolean))).forEach(accId => {
          const current = runningTotals.get(accId) || 0;
          const newBal = current + txn.amount;
          runningTotals.set(accId, newBal);
          impact[accId] = newBal;
        });
      }
      if (txn.type === 'expense' && txn.accountsFrom) {
        Array.from(new Set(txn.accountsFrom.filter(Boolean))).forEach(accId => {
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
        header: 'Date', 
        accessorKey: 'date',
        cell: ({ row }: { row: { original: Transaction } }) => (
          <div className="text-sm font-bold text-gray-900" title="Transaction Date">
            {safeFormatDate(row.original.date)}
          </div>
        ),
      },
      {
        header: 'Type & Status',
        cell: ({ row }: { row: { original: Transaction } }) => {
          let resolvedPaymentStatus = row.original.paymentStatus;
          if (resolvedPaymentStatus && resolvedPaymentStatus !== 'expense') {
            resolvedPaymentStatus = derivePaymentStatus({
              amount: row.original.amount,
              paidAmount: row.original.paidAmount,
              remainingAmount: row.original.remainingAmount,
              paymentStatus: row.original.paymentStatus
            });
          }
          const bits = [row.original.type, resolvedPaymentStatus].filter(Boolean) as string[];
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
          // Fall back gracefully to `groupName` if group mapping isn't cleanly established
          const displayGroupName = group ? group.name : row.original.groupName;
          
          return (
             <div className="flex flex-col gap-1 items-start">
                <span className="text-sm text-gray-900 font-medium">{row.original.category}</span>
                {displayGroupName && <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit">Grp: {displayGroupName}</span>}
                {row.original.departmentName && <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 w-fit">Dept: {row.original.departmentName}</span>}
             </div>
          );
        }
      },
      {
        header: 'Vehicle & Account',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
          const reg = vehicle ? vehicle.registrationNumber : row.original.vehicleName;
          
          const accId = row.original.accountFrom || row.original.accountTo || vehicle?.owner?.accountId;
          const assignedAccount = accounts.find(a => a.id === accId);
          const accountName = assignedAccount?.name || row.original.vehicleOwner?.name;
          const groupName = row.original.groupName || (row.original.groupId ? groups.find(g => g.id === row.original.groupId)?.name : undefined) || vehicle?.assignedGroupName;
          const deptName = row.original.departmentName || vehicle?.assignedDepartmentName;

          return (
            <div className="flex flex-col gap-1 min-w-[130px]">
              {reg ? (
                <div className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-gray-800 w-fit" title={vehicle ? `${vehicle.make} ${vehicle.model}` : undefined}>
                  {reg}
                </div>
              ) : (
                <span className="text-gray-400 text-xs">-</span>
              )}
              {accountName && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit font-medium truncate max-w-[160px]" title={`Pre-assigned Account: ${accountName}`}>
                  Acc: {accountName}
                </span>
              )}
              {deptName && (
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 w-fit font-medium truncate max-w-[160px]" title={`Department: ${deptName}`}>
                  Dept: {deptName}
                </span>
              )}
              {groupName && !accountName && (
                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit font-medium truncate max-w-[160px]">
                  Grp: {groupName}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Order / Ref & Description',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const invNum = row.original.invoiceNumber;
          const ordNum = row.original.orderNumber || row.original.orderId;
          const refId = row.original.referenceId;
          const showRef = refId && refId !== ordNum && refId !== invNum;

          return (
            <div className="flex flex-col gap-1 max-w-[240px]">
              {(invNum || ordNum || showRef) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {invNum && (
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                      title={`Invoice #${invNum}`}
                    >
                      <FileText className="w-3 h-3 mr-1 text-indigo-600 shrink-0" />
                      #{invNum}
                    </span>
                  )}
                  {ordNum && ordNum !== invNum && (
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      title={`Order #${ordNum}`}
                    >
                      Ord: {ordNum}
                    </span>
                  )}
                  {showRef && (
                    <span 
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200"
                      title={`Reference: ${refId}`}
                    >
                      Ref: {refId.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              <div className="text-sm text-gray-700 font-semibold truncate" title={row.original.description}>
                {row.original.description || (invNum ? `Invoice #${invNum}` : '-')}
              </div>
            </div>
          );
        }
      },
      {
        header: 'Credit',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const billed = row.original.customerBilled !== undefined ? Number(row.original.customerBilled) : (row.original.amount || 0);
          const rawDealerCost = row.original.dealerCost !== undefined 
            ? Number(row.original.dealerCost) 
            : (row.original.subcontractorCost !== undefined ? Number(row.original.subcontractorCost) : undefined);
          const hasExplicitDealer = rawDealerCost !== undefined && rawDealerCost > 0;
          const isSubcontractorMode = (row.original.isProfitEdited === true || row.original.isEdited === true) && hasExplicitDealer;
          const sub = isSubcontractorMode ? rawDealerCost! : billed;

          // CASH-BASIS / REALIZED PROFIT MODEL
          const paid = Number(
            row.original.paid !== undefined
              ? row.original.paid
              : row.original.paidAmount !== undefined
              ? row.original.paidAmount
              : row.original.paymentStatus === 'paid'
              ? billed
              : 0
          );
          const statusStr = String(row.original.paymentStatus || '').toLowerCase();
          const isUnpaid = paid <= 0 || statusStr === 'unpaid';
          const isFullyPaid = statusStr === 'paid' || paid >= billed || (billed > 0 && Math.max(0, billed - paid) <= 0.001);

          const isDebit = row.original.entryType === 'DEBIT' || String(row.original.type || '').toLowerCase() === 'expense' || String((row.original as any).transactionType || '').toUpperCase() === 'EXPENSE';
          const isCredit = !isDebit && (row.original.entryType === 'CREDIT' || (String(row.original.type || '').toLowerCase() === 'income' && row.original.entryType !== 'DEBIT'));

          let profit = 0;
          let margin = 0;

          if (isUnpaid) {
            profit = 0;
            margin = 0;
          } else {
            // Formula strictly equal: Collected Amount (Paid) - Dealer Cost
            profit = Number((paid - sub).toFixed(2));
            margin = paid > 0 ? Number(((profit / paid) * 100).toFixed(1)) : 0;
          }

          const showProfitBreakdown = isSubcontractorMode && sub > 0 && (sub !== billed || isSubcontractorMode);

          return isCredit ? (
            <div className="flex flex-col">
              <span className="text-[#059669] font-bold text-base font-mono">{formatCurrency(row.original.amount)}</span>
              {(row.original.vatAmount! > 0 || row.original.netAmount! > 0) && (
                <span className="text-[10px] text-[#2563eb] font-medium mt-0.5 leading-tight font-mono">
                  Net: {formatCurrency(row.original.netAmount || 0)}<br/>VAT: {formatCurrency(row.original.vatAmount || 0)}
                </span>
              )}
              {showProfitBreakdown && (
                <div className="mt-1 pt-1 border-t border-dashed border-gray-200 text-[10px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-500 font-medium">
                    <span>Billed:</span>
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(billed)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-medium">
                    <span>Dealer Cost:</span>
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(sub)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className={isUnpaid ? 'text-slate-500' : profit > 0 ? 'text-[#059669]' : profit < 0 ? 'text-[#dc2626]' : 'text-slate-500'}>
                      {isUnpaid ? 'Realized Profit:' : 'Net Profit:'}
                    </span>
                    <span className={`font-mono ${isUnpaid ? 'text-slate-600' : profit > 0 ? 'text-[#059669]' : profit < 0 ? 'text-[#dc2626]' : 'text-slate-600'}`}>
                      {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="flex justify-end pt-0.5">
                    <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                      isUnpaid
                        ? 'bg-slate-50 text-slate-500 border-slate-200'
                        : margin >= 0
                        ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                        : 'bg-rose-50 text-[#dc2626] border-rose-200'
                    }`}>
                      {isUnpaid ? '0.0% Margin (Unpaid)' : `${margin.toFixed(1)}% Margin`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : <span className="text-gray-300 text-sm">-</span>;
        }
      },
      {
        header: 'Debit',
        cell: ({ row }: { row: { original: Transaction } }) => {
          const billed = row.original.customerBilled !== undefined ? Number(row.original.customerBilled) : (row.original.amount || 0);
          const rawDealerCost = row.original.dealerCost !== undefined 
            ? Number(row.original.dealerCost) 
            : (row.original.subcontractorCost !== undefined ? Number(row.original.subcontractorCost) : undefined);
          const hasExplicitDealer = rawDealerCost !== undefined && rawDealerCost > 0;
          const isSubcontractorMode = (row.original.isProfitEdited === true || row.original.isEdited === true) && hasExplicitDealer;
          const sub = isSubcontractorMode ? rawDealerCost! : billed;

          // CASH-BASIS / REALIZED PROFIT MODEL
          const paid = Number(
            row.original.paid !== undefined
              ? row.original.paid
              : row.original.paidAmount !== undefined
              ? row.original.paidAmount
              : row.original.paymentStatus === 'paid'
              ? billed
              : 0
          );
          const statusStr = String(row.original.paymentStatus || '').toLowerCase();
          const isUnpaid = paid <= 0 || statusStr === 'unpaid';
          const isFullyPaid = statusStr === 'paid' || paid >= billed || (billed > 0 && Math.max(0, billed - paid) <= 0.001);

          const isDebit = row.original.entryType === 'DEBIT' || String(row.original.type || '').toLowerCase() === 'expense' || String((row.original as any).transactionType || '').toUpperCase() === 'EXPENSE';

          let profit = 0;
          let margin = 0;

          if (isUnpaid) {
            profit = 0;
            margin = 0;
          } else {
            // Formula strictly equal: Collected Amount (Paid) - Dealer Cost
            profit = Number((paid - sub).toFixed(2));
            margin = paid > 0 ? Number(((profit / paid) * 100).toFixed(1)) : 0;
          }

          const showProfitBreakdown = (isSubcontractorMode && sub > 0) || (row.original.dealerCost !== undefined && row.original.customerBilled !== undefined) || (sub !== billed && sub > 0);

          return isDebit ? (
            <div className="flex flex-col">
              <span className="text-[#dc2626] font-bold text-base font-mono">{formatCurrency(row.original.amount)}</span>
              {(row.original.vatAmount! > 0 || row.original.netAmount! > 0) && (
                <span className="text-[10px] text-[#2563eb] font-medium mt-0.5 leading-tight font-mono">
                  Net: {formatCurrency(row.original.netAmount || 0)}<br/>VAT: {formatCurrency(row.original.vatAmount || 0)}
                </span>
              )}
              {showProfitBreakdown && (
                <div className="mt-1 pt-1 border-t border-dashed border-gray-200 text-[10px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-500 font-medium">
                    <span>Billed:</span>
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(billed)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 font-medium">
                    <span>Dealer Cost:</span>
                    <span className="font-mono font-bold text-slate-700">{formatCurrency(sub)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className={isUnpaid ? 'text-slate-500' : profit > 0 ? 'text-[#059669]' : profit < 0 ? 'text-[#dc2626]' : 'text-slate-500'}>
                      {isUnpaid ? 'Realized Profit:' : 'Net Profit:'}
                    </span>
                    <span className={`font-mono ${isUnpaid ? 'text-slate-600' : profit > 0 ? 'text-[#059669]' : profit < 0 ? 'text-[#dc2626]' : 'text-slate-600'}`}>
                      {profit > 0 ? '+' : ''}{formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="flex justify-end pt-0.5">
                    <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                      isUnpaid
                        ? 'bg-slate-50 text-slate-500 border-slate-200'
                        : margin >= 0
                        ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                        : 'bg-rose-50 text-[#dc2626] border-rose-200'
                    }`}>
                      {isUnpaid ? '0.0% Margin (Unpaid)' : `${margin.toFixed(1)}% Margin`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : <span className="text-gray-300 text-sm">-</span>;
        }
      },
      {
        header: 'Balance',
        cell: ({ row }: { row: { original: Transaction } }) => {
           const txnBalances = transactionBalances.get(row.original.id);
           const rawAccounts = row.original.type === 'income' ? row.original.accountsTo : row.original.accountsFrom;
           if (!rawAccounts || !txnBalances) return <span className="text-gray-300">-</span>;
           const involvedAccounts = Array.from(new Set(rawAccounts.filter(Boolean)));

           return (
             <div className="flex flex-col gap-1">
               {involvedAccounts.map((accId, aIdx) => {
                  const bal = txnBalances[accId];
                  if (bal === undefined) return null;
                  const balColor = bal < 0 ? 'text-[#dc2626]' : bal > 0 ? 'text-[#059669]' : 'text-gray-900';
                  return (
                    <div key={`${row.original.id}-${accId}-${aIdx}`} className="flex flex-col items-end leading-none">
                       <span className={`text-base font-bold font-mono ${balColor}`}>{formatCurrency(bal)}</span>
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
              {can('finance', 'assign') && <ActionBtn onClick={() => onAssignDepartment(row.original)} icon={Briefcase} colorClass="text-teal-600" title="Assign Department" />}
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

    const canSelect = isManager || can('finance', 'assign') || can('finance', 'delete');
    if (!canSelect) {
      return cols.filter(c => c.id !== 'select');
    }
    return cols;
  }, [allSelected, someSelected, selectedIds, onToggleAll, onToggleOne, groups, accounts, vehicles, onPrintReceipt, can, formatCurrency, isManager, transactionBalances]);

  const uniqueTransactions = useMemo(() => {
    const seen = new Set<string>();
    return transactions.filter(t => {
      if (!t?.id) return true;
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [transactions]);

  return (
    <DataTable 
      data={uniqueTransactions} 
      columns={columns as any} 
      onRowClick={transaction => can('finance', 'view') && onView(transaction)} 
      rowClassName={({ original }) => {
        const dynamicStatus = derivePaymentStatus({
          amount: original.amount,
          paidAmount: original.paidAmount,
          remainingAmount: original.remainingAmount,
          paymentStatus: original.paymentStatus
        });
        const isPaid = original.paymentStatus === 'paid' || dynamicStatus === 'paid';
        const isOwing = (original.paymentStatus === 'unpaid' || (original.remainingAmount ?? 0) > 0.001) && !isPaid;
        return isPaid 
          ? 'table-row border-l-4 border-l-[#059669]' 
          : isOwing 
          ? 'table-row border-l-4 border-l-[#dc2626]' 
          : 'table-row border-l-4 border-l-slate-300';
      }}
    />
  );
};

export default TransactionTable;