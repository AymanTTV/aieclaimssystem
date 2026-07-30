// src/pages/DriverPay.tsx
import React, { useState, useCallback } from 'react';
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import { usePermissions } from '../hooks/usePermissions';
import { useDriverPay } from '../hooks/useDriverPay';
import { useDriverPayFilters } from '../hooks/useDriverPayFilters';
import { Download, Plus, FileText, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AddPaymentPeriodModal from '../components/driverPay/AddPaymentPeriodModal';
import { format } from 'date-fns';
import { DriverPay } from '../types/driverPay';
import DriverPayForm from '../components/driverPay/DriverPayForm';
import DriverPayDetails from '../components/driverPay/DriverPayDetails';
import DriverPayFilters from '../components/driverPay/DriverPayFilters';
import DriverPayTable from '../components/driverPay/DriverPayTable';
import DriverPaySummary from '../components/driverPay/DriverPaySummary';
import DriverPayPaymentModal from '../components/driverPay/DriverPayPaymentModal';
import FormField from '../components/ui/FormField';
import ManageDriverGroupsModal from '../components/driverPay/ManageDriverGroupsModal';
import Modal from '../components/ui/Modal';
import { exportToExcel } from '../utils/excel';
import toast from 'react-hot-toast';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { DriverPayDocument } from '../components/pdf/documents';
import { generateBulkDocuments } from '../utils/documentGenerator';
import { DriverPayBulkDocument } from '../components/pdf/documents';

// --- Helper function to extract number from driverNo ---
const getDriverNumber = (driverNo: string | undefined | null): number => {
  if (!driverNo || typeof driverNo !== 'string' || !driverNo.toUpperCase().startsWith('DR')) {
    return -Infinity;
  }
  const numStr = driverNo.substring(2);
  const num = parseInt(numStr, 10);
  return isNaN(num) ? -Infinity : num;
};
// --------------------------------------------------------

const DriverPayPage = () => {
  const { can } = usePermissions();
  const { user } = useAuth();
  const { records, loading } = useDriverPay();

  const [lockFilter, setLockFilter] = useState('active');

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    collectionFilter,
    setCollectionFilter,
    periodDateRange,
    setPeriodDateRange,
    periodOverlapDateRange,
    setPeriodOverlapDateRange,
    usageFilter,
    setUsageFilter,
    filteredRecords,
    groupIdFilter,
  setGroupIdFilter,
    summary
  } = useDriverPayFilters(records, lockFilter); 

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DriverPay | null>(null);
  const [editingRecord, setEditingRecord] = useState<DriverPay | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<DriverPay | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DriverPay | null>(null);
  const [addingPeriodToRecord, setAddingPeriodToRecord] = useState<DriverPay | null>(null);
  const [lockingRecord, setLockingRecord] = useState<DriverPay | null>(null);
  const [activatingRecord, setActivatingRecord] = useState<DriverPay | null>(null);

  // 🟢 NEW: Bulk action selection state
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [showDefaultsModal, setShowDefaultsModal] = useState(false);
  const [defaultsForm, setDefaultsForm] = useState({ commA: '6', commB: '0' });
  const [isUpdatingDefaults, setIsUpdatingDefaults] = useState(false);
  const [showManageGroups, setShowManageGroups] = useState(false);

  const sortedFilteredRecords = [...filteredRecords].sort((a, b) => {
    const numA = getDriverNumber(a.driverNo);
    const numB = getDriverNumber(b.driverNo);
    return numA - numB;
  });

  const handleLockDriver = (record: DriverPay) => setLockingRecord(record);
  const handleActivateDriver = (record: DriverPay) => setActivatingRecord(record);

  const confirmLock = async () => {
    if (!lockingRecord) return;
    if (!can('driverPay', 'delete')) {
      toast.error("You don't have permission to lock drivers.");
      return;
    }
    try {
      const recordRef = doc(db, 'driverPay', lockingRecord.id);
      await updateDoc(recordRef, { isLocked: true });
      toast.success('Driver locked successfully.');
      setLockingRecord(null);
    } catch (error) {
      console.error('Error locking driver:', error);
      toast.error('Failed to lock driver.');
      setLockingRecord(null);
    }
  };

  const confirmActivate = async () => {
    if (!activatingRecord) return;
    if (!can('driverPay', 'delete')) {
      toast.error("You don't have permission to activate drivers.");
      return;
    }
    try {
      const recordRef = doc(db, 'driverPay', activatingRecord.id);
      await updateDoc(recordRef, { isLocked: false });
      toast.success('Driver activated successfully.');
      setActivatingRecord(null);
    } catch (error) {
      console.error('Error activating driver:', error);
      toast.error('Failed to activate driver.');
      setActivatingRecord(null);
    }
  };

  // 🟢 NEW: Multi-selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((ids: string[], isSelected: boolean) => {
    setSelectedRecordIds(isSelected ? new Set(ids) : new Set());
  }, []);

  const applyDefaultCommissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('driverPay', 'update')) {
      toast.error("You don't have permission to edit records.");
      return;
    }

    setIsUpdatingDefaults(true);
    try {
      const commA = parseFloat(defaultsForm.commA);
      const commB = parseFloat(defaultsForm.commB);
      
      if (isNaN(commA) || isNaN(commB)) {
        toast.error('Invalid commission values');
        return;
      }

      const promises = Array.from(selectedRecordIds).map(id => {
        const ref = doc(db, 'driverPay', id);
        return updateDoc(ref, {
          defaultCommissionA: commA,
          defaultCommissionB: commB,
          updatedAt: new Date()
        });
      });

      await Promise.all(promises);
      toast.success('Default commissions updated for selected drivers');
      setShowDefaultsModal(false);
      setSelectedRecordIds(new Set()); // Clear selection upon success
    } catch (err) {
      console.error('Error updating defaults:', err);
      toast.error('Failed to update defaults');
    } finally {
      setIsUpdatingDefaults(false);
    }
  };

  const handleExport = () => {
    try {
      const exportData = sortedFilteredRecords.map(record => ({
        'Driver No': record.driverNo,
        'TID': record.tidNo,
        'Name': record.name,
        'Phone Number': record.phoneNumber,
        'Collection': record.collection === 'OTHER' ? record.customCollection : record.collection,
        'Total Amount': record.paymentPeriods.reduce((sum, period) => sum + (period.totalAmount || 0), 0).toFixed(2),
        'Commission A': record.paymentPeriods.reduce((sum, period) => sum + (period.commissionAmountA || 0), 0).toFixed(2),
        'Commission B': record.paymentPeriods.reduce((sum, period) => sum + (period.commissionAmountB || 0), 0).toFixed(2),
        'Net Pay': record.paymentPeriods.reduce((sum, period) => sum + (period.netPay || 0), 0).toFixed(2),
        'Paid Amount': record.paymentPeriods.reduce((sum, period) => sum + (period.paidAmount || 0), 0).toFixed(2),
        'Remaining': record.paymentPeriods.reduce((sum, period) => sum + (period.remainingAmount || 0), 0).toFixed(2),
        'Status': record.isLocked ? 'Locked' : 'Active',
        'Created At': record.createdAt ? format(new Date(record.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A',
        'Last Updated': record.updatedAt ? format(new Date(record.updatedAt), 'dd/MM/yyyy HH:mm') : 'N/A'
      }));

      exportToExcel(exportData, 'driver_pay_records_sorted');
      toast.success('Sorted records exported successfully');
    } catch (error) {
      console.error('Error exporting sorted records:', error);
      toast.error('Failed to export sorted records');
    }
  };

  const handleDelete = (record: DriverPay) => {
    setDeletingRecord(record);
  };

  const handlePeriodAdded = (updatedRecord: DriverPay) => {
    setAddingPeriodToRecord(null);
    toast.success('Driver pay record updated with new period!');
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;
    try {
        await deleteDoc(doc(db, 'driverPay', deletingRecord.id));
        toast.success('Record deleted successfully');
        setDeletingRecord(null);
    } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record');
        setDeletingRecord(null);
    }
  };

  const handleAddPeriod = useCallback((record: DriverPay) => {
    setAddingPeriodToRecord(record);
  }, []);

  const handleGenerateDocument = async (record: DriverPay) => {
    try {
      await generateAndUploadDocument(DriverPayDocument, record, 'driverPay', record.id, 'driverPay');
      toast.success('Document generated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating document:', error);
      toast.error(`Failed to generate document: ${errorMessage}`);
    }
  };

  const handleViewDocument = (url: string | undefined | null) => {
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        toast.error("Document URL not found for this record.");
    }
  };

  const handleGeneratePDF = async () => {
    if (sortedFilteredRecords.length === 0) {
        toast.error("No records to generate PDF for.");
        return;
    }
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      const companyDetails = companyDoc.exists() ? companyDoc.data() : {};
      
      const pdfBlob = await generateBulkDocuments(
        DriverPayBulkDocument,
        sortedFilteredRecords,
        companyDetails
      );

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(pdfUrl, '_blank');
      if (!newWindow) {
          toast.error("Could not open PDF. Please check pop-up blocker settings.");
      } else {
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      }

      toast.success('Driver Pay summary PDF generated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Driver Pay PDF:', error);
      toast.error(`Failed to generate Driver Pay PDF: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
         <span className="ml-3">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DriverPaySummary
        total={summary.total}
        commissionA={summary.commissionA}
        commissionB={summary.commissionB}
        netPay={summary.netPay}
        totalPaid={summary.totalPaid}
        totalRemaining={summary.totalRemaining}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Driver Pay</h1>
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 🟢 NEW: Default Settings Bulk Action Button */}
          {selectedRecordIds.size > 0 && can('driverPay', 'update') && (
            <button
              onClick={() => setShowDefaultsModal(true)}
              className="inline-flex items-center px-4 py-2 border border-primary text-primary rounded-md shadow-sm text-sm font-medium bg-white hover:bg-primary-50 transition-colors"
            >
              <Settings className="h-5 w-5 mr-2" />
              Set Default Commissions ({selectedRecordIds.size})
            </button>
          )}

          {can('driverPay', 'export') && (
            <button
              onClick={handleGeneratePDF}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={sortedFilteredRecords.length === 0}
              title={sortedFilteredRecords.length === 0 ? 'No data for PDF' : 'Generate PDF'}
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate PDF
            </button>
          )}

          {can('driverPay', 'export') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={sortedFilteredRecords.length === 0}
              title={sortedFilteredRecords.length === 0 ? 'No data to export' : 'Export to Excel'}
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}

          {can('driverPay', 'update') && (
  <button
    onClick={() => setShowManageGroups(true)}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    Manage Groups
  </button>
)}

          {can('driverPay', 'create') && (
            <button
              onClick={() => {
                setEditingRecord(null);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Driver Pay
            </button>
          )}
        </div>
      </div>

      <DriverPayFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        collectionFilter={collectionFilter}
        onCollectionFilterChange={setCollectionFilter}
        periodDateRange={periodDateRange}
        onPeriodDateRangeChange={setPeriodDateRange}
        periodOverlapDateRange={periodOverlapDateRange}
        onPeriodOverlapDateRangeChange={setPeriodOverlapDateRange}
        lockFilter={lockFilter}
        onLockFilterChange={setLockFilter}
        usageFilter={usageFilter} 
        onUsageFilterChange={setUsageFilter} 
        groupIdFilter={groupIdFilter}
  onGroupIdFilterChange={setGroupIdFilter}
      />

      <DriverPayTable
        records={sortedFilteredRecords}
        onView={(record) => setSelectedRecord(record)}
        onEdit={(record) => {
            setShowForm(false);
            setEditingRecord(record);
        }}
        onDelete={handleDelete}
        onRecordPayment={(record) => setRecordingPayment(record)}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onAddPeriod={handleAddPeriod}
        onLockDriver={handleLockDriver} 
        onActivateDriver={handleActivateDriver} 
        selectedIds={selectedRecordIds}              // 🟢 Pass Selection State
        onToggleSelect={handleToggleSelect}          // 🟢 Pass Selection Handler
        onToggleSelectAll={handleToggleSelectAll}    // 🟢 Pass Selection Handler
      />
       {sortedFilteredRecords.length === 0 && !loading && (
           <div className="text-center py-4 text-gray-500">
             No records found matching your criteria.
           </div>
       )}

      {/* --- Modals --- */}
      <Modal
        isOpen={showForm || !!editingRecord}
        onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
        }}
        title={editingRecord ? "Edit Driver Pay Record" : "Add Driver Pay Record"}
        size="xl"
      >
        {(showForm || editingRecord) && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <DriverPayForm
              record={editingRecord}
              onClose={() => {
                  setShowForm(false);
                  setEditingRecord(null);
              }}
            />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Driver Pay Details"
        size="lg"
      >
        {selectedRecord && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <DriverPayDetails record={selectedRecord} />
          </div>
        )}
      </Modal>

      {/* 🟢 NEW: Default Commissions Config Modal */}
      <Modal
        isOpen={showDefaultsModal}
        onClose={() => setShowDefaultsModal(false)}
        title="Set Default Commissions"
      >
        <form onSubmit={applyDefaultCommissions} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Set the preferred default commission percentages for the <strong>{selectedRecordIds.size} selected driver(s)</strong>. 
            These values will automatically pre-fill when you create a new payment period for them in the future.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Default Commission A (%)"
              type="number"
              value={defaultsForm.commA}
              onChange={e => setDefaultsForm({ ...defaultsForm, commA: e.target.value })}
              min="0"
              max="100"
              step="0.01"
              required
            />
            <FormField
              label="Default Commission B (%)"
              type="number"
              value={defaultsForm.commB}
              onChange={e => setDefaultsForm({ ...defaultsForm, commB: e.target.value })}
              min="0"
              max="100"
              step="0.01"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 mt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDefaultsModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingDefaults}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {isUpdatingDefaults ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>
        </form>
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
        isOpen={!!addingPeriodToRecord}
        onClose={() => setAddingPeriodToRecord(null)}
        title={`Add Payment Period to ${addingPeriodToRecord?.name || 'Record'}`}
      >
        {addingPeriodToRecord && (
          <AddPaymentPeriodModal
            driverPayRecord={addingPeriodToRecord}
            onClose={() => setAddingPeriodToRecord(null)}
            onPeriodAdded={handlePeriodAdded}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        title="Delete Record"
      >
         {deletingRecord && (
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    Are you sure you want to delete this driver pay record? This action cannot be undone.
                </p>
                <p className="text-sm font-medium text-gray-700">
                    Driver: {deletingRecord.name} (No: {deletingRecord.driverNo})
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setDeletingRecord(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                    >
                        Delete Record
                    </button>
                </div>
            </div>
         )}
      </Modal>

      {/* Lock Driver Confirmation Modal */}
      <Modal
        isOpen={!!lockingRecord}
        onClose={() => setLockingRecord(null)}
        title="Lock Driver"
      >
        {lockingRecord && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to lock this driver? They will be hidden from the default 'Active Drivers' view.
            </p>
            <p className="text-sm font-medium text-gray-700">
              Driver: {lockingRecord.name} (No: {lockingRecord.driverNo})
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setLockingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLock}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
              >
                Lock Driver
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ManageDriverGroupsModal 
  isOpen={showManageGroups} 
  onClose={() => setShowManageGroups(false)} 
/>

      {/* Activate Driver Confirmation Modal */}
      <Modal
        isOpen={!!activatingRecord}
        onClose={() => setActivatingRecord(null)}
        title="Activate Driver"
      >
        {activatingRecord && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to activate this driver? They will be visible in the default 'Active Drivers' view.
            </p>
            <p className="text-sm font-medium text-gray-700">
              Driver: {activatingRecord.name} (No: {activatingRecord.driverNo})
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setActivatingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmActivate}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Activate Driver
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DriverPayPage;