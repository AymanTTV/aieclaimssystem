import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VATRecord } from '../../types/vatRecord';
import { Eye, Edit, Trash2, FileText, CheckCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VATRecordTableProps {
  records: VATRecord[];
  onView: (record: VATRecord) => void;
  onEdit: (record: VATRecord) => void;
  onDelete: (record: VATRecord) => void;
  onGenerateDocument: (record: VATRecord) => void;
  onViewDocument: (url: string) => void;
  onUpdateStatus: (record: VATRecord) => void; // Add this prop
}

const VATRecordTable: React.FC<VATRecordTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onUpdateStatus
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();
  const columns = [
    {
      header: 'Receipt Details',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.receiptNo}</div>
          <div className="text-sm text-gray-500">
            {format(row.original.date, 'dd/MM/yyyy')}
          </div>
        </div>
      ),
    },
    {
      header: 'Supplier Info',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.supplier}</div>
          <div className="text-sm text-gray-500">REG: {row.original.regNo}</div>
          {row.original.vatNo && <div className="text-sm text-gray-500">VAT No: {row.original.vatNo}</div>} {/* Display VAT No */}
        </div>
      ),
    },
    {
      header: 'Financial Details',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="text-green-600">NET: {formatCurrency(row.original.net !== undefined ? row.original.net : 0)}</div>
          <div className="text-blue-600">VAT: {formatCurrency(row.original.vat !== undefined ? row.original.vat : 0)}</div>
          <div>GROSS: {formatCurrency(row.original.gross !== undefined ? row.original.gross : 0)}</div>
          <div className="text-purple-600">Received: {formatCurrency(row.original.vatReceived !== undefined ? row.original.vatReceived : 0)}</div>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.customerName}</div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
          ${row.original.status === 'awaiting' ? 'bg-yellow-100 text-yellow-800' :
            row.original.status === 'processing' ? 'bg-blue-100 text-blue-800' :
            'bg-green-100 text-green-800'}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('vatRecord', 'view') && (
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
          {can('vatRecord', 'update') && (
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

            {can('vatRecord', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(row.original); // Call the update status handler
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Update Status"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          {can('vatRecord', 'delete') && (
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
      onRowClick={(record) => can('vatRecord', 'view') && onView(record)}
    />
  );
};

export default VATRecordTable;