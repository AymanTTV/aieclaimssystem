import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VDFinanceRecord } from '../../types/vdFinance';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface VDFinanceTableProps {
  records: VDFinanceRecord[];
  onView: (record: VDFinanceRecord) => void;
  onEdit: (record: VDFinanceRecord) => void;
  onDelete: (record: VDFinanceRecord) => void;
  onGenerateDocument: (record: VDFinanceRecord) => void;
  onViewDocument: (url: string) => void;
}

const VDFinanceTable: React.FC<VDFinanceTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

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
    {
      header: 'Registration',
      accessorKey: 'registration',
    },
    {
      header: 'Amount Details',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div>Total: £{row.original.totalAmount.toFixed(2)}</div>
          <div>NET: £{row.original.netAmount.toFixed(2)}</div>
          <div>VAT IN: £{row.original.vatIn.toFixed(2)}</div>
        </div>
      ),
    },
    {
      header: 'Fees & Repairs',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div>Solicitor: £{row.original.solicitorFee.toFixed(2)}</div>
          <div>Client Repair: £{row.original.clientRepair.toFixed(2)}</div>
          <div>Purchased Items: £{row.original.purchasedItems.toFixed(2)}</div>
        </div>
      ),
    },
    {
      header: 'Profit',
      cell: ({ row }) => (
        <div className="font-medium text-green-600">
          £{row.original.profit.toFixed(2)}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy HH:mm'),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('claims', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('claims', 'update') && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateDocument(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
            </>
          )}
          {can('claims', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument(row.original.documentUrl!);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Document"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={records}
      columns={columns}
      onRowClick={(record) => can('claims', 'view') && onView(record)}
    />
  );
};

export default VDFinanceTable;