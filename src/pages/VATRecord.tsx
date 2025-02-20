// src/pages/VATRecord.tsx

import React, { useState } from 'react';
import { useVATRecords } from '../hooks/useVATRecords';
import { useVATRecordFilters } from '../hooks/useVATRecordFilters';
import { useCustomers } from '../hooks/useCustomers';
import VATRecordTable from '../components/vatRecord/VATRecordTable';
import VATRecordForm from '../components/vatRecord/VATRecordForm';
import VATRecordDetails from '../components/vatRecord/VATRecordDetails';
import VATRecordFilters from '../components/vatRecord/VATRecordFilters';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { VATRecord } from '../types/vatRecord';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { exportToExcel } from '../utils/excel';

const VATRecordPage = () => {
  const { records, loading } = useVATRecords();
  const { customers } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    filteredRecords,
    summary
  } = useVATRecordFilters(records);

  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VATRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<VATRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<VATRecord | null>(null);

  const handleExport = () => {
    try {
      const exportData = records.map(record => ({
        'Receipt No': record.receiptNo,
        'Accountant': record.accountant,
        'Supplier': record.supplier,
        'REG No': record.regNo,
        'GROSS': record.gross.toFixed(2),
        'VAT %': record.vatPercentage,
        'VAT': record.vat.toFixed(2),
        'NET': record.net.toFixed(2),
        'VAT Received': record.vatReceived.toFixed(2),
        'Customer': record.customerName,
        'Status': record.status,
        'Date': record.date.toLocaleDateString(),
      }));

      exportToExcel(exportData, 'vat_records');
      toast.success('VAT records exported successfully');
    } catch (error) {
      console.error('Error exporting records:', error);
      toast.error('Failed to export records');
    }
  };

  const handleDelete = async (record: VATRecord) => {
    try {
      await deleteDoc(doc(db, 'vatRecords', record.id));
      toast.success('Record deleted successfully');
      setDeletingRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total NET</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            £{summary.net.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total VAT</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            £{summary.vat.toFixed(2)}
          </p>
        </div>
        

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total GROSS</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            £{summary.gross.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total VAT Received</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">
            £{summary.vatReceived.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">VAT Records</h1>
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
          {can('vatRecord', 'create') && (
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

      {/* Filters */}
      <VATRecordFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Records Table */}
      <VATRecordTable
        records={filteredRecords}
        onView={setSelectedRecord}
        onEdit={setEditingRecord}
        onDelete={setDeletingRecord}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm || !!editingRecord}
        onClose={() => {
          setShowForm(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? "Edit VAT Record" : "Add VAT Record"}
        size="xl"
      >
        <VATRecordForm
          record={editingRecord}
          customers={customers}
          onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="VAT Record Details"
        size="lg"
      >
        {selectedRecord && (
          <VATRecordDetails record={selectedRecord} />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        title="Delete VAT Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this VAT record? This action cannot be undone.
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

export default VATRecordPage;
