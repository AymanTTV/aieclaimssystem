// src/pages/Rentals.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import AvailableVehiclesModal from '../components/rentals/AvailableVehiclesModal';
import ReturnConditionForm from '../components/rentals/ReturnConditionForm.tsx';
import Modal from '../components/ui/Modal';
import { Plus, Download, Car, RefreshCw as RefreshCwIcon, Search, FileText } from 'lucide-react';
import { exportRentals } from '../utils/RentalsExport';
import { Rental } from '../types';
import { deleteRentalPayment } from '../utils/paymentUtils';
import toast from 'react-hot-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import RentalSummaryCards from '../components/rentals/RentalSummaryCards';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { syncVehicleStatuses } from '../utils/vehicleStatusManager';
import RentalDiscountModal from '../components/rentals/RentalDiscountModal';
import {
  generateBulkDocuments,
  getCompanyDetails
} from '../utils/documentGenerator';
import { RentalBulkDocument } from '../components/pdf/documents';
import { generateRentalDocuments } from '../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../utils/uploadRentalDocuments';
import { saveAs } from 'file-saver';
import { useCompanyDetails } from '../hooks/useCompanyDetails';

// ✅ Use the standalone modal component you created earlier
import RentalAgreement90Modal from '../components/rentals/RentalAgreement90Modal';

const Rentals = () => {
  const { rentals, loading } = useRentals();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();
  const [discountingRental, setDiscountingRental] = useState<Rental | null>(null);
  const { companyDetails } = useCompanyDetails();

  // "All Records" checkbox
  const [showAllRecords, setShowAllRecords] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    reasonFilter,
    setReasonFilter,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
  } = useRentalFilters(rentals, vehicles, customers);

  const [showForm, setShowForm] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [deletingRental, setDeletingRental] = useState<Rental | null>(null);
  const [payingRental, setPayingRental] = useState<Rental | null>(null);
  const [completingRental, setCompletingRental] = useState<Rental | null>(null);
  const [showAvailableVehicles, setShowAvailableVehicles] = useState(false);

  // 90-day modal state
  const [rentalFor90, setRentalFor90] = useState<Rental | null>(null);
  const [show90, setShow90] = useState(false);
  const open90 = (r: Rental) => { setRentalFor90(r); setShow90(true); };
  const close90 = () => { setShow90(false); setRentalFor90(null); };

  // Keep the Details modal in sync
  useEffect(() => {
    if (selectedRental && rentals.length > 0) {
      const fresh = rentals.find(r => r.id === selectedRental.id);
      if (fresh) {
        if (JSON.stringify(fresh) !== JSON.stringify(selectedRental)) {
          setSelectedRental(fresh);
        }
      } else {
        setSelectedRental(null);
      }
    }
  }, [rentals, selectedRental]);

  // Filtering + enhanced search (includes Hire Substitution)
  const filteredRentals = useMemo(() => {
    let list = rentals;

    if (!showAllRecords) {
      if (statusFilter !== 'all') {
        list = list.filter(r => r.status === statusFilter);
      } else {
        list = list.filter(r =>
          r.status !== 'completed' || (r.status === 'completed' && r.paymentStatus !== 'paid')
        );
      }
      if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
      if (vehicleFilter) list = list.filter(r => r.vehicleId === vehicleFilter);
      if (reasonFilter !== 'all') list = list.filter(r => r.reason === reasonFilter);
      else list = list.filter(r => r.reason !== 'o/d' && r.reason !== 'staff');
    }

    if (startDateFilter) {
      const s = new Date(startDateFilter);
      list = list.filter(r => new Date(r.startDate) >= s);
    }
    if (endDateFilter) {
      const e = new Date(endDateFilter);
      list = list.filter(r => new Date(r.endDate) <= e);
    }

    if (searchQuery) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(r => {
        const v = vehicles.find(vv => vv.id === r.vehicleId);
        const c = customers.find(cc => cc.id === r.customerId);

        const matchesVehicle = v
          ? (`${v.make} ${v.model} ${v.registrationNumber}`).toLowerCase().includes(q)
          : false;

        const matchesCustomer = c
          ? (`${c.name} ${c.mobile} ${c.email}`).toLowerCase().includes(q)
          : false;

        const matchesBasic =
          r.id.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q);

        // ✅ Hire Substitution vehicle fields
        const subs = r.hireSubstitutionDetails || [];
        const matchesSubRegistration = subs.some(sub =>
          (sub.registration || '').toLowerCase().includes(q)
        );
        const matchesSubMakeModel = subs.some(sub =>
          (`${sub.make || ''} ${sub.model || ''}`.trim()).toLowerCase().includes(q)
        );
        const matchesSubLoaner = subs.some(sub =>
          (sub.loaner || '').toLowerCase().includes(q)
        );

        return (
          matchesVehicle ||
          matchesCustomer ||
          matchesBasic ||
          matchesSubRegistration ||
          matchesSubMakeModel ||
          matchesSubLoaner
        );
      });
    }

    if (user && (user as any).permissions) {
      const rp = (user as any).permissions.rentals;
      list = list.filter(r => {
        switch (r.type) {
          case 'daily': return rp.daily;
          case 'weekly': return rp.weekly;
          case 'claim': return rp.claim;
          default: return true;
        }
      });
    }

    return list;
  }, [
    rentals, vehicles, customers, user,
    showAllRecords, statusFilter, typeFilter, vehicleFilter, reasonFilter,
    startDateFilter, endDateFilter, searchQuery
  ]);

  const handleExport = useCallback(() => {
    try {
      exportRentals(rentals);
      toast.success('Rentals exported successfully');
    } catch (error) {
      console.error('Error exporting rentals:', error);
      toast.error('Failed to export rentals');
    }
  }, [rentals]);

  // Agreement: open latest or generate first
  const handleDownloadAgreement = useCallback(
    async (rental: Rental) => {
      const agreements = rental.documents?.agreements || {};
      const keys = Object.keys(agreements).sort((a, b) =>
        (parseInt(a.split('_')[1] || '0') - parseInt(b.split('_')[1] || '0'))
      );
      const latest = keys.length ? keys[keys.length - 1] : null;

      if (latest && agreements[latest]) {
        window.open(agreements[latest], '_blank');
        return;
      }

      toast.loading('Generating agreement...');
      try {
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const customer = customers.find(c => c.id === rental.customerId);
        if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found for this rental');

        const docs = await generateRentalDocuments(rental, vehicle, customer);

        const ts = (rental as any).originalStartDate
          ? new Date(rental.originalStartDate as any).getTime()
          : new Date(rental.startDate).getTime();
        if (isNaN(ts)) throw new Error('Invalid original start date, cannot create agreement name.');

        const key = `agreement_${ts}`;
        const uploadRes = await uploadRentalDocuments(rental.id, {
          agreements: { [key]: docs.agreement },
          invoice: docs.invoice,
          permit: docs.permit,
          claimDocuments: docs.claimDocuments
        });

        toast.dismiss();
        toast.success('Agreement generated and uploaded!');
        if (uploadRes.agreementUrls[key]) window.open(uploadRes.agreementUrls[key], '_blank');
      } catch (error: any) {
        console.error('Error generating agreement:', error);
        toast.dismiss();
        toast.error(`Failed to generate agreement: ${error.message}`);
      }
    },
    [vehicles, customers]
  );

  // Invoice: open or generate
  const handleDownloadInvoice = useCallback(
    async (rental: Rental) => {
      if (rental.documents?.invoice) {
        window.open(rental.documents.invoice, '_blank');
        return;
      }
      toast.loading('Generating invoice...');
      try {
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const customer = customers.find(c => c.id === rental.customerId);
        if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found');

        const docs = await generateRentalDocuments(rental, vehicle, customer);
        const uploadRes = await uploadRentalDocuments(rental.id, {
          agreements: {},
          invoice: docs.invoice,
          permit: docs.permit,
          claimDocuments: docs.claimDocuments
        });

        toast.dismiss();
        toast.success('Invoice generated and uploaded!');
        if (uploadRes.invoiceUrl) window.open(uploadRes.invoiceUrl, '_blank');
      } catch (error: any) {
        console.error('Error generating invoice:', error);
        toast.dismiss();
        toast.error(`Failed to generate invoice: ${error.message}`);
      }
    },
    [vehicles, customers]
  );

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
      window.open(rental.documents?.permit, '_blank');
    } else {
      toast.error('No parking permit available');
    }
  }, []);

  const handleGenerateBulkDocument = useCallback(async () => {
    try {
      toast.loading('Generating bulk rental summary...');
      const companyDetailsData = await getCompanyDetails();
      if (!companyDetailsData) throw new Error('Company details not found');

      const pdfBlob = await generateBulkDocuments(
        RentalBulkDocument,
        filteredRentals,
        companyDetailsData,
        { vehicles, customers }
      );

      saveAs(pdfBlob, 'rental_summary.pdf');
      toast.dismiss();
      toast.success('Bulk document generated successfully');
    } catch (error: any) {
      console.error('Error generating bulk document:', error);
      toast.dismiss();
      toast.error(`Failed to generate bulk document: ${error.message}`);
    }
  }, [filteredRentals, vehicles, customers]);

  // 90-day confirm: generate a new Agreement file keyed by chosen start time
  const handleConfirm90 = useCallback(async (start: Date, end: Date) => {
    if (!rentalFor90) return;
    try {
      toast.loading('Generating 90-day agreement…');

      const vehicle = vehicles.find(v => v.id === rentalFor90.vehicleId);
      const customer = customers.find(c => c.id === rentalFor90.customerId);
      if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found');

      // ----------------- ✅ FIX 1: Pass the periodOverride -----------------
      // This tells the generator to use the new dates for the agreement
      const docs = await generateRentalDocuments(rentalFor90, vehicle, customer, { 
        periodOverride: { start, end } 
      });
      // ----------------- END OF FIX 1 -----------------

      const key = `agreement_${start.getTime()}`;

      // ----------------- ✅ FIX 2: Pass all documents to the uploader -----------------
      // The uploader will merge the new agreement and refresh the other docs
      const uploadRes = await uploadRentalDocuments(rentalFor90.id, {
        agreements: { [key]: docs.agreement },
        invoice: docs.invoice, // <-- Pass the invoice
        permit: docs.permit, // <-- Pass the permit
        claimDocuments: docs.claimDocuments // <-- Pass the claim docs
      });
      // ----------------- END OF FIX 2 -----------------

      toast.dismiss();
      toast.success('90-day agreement uploaded!');
      if (uploadRes.agreementUrls?.[key]) window.open(uploadRes.agreementUrls[key], '_blank');
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || 'Failed to generate 90-day agreement');
    } finally {
      close90();
    }
  }, [rentalFor90, vehicles, customers]);

  if (loading || vehiclesLoading || customersLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RentalSummaryCards rentals={filteredRentals} vehicles={vehicles} />

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rentals</h1>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'manager' && (
            <button
              onClick={handleGenerateBulkDocument}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">PDF</span>
              <span className="hidden sm:inline">&nbsp;Report</span>
            </button>
          )}

          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Export</span>
            </button>
          )}

          <button
            onClick={() => setShowAvailableVehicles(true)}
            className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Car className="h-5 w-5 mr-1 sm:mr-2" />
            <span className="truncate">Available</span>
            <span className="hidden sm:inline">&nbsp;Vehicles</span>
          </button>

          <button
            onClick={syncVehicleStatuses}
            className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCwIcon className="h-5 w-5 mr-1 sm:mr-2" />
            <span className="truncate">Sync</span>
            <span className="hidden sm:inline">&nbsp;Statuses</span>
          </button>

          {can('rentals', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-1 sm:mr-2" />
              <span className="truncate">Schedule</span>
              <span className="hidden sm:inline">&nbsp;Rental</span>
            </button>
          )}
        </div>
      </div>

      {/* Search + All Records */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search rentals… (customer / main vehicle / hire-sub vehicle reg/make/model / loaner)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>

          <div className="flex sm:justify-end">
            <label htmlFor="allRecords" className="inline-flex items-center gap-2 select-none cursor-pointer">
              <input
                type="checkbox"
                id="allRecords"
                checked={showAllRecords}
                onChange={(e) => {
                  setShowAllRecords(e.target.checked);
                  if (e.target.checked) {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setVehicleFilter('');
                    setReasonFilter('all');
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                All Records
              </span>
            </label>
          </div>
        </div>

        <RentalFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          vehicleFilter={vehicleFilter}
          onVehicleFilterChange={setVehicleFilter}
          reasonFilter={reasonFilter}
          onReasonFilterChange={setReasonFilter}
          startDateFilter={startDateFilter}
          onStartDateChange={setStartDateFilter}
          endDateFilter={endDateFilter}
          onEndDateChange={setEndDateFilter}
          vehicles={vehicles}
          isDisabled={showAllRecords}
        />
      </div>

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
        onGenerate90DayAgreement={(rental: Rental) => open90(rental)}
      />

      {/* Discount */}
      <Modal isOpen={!!discountingRental} onClose={() => setDiscountingRental(null)} title="Apply Discount">
        {discountingRental && (
          <RentalDiscountModal rental={discountingRental} onClose={() => setDiscountingRental(null)} />
        )}
      </Modal>

      {/* Create Rental */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Schedule Rental" size="xl">
        <RentalForm vehicles={vehicles} customers={customers} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Details */}
      <Modal isOpen={!!selectedRental} onClose={() => setSelectedRental(null)} title="Rental Details" size="xl">
        {selectedRental && (
          <RentalDetails
            rental={selectedRental}
            vehicle={vehicles.find(v => v.id === selectedRental.vehicleId) || null}
            customer={customers.find(c => c.id === selectedRental.customerId) || null}
            onDownloadInvoice={() => handleDownloadInvoice(selectedRental)}
            onDownloadPermit={() => handleDownloadPermit(selectedRental)}
          />
        )}
      </Modal>

      {/* Edit */}
      <Modal isOpen={!!editingRental} onClose={() => setEditingRental(null)} title="Edit Rental" size="xl">
        {editingRental && (
          <RentalEditModal
            rental={editingRental}
            vehicles={vehicles}
            customers={customers}
            onClose={() => setEditingRental(null)}
          />
        )}
      </Modal>

      {/* Delete */}
      <Modal isOpen={!!deletingRental} onClose={() => setDeletingRental(null)} title="Delete Rental">
        {deletingRental && <RentalDeleteModal rental={deletingRental} onClose={() => setDeletingRental(null)} />}
      </Modal>

      {/* Record Payment */}
      <Modal isOpen={!!payingRental} onClose={() => setPayingRental(null)} title="Record Payment">
        {payingRental && (
          <RentalPaymentModal
            rental={payingRental}
            vehicle={vehicles.find(v => v.id === payingRental.vehicleId)}
            onClose={() => setPayingRental(null)}
          />
        )}
      </Modal>

      {/* Return Condition */}
      <Modal isOpen={!!completingRental} onClose={() => setCompletingRental(null)} title="Vehicle Return Condition" size="xl">
        {completingRental && (
          <ReturnConditionForm
            checkOutCondition={completingRental.checkOutCondition!}
            initialCondition={completingRental.returnCondition ?? undefined}
            onClose={() => setCompletingRental(null)}
            onSubmit={async (condition) => {
              try {
                const r = completingRental!;
                const prevReturn = r.returnCondition?.totalCharges ?? 0;
                const baseCost = (r as any).cost ?? 0 - prevReturn;
                const newRemaining = (baseCost + condition.totalCharges) - ((r as any).paidAmount ?? 0);
                const newPaymentStatus =
                  newRemaining <= 0.001 ? 'paid'
                  : ((r as any).paidAmount ?? 0) > 0 ? 'partially_paid'
                  : 'pending';

                await updateDoc(doc(db, 'rentals', r.id), {
                  returnCondition: {
                    ...condition,
                    id: r.returnCondition?.id ?? `return_${Date.now()}`,
                    createdAt: r.returnCondition?.createdAt ?? new Date(),
                    createdBy: r.returnCondition?.createdBy ?? (user as any)?.id,
                  },
                  cost: baseCost,
                  remainingAmount: Math.max(newRemaining, 0),
                  paymentStatus: newPaymentStatus,
                  updatedAt: new Date(),
                  updatedBy: (user as any)?.id,
                });

                toast.success('Return condition saved.');
                setCompletingRental(null);
              } catch (error) {
                console.error('Error saving return condition:', error);
                toast.error('Failed to save return condition');
              }
            }}
          />
        )}
      </Modal>

      {/* Available Vehicles */}
      <Modal isOpen={showAvailableVehicles} onClose={() => setShowAvailableVehicles(false)} title="Available Vehicles" size="xl">
        <AvailableVehiclesModal vehicles={vehicles} onClose={() => setShowAvailableVehicles(false)} />
      </Modal>

      {/* ✅ 90-day Agreement Modal — using a proper component (no inline hooks) */}
      <RentalAgreement90Modal
        rental={rentalFor90 as Rental}
        isOpen={show90}
        onClose={close90}
        onConfirm={handleConfirm90}
      />
    </div>
  );
};

export default Rentals;