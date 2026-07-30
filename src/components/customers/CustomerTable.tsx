// src/components/customers/CustomerTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2, FileText, File, Tag, Send, Inbox } from 'lucide-react'; // [NEW] Added Inbox
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../types/customer';
import { usePermissions } from '../../hooks/usePermissions';
import { doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onGenerateDocument: (customer: Customer) => void;
  onViewDocument: (url: string) => void;
  onAssignType: (customer: Customer) => void;
  onUpdateBillCopy: (customer: Customer) => void; // [NEW]
  rowSelection: any;
  onRowSelectionChange: any;
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers, onView, onEdit, onDelete, onGenerateDocument, onViewDocument, onAssignType, onUpdateBillCopy,
  rowSelection, onRowSelectionChange
}) => {
  const { can } = usePermissions();

  const sendSignatureRequest = async (customer: Customer) => {
      if (!customer.mobile) { toast.error('This customer has no mobile number.'); return; }
      const toastId = toast.loading('Generating secure link...');
      try {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 1);
        await updateDoc(doc(db, 'customers', customer.id), { signatureRequestToken: token, signatureRequestExpiresAt: expiresAt });
        const signingLink = `${window.location.origin}/sign/${customer.id}?token=${token}`;
        const message = `Hello ${customer.name}, please click the link below to digitally sign your document for AIE Skyline. This link will expire in 1 hour:\n\n${signingLink}`;
        let phone = customer.mobile.replace(/\s+/g, '');
        if (phone.startsWith('0')) phone = '44' + phone.substring(1);
        toast.success('Link generated! Opening WhatsApp...', { id: toastId });
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      } catch (error) { toast.error('Failed to generate link', { id: toastId }); }
  };

  const allSelected = customers.length > 0 && Object.keys(rowSelection).length === customers.length;

  const columns = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
          checked={allSelected}
          onChange={() => {
            if (allSelected) {
              onRowSelectionChange({});
            } else {
              const newSel: any = {};
              customers.forEach(c => newSel[c.id] = true);
              onRowSelectionChange(newSel); 
            }
          }}
        />
      ),
      cell: ({ row }: any) => {
        const customerId = row.original.id;
        const isSelected = !!rowSelection[customerId];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
              checked={isSelected}
              onChange={() => {
                onRowSelectionChange((prev: any) => {
                  const newSel = { ...prev };
                  if (newSel[customerId]) { delete newSel[customerId]; } else { newSel[customerId] = true; }
                  return newSel;
                });
              }}
            />
          </div>
        );
      },
    },
    { 
      header: 'Name', 
      accessorKey: 'name',
      cell: ({ row }: any) => <span className="font-medium text-gray-900 text-sm">{row.original.name}</span>
    },
    {
      header: 'Age',
      accessorKey: 'age',
      cell: ({ row }: any) => <span className="text-gray-600 text-sm">{row.original.age || '-'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => {
        const status = row.original.status || 'active';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      }
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }: any) => <span className="capitalize text-gray-600 text-sm">{row.original.type || 'Customer'}</span>,
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: ({ row }: any) => (
        <a href={`tel:${row.original.mobile}`} className="text-blue-600 hover:underline text-sm whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {row.original.mobile}
        </a>
      ),
    },
    {
      header: 'License Expiry',
      cell: ({ row }: any) => {
        if (row.original.type === 'company' || !row.original.licenseExpiry) return <span className="text-gray-400 text-sm">-</span>;
        const date = row.original.licenseExpiry;
        return <div className={`${isExpiringOrExpired(date) ? 'text-red-600 font-medium' : 'text-gray-600'} text-sm whitespace-nowrap`}>{formatDate(date)}</div>;
      },
    },
    {
      header: 'Bill Expiry',
      cell: ({ row }: any) => {
        if (row.original.type === 'company' || !row.original.billExpiry) return <span className="text-gray-400 text-sm">-</span>;
        const date = row.original.billExpiry;
        return <div className={`${isExpiringOrExpired(date) ? 'text-red-600 font-medium' : 'text-gray-600'} text-sm whitespace-nowrap`}>{formatDate(date)}</div>;
      },
    },
    {
      header: 'Signature',
      cell: ({ row }: any) => {
        if (row.original.type === 'company') return <span className="text-gray-400 text-sm">-</span>;
        const signature = row.original.signature;
        if (signature) {
          return (
            <div className="h-8 w-14 bg-white border border-gray-200 rounded flex items-center justify-center overflow-hidden shrink-0">
              <img src={signature} alt="Signature" className="max-h-full max-w-full object-contain" />
            </div>
          );
        }
        return <span className="text-[10px] text-gray-500 italic bg-gray-100 px-2 py-1 rounded">Pending</span>;
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2.5">
          {can('customers', 'view') && <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} className="text-gray-500 hover:text-blue-600" title="View"><Eye className="h-4 w-4" /></button>}
          {can('customers', 'update') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} className="text-gray-500 hover:text-blue-600" title="Edit"><Edit className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onAssignType(row.original); }} className="text-gray-500 hover:text-green-600" title="Assign Type"><Tag className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); sendSignatureRequest(row.original); }} className="text-gray-500 hover:text-green-600" title="Signature Request"><Send className="h-4 w-4" /></button>
              {/* [NEW] Bill Copy Action Button */}
              <button onClick={(e) => { e.stopPropagation(); onUpdateBillCopy(row.original); }} className={`hover:text-orange-600 ${row.original.billCopyStatus === 'available' ? 'text-orange-500' : 'text-gray-500'}`} title="Office Bill Copy Status"><Inbox className="h-4 w-4" /></button>
            </>
          )}
          {can('customers', 'view') && <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-gray-500 hover:text-purple-600" title="Generate Doc"><FileText className="h-4 w-4" /></button>}
          {can('customers', 'view') && row.original.documentUrl && <button onClick={(e) => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }} className="text-gray-500 hover:text-indigo-600" title="View Doc"><File className="h-4 w-4" /></button>}
          {can('customers', 'delete') && <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} className="text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={(customer) => can('customers', 'view') && onView(customer)}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
    />
  );
};

export default CustomerTable;