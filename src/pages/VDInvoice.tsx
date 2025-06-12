import React, { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { VDInvoice } from '../types/vdInvoice';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Search } from 'lucide-react';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { VDInvoiceDocument } from '../components/pdf/documents';

// Import components
import VDInvoiceTable from '../components/vdInvoice/VDInvoiceTable';
import VDInvoiceForm from '../components/vdInvoice/VDInvoiceForm';
import VDInvoiceDetails from '../components/vdInvoice/VDInvoiceDetails';

const VDInvoicePage = () => {
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const [invoices, setInvoices] = useState<VDInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VDInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<VDInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<VDInvoice | null>(null);
  const { user } = useAuth();

  React.useEffect(() => {
    const q = query(collection(db, 'vdInvoices'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as VDInvoice[];
      setInvoices(invoiceData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (data: Partial<VDInvoice>) => {
    try {
      const docRef = await addDoc(collection(db, 'vdInvoices'), {
        ...data,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await generateAndUploadDocument(
        VDInvoiceDocument,
        { id: docRef.id, ...data },
        'vdInvoices',
        docRef.id,
        'vdInvoices'
      );

      toast.success('Invoice created successfully');
      setShowForm(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const handleUpdate = async (data: Partial<VDInvoice>) => {
    if (!editingInvoice) return;

    try {
      await updateDoc(doc(db, 'vdInvoices', editingInvoice.id), {
        ...data,
        updatedAt: new Date()
      });

      await generateAndUploadDocument(
        VDInvoiceDocument,
        { id: editingInvoice.id, ...data },
        'vdInvoices',
        editingInvoice.id,
        'vdInvoices'
      );

      toast.success('Invoice updated successfully');
      setEditingInvoice(null);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  const handleDelete = async (invoice: VDInvoice) => {
    try {
      await deleteDoc(doc(db, 'vdInvoices', invoice.id));
      toast.success('Invoice deleted successfully');
      setDeletingInvoice(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleGenerateDocument = async (invoice: VDInvoice) => {
    try {
      await generateAndUploadDocument(
        VDInvoiceDocument,
        invoice,
        'vdInvoices',
        invoice.id,
        'vdInvoices'
      );
      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchQuery.toLowerCase();
    return (
      invoice.customerName.toLowerCase().includes(searchLower) ||
      invoice.registration.toLowerCase().includes(searchLower) ||
      invoice.invoiceNumber.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">VD Invoices</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <VDInvoiceTable
        invoices={filteredInvoices}
        onView={setSelectedInvoice}
        onEdit={setEditingInvoice}
        onDelete={setDeletingInvoice}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={(url) => window.open(url, '_blank')}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Invoice"
        size="xl"
      >
        <VDInvoiceForm
          customers={customers}
          vehicles={vehicles}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Invoice Details"
        size="xl"
      >
        {selectedInvoice && (
          <VDInvoiceDetails invoice={selectedInvoice} />
        )}
      </Modal>

      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title="Edit Invoice"
        size="xl"
      >
        {editingInvoice && (
          <VDInvoiceForm
            invoice={editingInvoice}
            customers={customers}
            vehicles={vehicles}
            onSubmit={handleUpdate}
            onClose={() => setEditingInvoice(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingInvoice}
        onClose={() => setDeletingInvoice(null)}
        title="Delete Invoice"
      >
        {deletingInvoice && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() =>setDeletingInvoice(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(deletingInvoice);
                  setDeletingInvoice(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VDInvoicePage;