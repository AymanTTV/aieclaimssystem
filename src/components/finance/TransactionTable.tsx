// src/components/finance/TransactionTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Customer, Account } from '../../types';
import { Eye, Edit, Trash2, FileText, Printer, Tag, Link2, RefreshCw } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format, isValid } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  customers: Customer[];
  accounts: Account[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onGenerateDocument: (transaction: Transaction) => void;
  onViewDocument: (url: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  onAssign: (transaction: Transaction) => void;
  groups: { id: string; name: string }[];
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions = [],
  vehicles = [],
  customers = [],
  accounts = [],
  groups = [],
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onPrintReceipt,
  onAssign,
  selectedIds,
  onToggleAll,
  onToggleOne,
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

  const getAccountNames = (ids?: string[]): string => {
      if (!ids || ids.length === 0) return '';
      return ids.map(id => accounts.find(a => a.id === id)?.name || 'Unknown').join(' & ');
  };

  const columns = [
    {
      id: 'select',
      header: (<input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={allSelected} ref={(input) => { if (input) input.indeterminate = someSelected; }} onChange={(e) => onToggleAll(e.target.checked)} />),
      cell: ({ row }: { row: { original: Transaction } }) => (<input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={selectedIds.has(row.original.id)} onChange={() => onToggleOne(row.original.id)} onClick={(e) => e.stopPropagation()} />),
    },
    {
      header: 'Date',
      accessorKey: 'date',
      cell: ({ row }: { row: { original: Transaction } }) => (
        <div className="whitespace-nowrap text-sm text-gray-900">
          {safeFormatDate(row.original.date)}
        </div>
      ),
    },
    {
      header: 'Type & Status',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const bits = [row.original.type, row.original.status || 'completed', row.original.paymentStatus,].filter(Boolean) as string[];
        const isMultiOrLinked = (row.original.accountsFrom && row.original.accountsFrom.length > 1) || (row.original.accountsTo && row.original.accountsTo.length > 1) || !!row.original.referenceId;
        const isLatestRecurring = row.original.isRecurring && !!row.original.nextRecurringDate;

        return (
          <div className="flex flex-col gap-1 items-start leading-tight min-w-[100px]">
            {isMultiOrLinked && (<div className="flex items-center gap-1 text-xs text-blue-600 whitespace-nowrap" title="Multi-Account / Linked"><Link2 className="h-3 w-3" /><span>Split/Linked</span></div>)}
            {row.original.isRecurring && (
               <div className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${
                 isLatestRecurring 
                   ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                   : 'text-gray-500 bg-gray-50 border-gray-200' 
               }`}>
                 <RefreshCw className="h-3 w-3" />
                 <span className="capitalize">
                    {row.original.recurringFrequency}
                    {isLatestRecurring && <span className="ml-1 font-bold">(Latest)</span>}
                 </span>
               </div>
            )}
            {bits.map((s, i) => (<StatusBadge key={i} status={s} />))}
          </div>
        );
      },
    },
    {
      header: 'Account / Group',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const transaction = row.original;
        const group = transaction.groupId ? groups.find(g => g.id === transaction.groupId) : null;
        
        const fromNames = getAccountNames(transaction.accountsFrom);
        const toNames = getAccountNames(transaction.accountsTo);

        return (
          <div className="flex flex-col gap-0.5 items-start leading-tight max-w-[160px]">
            {fromNames && (
                <div className="w-full truncate" title={`Debit: ${fromNames}`}>
                    <span className="font-semibold text-red-600 text-xs mr-1">From:</span>
                    <span className="text-sm">{fromNames}</span>
                </div>
            )}
            {toNames && (
                <div className="w-full truncate" title={`Credit: ${toNames}`}>
                    <span className="font-semibold text-green-600 text-xs mr-1">To:</span>
                    <span className="text-sm">{toNames}</span>
                </div>
            )}
            
            <div className="w-full truncate mt-1">
                <span className="font-semibold text-gray-500 text-xs mr-1">Group:</span>
                {group ? (<span className="text-sm" title={group.name}>{group.name}</span>) : (<span className="text-gray-400 text-sm">N/A</span>)}
            </div>
            <div className="w-full truncate">
                <span className="font-semibold text-gray-500 text-xs mr-1">Cat:</span>
                <span className="text-sm" title={transaction.category}>{transaction.category}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }: { row: { original: Transaction } }) => (
        <span className={`${row.original.type === 'income' ? 'text-green-600' : 'text-red-600'} font-medium whitespace-nowrap`}>
            {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    { 
      header: 'Customer',
      cell: ({ row }: { row: { original: Transaction } }) => {
        if (row.original.customerName) {
          return <div className="max-w-[120px] truncate text-sm" title={row.original.customerName}>{row.original.customerName}</div>;
        }
        if (row.original.customerId) {
          const customer = customers.find(c => c.id === row.original.customerId);
          if (customer) {
            return (
              <div className="max-w-[120px]">
                <div className="font-medium truncate text-sm" title={customer.name}>{customer.name}</div>
                <div className="text-xs text-gray-500 truncate">{customer.mobile}</div>
              </div>
            );
          }
        }
        return <div className="text-gray-400 text-xs">N/A</div>;
      },
    },
    { 
      header: 'Vehicle',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        const regNumber = vehicle?.registrationNumber;
        const fullDetails = row.original.vehicleName || (vehicle ? `${vehicle.make} ${vehicle.model} (${regNumber})` : '');

        if (regNumber) {
          return <div className="max-w-[100px] truncate text-sm" title={fullDetails}>{regNumber}</div>;
        }
        if(row.original.vehicleName) {
             return <div className="max-w-[100px] truncate text-sm" title={row.original.vehicleName}>{row.original.vehicleName}</div>
        }
        return <div className="text-gray-400 text-xs">N/A</div>;
      },
    },
    {
      header: 'Rect',
      cell: ({ row }: { row: { original: Transaction } }) => onPrintReceipt ? (<button onClick={e => { e.stopPropagation(); onPrintReceipt(row.original); }} className="p-1 hover:bg-gray-100 rounded" title="Print Receipt"><Printer className="h-4 w-4 text-gray-600" /></button>) : null,
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: { original: Transaction } }) => (
        <div className="flex space-x-1"> 
          {can('finance', 'view') && (<button onClick={e => { e.stopPropagation(); onView(row.original); }} className="text-blue-600 hover:text-blue-800 p-1" title="View Details"><Eye className="h-4 w-4" /></button>)}
          {can('finance', 'update') && (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit(row.original); }} className={`text-blue-600 hover:text-blue-800 p-1`} title={"Edit"} >
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={e => { e.stopPropagation(); onAssign(row.original); }} className="text-purple-600 hover:text-purple-800 p-1" title="Assign Group/Category"><Tag className="h-4 w-4" /></button>
              <button onClick={e => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-green-600 hover:text-green-800 p-1" title="Generate Document"><FileText className="h-4 w-4" /></button>
            </>
          )}
          {can('finance', 'delete') && (<button onClick={e => { e.stopPropagation(); onDelete(row.original); }} className="text-red-600 hover:text-red-800 p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>)}
          {row.original.documentUrl && (<button onClick={e => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }} className="text-blue-600 hover:text-blue-800 p-1" title="View Document"><Eye className="h-4 w-4" /></button>)}
        </div>
      ),
    },
  ];

  return (
    <DataTable data={transactions} columns={columns} onRowClick={transaction => can('finance', 'view') && onView(transaction)} />
  );
};

export default TransactionTable;