// src/pages/maintenance.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useMaintenanceFilters } from '../hooks/useMaintenanceFilters';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceFilters from '../components/maintenance/MaintenanceFilters';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';
import MaintenanceDetails from '../components/maintenance/MaintenanceDetails';
import MaintenanceDeleteModal from '../components/maintenance/MaintenanceDeleteModal';
import { useCompanyDetails } from '../hooks/useCompanyDetails';
import { Plus, Download, FileText, Edit2, Trash2 } from 'lucide-react';
import { exportMaintenanceLogs } from '../utils/MaintenanceExport';
import { MaintenanceLog, Vehicle, Customer } from '../types'; // IMPORT Customer type
import { generateAndUploadDocument, generateBulkDocuments, getCompanyDetails } from '../utils/documentGenerator';
import { MaintenanceDocument, MaintenanceBulkDocument } from '../components/pdf/documents';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import maintenanceCategoryService from '../services/maintenanceCategory.service';
import { useCustomers } from '../hooks/useCustomers'; // IMPORT useCustomers hook

const Maintenance: React.FC = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const { customers, loading: customersLoading } = useCustomers(); // FETCH customers
  const { can } = usePermissions();
  const { user } = useAuth();
  const { companyDetails } = useCompanyDetails();

  // Build a map for quick vehicle lookups
  const vehiclesMap = React.useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {} as Record<string, Vehicle>);
  }, [vehicles]);

  // BUILD a map for quick customer lookups
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
    filteredLogs,
  } = useMaintenanceFilters(logs, vehiclesMap);

  // State for “Add / Edit / Delete” maintenance
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<MaintenanceLog | null>(null);

  // State for “Manage Categories”
  const [showCatModal, setShowCatModal] = useState(false);
  const [maintCategories, setMaintCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  // Load maintenance categories from Firestore
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

  // Delete callback for a log
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

  // Export all logs to Excel
  const handleExport = useCallback(() => {
    try {
      exportMaintenanceLogs(logs);
      toast.success('Maintenance logs exported successfully');
    } catch (error) {
      console.error('Error exporting maintenance logs:', error);
      toast.error('Failed to export maintenance logs');
    }
  }, [logs]);

  // Generate document for a single log
  const handleGenerateDocument = useCallback(
    async (log: MaintenanceLog) => {
      try {
        toast.loading('Generating maintenance document...');
        const vehicle = vehiclesMap[log.vehicleId];
        if (!vehicle) {
          throw new Error('Vehicle not found');
        }
        const companyDetailsData = await getCompanyDetails();
        if (!companyDetailsData) {
          throw new Error('Company details not found');
        }

        await generateAndUploadDocument(
          MaintenanceDocument,
          { ...log, vehicle },
          'maintenance',
          log.id,
          'maintenanceLogs',
          companyDetailsData
        );

        toast.dismiss();
        toast.success('Document generated successfully');
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

  // Generate a bulk PDF of all filtered logs
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
          customersMap // PASS customersMap here
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
    [filteredLogs, vehiclesMap, customersMap] // ADD customersMap to dependency array
  );

  // UPDATE loading check to include customers
  if (vehiclesLoading || logsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* ── Top Bar ── */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
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

          {can('maintenance', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Schedule Maintenance
            </button>
          )}

          {/* ── Manage Categories Button ── */}
          {user?.role === 'manager' && (
          <button
            onClick={() => setShowCatModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit2 className="h-5 w-5 mr-2" />
            Manage Categories
          </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
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
        /** Pass dynamic categories into the “Type” dropdown **/
        categories={maintCategories.map((c) => c.name)}
      />

      {/* ── Table ── */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <MaintenanceTable
          logs={filteredLogs}
          vehicles={vehiclesMap}
          onView={setSelectedLog}
          onEdit={setEditingLog}
          onDelete={handleDelete}
          onGenerateDocument={handleGenerateDocument}
          onViewDocument={handleViewDocument}
        />
      </div>

      {/* ── Add / Edit Maintenance Form Modal ── */}
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

      {/* ── View Maintenance Details Modal ── */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Maintenance Details"
        size="lg"
      >
        {selectedLog && vehiclesMap[selectedLog.vehicleId] && (
          <MaintenanceDetails
            log={selectedLog}
            vehicle={vehiclesMap[selectedLog.vehicleId]}
          />
        )}
      </Modal>

      {/* ── Delete Maintenance Log Modal ── */}
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

      {/* ── Manage Categories Modal ── */}
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
      {/* ────────────────────────────────────────────────────────────────────────────── */}
    </div>
  );
};

export default Maintenance;
