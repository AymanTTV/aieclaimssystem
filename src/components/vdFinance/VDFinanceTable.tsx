// src/components/vdFinance/VDFinanceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VDFinanceRecord } from '../../types/vdFinance';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';

interface VDFinanceTableProps {
  records: VDFinanceRecord[];
  onView: (record: VDFinanceRecord) => void;
  onEdit: (record: VDFinanceRecord) => void;
  onDelete: (record: VDFinanceRecord) => void;
  onGenerateDocument: (record: VDFinanceRecord) => void;
  onViewDocument: (url: string) => void;
  onClearProfit: (record: VDFinanceRecord) => void;
  onUnclearProfit: (record: VDFinanceRecord) => void;
  selectedIds: Set<string>; // NEW
  onToggleOne: (id: string) => void; // NEW
  onToggleAll: (checked: boolean, allIds: string[]) => void; // NEW
}

const VDFinanceTable: React.FC<VDFinanceTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onClearProfit,
  onUnclearProfit,
  selectedIds,
  onToggleOne,
  onToggleAll
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();

  const isPaid = (rec: VDFinanceRecord) => rec.profit === 0 && rec.originalProfit != null;
  const blurStyle = (rec: VDFinanceRecord) => isPaid(rec) ? "opacity-50 blur-[0.5px] select-none" : "";

  const profitColumn = {
    header: 'Profit',
    cell: ({ row }: any) => {
      const rec: VDFinanceRecord = row.original;
      if (rec.profit > 0) {
        return <span className="font-medium text-green-600">{formatCurrency(rec.profit)}</span>;
      }
      if (rec.originalProfit != null) {
        return <span className="font-medium text-yellow-600">Profit Paid</span>;
      }
      return <span className="font-medium text-gray-500">Cleared</span>;
    },
  };

  const columns = [
    {
      id: 'selection',
      header: () => (
        <input
          type="checkbox"
          checked={records.length > 0 && records.every(r => selectedIds.has(r.id))}
          onChange={(e) => onToggleAll(e.target.checked, records.map(r => r.id))}
          className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
        />
      ),
      cell: ({ row }: any) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleOne(row.original.id)}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
          />
        </div>
      ),
    },
    {
      header: 'Name & Reference',
      cell: ({ row }: any) => {
        const rec = row.original;
        return (
          <div className={blurStyle(rec)}>
            <div className="font-medium">{rec.name}</div>
            <div className="text-sm text-gray-500">Ref: {rec.reference}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {rec.groupName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800">
                  Grp: {rec.groupName}
                </span>
              )}
              {rec.departmentName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800">
                  Dept: {rec.departmentName}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    { 
      header: 'Registration', 
      cell: ({ row }: any) => {
        const rec = row.original;
        return (
          <div className={blurStyle(rec)}>
            {rec.registration}
          </div>
        );
      }
    },
    {
      header: 'Amount Details',
      cell: ({ row }: any) => {
        const rec = row.original;
        const discount = rec.totalDiscount ?? 0;
        return (
          <div className={`space-y-1 text-sm ${blurStyle(rec)}`}>
            <div>Total: {formatCurrency(rec.totalAmount)}</div>
            <div>NET: {formatCurrency(rec.netAmount)}</div>
            <div>VAT IN: {formatCurrency(rec.vatIn)}</div>
            {discount > 0 && (<div className="text-red-600">Discount: –{formatCurrency(discount)}</div>)}
          </div>
        );
      },
    },
    {
      header: 'Fees & Repairs',
      cell: ({ row }: any) => {
        const rec = row.original;
        return (
          <div className={`space-y-1 text-sm ${blurStyle(rec)}`}>
            <div>Solicitor: {formatCurrency(rec.solicitorFee)}</div>
            <div>Client Repair: {formatCurrency(rec.clientRepair)}</div>
            <div>Purchased Items: {formatCurrency(rec.purchasedItems)}</div>
          </div>
        );
      },
    },
    profitColumn,
    {
      header: 'Incident Details',
      cell: ({ row }: any) => {
        const rec = row.original;
        if (!rec.incidentDate) return <span className="text-gray-400">-</span>;
        return (
          <div className={blurStyle(rec)}>
            <div className="text-sm font-medium"> 
              {format(new Date(rec.incidentDate), 'dd/MM/yyyy')}
            </div>
            {rec.incidentTime && <div className="text-sm text-gray-500">{rec.incidentTime}</div>}
          </div>
        );
      },
    },
    { 
      header: 'Record Date', 
      cell: ({ row }: any) => {
        const rec = row.original;
        return (
          <div className={blurStyle(rec)}>
             {format(rec.date, 'dd/MM/yyyy HH:mm')}
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => {
        const rec: VDFinanceRecord = row.original;
        const recordPaid = isPaid(rec);

        return (
          <div className="flex space-x-2">
            {can('vdFinance', 'view') && (
              <button onClick={e => { e.stopPropagation(); onView(rec); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                <Eye className="h-4 w-4" />
              </button>
            )}

            {can('vdFinance', 'update') && !recordPaid && (
                <button onClick={e => { e.stopPropagation(); onEdit(rec); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                  <Edit className="h-4 w-4" />
                </button>
            )}

            {can('vdFinance', 'singleDoc') && (
                <button onClick={e => { e.stopPropagation(); onGenerateDocument(rec); }} className="text-green-600 hover:text-green-800" title="Generate Document">
                  <FileText className="h-4 w-4" />
                </button>
            )}

            {can('vdFinance', 'delete') && !recordPaid && (
              <button onClick={e => { e.stopPropagation(); onDelete(rec); }} className="text-red-600 hover:text-red-800" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {can('vdFinance', 'recordPayment') && rec.profit > 0 && (
              <button onClick={e => { e.stopPropagation(); onClearProfit(rec); }} className="px-2 py-1 text-xs bg-green-500 text-white rounded" title="Mark Profit Paid">
                Profit Paid
              </button>
            )}

            {user?.role === 'manager' && recordPaid && (
              <button onClick={e => { e.stopPropagation(); onUnclearProfit(rec); }} className="px-2 py-1 text-xs bg-yellow-500 text-white rounded" title="Re-open Profit">
                Re-open
              </button>
            )}

            {can('vdFinance', 'singleDoc') && rec.documentUrl && (
              <button onClick={e => { e.stopPropagation(); onViewDocument(rec.documentUrl!); }} className="text-blue-600 hover:text-blue-800" title="View Document">
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable data={records} columns={columns} onRowClick={rec => can('vdFinance', 'view') && onView(rec)} />;
};

export default VDFinanceTable;