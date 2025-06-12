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
import { Plus, Download, FileText } from 'lucide-react';
import { PoundSterling } from 'lucide-react';
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

  // ── STATE FOR DYNAMIC CATEGORIES ──
  const [categories, setCategories] = useState<string[]>([]);
  const [showManageCategories, setShowManageCategories] = useState(false);

  // Fetch categories
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

  // refresh categories
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

  // ── INVOICE FILTERS HOOK ──
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
  } = useInvoiceFilters(invoices);

  // ── SUMMARY NUMBERS ──
  const totalInvoicesAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOwingAmount = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

  // ── MODAL STATE ──
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // ── HANDLERS ──
  const handleExport = () => {
    const exportData = invoices.map((inv) => ({
      'Invoice Number': `AIE-INV-${inv.id.slice(-8).toUpperCase()}`,
      Date: inv.date.toLocaleDateString(),
      'Due Date': inv.dueDate.toLocaleDateString(),
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
    } catch (err) {
      console.error('Error deleting payment:', err);
      toast.error('Failed to delete payment');
    }
  };

  // ── SINGLE‐INVOICE PDF Generation ──
  const handleGenerateDocument = async (inv: Invoice) => {
    try {
      toast.loading('Generating invoice PDF…');
      const companyDetails = await getCompanyDetails();
      if (!companyDetails) throw new Error('Company details not found');

      // Re‐use the same utility that maintenance uses, except point at InvoiceDocument
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

  // ── SINGLE‐INVOICE VIEW (open PDF in new tab) ──
  const handleViewDocument = (inv: Invoice) => {
    if (inv.documentUrl) {
      window.open(inv.documentUrl, '_blank');
    } else {
      toast.error('No PDF available yet');
    }
  };

  // ── BULK PDF for all filtered invoices ──
  const handleGenerateBulkPDF = async () => {
    try {
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
      toast.success('Invoice summary PDF generated');
    } catch (err) {
      console.error('Error generating bulk Invoice PDF:', err);
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
      {/* ─── Page Header ─── */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
          <button
            onClick={handleGenerateBulkPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>
          )}

          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}

          <button
            onClick={() => setShowManageCategories(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Manage Categories
          </button>

          {can('finance', 'create') && (
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

      {/* ─── Summary Cards ─── */}
      {can('finance', 'cards') && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <PoundSterling className="h-6 w-6 text-primary mr-2" />
            <h4 className="text-sm font-semibold text-gray-600">Total Invoices</h4>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(totalInvoicesAmount)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <PoundSterling className="h-6 w-6 text-green-600 mr-2" />
            <h4 className="text-sm font-semibold text-gray-600">Total Paid</h4>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(totalPaidAmount)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <PoundSterling className="h-6 w-6 text-amber-600 mr-2" />
            <h4 className="text-sm font-semibold text-gray-600">Total Owing</h4>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {formatCurrency(totalOwingAmount)}
          </p>
        </div>
      </div>

      )}

      {/* ─── Filters Section ─── */}
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

      {/* ─── Main Table with “Generate PDF” & “View PDF” ─── */}
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

        // NEW callbacks:
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
      />

      {/* ─── Modals ─── */}
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
            onClose={() => setPayingInvoice(null)}
          />
        )}
      </Modal>

      {/* ─── Manage Categories Modal ─── */}
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
