// src/pages/VDFinance.tsx
import React, { useState } from 'react';
import { useVDFinance } from '../hooks/useVDFinance';
import { useVehicles } from '../hooks/useVehicles';
import VDFinanceTable from '../components/vdFinance/VDFinanceTable';
import VDFinanceForm from '../components/vdFinance/VDFinanceForm';
import VDFinanceSummary from '../components/vdFinance/VDFinanceSummary';
import VDFinanceDetails from '../components/vdFinance/VDFinanceDetails';
import VDFinanceFilters from '../components/vdFinance/VDFinanceFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download, FileText } from 'lucide-react';
import { VDFinanceRecord } from '../types/vdFinance';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VDFinanceDocument, VDFinanceBulkDocument } from '../components/pdf/documents';

const VDFinance: React.FC = () => {
  const { records, loading } = useVDFinance();
  const { vehicles } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [statusFilter, setStatusFilter] = useState<ProfitStatusFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VDFinanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<VDFinanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<VDFinanceRecord | null>(null);

  const handleClearProfit = async (rec: VDFinanceRecord) => {
    try {
      await updateDoc(doc(db, 'vdFinance', rec.id), {
        originalProfit: rec.profit,
        profit: 0,
      });
      toast.success('Profit marked as paid');
    } catch (error: any) {
      console.error('Error clearing profit:', error);
      toast.error(error.message || 'Failed to clear profit');
    }
  };

  const handleUnclearProfit = async (rec: VDFinanceRecord) => {
    try {
      await updateDoc(doc(db, 'vdFinance', rec.id), {
        profit: rec.originalProfit,
        originalProfit: deleteField(),
      });
      toast.success('Profit restored');
    } catch (error: any) {
      console.error('Error restoring profit:', error);
      toast.error(error.message || 'Failed to restore profit');
    }
  };

  const handleExport = () => {
    try {
      const exportData = records.map(r => ({
        'Name': r.name,
        'Reference': r.reference,
        'Registration': r.registration,
        'Total Amount': r.totalAmount.toFixed(2),
        'NET': r.netAmount.toFixed(2),
        'VAT IN': r.vatIn.toFixed(2),
        'VAT OUT': r.vatOut.toFixed(2),
        'Solicitor Fee': r.solicitorFee.toFixed(2),
        'Client Repair': r.clientRepair.toFixed(2),
        'Purchased Items': r.purchasedItems.toFixed(2),
        'Profit': r.profit.toFixed(2),
        'Date': r.date.toLocaleDateString(),
      }));
      exportToExcel(exportData, 'vd_finance_records');
      toast.success('Records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error('Failed to export records');
    }
  };

  const handleDelete = async (record: VDFinanceRecord) => {
    try {
      await deleteDoc(doc(db, 'vdFinance', record.id));
      toast.success('Record deleted successfully');
      setDeletingRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleGenerateDocument = async (record: VDFinanceRecord) => {
    try {
      const vehicle = vehicles.find(v => v.registrationNumber === record.registration);
      await generateAndUploadDocument(
        VDFinanceDocument,
        { ...record, vehicle },
        'vdFinance',
        record.id,
        'vdFinance'
      );
      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const handleGeneratePDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error('Company details not found');
      const companyDetails = companyDoc.data();
      const pdfBlob = await generateBulkDocuments(
        VDFinanceBulkDocument,
        filteredRecords,
        companyDetails
      );
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      toast.success('VDFinance summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating VDFinance PDF:', error);
      toast.error('Failed to generate VDFinance PDF');
    }
  };

   const filteredRecords = records
    .filter(record => {
      const mq = searchQuery.toLowerCase();
      const matchesSearch =
        record.name.toLowerCase().includes(mq) ||
        record.reference.toLowerCase().includes(mq) ||
        record.registration.toLowerCase().includes(mq);
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = record.date >= dateRange.start && record.date <= dateRange.end;
      }
      return matchesSearch && matchesDate;
    })
    .filter(record => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'unpaid') {
        return record.profit > 0;
      }
      if (statusFilter === 'paid') {
        return record.profit === 0 && record.originalProfit != null;
      }
      // 'cleared'
      return record.profit === 0 && record.originalProfit == null;
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
      <VDFinanceSummary records={filteredRecords} />

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">VD Finance</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <button
              onClick={handleGeneratePDF}
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
          {can('claims', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Record
            </button>
          )}
        </div>
      </div>

      <VDFinanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <VDFinanceTable
        records={filteredRecords}
        onView={setSelectedRecord}
        onEdit={setEditingRecord}
        onDelete={setDeletingRecord}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onClearProfit={handleClearProfit}
        onUnclearProfit={handleUnclearProfit}
      />

      <Modal
        isOpen={showForm || !!editingRecord}
        onClose={() => {
          setShowForm(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? 'Edit Record' : 'Add Record'}
        size="xl"
      >
        <VDFinanceForm
          record={editingRecord}
          vehicles={vehicles}
          onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="VD Finance Details"
        size="lg"
      >
        {selectedRecord && <VDFinanceDetails record={selectedRecord} />}
      </Modal>

      <Modal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        title="Delete Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingRecord(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingRecord && handleDelete(deletingRecord)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Record
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VDFinance;
