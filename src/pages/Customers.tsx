// src/pages/Customers.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerFilters } from '../hooks/useCustomerFilters';
import CustomerTable from '../components/customers/CustomerTable';
import CustomerFilters from '../components/customers/CustomerFilters';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerDetails from '../components/customers/CustomerDetails';
import Modal from '../components/ui/Modal';
import { Customer } from '../types/customer';
import { handleCustomerExport } from '../utils/customerHelpers';
import { Plus, Download, CheckCircle, XCircle, Edit3 } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { generateAndUploadDocument } from '../utils/documentGenerator';
import { CustomerDocument } from '../components/pdf/documents';
import AssignCustomerTypeForm from '../components/customers/AssignCustomerTypeForm';

const Customers = () => {
  const { customers, loading } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery, setSearchQuery,
    expiryFilters, setExpiryFilters, 
    statusFilter, setStatusFilter, 
    billCopyFilter, setBillCopyFilter, // [NEW]
    selectedGender, setSelectedGender,
    ageRange, setAgeRange,
    selectedType, setSelectedType,
    filteredCustomers
  } = useCustomerFilters(customers);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);
  
  // [NEW] Bill Copy Tracker State
  const [updatingBillCopy, setUpdatingBillCopy] = useState<Customer | null>(null);
  const [billCopyData, setBillCopyData] = useState<{status: 'available' | 'unavailable', note: string}>({status: 'unavailable', note: ''});

  // Load existing data when modal opens
  useEffect(() => {
    if (updatingBillCopy) {
      setBillCopyData({
        status: updatingBillCopy.billCopyStatus || 'unavailable',
        note: updatingBillCopy.billCopyNote || ''
      });
    }
  }, [updatingBillCopy]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  const isManager = (user?.role || '').toLowerCase() === 'manager';

  const visibleCustomers = useMemo(() => {
    if (isManager) return filteredCustomers;
    return (searchQuery || '').trim() ? filteredCustomers : [];
  }, [filteredCustomers, isManager, searchQuery]);

  const handleBulkStatusUpdate = async (newStatus: 'active' | 'inactive') => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    const toastId = toast.loading(`Marking ${selectedIds.length} members as ${newStatus}...`);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateDoc(doc(db, 'customers', id), {
            status: newStatus,
            updatedAt: new Date()
          })
        )
      );
      toast.success(`Successfully updated ${selectedIds.length} members`, { id: toastId });
      setRowSelection({});
      setIsStatusModalOpen(false);
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update some members', { id: toastId });
    }
  };

  const handleSaveBillCopy = async () => {
    if (!updatingBillCopy) return;
    const toastId = toast.loading('Saving bill copy status...');
    try {
      await updateDoc(doc(db, 'customers', updatingBillCopy.id), {
        billCopyStatus: billCopyData.status,
        billCopyNote: billCopyData.note,
        updatedAt: new Date()
      });
      toast.success('Office Bill Copy updated', { id: toastId });
      setUpdatingBillCopy(null);
    } catch (error) {
      toast.error('Failed to update bill copy', { id: toastId });
    }
  };

  const handleOpenEditForm = (customer: Customer | null) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customer: Customer) => {
    try {
      await deleteDoc(doc(db, 'customers', customer.id));
      toast.success('Customer deleted successfully');
      setDeletingCustomer(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleGenerateDocument = async (customer: Customer) => {
    try {
      await generateAndUploadDocument(
        CustomerDocument, 
        customer,         
        'customers',      
        customer.id,      
        'customers'       
      );
      toast.success('Document generated successfully');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => { window.open(url, '_blank'); };
  const selectedCount = Object.keys(rowSelection).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers & Members</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && can('customers', 'update') && (
             <div className="flex items-center bg-blue-50 border border-blue-200 rounded-md px-3 py-1 mr-2 shadow-sm">
               <span className="text-sm text-blue-800 font-medium mr-3">{selectedCount} selected</span>
               <button onClick={() => setIsStatusModalOpen(true)} className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded flex items-center transition-colors">
                 <Edit3 className="w-4 h-4 mr-2"/> Update Status
               </button>
             </div>
          )}

          {can('customers', 'export') && (
            <button onClick={() => handleCustomerExport(customers)} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-5 w-5 mr-2" /> Export
            </button>
          )}
          {can('customers', 'create') && (
            <button onClick={() => handleOpenEditForm(null)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600">
              <Plus className="h-5 w-5 mr-2" /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        expiryFilters={expiryFilters} onExpiryFiltersChange={setExpiryFilters}
        statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
        billCopyFilter={billCopyFilter} onBillCopyFilterChange={setBillCopyFilter} // [NEW]
        selectedGender={selectedGender} onGenderFilter={setSelectedGender}
        ageRange={ageRange} onAgeRangeFilter={setAgeRange}
        selectedType={selectedType} onTypeFilter={setSelectedType}
      />

      {/* Table */}
      <CustomerTable
        customers={visibleCustomers}
        onView={setSelectedCustomer}
        onEdit={(c) => handleOpenEditForm(c)}
        onDelete={setDeletingCustomer}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onAssignType={setAssigningCustomer}
        onUpdateBillCopy={setUpdatingBillCopy} // [NEW]
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      {/* Modals */}
      <Modal isOpen={isFormModalOpen} onClose={handleCloseForm} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="xl">
        <CustomerForm customer={editingCustomer || undefined} onClose={handleCloseForm} />
      </Modal>

      <Modal isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title="Customer Details" size="lg">
        {selectedCustomer && <CustomerDetails customer={selectedCustomer} />}
      </Modal>

      <Modal isOpen={!!assigningCustomer} onClose={() => setAssigningCustomer(null)} title="Assign Customer Type">
        {assigningCustomer && <AssignCustomerTypeForm customer={assigningCustomer} onClose={() => setAssigningCustomer(null)} />}
      </Modal>

      {/* [NEW] Bill Copy Modal */}
      <Modal isOpen={!!updatingBillCopy} onClose={() => setUpdatingBillCopy(null)} title="Update Office Bill Copy">
        {updatingBillCopy && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Record the physical bill copy status for <strong>{updatingBillCopy.name}</strong>.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={billCopyData.status}
                onChange={(e) => setBillCopyData({ ...billCopyData, status: e.target.value as 'available' | 'unavailable' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="available">Available (In Office)</option>
                <option value="unavailable">Unavailable (Not in Office)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Internal Notes (Optional)</label>
              <textarea
                value={billCopyData.note}
                onChange={(e) => setBillCopyData({ ...billCopyData, note: e.target.value })}
                rows={3}
                placeholder="Where is it stored, or why is it missing?"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button onClick={() => setUpdatingBillCopy(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveBillCopy} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Member Status" size="md">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Choose New Status</h3>
            <p className="text-sm text-gray-500 mt-1">You are updating the status for <strong>{selectedCount}</strong> selected member(s).</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleBulkStatusUpdate('active')} className="flex flex-col items-center justify-center p-6 border-2 border-green-200 bg-green-50 rounded-xl hover:bg-green-100 hover:border-green-300 transition-all group">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform"><CheckCircle className="w-8 h-8 text-green-500" /></div>
              <span className="font-bold text-green-800 text-lg">Active</span>
              <span className="text-xs text-green-600 mt-1 text-center">Grants normal portal access</span>
            </button>
            <button onClick={() => handleBulkStatusUpdate('inactive')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 bg-gray-50 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all group">
              <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform"><XCircle className="w-8 h-8 text-gray-400" /></div>
              <span className="font-bold text-gray-700 text-lg">Inactive</span>
              <span className="text-xs text-gray-500 mt-1 text-center">Restricts or suspends access</span>
            </button>
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deletingCustomer} onClose={() => setDeletingCustomer(null)} title="Delete Customer">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Are you sure you want to delete this customer? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <button onClick={() => setDeletingCustomer(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button onClick={() => deletingCustomer && handleDelete(deletingCustomer)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">Delete Customer</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;