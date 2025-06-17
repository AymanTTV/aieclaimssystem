// src/pages/DriverPay.tsx

import React, { useState, useCallback } from 'react';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase'; // Assuming storage is used elsewhere or for future use
import { usePermissions } from '../hooks/usePermissions';
import { useDriverPay } from '../hooks/useDriverPay';
import { useDriverPayFilters } from '../hooks/useDriverPayFilters';
import { Download, Plus, Search, FileText, Calendar } from 'lucide-react'; // Ensure Search is used if needed by filters
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
import Modal from '../components/ui/Modal';
import { exportToExcel } from '../utils/excel';
import toast from 'react-hot-toast';
import { generateAndUploadDocument } from '../utils/documentGenerator'; // Ensure path is correct
import { DriverPayDocument } from '../components/pdf/documents'; // Ensure path is correct

import { generateBulkDocuments } from '../utils/documentGenerator'; // Ensure path is correct
import { DriverPayBulkDocument } from '../components/pdf/documents'; // Ensure path is correct

// --- Helper function to extract number from driverNo ---
const getDriverNumber = (driverNo: string | undefined | null): number => {
  if (!driverNo || typeof driverNo !== 'string' || !driverNo.toUpperCase().startsWith('DR')) {
    // Handle invalid or missing driver numbers, place them last in descending sort
    return -Infinity;
  }
  // Extract numeric part after "DR"
  const numStr = driverNo.substring(2);
  const num = parseInt(numStr, 10); // Use base 10 for parsing

  // Handle cases where parsing fails (e.g., "DRabc") -> place them last
  return isNaN(num) ? -Infinity : num;
};
// --------------------------------------------------------


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
    periodDateRange, // Destructure existing state
    setPeriodDateRange, // Destructure existing setter
    periodOverlapDateRange, // Destructure the updated state name
    setPeriodOverlapDateRange, // Destructure the updated setter name
    filteredRecords,
    summary
  } = useDriverPayFilters(records);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DriverPay | null>(null);
  const [editingRecord, setEditingRecord] = useState<DriverPay | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<DriverPay | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DriverPay | null>(null);
  const [addingPeriodToRecord, setAddingPeriodToRecord] = useState<DriverPay | null>(null);

  // --- Sort the filtered records by driver number descending ---
  const sortedFilteredRecords = [...filteredRecords].sort((a, b) => {
    const numA = getDriverNumber(a.driverNo);
    const numB = getDriverNumber(b.driverNo);

    // Ascending order: Lower numbers come first
    return numA - numB;
  });
  
  
  // -----------------------------------------------------------

  const handleExport = () => {
    try {
      // Using the currently displayed (filtered and sorted) records for export
      const exportData = sortedFilteredRecords.map(record => ({
        'Driver No': record.driverNo,
        'TID': record.tidNo,
        'Name': record.name,
        'Phone Number': record.phoneNumber,
        'Collection': record.collection === 'OTHER' ? record.customCollection : record.collection,
        'Total Amount': record.paymentPeriods.reduce((sum, period) => sum + (period.totalAmount || 0), 0).toFixed(2),
        'Commission': record.paymentPeriods.reduce((sum, period) => sum + (period.commissionAmount || 0), 0).toFixed(2),
        'Net Pay': record.paymentPeriods.reduce((sum, period) => sum + (period.netPay || 0), 0).toFixed(2),
        'Paid Amount': record.paymentPeriods.reduce((sum, period) => sum + (period.paidAmount || 0), 0).toFixed(2),
        'Remaining': record.paymentPeriods.reduce((sum, period) => sum + (period.remainingAmount || 0), 0).toFixed(2),
        'Created At': record.createdAt ? format(record.createdAt, 'dd/MM/yyyy HH:mm') : 'N/A',
        'Last Updated': record.updatedAt ? format(record.updatedAt, 'dd/MM/yyyy HH:mm') : 'N/A'
      }));

      exportToExcel(exportData, 'driver_pay_records_sorted'); // Changed filename slightly
      toast.success('Sorted records exported successfully');
    } catch (error) {
      console.error('Error exporting sorted records:', error);
      toast.error('Failed to export sorted records');
    }
  };

  // Set state to show confirmation modal
  const handleDelete = (record: DriverPay) => {
    setDeletingRecord(record);
  };

  const handlePeriodAdded = (updatedRecord: DriverPay) => {
  // This function will be called when a period is successfully added
  // The `useDriverPay` hook is typically real-time, so it should automatically re-render
  // your table/summary with the updated data. If not, you might need to manually
  // update the `records` state or refetch.
  setAddingPeriodToRecord(null); // Close the modal
  toast.success('Driver pay record updated with new period!');
};

  // Actual deletion logic, called from confirmation modal
  const confirmDelete = async () => {
    if (!deletingRecord) return;
    try {
        await deleteDoc(doc(db, 'driverPay', deletingRecord.id));
        toast.success('Record deleted successfully');
        setDeletingRecord(null); // Close confirmation modal
    } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record');
        setDeletingRecord(null); // Close confirmation modal even on error
    }
  };

  const handleAddPeriod = useCallback((record: DriverPay) => {
  setAddingPeriodToRecord(record);
}, []);


  const handleGenerateDocument = async (record: DriverPay) => {
    // Keeping original logic, just ensure parameters match the utility function
    try {
      await generateAndUploadDocument(
        DriverPayDocument,
        record,
        'driverPay',        // Collection name (optional)
        record.id,          // Document ID
        'driverPay' // Correct collection name for updating the original record
      );
      toast.success('Document generated successfully');
      // You might need to refresh record data here if documentUrl is stored on the record
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(`Failed to generate document: ${error.message || 'Unknown error'}`);
    }
  };

  const handleViewDocument = (url: string | undefined | null) => {
    // Ensure URL is valid before opening
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        toast.error("Document URL not found for this record.");
    }
  };

  const handleGeneratePDF = async () => {
    // Using the currently displayed (filtered and sorted) records
    if (sortedFilteredRecords.length === 0) {
        toast.error("No records to generate PDF for.");
        return;
    }
    try {
      // Get company details
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      // Handle case where details might not exist gracefully
      const companyDetails = companyDoc.exists() ? companyDoc.data() : {};
      if (!companyDoc.exists()) {
        console.warn("Company details not found for PDF generation.");
      }

      // Generate PDF with all filtered vehicles
      const pdfBlob = await generateBulkDocuments(
        DriverPayBulkDocument,
        sortedFilteredRecords, // Use sorted data
        companyDetails
      );

      // Create URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWindow = window.open(pdfUrl, '_blank');
      if (!newWindow) {
          toast.error("Could not open PDF. Please check pop-up blocker settings.");
      } else {
          // Optional: Clean up the object URL after some time
          setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      }

      toast.success('Driver Pay summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating Driver Pay PDF:', error);
      toast.error(`Failed to generate Driver Pay PDF: ${error.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
         {/* Simple loading text from original implied structure */}
         <span className="ml-3">Loading...</span>
      </div>
    );
  }

  // --- Return statement using your original structure ---
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <DriverPaySummary
        total={summary.total}
        commission={summary.commission}
        netPay={summary.netPay}
        totalPaid={summary.totalPaid}
        totalRemaining={summary.totalRemaining}
      />

      {/* Header with Search and Actions (Original Structure) */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Driver Pay</h1>
        <div className="flex space-x-2">

          {/* Generate PDF Button (Original Style Implied) */}
          {user?.role === 'manager' && (
          <button
            onClick={handleGeneratePDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={sortedFilteredRecords.length === 0}
            title={sortedFilteredRecords.length === 0 ? "No data for PDF" : "Generate PDF"}
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>
          )}

          {/* Export Button (Original Style Implied & Role Check) */}
          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={sortedFilteredRecords.length === 0}
              title={sortedFilteredRecords.length === 0 ? "No data to export" : "Export to Excel"}
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}
          {/* Add Button (Original Style Implied & Permission Check) */}
          {can('driverPay', 'create') && (
            <button
              onClick={() => {
                  setEditingRecord(null); // Ensure add mode
                  setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600" // Assuming 'bg-primary-600' was your hover class
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Driver Pay
            </button>
          )}
        </div>
      </div>

      {/* Filters - Pass the updated props */}
      <DriverPayFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        collectionFilter={collectionFilter}
        onCollectionFilterChange={setCollectionFilter}
        periodDateRange={periodDateRange}
        onPeriodDateRangeChange={setPeriodDateRange}
        periodOverlapDateRange={periodOverlapDateRange} // Pass updated prop
        onPeriodOverlapDateRangeChange={setPeriodOverlapDateRange} // Pass updated setter
      />

      {/* Data Table (Original Structure) - Pass the sorted array */}
      <DriverPayTable
        records={sortedFilteredRecords} // <-- Use the sorted array here
        onView={(record) => setSelectedRecord(record)}
        onEdit={(record) => {
            setShowForm(false); // Close add modal if open
            setEditingRecord(record); // Open edit modal
        }}
        onDelete={handleDelete} // Trigger confirmation modal
        onRecordPayment={(record) => setRecordingPayment(record)}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onAddPeriod={handleAddPeriod}
      />
       {/* Optional: Message when no records match filters */}
       {sortedFilteredRecords.length === 0 && !loading && (
           <div className="text-center py-4 text-gray-500">No records found matching your criteria.</div>
       )}

      {/* --- Modals (Original Structure) --- */}

      {/* Add/Edit Form Modal (Combined logic as before) */}
      <Modal
        isOpen={showForm || !!editingRecord}
        onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
        }}
        title={editingRecord ? "Edit Driver Pay Record" : "Add Driver Pay Record"} // Dynamic title
        size="xl" // Keeping size from original structure if specified
      >
        {/* Render form only when modal should be open */}
        {(showForm || editingRecord) && (
             <DriverPayForm
                record={editingRecord} // Pass null if adding, record if editing
                onClose={() => {
                    setShowForm(false);
                    setEditingRecord(null);
                }}
            />
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Driver Pay Details"
        size="lg" // Keeping size from original structure if specified
      >
        {selectedRecord && (
          <DriverPayDetails record={selectedRecord} />
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!recordingPayment}
        onClose={() => setRecordingPayment(null)}
        title="Record Payment" // Simpler title from original structure
      >
        {recordingPayment && (
          <DriverPayPaymentModal
            record={recordingPayment}
            onClose={() => setRecordingPayment(null)}
          />
        )}
      </Modal>

      {/* NEW: Add Payment Period Modal */}
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

      {/* Delete Confirmation Modal (Original structure for content) */}
      <Modal
        isOpen={!!deletingRecord}
        onClose={() => setDeletingRecord(null)}
        title="Delete Record" // Title from original structure
      >
         {/* Content based on original structure */}
         {deletingRecord && (
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    Are you sure you want to delete this driver pay record? This action cannot be undone.
                </p>
                {/* Displaying record name for confirmation */}
                <p className="text-sm font-medium text-gray-700">
                    Driver: {deletingRecord.name} (No: {deletingRecord.driverNo})
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setDeletingRecord(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" // Style from original structure
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDelete} // Call confirm delete function
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700" // Style from original structure
                    >
                        Delete Record
                    </button>
                </div>
            </div>
         )}
      </Modal>
    </div>
  );
};

export default DriverPayPage;