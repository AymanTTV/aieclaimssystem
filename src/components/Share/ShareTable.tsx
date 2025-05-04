import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { ShareRecord } from '../../types/share';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface ShareTableProps {
  records: ShareRecord[];
  onView: (r: ShareRecord) => void;
  onEdit: (r: ShareRecord) => void;
  onDelete: (r: ShareRecord) => void;
}

const ShareTable: React.FC<ShareTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    {
      header: 'Client',
      accessorKey: 'clientName',
    },
    {
      header: 'Reason / Dates',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-1 text-sm">
            <div>Reason: {r.reason}</div>
            {r.startDate && r.endDate && (
              <div>
                {format(new Date(r.startDate), 'dd/MM/yyyy')} –
                {format(new Date(r.endDate), 'dd/MM/yyyy')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Amounts',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-1 text-sm">
            <div>VD: {formatCurrency(r.vdProfit)}</div>
            <div>Paid: {formatCurrency(r.actualPaid)}</div>
            <div>Vehicle: {formatCurrency(r.vehicleRunningCost)}</div>
          </div>
        );
      },
    },
    {
      header: 'Fees & Expenses',
      cell: ({ row }) => {
        const r = row.original;
        const expSum = r.expenses.reduce((s, e) => s + e.amount * (e.vat ? 1.2 : 1), 0);
        return (
          <div className="space-y-1 text-sm">
            <div>Legal {r.legalFeePercentage}%: {formatCurrency(r.legalFeeCost)}</div>
            <div>Expenses: {formatCurrency(expSum)}</div>
          </div>
        );
      },
    },
    {
      header: 'Shares',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="space-y-1 text-sm">
            <div>AIE {r.aieSkylinePercentage}%: {formatCurrency(r.aieSkylineAmount)}</div>
            <div>Abd {r.abdulAzizPercentage}%: {formatCurrency(r.abdulAzizAmount)}</div>
            <div>JAY {r.jayPercentage}%: {formatCurrency(r.jayAmount)}</div>
          </div>
        );
      },
    },
    {
      header: 'Progress',
      accessorKey: 'progress',
      cell: ({ getValue }) => String(getValue()).replace('-', ' ').toUpperCase(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('share', 'view') && (
            <button onClick={() => onView(row.original)} title="View">
              <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
            </button>
          )}
          {can('share', 'update') && (
            <button onClick={() => onEdit(row.original)} title="Edit">
              <Edit className="h-4 w-4 text-green-600 hover:text-green-800" />
            </button>
          )}
          {can('share', 'delete') && (
            <button onClick={() => onDelete(row.original)} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
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
      onRowClick={r => can('share', 'view') && onView(r)}
    />
  );
};

export default ShareTable;
