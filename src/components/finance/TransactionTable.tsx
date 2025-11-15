// src/components/finance/TransactionTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Customer, Account } from '../../types';
import { Eye, Edit, Trash2, FileText, Printer, Tag, Link2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format, isValid } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  customers: Customer[];
  accounts: Account[]; // Pass all accounts for name lookup
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onGenerateDocument: (transaction: Transaction) => void;
  onViewDocument: (url: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  onAssign: (transaction: Transaction) => void; // Now primarily for Group/Category
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
  // selectedCustomerId, // Not directly used in columns
  // onCustomerChange,   // Not directly used in columns
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
      if (!ids || ids.length === 0) return 'N/A';
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
      cell: ({ row }: { row: { original: Transaction } }) => safeFormatDate(row.original.date),
    },
    {
      header: 'Type & Status',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const bits = [row.original.type, row.original.status || 'completed', row.original.paymentStatus,].filter(Boolean) as string[];
        const isMultiOrLinked = (row.original.accountsFrom && row.original.accountsFrom.length > 1) || (row.original.accountsTo && row.original.accountsTo.length > 1) || !!row.original.referenceId;
        return (
          <div className="flex flex-col gap-1 items-start leading-tight">
            {isMultiOrLinked && (<div className="flex items-center gap-1 text-xs text-blue-600" title="Multi-Account / Linked"><Link2 className="h-3 w-3" /><span>Split/Linked</span></div>)}
            {bits.map((s, i) => (<StatusBadge key={i} status={s} />))}
          </div>
        );
      },
    },
    {
      header: 'Account(s) / Group / Category',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const transaction = row.original;
        const group = transaction.groupId ? groups.find(g => g.id === transaction.groupId) : null;
        const accountLabel = transaction.type === 'expense' ? 'From:' : 'To:';
        const accountNames = transaction.type === 'expense' ? getAccountNames(transaction.accountsFrom) : getAccountNames(transaction.accountsTo);
        return (
          <div className="flex flex-col gap-1 items-start leading-tight">
            <div><span className="font-semibold text-gray-600 text-xs">{accountLabel} </span><span className="text-sm">{accountNames}</span></div>
            <div><span className="font-semibold text-gray-600 text-xs">Group: </span>{group ? (<span className="text-sm">{group.name}</span>) : (<span className="text-gray-400 text-sm">N/A</span>)}</div>
            <div><span className="font-semibold text-gray-600 text-xs">Category: </span><span className="text-sm">{transaction.category}</span></div>
          </div>
        );
      },
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }: { row: { original: Transaction } }) => (<span className={`${row.original.type === 'income' ? 'text-green-600' : 'text-red-600'} font-medium`}>{formatCurrency(row.original.amount)}</span>),
    },
    { // Customer Column (Reverted Style)
      header: 'Customer',
      cell: ({ row }: { row: { original: Transaction } }) => {
        if (row.original.customerName) {
          return <div>{row.original.customerName}</div>;
        }
        if (row.original.customerId) {
          const customer = customers.find(c => c.id === row.original.customerId);
          if (customer) {
            return (
              <div>
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.mobile}</div>
              </div>
            );
          }
        }
        return <div className="text-gray-400">N/A</div>;
      },
    },
    { // --- UPDATED VEHICLE COLUMN ---
      header: 'Vehicle',
      cell: ({ row }: { row: { original: Transaction } }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        const regNumber = vehicle?.registrationNumber;
        const fullDetails = row.original.vehicleName || (vehicle ? `${vehicle.make} ${vehicle.model} (${regNumber})` : '');

        if (regNumber) {
          // Display only Reg Number, use full details in title for hover
          return <div title={fullDetails}>{regNumber}</div>;
        }
        if(row.original.vehicleName) {
             // Display cached name if no vehicle found but name exists
             return <div title={row.original.vehicleName}>{row.original.vehicleName}</div>
        }
        return <div className="text-gray-400">N/A</div>; // Fallback
      },
    }, // --- END VEHICLE UPDATE ---
    {
      header: 'Receipt',
      cell: ({ row }: { row: { original: Transaction } }) => onPrintReceipt ? (<button onClick={e => { e.stopPropagation(); onPrintReceipt(row.original); }} className="p-1 hover:bg-gray-100 rounded" title="Print Receipt"><Printer className="h-4 w-4 text-gray-600" /></button>) : null,
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: { original: Transaction } }) => (
        <div className="flex space-x-2">
          {can('finance', 'view') && (<button onClick={e => { e.stopPropagation(); onView(row.original); }} className="text-blue-600 hover:text-blue-800" title="View Details"><Eye className="h-4 w-4" /></button>)}
          {can('finance', 'update') && (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit(row.original); }} className={`text-blue-600 hover:text-blue-800`} title={"Edit"} >
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={e => { e.stopPropagation(); onAssign(row.original); }} className="text-purple-600 hover:text-purple-800" title="Assign Group/Category"><Tag className="h-4 w-4" /></button>
              <button onClick={e => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-green-600 hover:text-green-800" title="Generate Document"><FileText className="h-4 w-4" /></button>
            </>
          )}
          {can('finance', 'delete') && (<button onClick={e => { e.stopPropagation(); onDelete(row.original); }} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 className="h-4 w-4" /></button>)}
          {row.original.documentUrl && (<button onClick={e => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }} className="text-blue-600 hover:text-blue-800" title="View Document"><Eye className="h-4 w-4" /></button>)}
        </div>
      ),
    },
  ];

  return (
    <DataTable data={transactions} columns={columns} onRowClick={transaction => can('finance', 'view') && onView(transaction)} />
  );
};

export default TransactionTable;