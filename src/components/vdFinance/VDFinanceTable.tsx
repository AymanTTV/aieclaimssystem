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
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();

  // Profit column only for managers
  const profitColumn = {
    header: 'Profit',
    cell: ({ row }) => {
      const rec = row.original;
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
      header: 'Name & Reference',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">Ref: {row.original.reference}</div>
        </div>
      ),
    },
    { header: 'Registration', accessorKey: 'registration' },
    {
      header: 'Amount Details',
      cell: ({ row }) => {
        const rec = row.original;
        const discount = rec.totalDiscount || 0;
        return (
          <div className="space-y-1 text-sm">
            <div>Total: {formatCurrency(rec.totalAmount)}</div>
            <div>NET: {formatCurrency(rec.netAmount)}</div>
            <div>VAT IN: {formatCurrency(rec.vatIn)}</div>
            {discount > 0 && (
              <div className="text-red-600">Discount: –{formatCurrency(discount)}</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Fees & Repairs',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div>Solicitor: {formatCurrency(row.original.solicitorFee)}</div>
          <div>Client Repair: {formatCurrency(row.original.clientRepair)}</div>
          <div>Purchased Items: {formatCurrency(row.original.purchasedItems)}</div>
        </div>
      ),
    },
    // Only include Profit column for managers
    ...(user?.role === 'manager' ? [profitColumn] : []),
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy HH:mm'),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="flex space-x-2">
            {can('claims', 'view') && (
              <button
                onClick={e => { e.stopPropagation(); onView(rec); }}
                className="text-blue-600 hover:text-blue-800"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {can('claims', 'update') && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onEdit(rec); }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onGenerateDocument(rec); }}
                  className="text-green-600 hover:text-green-800"
                  title="Generate Document"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </>
            )}
            {can('claims', 'delete') && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(rec); }}
                className="text-red-600 hover:text-red-800"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Profit toggle buttons only for managers */}
            {user?.role === 'manager' && rec.profit > 0 && (
              <button
                onClick={e => { e.stopPropagation(); onClearProfit(rec); }}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                title="Mark Profit Paid"
              >
                Profit Paid
              </button>
            )}
            {user?.role === 'manager' && rec.profit === 0 && rec.originalProfit != null && (
              <button
                onClick={e => { e.stopPropagation(); onUnclearProfit(rec); }}
                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded"
                title="Unclear Profit"
              >
                Unclear
              </button>
            )}

            {rec.documentUrl && (
              <button
                onClick={e => { e.stopPropagation(); onViewDocument(rec.documentUrl!); }}
                className="text-blue-600 hover:text-blue-800"
                title="View Document"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={records}
      columns={columns}
      onRowClick={rec => can('claims', 'view') && onView(rec)}
    />
  );
};

export default VDFinanceTable;
