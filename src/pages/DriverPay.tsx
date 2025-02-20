// src/pages/DriverPay.tsx

import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { usePermissions } from '../hooks/usePermissions';
import { useDriverPay } from '../hooks/useDriverPay';
import { useDriverPayFilters } from '../hooks/useDriverPayFilters';
import { Download, Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { DriverPay } from '../types/driverPay';
import DriverPayForm from '../components/driverPay/DriverPayForm';
import DriverPayDetails from '../components/driverPay/DriverPayDetails';
import DriverPayFilters from '../components/driverPay/DriverPayFilters';
import DriverPayTable from '../components/driverPay/DriverPayTable';
import DriverPaySummary from '../components/driverPay/DriverPaySummary';
import DriverPayPaymentModal from '../components/driverPay/DriverPayPaymentModal';
import Modal from '../components/ui/Modal';
import { exportToExcel } from '../utils/excel';
import toast from 'react-hot-toast';

const DriverPayPage = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { records, loading } = useDriverPay();
  
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    collectionFilter,
    setCollectionFilter,
    dateRange,
    setDateRange,
    filteredRecords,
    summary
  } = useDriverPayFilters(records);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DriverPay | null>(null);
  const [editingRecord, setEditingRecord] = useState<DriverPay | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<DriverPay | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DriverPay | null>(null);

  const handleExport = () => {
    try {
      const exportData = records.map(record => ({
        'Driver No': record.driverNo,
        'TID': record.tidNo,
        'Name': record.name,
        'Phone Number': record.phoneNumber,
        'Collection': record.collection === 'OTHER' ? record.customCollection : record.collection,
        'Total Amount': record.paymentPeriods.reduce((sum, period) => sum + period.totalAmount, 0).toFixed(2),
        'Commission': record.paymentPeriods.reduce((sum, period) => sum + period.commissionAmount, 0).toFixed(2),
        'Net Pay': record.paymentPeriods.reduce((sum, period) => sum + period.netPay, 0).toFixed(2),
        'Paid Amount': record.paymentPeriods.reduce((sum, period) => sum + period.paidAmount, 0).toFixed(2),
        'Remaining': record.paymentPeriods.reduce((sum, period) => sum + period.remainingAmount, 0).toFixed(2),
        'Created At': format(record.createdAt, 'dd/MM/yyyy HH:mm'),
        'Last Updated': format(record.updatedAt, 'dd/MM/yyyy HH:mm')
      }));

      exportToExcel(exportData, 'driver_pay_records');
      toast.success('Records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error('Failed to export records');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <DriverPaySummary
        total={summary.total}
        commission={summary.commission}
        netPay={summary.netPay}
      />

      {/* Header with Search and Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Driver Pay</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {can('driverPay', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Driver Pay
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <DriverPayFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        collectionFilter={collectionFilter}
        onCollectionFilterChange={setCollectionFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Data Table */}
      <DriverPayTable
        records={filteredRecords}
        onView={setSelectedRecord}
        onEdit={setEditingRecord}
        onDelete={setDeletingRecord}
        onRecordPayment={setRecordingPayment}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add Driver Pay Record"
        size="xl"
      >
        <DriverPayForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Driver Pay Details"
        size="lg"
      >
        {selectedRecord && (
          <DriverPayDetails record={selectedRecord} />
        )}
      </Modal>

      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Edit Driver Pay Record"
        size="xl"
      >
        {editingRecord && (
          <DriverPayForm
            record={editingRecord}
            onClose={() => setEditingRecord(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!recordingPayment}
        onClose={() => setRecordingPayment(null)}
        title="Record Payment"
      >
        {recordingPayment && (
          <DriverPayPaymentModal
            record={recordingPayment}
            onClose={() => setRecordingPayment(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        title="Delete Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this driver pay record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingRecord(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (deletingRecord) {
                  try {
                    await deleteDoc(doc(db, 'driverPay', deletingRecord.id));
                    toast.success('Record deleted successfully');
                    setDeletingRecord(null);
                  } catch (error) {
                    console.error('Error deleting record:', error);
                    toast.error('Failed to delete record');
                  }
                }
              }}
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

export default DriverPayPage;
