// src/pages/Maintenance.tsx

import React, { useState, useCallback, useEffect } from 'react';
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
import { Plus, Download, FileText, Edit2, Trash2, CheckCircle, CalendarClock, ExternalLink, Radio, Copy, MessageCircle, Mail, Settings2, MessageSquare, Tv } from 'lucide-react'; 
import MaintenanceCommunicationModal from '../components/maintenance/MaintenanceCommunicationModal'; 
import TemplateQuickAccessModal, { QuickAccessModalType } from '../components/common/TemplateQuickAccessModal'; 
import { startOfDay, differenceInCalendarDays, format, parseISO } from 'date-fns'; 
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
import { useRentals } from '../hooks/useRentals';
import { updateDoc, doc } from 'firebase/firestore'; 
import { db } from '../lib/firebase'; 
import FormField from '../components/ui/FormField';

const Maintenance: React.FC = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const { customers, loading: customersLoading } = useCustomers(); 
  const { rentals, loading: rentalsLoading } = useRentals();
  const { can, isCompany } = usePermissions(); 
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
  
  // State for completion modal
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);

  const [showCatModal, setShowCatModal] = useState(false);
  const [maintCategories, setMaintCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [editCat, setEditCat] = useState<{ id: string; name: string } | null>(null);
  const [catName, setCatName] = useState<string>('');

  const [payLog, setPayLog] = useState<MaintenanceLog | null>(null);
  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
  }>({
    isOpen: false,
    mode: 'whatsapp',
  });

  const [quickAccessModalOpen, setQuickAccessModalOpen] = useState(false);
  const [quickAccessType, setQuickAccessType] = useState<QuickAccessModalType>('messageTemplates');
  
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

  const handleExport = useCallback(() => {
    try {
      exportMaintenanceLogs(logs, vehiclesMap);
      toast.success('Maintenance logs exported successfully');
    } catch (error) {
      console.error('Error exporting maintenance logs:', error);
      toast.error('Failed to export maintenance logs');
    }
  }, [logs, vehiclesMap]); 

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
      if (!vehicles.length) {
  toast.error('Vehicles not loaded yet. Please wait...');
  return;
}
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

  // --- Completion Handlers ---
  const handleCompleteMaintenance = (log: MaintenanceLog) => {
     setCompletingLog(log);
  };

  const handleStatusChange = async (log: MaintenanceLog, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.id
      };
      await updateDoc(doc(db, 'maintenanceLogs', log.id), updates);
      toast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  // ✅ INLINE COMPONENT: Complete Maintenance Form
  const CompleteMaintenanceModalContent = ({ log, onClose }: { log: MaintenanceLog, onClose: () => void }) => {
    const [modalLoading, setModalLoading] = useState(false);
    const [formData, setFormData] = useState({
      orderNumber: log.orderNumber || '',
      invoiceNumber: log.invoiceNumber || '',
      serviceProvider: log.serviceProvider || '',
      nextServiceDate: log.nextServiceDate ? format(log.nextServiceDate, 'yyyy-MM-dd') : '',
      completedDate: log.completedDate ? format(log.completedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), // ✅ Added completion date state
      description: log.description || '',
      notes: log.notes || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // ✅ Require Invoice/Order Numbers only when completing
      if (!formData.orderNumber.trim()) {
        return toast.error('Maintenance Order Number is required to complete this record.');
      }
      if (!isCompany && !formData.invoiceNumber.trim()) {
        return toast.error('Maintenance Invoice Number is required to complete this record.');
      }

      setModalLoading(true);
      try {
         await updateDoc(doc(db, 'maintenanceLogs', log.id), {
            orderNumber: formData.orderNumber,
            invoiceNumber: formData.invoiceNumber,
            serviceProvider: formData.serviceProvider,
            nextServiceDate: formData.nextServiceDate ? parseISO(formData.nextServiceDate) : null,
            completedDate: formData.completedDate ? parseISO(formData.completedDate) : new Date(), // ✅ Added custom completion date payload
            description: formData.description,
            notes: formData.notes,
            status: 'completed',
            updatedAt: new Date()
         });
         toast.success('Maintenance marked as completed!');
         onClose();
      } catch (err) {
         toast.error('Failed to complete maintenance');
         console.error(err);
      } finally {
         setModalLoading(false);
      }
    };

    return (
       <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4 border-b pb-4">
             Please provide the final invoice/order numbers and verify the service details below before completing the maintenance record.
          </p>

          <div className="grid grid-cols-2 gap-4">
             <FormField 
               label="Maintenance Order Number" 
               value={formData.orderNumber} 
               onChange={e => setFormData({...formData, orderNumber: e.target.value})} 
               placeholder="e.g. ORD-1234" 
               required 
             />
             
               <FormField 
                 label="Maintenance Invoice Number" 
                 value={formData.invoiceNumber} 
                 onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} 
                 placeholder="e.g. INV-1234" 
                 required 
               />
            
          </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <FormField 
               label="Service Center" 
               value={formData.serviceProvider} 
               onChange={e => setFormData({...formData, serviceProvider: e.target.value})} 
               required 
             />
             {/* ✅ Added Completion Date Input */}
             <FormField 
               type="date"
               label="Completed Date" 
               value={formData.completedDate} 
               onChange={e => setFormData({...formData, completedDate: e.target.value})} 
               required 
             />
             <FormField 
               type="date" 
               label="Next Service Date" 
               value={formData.nextServiceDate} 
               onChange={e => setFormData({...formData, nextServiceDate: e.target.value})} 
             />
          </div>

          <FormField 
            label="Description" 
            as="textarea" 
            rows={2} 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
            required 
          />

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
             <textarea 
               rows={2} 
               value={formData.notes} 
               onChange={e => setFormData({...formData, notes: e.target.value})} 
               placeholder="Leave a note if needed..." 
               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 border"
             />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700 font-medium">Cancel</button>
             <button type="submit" disabled={modalLoading} className="px-6 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium disabled:opacity-50">
                {modalLoading ? 'Saving...' : 'Complete Maintenance'}
             </button>
          </div>
       </form>
    );
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

      <MaintenanceSummaryCards 
        logs={logs} 
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
      />

      {/* Header & Actions */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs text-[#0F172A]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
              🔧
            </div>
            <div>
              <h1 className="text-[22px] sm:text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
                Maintenance
              </h1>
              <p className="text-xs text-[#64748B]">Service tracking, scheduled repairs, MOTs, parts, and workshop dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap xl:justify-end no-scrollbar scrollbar-none py-0.5">
            {can('maintenance', 'categories') && (
              <button
                type="button"
                onClick={() => setShowCatModal(true)}
                className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-purple-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 hover:text-purple-800 active:scale-95 transition-all cursor-pointer"
              >
                <Settings2 className="h-4 w-4 mr-1.5 text-purple-600 pointer-events-none" />
                Categories Manage
              </button>
            )}

            {(user?.role === 'manager' || can('maintenance', 'export')) && (
              <button
                type="button"
                onClick={handleGenerateBulkPDF}
                className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-rose-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 hover:text-rose-800 active:scale-95 transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4 mr-1.5 text-rose-600 pointer-events-none" />
                PDF Report
              </button>
            )}

            {can('maintenance', 'export') && (
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-indigo-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 mr-1.5 text-indigo-600 pointer-events-none" />
                Export
              </button>
            )}

            {/* Dual-View Real-Time Public Mirror Button */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a
                href="/workshop-tv"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3 sm:px-3.5 py-2 border border-teal-200 rounded-xl shadow-xs text-xs sm:text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 hover:text-teal-800 active:scale-95 transition-all cursor-pointer gap-1.5"
                title="Open Workshop TV Display Mirror (Auto-Rotation Board) in new tab"
              >
                <Tv className="h-4 w-4 text-teal-600 pointer-events-none" />
                <span>Workshop TV</span>
              </a>

              <div className="inline-flex items-center rounded-xl border border-emerald-200 shadow-xs bg-emerald-50 overflow-hidden flex-shrink-0">
                <a
                  href="/maintenance/live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex whitespace-nowrap items-center justify-center px-3 py-2 text-xs sm:text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer gap-1.5"
                  title="Open Real-Time Public Mirror in new tab"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-600 pointer-events-none" />
                  <span>Live Public Mirror</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const mirrorUrl = `${window.location.origin}/maintenance/live`;
                    navigator.clipboard.writeText(mirrorUrl);
                    toast.success('Public Mirror URL copied to clipboard!');
                  }}
                  className="p-2 border-l border-emerald-200 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-colors cursor-pointer"
                  title="Copy Public Mirror URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {can('maintenance', 'create') && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex whitespace-nowrap flex-shrink-0 items-center justify-center px-3.5 sm:px-4 py-2 border border-emerald-600 rounded-xl shadow-xs text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5 pointer-events-none" />
                Schedule Maintenance
              </button>
            )}
          </div>
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

      <div className="w-full max-w-full">
       <MaintenanceTable
          logs={orderedLogs}
          vehicles={vehiclesMap}
          customers={customersMap}
          rentals={rentals}
          onView={setSelectedLog}
          onEdit={setEditingLog}
          onDelete={handleDelete}
          onGenerateDocument={handleGenerateDocument}
          onViewDocument={handleViewDocument}
          onPay={setPayLog}
          onComplete={handleCompleteMaintenance}
          onGenerateInvoice={handleGenerateInvoice}
          onStatusChange={handleStatusChange} 
        />
      </div>

      <Modal
        isOpen={showForm || !!editingLog}
        onClose={() => {
          setShowForm(false);
          setEditingLog(null);
        }}
        title={editingLog ? 'Edit Maintenance' : 'Schedule Maintenance'}
        size="2xl"
        className="h-[88vh] max-h-[92vh] max-w-5xl"
        contentClassName="p-0 flex flex-col min-h-0 overflow-hidden"
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
        size="2xl"
        className="h-[88vh] max-h-[92vh] max-w-5xl"
        contentClassName="p-0 flex flex-col min-h-0 overflow-hidden"
      >
        {selectedLog && (
          <MaintenanceDetails
            log={selectedLog}
            vehicle={
              vehiclesMap[selectedLog.vehicleId!] || 
              (selectedLog.vehicleDetails as unknown as Vehicle) || 
              { 
                make: 'Deleted', 
                model: 'Vehicle', 
                registrationNumber: `ID: ${selectedLog.vehicleId || 'Unknown'}` 
              } as Vehicle
            }
            onClose={() => setSelectedLog(null)}
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

      {/* ✅ Completion Form Modal */}
      <Modal
        isOpen={!!completingLog}
        onClose={() => setCompletingLog(null)}
        title="Complete Maintenance"
        size="lg" 
      >
        {completingLog && <CompleteMaintenanceModalContent log={completingLog} onClose={() => setCompletingLog(null)} />}
      </Modal>

      {/* Category Modal */}
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

      {commModal.isOpen && (
        <MaintenanceCommunicationModal
          isOpen={commModal.isOpen}
          onClose={() => setCommModal((prev) => ({ ...prev, isOpen: false }))}
          initialMode={commModal.mode}
          logs={filteredLogs.length > 0 ? filteredLogs : logs}
          vehicles={vehicles}
          customers={customers}
          rentals={rentals}
        />
      )}
    </div>
  );
};

export default Maintenance;