import React, { useState, useCallback } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useCustomers } from '../hooks/useCustomers';
import { useRentalFilters } from '../hooks/useRentalFilters';
import RentalFilters from '../components/rentals/RentalFilters';
import RentalTable from '../components/rentals/RentalTable';
import RentalForm from '../components/rentals/RentalForm';
import RentalDetails from '../components/rentals/RentalDetails';
import RentalEditModal from '../components/rentals/RentalEditModal';
import RentalDeleteModal from '../components/rentals/RentalDeleteModal';
import RentalPaymentModal from '../components/rentals/RentalPaymentModal';
import RentalCompleteModal from '../components/rentals/RentalCompleteModal';
import AvailableVehiclesModal from '../components/rentals/AvailableVehiclesModal';
import ReturnConditionForm from '../components/rentals/ReturnConditionForm.tsx'
import Modal from '../components/ui/Modal';
import { Plus, Download, Car, RotateCw } from 'lucide-react';
import { exportRentals } from '../utils/RentalsExport';
import { Rental } from '../types';
import { deleteRentalPayment } from '../utils/paymentUtils';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import RentalSummaryCards from '../components/rentals/RentalSummaryCards';

import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, FileText } from 'lucide-react';
import { syncVehicleStatuses } from '../utils/vehicleStatusManager';
import RentalDiscountModal from '../components/rentals/RentalDiscountModal';

import { generateAndUploadDocument, generateBulkDocuments, getCompanyDetails } from '../utils/documentGenerator';
import { RentalDocument, RentalBulkDocument } from '../components/pdf/documents';
import { saveAs } from 'file-saver';
import { useCompanyDetails } from '../hooks/useCompanyDetails';

const Rentals = () => {
  const { rentals, loading } = useRentals();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();
  const [discountingRental, setDiscountingRental] = useState<Rental | null>(null);
  const { companyDetails } = useCompanyDetails();

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredRentals
  } = useRentalFilters(rentals, vehicles, customers);

  const [showForm, setShowForm] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [deletingRental, setDeletingRental] = useState<Rental | null>(null);
  const [payingRental, setPayingRental] = useState<Rental | null>(null);
  const [completingRental, setCompletingRental] = useState<Rental | null>(null);
  const [showAvailableVehicles, setShowAvailableVehicles] = useState(false);

  const handleExport = useCallback(() => {
    try {
      exportRentals(rentals);
      toast.success('Rentals exported successfully');
    } catch (error) {
      console.error('Error exporting rentals:', error);
      toast.error('Failed to export rentals');
    }
  }, [rentals]);

  const handleDownloadAgreement = useCallback(async (rental: Rental) => {
    if (rental.documents?.agreement) {
      window.open(rental.documents.agreement, '_blank');
    } else {
      toast.loading('Generating agreement...');
      try {
        const companyDetailsData = await getCompanyDetails();
        if (!companyDetailsData) {
          throw new Error('Company details not found');
        }
        // Assuming RentalDocument can generate agreement based on rental data
        await generateAndUploadDocument(
          RentalDocument,
          rental,
          'rentals', // storage path
          rental.id,
          'rentals', // firestore collection
          companyDetailsData // Pass company details
        );
        toast.dismiss();
        toast.success('Agreement generated and uploaded!');
        // Note: For real-time updates, you'd want your useRentals hook
        // to re-fetch or listen for changes to the specific rental document.
        // For now, this just updates the backend and shows a success toast.
      } catch (error) {
        console.error('Error generating agreement:', error);
        toast.dismiss();
        toast.error('Failed to generate agreement');
      }
    }
  }, []);

  const handleDownloadInvoice = useCallback(async (rental: Rental) => {
    if (rental.documents?.invoice) {
      window.open(rental.documents.invoice, '_blank');
    } else {
      toast.loading('Generating invoice...');
      try {
        const companyDetailsData = await getCompanyDetails();
        if (!companyDetailsData) {
          throw new Error('Company details not found');
        }
        // Assuming RentalDocument can generate invoice based on rental data
        await generateAndUploadDocument(
          RentalDocument,
          rental,
          'rentals', // storage path
          rental.id,
          'rentals', // firestore collection
          companyDetailsData // Pass company details
        );
        toast.dismiss();
        toast.success('Invoice generated and uploaded!');
      } catch (error) {
        console.error('Error generating invoice:', error);
        toast.dismiss();
        toast.error('Failed to generate invoice');
      }
    }
  }, []);

  const handleDeletePayment = useCallback(async (rental: Rental, paymentId: string) => {
    try {
      await deleteRentalPayment(rental, paymentId);
      toast.success('Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  }, []);

  const handleDownloadPermit = useCallback((rental: Rental) => {
    if (rental.documents?.permit) {
      window.open(rental.documents.permit, '_blank');
    } else {
      toast.error('No parking permit available');
    }
  }, []);

  const handleGenerateBulkDocument = useCallback(async () => {
    try {
      toast.loading('Generating bulk rental summary...');
      const companyDetailsData = await getCompanyDetails();
      if (!companyDetailsData) {
        throw new Error('Company details not found');
      }
      const pdfBlob = await generateBulkDocuments(
        RentalBulkDocument,
        filteredRentals,
        companyDetailsData, // Pass company details
        vehicles,
        customers
      );

      saveAs(pdfBlob, 'rental_summary.pdf');
      toast.dismiss();
      toast.success('Bulk document generated successfully');
    } catch (error) {
      console.error('Error generating bulk document:', error);
      toast.dismiss();
      toast.error('Failed to generate bulk document');
    }
  }, [filteredRentals, vehicles, customers]);


  if (loading || vehiclesLoading || customersLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4"> {/* Added some padding */}
      {user?.role === 'manager' && (
      <RentalSummaryCards rentals={filteredRentals} />
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
          <button
            onClick={handleGenerateBulkDocument}
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
          <button
            onClick={() => setShowAvailableVehicles(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Car className="h-5 w-5 mr-2" />
            Available Vehicles
          </button>
          <button
            onClick={syncVehicleStatuses}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Sync Statuses
          </button>

          {can('rentals', 'create') && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Schedule Rental
              </button>
            </>
          )}
        </div>
      </div>

      <RentalFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        vehicleFilter={vehicleFilter}
        onVehicleFilterChange={setVehicleFilter}
        vehicles={vehicles}
      />

      <RentalTable
        rentals={filteredRentals}
        vehicles={vehicles}
        customers={customers}
        onView={setSelectedRental}
        onEdit={setEditingRental}
        onDelete={setDeletingRental}
        onComplete={setCompletingRental}
        onDownloadAgreement={handleDownloadAgreement}
        onDownloadInvoice={handleDownloadInvoice}
        onRecordPayment={setPayingRental}
        onApplyDiscount={setDiscountingRental}
        onDeletePayment={handleDeletePayment}
      />

      <Modal
        isOpen={!!discountingRental}
        onClose={() => setDiscountingRental(null)}
        title="Apply Discount"
      >
        {discountingRental && (
          <RentalDiscountModal
            rental={discountingRental}
            onClose={() => setDiscountingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Schedule Rental"
        size="xl"
      >
        <RentalForm
          vehicles={vehicles}
          customers={customers}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedRental}
        onClose={() => setSelectedRental(null)}
        title="Rental Details"
        size="xl"
      >
        {selectedRental && (
          <RentalDetails
            rental={selectedRental}
            vehicle={vehicles.find(v => v.id === selectedRental.vehicleId) || null}
            customer={customers.find(c => c.id === selectedRental.customerId) || null}
            onDownloadAgreement={() => handleDownloadAgreement(selectedRental)}
            onDownloadInvoice={() => handleDownloadInvoice(selectedRental)}
            onDownloadPermit={() => handleDownloadPermit(selectedRental)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingRental}
        onClose={() => setEditingRental(null)}
        title="Edit Rental"
        size="xl"
      >
        {editingRental && (
          <RentalEditModal
            rental={editingRental}
            vehicles={vehicles}
            customers={customers}
            onClose={() => setEditingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingRental}
        onClose={() => setDeletingRental(null)}
        title="Delete Rental"
      >
        {deletingRental && (
          <RentalDeleteModal
            rental={deletingRental}
            onClose={() => setDeletingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!payingRental}
        onClose={() => setPayingRental(null)}
        title="Record Payment"
      >
        {payingRental && (
          <RentalPaymentModal
            rental={payingRental}
            onClose={() => setPayingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!completingRental}
        onClose={() => setCompletingRental(null)}
        title="Vehicle Return Condition"
      >
        {completingRental && (
          <ReturnConditionForm
            checkOutCondition={completingRental.checkOutCondition}
            onSubmit={async (condition) => {
              try {
                const newTotalCost = completingRental.cost + condition.totalCharges;
                const newRemainingAmount = newTotalCost - completingRental.paidAmount;

                await updateDoc(doc(db, 'rentals', completingRental.id), {
                  returnCondition: condition,
                  cost: newTotalCost,
                  remainingAmount: newRemainingAmount,
                  updatedAt: new Date()
                });

                toast.success('Return condition saved successfully');
                setCompletingRental(null);
              } catch (error) {
                console.error('Error saving return condition:', error);
                toast.error('Failed to save return condition');
              }
            }}
            onClose={() => setCompletingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={showAvailableVehicles}
        onClose={() => setShowAvailableVehicles(false)}
        title="Available Vehicles"
        size="xl"
      >
        <AvailableVehiclesModal
          vehicles={vehicles}
          onClose={() => setShowAvailableVehicles(false)}
        />
      </Modal>
    </div>
  );
};

export default Rentals;
