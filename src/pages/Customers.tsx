import React, { useState } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useCustomerFilters } from '../hooks/useCustomerFilters';
import CustomerTable from '../components/customers/CustomerTable';
import CustomerFilters from '../components/customers/CustomerFilters';
import CustomerForm from '../components/customers/CustomerForm';
import CustomerDetails from '../components/customers/CustomerDetails';
import Modal from '../components/ui/Modal';
import { Customer } from '../types/customer';
import { handleCustomerExport, handleCustomerImport } from '../utils/customerHelpers';
import { Plus, Download, Upload } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';


const Customers = () => {
  const { customers, loading } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();

  const {
    searchQuery,
    setSearchQuery,
    filterExpired,
    setFilterExpired,
    filterSoonExpiring,
    setFilterSoonExpiring,
    selectedGender,
    setSelectedGender,
    ageRange,
    setAgeRange,
    filteredCustomers
  } = useCustomerFilters(customers);

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="flex space-x-2">
          
              {user?.role === 'manager' && (
  <button
    onClick={() => handleCustomerExport(customers)}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    <Download className="h-5 w-5 mr-2" />
    Export
  </button>
)}

              {/* <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Import
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={(e) => e.target.files && handleCustomerImport(e.target.files[0])}
                />
              </label> */}
          {can('customers', 'create') && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Customer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterExpired={filterExpired}
        onFilterExpired={setFilterExpired}
        filterSoonExpiring={filterSoonExpiring}
        onFilterSoonExpiring={setFilterSoonExpiring}
        selectedGender={selectedGender}
        onGenderFilter={setSelectedGender}
        ageRange={ageRange}
        onAgeRangeFilter={setAgeRange}
      />

      {/* Table */}
      <CustomerTable
        customers={filteredCustomers}
        onView={setSelectedCustomer}
        onEdit={setEditingCustomer}
        onDelete={setDeletingCustomer}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New Customer"
        size="xl"
      >
        <CustomerForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Details"
        size="lg"
      >
        {selectedCustomer && <CustomerDetails customer={selectedCustomer} />}
      </Modal>

      <Modal
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title="Edit Customer"
        size="xl"
      >
        {editingCustomer && (
          <CustomerForm
            customer={editingCustomer}
            onClose={() => setEditingCustomer(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        title="Delete Customer"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this customer? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingCustomer(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingCustomer && handleDelete(deletingCustomer)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Customer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;