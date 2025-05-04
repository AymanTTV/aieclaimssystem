import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useCustomers } from '../hooks/useCustomers';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceFilters } from '../hooks/useInvoiceFilters';
import InvoiceTable from '../components/finance/InvoiceTable';
import InvoiceForm from '../components/finance/InvoiceForm';
import InvoiceDetails from '../components/finance/InvoiceDetails';
import InvoiceEditModal from '../components/finance/InvoiceEditModal';
import InvoiceDeleteModal from '../components/finance/InvoiceDeleteModal';
import InvoicePaymentModal from '../components/finance/InvoicePaymentModal';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { Invoice } from '../types';
import { deleteInvoicePayment } from '../utils/invoiceUtils';
import toast from 'react-hot-toast';
import InvoiceFilters from '../components/finance/InvoiceFilters';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';

import { generateBulkDocuments } from '../utils/documentGenerator';
import { InvoiceBulkDocument } from '../components/pdf/documents';



const Invoices = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
   const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices
  } = useInvoiceFilters(invoices);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const handleExport = () => {
    const exportData = invoices.map(invoice => ({
      'Invoice Number': `AIE-INV-${invoice.id.slice(-8).toUpperCase()}`,
      Date: invoice.date.toLocaleDateString(),
      'Due Date': invoice.dueDate.toLocaleDateString(),
      Amount: `£${invoice.amount.toFixed(2)}`,
      'Amount Paid': `£${invoice.paidAmount.toFixed(2)}`,
      'Remaining Amount': `£${invoice.remainingAmount.toFixed(2)}`,
      Status: invoice.paymentStatus.replace('_', ' '),
      Category: invoice.category
    }));

    exportToExcel(exportData, 'invoices');
    toast.success('Invoices exported successfully');
  };

  const handleDeletePayment = async (invoice: Invoice, paymentId: string) => {
    try {
      await deleteInvoicePayment(invoice, paymentId);
      toast.success('Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      // Get company details
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) {
        throw new Error('Company details not found');
      }
      const companyDetails = companyDoc.data();
  
      // Generate PDF with all filtered vehicles
      const pdfBlob = await generateBulkDocuments(
        InvoiceBulkDocument,
        filteredInvoices,
        companyDetails
      );
  
      // Create URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
  
      toast.success('Invoice summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating Invoice PDF:', error);
      toast.error('Failed to generate Invoice PDF');
    }
  };

  if (vehiclesLoading || customersLoading || invoicesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <div className="flex space-x-2">

           <button
                    onClick={handleGeneratePDF}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Generate PDF
                  </button>
          
          {user?.role === 'manager' && (
  <button
    onClick={handleExport}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    <Download className="h-5 w-5 mr-2" />
    Export
  </button>
)}

          {can('finance', 'create') && (
      <>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
      </>
      )}
        </div>
      </div>
      {/* Add Filters */}
      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <InvoiceTable
        invoices={filteredInvoices}
        vehicles={vehicles}
        customers={customers}
        onView={setSelectedInvoice}
        onEdit={setEditingInvoice}
        onDelete={(invoice) => setDeletingInvoiceId(invoice.id)}
        onDownload={(invoice) => window.open(invoice.documentUrl, '_blank')}
        onRecordPayment={setPayingInvoice}
        onDeletePayment={handleDeletePayment}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Invoice"
        size="xl"
      >
        <InvoiceForm
          vehicles={vehicles}
          customers={customers}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            vehicle={vehicles.find(v => v.id === selectedInvoice.vehicleId)}
            customer={customers.find(c => c.id === selectedInvoice.customerId)}
            onDownload={() => window.open(selectedInvoice.documentUrl, '_blank')}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        title="Edit Invoice"
        size="xl"
      >
        {editingInvoice && (
          <InvoiceEditModal
            invoice={editingInvoice}
            vehicles={vehicles}
            customers={customers}
            onClose={() => setEditingInvoice(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingInvoiceId}
        onClose={() => setDeletingInvoiceId(null)}
        title="Delete Invoice"
      >
        {deletingInvoiceId && (
          <InvoiceDeleteModal
            invoiceId={deletingInvoiceId}
            onClose={() => setDeletingInvoiceId(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title="Record Payment"
        size="lg"
      >
        {payingInvoice && (
          <InvoicePaymentModal
            invoice={payingInvoice}
            vehicle={vehicles.find(v => v.id === payingInvoice.vehicleId)}
            onClose={() => setPayingInvoice(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Invoices;