import React, { useState } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VDInvoice } from '../../types/vdInvoice';
import { Invoice } from '../../types/finance';
import { Eye, Edit, Trash2, FileText, MessageCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import toast from 'react-hot-toast';
import InvoiceCommunicationModal from '../finance/InvoiceCommunicationModal';

interface VDInvoiceTableProps {
  invoices: VDInvoice[];
  onView: (invoice: VDInvoice) => void;
  onEdit: (invoice: VDInvoice) => void;
  onDelete: (invoice: VDInvoice) => void;
  onGenerateDocument: (invoice: VDInvoice) => void;
  onViewDocument: (url: string) => void;
}

const VDInvoiceTable: React.FC<VDInvoiceTableProps> = ({
  invoices,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
    invoice: Invoice | null;
    customerEmail?: string;
  }>({
    isOpen: false,
    mode: 'whatsapp',
    invoice: null,
  });

  const convertVDToInvoice = (vd: VDInvoice): Invoice => ({
    id: vd.id,
    invoiceNumber: vd.invoiceNumber,
    date: vd.date,
    dueDate: vd.date,
    total: vd.total,
    amount: vd.total,
    paidAmount: vd.paidAmount,
    remainingAmount: vd.remainingAmount,
    category: 'Vehicle Damage',
    customerName: vd.customerName,
    customerPhone: vd.customerPhone,
    vehicleName: `${vd.make || ''} ${vd.model || ''} (${vd.registration || ''})`.trim(),
    paymentStatus: vd.paymentStatus as any,
    lineItems: [],
    subTotal: vd.subtotal,
    vatAmount: vd.vatAmount,
    payments: (vd.payments || []) as any,
    createdAt: vd.createdAt,
    updatedAt: vd.updatedAt,
  });

  const handleWhatsApp = (inv: VDInvoice) => {
    setCommModal({
      isOpen: true,
      mode: 'whatsapp',
      invoice: convertVDToInvoice(inv),
      customerEmail: inv.customerEmail,
    });
  };

  const handleEmail = (inv: VDInvoice) => {
    setCommModal({
      isOpen: true,
      mode: 'email',
      invoice: convertVDToInvoice(inv),
      customerEmail: inv.customerEmail,
    });
  };

  const columns = [
    {
      header: 'Invoice Number',
      accessorKey: 'invoiceNumber',
    },
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
    {
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customerName}</div>
          <div className="text-sm text-gray-500">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.registration} - {row.original.make} {row.original.model}
          </div>
        </div>
      ),
    },
    {
      header: 'Payment Details',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">Total: £{row.original.total.toFixed(2)}</div>
          <div className="text-sm text-green-600">
            Paid: £{row.original.paidAmount.toFixed(2)}
          </div>
          {row.original.remainingAmount > 0 && (
            <div className="text-sm text-amber-600">
              Due: £{row.original.remainingAmount.toFixed(2)}
            </div>
          )}
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('vdInvoice', 'view') && (
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
          {can('vdInvoice', 'update') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="text-yellow-600 hover:text-yellow-800"
            title="Edit Invoice"
          >
            <Edit className="h-4 w-4" />
          </button>
          )}
          {can('vdInvoice', 'whatsapp') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWhatsApp(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Share via WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {can('vdInvoice', 'email') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEmail(row.original);
              }}
              className="text-sky-600 hover:text-sky-800"
              title="Send Email"
            >
              <Mail className="h-4 w-4" />
            </button>
          )}
          {can('vdInvoice', 'singleDoc') && (
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
          )}
          {can('vdInvoice', 'delete') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.original);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete Invoice"
          >
            <Trash2 className="h-4 w-4" />
          </button>
      )}
      {can('vdInvoice', 'singleDoc') && row.original.documentUrl && (
  
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
    <>
      <DataTable
        data={invoices}
        columns={columns}
        onRowClick={onView}
      />

      <InvoiceCommunicationModal
        isOpen={commModal.isOpen}
        onClose={() => setCommModal(prev => ({ ...prev, isOpen: false, invoice: null }))}
        invoice={commModal.invoice}
        customer={commModal.invoice ? ({
          id: 'temp_vd_cust',
          name: commModal.invoice.customerName || 'Customer',
          email: commModal.customerEmail || '',
          mobile: commModal.invoice.customerPhone || '',
        } as any) : undefined}
        initialMode={commModal.mode}
      />
    </>
  );
};

export default VDInvoiceTable;