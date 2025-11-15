// src/pages/Invoices.tsx
import React, { useEffect, useState } from 'react';
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
import InvoiceFilters from '../components/finance/InvoiceFilters';
import ManageCategoriesModal from '../components/finance/ManageCategoriesModal';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText, PoundSterling } from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { Invoice } from '../types/finance';
import { deleteInvoicePayment } from '../utils/invoiceUtils';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { generateBulkDocuments, generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { InvoiceBulkDocument, InvoiceDocument } from '../components/pdf/documents';
import { useFormattedDisplay } from '../hooks/useFormattedDisplay';

const Invoices: React.FC = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [categories, setCategories] = useState<string[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'invoiceCategories'));
        const cats: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { name: string };
          cats.push(data.name);
        });
        cats.sort((a, b) => a.localeCompare(b));
        setCategories(cats);
      } catch (err) {
        console.error('Error loading invoice categories:', err);
        toast.error('Failed to load invoice categories');
      }
    };
    fetchCategories();
  }, []);

  const refreshCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'invoiceCategories'));
      const cats: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as { name: string };
        cats.push(data.name);
      });
      cats.sort((a, b) => a.localeCompare(b));
      setCategories(cats);
    } catch (err) {
      console.error('Error refreshing categories:', err);
    }
  };

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices,
  } = useInvoiceFilters(invoices, vehicles); // <-- UPDATED

  const visible = filteredInvoices;
  const totalInvoicesAmount = visible.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaidAmount = visible.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  const totalOwingAmount = visible.reduce((sum, inv) => sum + (inv.remainingAmount > 0 ? inv.remainingAmount : 0), 0);

  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const handleExport = () => {
    const dataToExport = filteredInvoices.length > 0 ? filteredInvoices : invoices;
    const exportData = dataToExport.map((inv) => ({
      'Invoice Number': inv.invoiceNumber || `N/A (${inv.id.slice(-6)})`,
      Date: inv.date.toLocaleDateString(),
      'Due Date': inv.dueDate.toLocaleDateString(),
      'Customer': inv.customerName,
      'Vehicle': inv.vehicleName || '', // <-- ADDED
      Amount: `£${inv.total.toFixed(2)}`,
      'Amount Paid': `£${inv.paidAmount.toFixed(2)}`,
      'Remaining Amount': `£${inv.remainingAmount.toFixed(2)}`,
      Status: inv.paymentStatus.replace('_', ' '),
      Category: inv.category,
    }));
    exportToExcel(exportData, 'invoices');
    toast.success('Invoices exported successfully');
  };

  const handleDeletePayment = async (invoice: Invoice, paymentId: string) => {
    try {
      await deleteInvoicePayment(invoice, paymentId);
      toast.success('Payment deleted successfully');
      // Close any open modals to see the change
      setSelectedInvoice(prev => prev ? {...prev, payments: prev.payments.filter(p => p.id !== paymentId)} : null);
    } catch (err) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to delete payment');
    }
  };

  const handleGenerateDocument = async (inv: Invoice) => {
    try {
      toast.loading('Generating invoice PDF…');
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      await generateAndUploadDocument(
        InvoiceDocument,
        inv,
        'invoices',
        inv.id,
        'invoices',
        companyDetails
      );

      toast.dismiss();
      toast.success('Invoice PDF generated');
    } catch (err) {
      console.error('Error generating single invoice PDF:', err);
      toast.dismiss();
      toast.error('Failed to generate invoice PDF');
    }
  };

  const handleViewDocument = (inv: Invoice) => {
    if (inv.documentUrl) {
      window.open(inv.documentUrl, '_blank');
    } else {
      toast.error('No PDF available yet');
    }
  };

  const handleGenerateBulkPDF = async () => {
    try {
      if (filteredInvoices.length === 0) {
        toast.error("No invoices match the current filters to generate a PDF.");
        return;
      }
      toast.loading("Generating summary PDF...");
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error('Company details not found');
      const companyDetails = companyDoc.data();

      const blob = await generateBulkDocuments(
        InvoiceBulkDocument,
        filteredInvoices,
        companyDetails
      );
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.dismiss();
      toast.success('Invoice summary PDF generated');
    } catch (err) {
      console.error('Error generating bulk Invoice PDF:', err);
      toast.dismiss();
      toast.error('Failed to generate Invoice summary PDF');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
          {user?.role === 'manager' && (
            <button
              onClick={handleGenerateBulkPDF}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate PDF
            </button>
          )}

          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}

          {user?.role === 'manager' && (
            <button
              onClick={() => setShowManageCategories(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              Manage Categories
            </button>
          )}

          {can('finance', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {can('finance', 'cards') && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-gray-50">
                <PoundSterling className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-medium text-gray-600">Total Invoices</h4>
                <p className="mt-1 text-xl sm:text-2xl font-semibold text-gray-900">
                  {formatCurrency(totalInvoicesAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-gray-50">
                <PoundSterling className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-medium text-gray-600">Total Paid</h4>
                <p className="mt-1 text-xl sm:text-2xl font-semibold text-green-600">
                  {formatCurrency(totalPaidAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-gray-50">
                <PoundSterling className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-medium text-gray-600">Total Owing</h4>
                <p className="mt-1 text-xl sm:text-2xl font-semibold text-amber-600">
                  {formatCurrency(totalOwingAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        categories={categories}
      />

      <InvoiceTable
        invoices={filteredInvoices}
        vehicles={vehicles}
        customers={customers}
        onView={(inv) => setSelectedInvoice(inv)}
        onEdit={(inv) => setEditingInvoice(inv)}
        onDelete={(inv) => setDeletingInvoiceId(inv.id)}
        onDownload={(inv) => window.open(inv.documentUrl || '', '_blank')}
        onRecordPayment={(inv) => setPayingInvoice(inv)}
        onApplyDiscount={() => {}}
        onDeletePayment={handleDeletePayment}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Invoice"
        size="xl"
      >
        <InvoiceForm
          customers={customers}
          vehicles={vehicles}
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
          <InvoiceDetails
            invoice={selectedInvoice}
            vehicle={vehicles.find((v) => v.id === selectedInvoice.vehicleId)}
            customer={customers.find((c) => c.id === selectedInvoice.customerId)}
            onDownload={() =>
              window.open(selectedInvoice.documentUrl || '', '_blank')
            }
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
        size="xl"
      >
        {payingInvoice && (
          <InvoicePaymentModal
            invoice={payingInvoice}
            vehicle={vehicles.find((v) => v.id === payingInvoice.vehicleId)}
            customers={customers}
            onClose={() => setPayingInvoice(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={showManageCategories}
        onClose={() => {
          setShowManageCategories(false);
          refreshCategories();
        }}
        title="Manage Invoice Categories"
        size="lg"
      >
        <ManageCategoriesModal
          onClose={() => {
            setShowManageCategories(false);
            refreshCategories();
          }}
        />
      </Modal>
    </div>
  );
};

export default Invoices;