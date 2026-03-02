// src/pages/Maintenance.tsx

import React, { useState, useCallback, useEffect } from 'react';
// ... (keep existing imports)
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useMaintenanceFilters } from '../hooks/useMaintenanceFilters';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceFilters from '../components/maintenance/MaintenanceFilters';
import MaintenancePaymentModal from '../components/maintenance/MaintenancePaymentModal';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import MaintenanceSummaryCards from '../components/maintenance/MaintenanceSummaryCards';
import MaintenanceHeader from '../components/maintenance/MaintenanceHeader';  
import MaintenanceDetails from '../components/maintenance/MaintenanceDetails';
import MaintenanceDeleteModal from '../components/maintenance/MaintenanceDeleteModal';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { Plus, Download, FileText, Edit2, Trash2, CheckCircle, CalendarClock } from 'lucide-react'; // Added CalendarClock icon
import { startOfDay, differenceInCalendarDays, format } from 'date-fns'; 
import { exportMaintenanceLogs } from '../utils/MaintenanceExport';
import { MaintenanceLog, Vehicle, Customer } from '../types'; 
import { generateAndUploadDocument, generateBulkDocuments, getCompanyDetails, generateMaintenanceInvoiceDocument } from '../utils/documentGenerator'; 
import { MaintenanceDocument, MaintenanceBulkDocument } from '../components/pdf/documents';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import maintenanceCategoryService from '../services/maintenanceCategory.service';
import { useCustomers } from '../hooks/useCustomers'; 
import { updateDoc, doc } from 'firebase/firestore'; 
import { db } from '../lib/firebase'; 

const Maintenance: React.FC = () => {
  // ... (keep existing hooks and state setup)
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const { customers, loading: customersLoading } = useCustomers(); 
  const { can } = usePermissions();
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  // Maps
  const vehiclesMap = React.useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {} as Record<string, Vehicle>);
  }, [vehicles]);

  const customersMap = React.useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.id] = customer;
      return acc;
    }, {} as Record<string, Customer>);
  }, [customers]);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    dateRange,
    setDateRange,
    filteredLogs,
  } = useMaintenanceFilters(logs, vehiclesMap);

  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<MaintenanceLog | null>(null);
  
  // NEW: State for completion modal
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(''); // NEW State

  const [showCatModal, setShowCatModal] = useState(false);
  const [maintCategories, setMaintCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  const [payLog, setPayLog] = useState<MaintenanceLog | null>(null);
  
  // ... (keep existing category loading logic and effects)
  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    maintenanceCategoryService
      .getAll()
      .then((docs) => setMaintCategories(docs))
      .catch((err) => {
        console.error('Failed to load maintenance categories:', err);
        toast.error('Could not load maintenance categories');
      })
      .finally(() => setLoadingCats(false));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ... (keep category handlers: openCatForm, handleCatSubmit, handleCatDelete)
  const openCatForm = (cat?: { id: string; name: string }) => {
    if (cat) {
      setEditCat(cat);
      setCatName(cat.name);
    } else {
      setEditCat(null);
      setCatName('');
    }
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }
    try {
      if (editCat) {
        await maintenanceCategoryService.update(editCat.id, { name: catName.trim() });
        toast.success('Category updated');
      } else {
        await maintenanceCategoryService.create({ name: catName.trim() });
        toast.success('Category created');
      }
      setShowCatModal(false);
      setEditCat(null);
      setCatName('');
      loadCategories();
    } catch (err) {
      console.error('Error saving maintenance category:', err);
      toast.error('Failed to save maintenance category');
    }
  };

  const handleCatDelete = async (catId: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await maintenanceCategoryService.delete(catId);
      setMaintCategories((prev) => prev.filter((c) => c.id !== catId));
      toast.success('Category deleted');
    } catch (err) {
      console.error('Error deleting maintenance category:', err);
      toast.error('Failed to delete maintenance category');
    }
  };


  const handleDelete = useCallback(
    (log: MaintenanceLog) => {
      if (!can('maintenance', 'delete')) {
        toast.error('You do not have permission to delete maintenance logs');
        return;
      }
      setDeletingLog(log);
    },
    [can]
  );

  const orderedLogs = React.useMemo(() => {
    // ... (keep existing sorting logic)
    const now = startOfDay(new Date());
    const priority = (log: MaintenanceLog) => {
      if (log.status === 'scheduled') return 0;
      if (log.status === 'in-progress') return 1;
      if (log.status === 'completed') return 2;
      return 3;
    };
    return [...filteredLogs].sort((a, b) => {
      const pa = priority(a);
      const pb = priority(b);
      if (pa !== pb) return pa - pb;
      if (pa === 0) {
        const da = differenceInCalendarDays(a.date, now);
        const db = differenceInCalendarDays(b.date, now);
        if (da !== db) return da - db;
      }
      return (b.date?.getTime?.() ?? 0) - (a.date?.getTime?.() ?? 0);
    });
  }, [filteredLogs]);

  // ... (keep export, document generation handlers)
  const handleExport = useCallback(() => {
  try {
    // Pass both logs AND the vehiclesMap to the utility
    exportMaintenanceLogs(logs, vehiclesMap);
    toast.success('Maintenance logs exported successfully');
  } catch (error) {
    console.error('Error exporting maintenance logs:', error);
    toast.error('Failed to export maintenance logs');
  }
}, [logs, vehiclesMap]); // Added vehiclesMap to the dependency array

  const handleGenerateDocument = useCallback(
    async (log: MaintenanceLog) => {
      try {
        toast.loading('Generating work order...');
        const vehicle = vehiclesMap[log.vehicleId!] || (log.vehicleDetails as unknown as Vehicle);
        const url = await generateAndUploadDocument(
          MaintenanceDocument,
          { ...log, vehicle },
          'maintenance',
          log.id,
          'maintenanceLogs'
        );
        toast.dismiss();
        toast.success('Document generated successfully');
        if (url) window.open(url, '_blank');
      } catch (error) {
        console.error('Error generating document:', error);
        toast.dismiss();
        toast.error('Failed to generate document');
      }
    },
    [vehiclesMap]
  );

  const handleViewDocument = useCallback((url: string) => {
    window.open(url, '_blank');
  }, []);

  const handleGenerateBulkPDF = useCallback(
    async () => {
      try {
        toast.loading('Generating bulk maintenance report...');
        const companyDetailsData = await getCompanyDetails();
        if (!companyDetailsData) {
          throw new Error('Company details not found');
        }
        const pdfBlob = await generateBulkDocuments(
          MaintenanceBulkDocument,
          filteredLogs,
          companyDetailsData,
          vehiclesMap,
          customersMap
        );
        saveAs(pdfBlob, 'maintenance_records.pdf');
        toast.dismiss();
        toast.success('Maintenance records PDF generated successfully');
      } catch (error) {
        console.error('Error generating bulk PDF:', error);
        toast.dismiss();
        toast.error('Failed to generate PDF');
      }
    },
    [filteredLogs, vehiclesMap, customersMap] 
  );

  const handleGenerateInvoice = async (log: MaintenanceLog) => {
     try {
       toast.loading("Generating Maintenance Invoice...");
       const vehicle = vehiclesMap[log.vehicleId!] || (log.vehicleDetails as unknown as Vehicle);
       const url = await generateMaintenanceInvoiceDocument({ ...log, vehicle });
       toast.dismiss();
       toast.success("Invoice generated");
       if (url) window.open(url, '_blank');
     } catch(e) {
       console.error(e);
       toast.dismiss();
       toast.error("Failed to generate invoice");
     }
  };

  // --- CHANGED: Completion Handlers ---

  // UPDATED: Initialize Date when opening modal
  const handleCompleteMaintenance = (log: MaintenanceLog) => {
     setCompletionDate(format(new Date(), "yyyy-MM-dd'T'HH:mm")); // Default to now
     setCompletingLog(log);
  };

  // UPDATED: Use the specific date from the input
  const confirmCompleteMaintenance = async () => {
     if (!completingLog) return;
     try {
       const dateToSave = completionDate ? new Date(completionDate) : new Date();

       await updateDoc(doc(db, 'maintenanceLogs', completingLog.id), {
         status: 'completed',
         completedDate: dateToSave, 
         updatedAt: new Date(),
         updatedBy: user?.id
       });
       toast.success("Maintenance marked as completed");
       setCompletingLog(null);
       setCompletionDate('');
     } catch(e) {
       console.error(e);
       toast.error("Failed to update status");
     }
  };

  // NEW: Handle direct status changes from table (other than 'completed')
  const handleStatusChange = async (log: MaintenanceLog, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.id
      };
      // If moving away from completed, maybe clear the completion date?
      // For now, let's keep it simple. If moving TO completed, the table logic
      // calls handleCompleteMaintenance instead of this function.
      
      await updateDoc(doc(db, 'maintenanceLogs', log.id), updates);
      toast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  if (vehiclesLoading || logsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <MaintenanceSummaryCards logs={filteredLogs} />

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Maintenance</h1>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'manager' && (
            <button
              onClick={handleGenerateBulkPDF}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">PDF</span>
              <span className="hidden sm:inline">&nbsp;Report</span>
            </button>
          )}

          {can('maintenance', 'export') && (
            <button
              onClick={handleExport}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Export</span>
            </button>
          )}

          {can('maintenance', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Schedule</span>
              <span className="hidden sm:inline">&nbsp;Maintenance</span>
            </button>
          )}

          {user?.role === 'manager' && (
            <button
              onClick={() => setShowCatModal(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit2 className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Categories</span>
              <span className="hidden sm:inline">&nbsp;Manage</span>
            </button>
          )}
        </div>
      </div>

      <MaintenanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        vehicleFilter={vehicleFilter}
        onVehicleFilterChange={setVehicleFilter}
        vehicles={vehicles}
        paymentStatusFilter={paymentStatusFilter}
        onPaymentStatusFilterChange={setPaymentStatusFilter}
        categories={maintCategories.map((c) => c.name)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
       <MaintenanceTable
          logs={orderedLogs}
          vehicles={vehiclesMap}
          onView={setSelectedLog}
          onEdit={setEditingLog}
          onDelete={handleDelete}
          onGenerateDocument={handleGenerateDocument}
          onViewDocument={handleViewDocument}
          onPay={setPayLog}
          onComplete={handleCompleteMaintenance}
          onGenerateInvoice={handleGenerateInvoice}
          onStatusChange={handleStatusChange} // NEW PROP
        />
      </div>

      <Modal
        isOpen={showForm || !!editingLog}
        onClose={() => {
          setShowForm(false);
          setEditingLog(null);
        }}
        title={editingLog ? 'Edit Maintenance' : 'Schedule Maintenance'}
        size="xl"
      >
        <MaintenanceForm
          vehicles={vehicles}
          onClose={() => {
            setShowForm(false);
            setEditingLog(null);
          }}
          editLog={editingLog || undefined}
        />
      </Modal>

      <Modal
        isOpen={!!payLog}
        onClose={()=>setPayLog(null)}
        title="Record Maintenance Payment"
      >
        {payLog && (
          <MaintenancePaymentModal
            log={payLog}
            vehicle={vehiclesMap[payLog.vehicleId!]}
            onClose={()=>setPayLog(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Maintenance Details"
        size="lg"
      >
        {selectedLog && (
          <MaintenanceDetails
            log={selectedLog}
            vehicle={vehiclesMap[selectedLog.vehicleId!] || (selectedLog.vehicleDetails as unknown as Vehicle)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        title="Delete Maintenance Log"
      >
        {deletingLog && (
          <MaintenanceDeleteModal
            logId={deletingLog.id}
            onClose={() => setDeletingLog(null)}
          />
        )}
      </Modal>

      {/* CHANGED: Completion Confirmation Modal with Date Input */}
      <Modal
        isOpen={!!completingLog}
        onClose={() => setCompletingLog(null)}
        title="Complete Maintenance"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
              <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Mark as Completed
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-3">
                  Confirm completion details below.
                </p>
                
                {/* NEW: Date Input */}
                <div className="text-left">
                  <label htmlFor="compDate" className="block text-xs font-medium text-gray-700 mb-1">
                    Completion Date & Time
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CalendarClock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="datetime-local"
                      id="compDate"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="block w-full rounded-md border-gray-300 pl-10 focus:border-green-500 focus:ring-green-500 sm:text-sm"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
              onClick={confirmCompleteMaintenance}
            >
              Complete
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={() => setCompletingLog(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Category Modal - (Unchanged content) */}
      <Modal
        isOpen={showCatModal}
        onClose={() => {
          setShowCatModal(false);
          setEditCat(null);
          setCatName('');
        }}
        title={editCat ? 'Edit Category' : 'Add Category'}
        size="md"
      >
        <form onSubmit={handleCatSubmit} className="flex items-center space-x-2 mb-4">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name"
            required
            className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {editCat ? 'Update' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCatModal(false);
              setEditCat(null);
              setCatName('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        </form>

        <div className="max-h-56 overflow-y-auto">
          {loadingCats ? (
            <div className="text-gray-500 text-sm">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {maintCategories.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between items-center border-b pb-1"
                >
                  <span className="text-gray-700">{c.name}</span>
                  <div className="space-x-2">
                    <button onClick={() => openCatForm(c)}>
                      <Edit2 className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                    </button>
                    <button onClick={() => handleCatDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
                    </button>
                  </div>
                </li>
              ))}
              {maintCategories.length === 0 && (
                <li className="text-gray-500 text-sm">No categories found.</li>
              )}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Maintenance;