// src/components/customers/CustomerTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Customer } from '../../types/customer';
import { Eye, Edit, Trash2, FileText, File, Tag, Send } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../types/customer';
import { usePermissions } from '../../hooks/usePermissions';

// 1. ADD THESE IMPORTS
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
}

const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onAssignType
}) => {
  const { can } = usePermissions();

  // 2. REPLACE THE PREVIOUS sendSignatureRequest FUNCTION WITH THIS:
  const sendSignatureRequest = async (customer: Customer) => {
    if (!customer.mobile) {
      toast.error('This customer has no mobile number.');
      return;
    }

    const toastId = toast.loading('Generating secure link...');

    try {
      // Generate a simple unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Save token to Firestore
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        signatureRequestToken: token
      });

      // Construct URL with the token
      const baseUrl = window.location.origin;
      // We append ?token=xyz to the URL
      const signingLink = `${baseUrl}/sign/${customer.id}?token=${token}`;
      
      const message = `Hello ${customer.name}, please click the link below to digitally sign your document for AIE Skyline:\n\n${signingLink}`;
      
      // Format phone
      let phone = customer.mobile.replace(/\s+/g, '');
      if (phone.startsWith('0')) {
        phone = '44' + phone.substring(1);
      }

      toast.success('Link generated! Opening WhatsApp...', { id: toastId });

      // Open WhatsApp
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate link', { id: toastId });
    }
  };

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => <span className="capitalize">{row.original.type || 'Customer'}</span>,
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: ({ row }) => (
        <a
          href={`tel:${row.original.mobile}`}
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.mobile}
        </a>
      ),
    },
    {
      header: 'License Expiry',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.licenseExpiry) return <span className="text-gray-400">N/A</span>;
        const date = row.original.licenseExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date);
        return (
          <div className={`${expiredOrExpiring ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      header: 'Bill Expiry',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.billExpiry) return <span className="text-gray-400">N/A</span>;
        const date = row.original.billExpiry;
        const expiredOrExpiring = isExpiringOrExpired(date);
        return (
          <div className={`${expiredOrExpiring ? 'text-red-500' : 'text-gray-900'}`}>
            {formatDate(date)}
          </div>
        );
      },
    },
    {
      header: 'Signature',
      cell: ({ row }) => {
        if (row.original.type === 'company' || !row.original.signature) {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <img
            src={row.original.signature}
            alt="Signature"
            className="h-8 bg-gray-100 rounded border"
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          {can('customers', 'view') && (
            <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} className="text-gray-600 hover:text-blue-800" title="View Details"><Eye className="h-4 w-4" /></button>
          )}
          {can('customers', 'update') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} className="text-gray-600 hover:text-blue-800" title="Edit"><Edit className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onAssignType(row.original); }} className="text-gray-600 hover:text-green-800" title="Assign Type"><Tag className="h-4 w-4" /></button>
            </>
          )}
          {/* NEW: Send Signature Request Button */}
          {/* Send Button */}
           {can('customers', 'update') && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                sendSignatureRequest(row.original); 
              }} 
              className="text-gray-600 hover:text-green-600" 
              title="Send Signature Request"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          {can('customers', 'view') && (
            <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-gray-600 hover:text-purple-800" title="Generate Document"><FileText className="h-4 w-4" /></button>
          )}
          { can('customers', 'view') && row.original.documentUrl && (
            <button onClick={(e) => { e.stopPropagation(); onViewDocument(row.original.documentUrl!); }} className="text-gray-600 hover:text-indigo-800" title="View Document"><File className="h-4 w-4" /></button>
          )}
          {can('customers', 'delete') && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} className="text-gray-600 hover:text-red-800" title="Delete"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={customers}
      columns={columns}
      onRowClick={(customer) => can('customers', 'view') && onView(customer)}
    />
  );
};

export default CustomerTable;