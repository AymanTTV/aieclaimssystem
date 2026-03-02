// src/pages/Rentals.tsx
import React, { useState, useCallback, useMemo, useEffect, createElement } from 'react';
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
import RentalNotesModal from '../components/rentals/RentalNotesModal';
import AvailableVehiclesModal from '../components/rentals/AvailableVehiclesModal';
import ReturnConditionForm from '../components/rentals/ReturnConditionForm';
import ParkingPermitModal from '../components/rentals/ParkingPermitModal';
import ExpectedReturnModal from '../components/rentals/ExpectedReturnModal';
import RentalExtensionModal from '../components/rentals/RentalExtensionModal'; 
import Modal from '../components/ui/Modal';
import { 
  Plus, 
  Download, 
  Car, 
  RefreshCw as RefreshCwIcon, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  FileText as FileTextIcon 
} from 'lucide-react';
import { exportRentals } from '../utils/RentalsExport';
import { Rental, Vehicle, Customer } from '../types';
import { deleteRentalPayment } from '../utils/paymentUtils';
import toast from 'react-hot-toast';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
import { calculateTotalSubstitutionCharges, calculateRentalCost } from '../utils/rentalCalculations'; 
import RentalAgreement90Modal from '../components/rentals/RentalAgreement90Modal';
import { pdf } from '@react-pdf/renderer';
import { ParkingPermitLetter } from '../components/pdf/ParkingPermitLetter';
import { ensureValidDate } from '../utils/dateHelpers';

const Rentals = () => {
  const { rentals, loading } = useRentals();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { customers, loading: customersLoading } = useCustomers();
  const { can } = usePermissions();
  const { user } = useAuth();
  const [discountingRental, setDiscountingRental] = useState<Rental | null>(null);
  const { companyDetails } = useCompanyDetails();
  const [notingRental, setNotingRental] = useState<Rental | null>(null);
  
  const [extendingRental, setExtendingRental] = useState<Rental | null>(null);

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
  
  const [agreementRental, setAgreementRental] = useState<Rental | null>(null);

  const [showReturnSelector, setShowReturnSelector] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ type: 'main' | 'sub', index?: number } | null>(null);

  const [permitRental, setPermitRental] = useState<Rental | null>(null);
  const [returnExpectationRental, setReturnExpectationRental] = useState<Rental | null>(null);

  const [rentalFor90, setRentalFor90] = useState<Rental | null>(null);
  const [show90, setShow90] = useState(false);
  const open90 = (r: Rental) => { setRentalFor90(r); setShow90(true); };
  const close90 = () => { setShow90(false); setRentalFor90(null); };

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

  const filteredRentals = useMemo(() => {
    let list = rentals;

    if (!showAllRecords) {
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
           list = list.filter(r => r.status === 'active');
        } else {
           list = list.filter(r => r.status === statusFilter);
        }
      } else {
        // Default View: Shows Active, Scheduled, AND Completed rentals that still owe money (including missed return charges)
        list = list.filter(r => {
          if (r.status === 'active' || r.status === 'scheduled') return true;
          
          let owing = r.remainingAmount || 0;
          const v = vehicles.find(veh => veh.id === r.vehicleId);
          if (v && r.startDate && r.endDate) {
            const start = ensureValidDate(r.startDate);
            const end = ensureValidDate(r.endDate);
            if (start && end) {
              const baseCost = calculateRentalCost(
                start, end, r.type, v, r.reason, r.negotiatedRate ?? undefined,
                r.storageCost || 0, r.recoveryCost || 0, r.deliveryCharge || 0, r.collectionCharge || 0,
                r.insurancePerDay || 0, (r as any).insurancePerWeek || 0,
                r.includeVAT, false, false, r.insurancePerDayIncludeVAT, (r as any).insurancePerWeekIncludeVAT, r.includeRecoveryCostVAT
              );
              const subCharges = (r.hireSubstitutionDetails || []).reduce((acc: number, sub: any) => acc + (sub.returnCondition?.totalCharges || 0), 0);
              const returnCharges = (r.returnCondition?.totalCharges ?? 0) + subCharges;
              const discountedTotal = baseCost - (r.discountAmount ?? 0);
              owing = discountedTotal + returnCharges - (r.paidAmount || 0);
            }
          }
          
          if (owing > 0.01) return true;
          return false;
        });
      }
    } else {
      // If "All Records" is ticked, STILL respect the status filter if changed from 'all'
      if (statusFilter !== 'all') {
        list = list.filter(r => r.status === statusFilter);
      }
    }

    // Always apply these filters
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    if (vehicleFilter) list = list.filter(r => r.vehicleId === vehicleFilter);
    if (reasonFilter !== 'all') list = list.filter(r => r.reason === reasonFilter);
    else if (!showAllRecords) list = list.filter(r => r.reason !== 'o/d' && r.reason !== 'staff');

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
          r.status.toLowerCase().includes(q) ||
          (r.rentalAgreementNumber && r.rentalAgreementNumber.toLowerCase().includes(q));

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

  const generateDocumentsWithTimeout = async (
    rental: Rental, 
    vehicle: Vehicle, 
    customer: Customer,
    options?: any
  ) => {
    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("PDF Generation timed out (15s). Check for large/invalid images.")), 15000)
    );
    
    const result = await Promise.race([
        generateRentalDocuments(rental, vehicle, customer, options),
        timeout
    ]);
    
    return result as Awaited<ReturnType<typeof generateRentalDocuments>>;
  };

  const handleOpenAgreementModal = useCallback((rental: Rental) => {
    setAgreementRental(rental);
  }, []);

  const processAgreementGeneration = useCallback(
    async (rental: Rental, includeImages: boolean) => {
      setAgreementRental(null);

      toast.loading(`Generating agreement ${includeImages ? 'with images' : '(text only)'}...`);
      try {
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const customer = customers.find(c => c.id === rental.customerId);
        if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found for this rental');

        const docs = await generateDocumentsWithTimeout(rental, vehicle, customer, {
          includeImages: includeImages
        });

        const ts = (rental as any).originalStartDate
          ? new Date(rental.originalStartDate as any).getTime()
          : new Date(rental.startDate).getTime();
        
        const key = `agreement_${ts}${includeImages ? '' : '_no_img'}`;
        
        const uploadRes = await uploadRentalDocuments(rental.id, {
          agreements: { [key]: docs.agreement },
          invoice: docs.invoice,
          permit: docs.permit,
          claimDocuments: docs.claimDocuments
        });

        toast.dismiss();
        toast.success('Agreement generated and uploaded!');
        
        if (uploadRes.agreementUrls[key]) {
             window.open(uploadRes.agreementUrls[key], '_blank');
        }
      } catch (error: any) {
        console.error('Error generating agreement:', error);
        toast.dismiss();
        toast.error(`Failed to generate agreement: ${error.message}`);
      }
    },
    [vehicles, customers]
  );

  const handleDownloadInvoice = useCallback(
    async (rental: Rental) => {
      toast.loading('Generating invoice...');
      try {
        const vehicle = vehicles.find(v => v.id === rental.vehicleId);
        const customer = customers.find(c => c.id === rental.customerId);
        if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found');

        const docs = await generateDocumentsWithTimeout(rental, vehicle, customer);

        const uploadRes = await uploadRentalDocuments(rental.id, {
          agreements: {},
          invoice: docs.invoice,
          permit: docs.permit,
          claimDocuments: docs.claimDocuments
        });

        toast.dismiss();
        toast.success('Invoice generated and uploaded!');
        
        if (uploadRes.invoiceUrl) {
            window.open(uploadRes.invoiceUrl, '_blank');
        }
      } catch (error: any) {
        console.error('Error generating invoice:', error);
        toast.dismiss();
        toast.error(`Failed to generate invoice: ${error.message}`);
      }
    },
    [vehicles, customers]
  );

  const handleDownloadPermit = useCallback((rental: Rental) => {
    if (rental.documents?.permit) {
      window.open(rental.documents?.permit, '_blank');
    } else {
      toast.error('No parking permit available');
    }
  }, []);

  const handleDownloadPermitTrigger = useCallback((rental: Rental) => {
    if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
      setPermitRental(rental);
    } else {
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      if (vehicle) {
        handleGeneratePermit(rental, vehicle, 'Main Vehicle');
      } else {
        toast.error('Main vehicle not found.');
      }
    }
  }, [vehicles]);

  const handleGeneratePermit = async (rental: Rental, targetVehicleData: any, label: string) => {
    setPermitRental(null); 
    toast.loading(`Generating Permit for ${label}...`);
    
    try {
      const customer = customers.find(c => c.id === rental.customerId);
      if (!customer) throw new Error('Customer not found');

      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      const companyDetails = companyDoc.exists() ? companyDoc.data() : null;
      if (!companyDetails) throw new Error('Company details not found');

      const mockVehicle = {
        ...targetVehicleData,
        registrationNumber: targetVehicleData.registrationNumber 
      } as Vehicle;

      const blob = await pdf(createElement(ParkingPermitLetter, {
        rental,
        vehicle: mockVehicle,
        customer,
        companyDetails: companyDetails as any
      })).toBlob();

      const uploadRes = await uploadRentalDocuments(rental.id, {
        agreements: {},
        invoice: new Blob([]), 
        permit: blob
      });

      toast.dismiss();
      toast.success(`Permit generated for ${label}!`);
      if (uploadRes.permitUrl) window.open(uploadRes.permitUrl, '_blank');

    } catch (err: any) {
      toast.dismiss();
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleDeletePayment = useCallback(async (rental: Rental, paymentId: string) => {
    try {
      await deleteRentalPayment(rental, paymentId);
      toast.success('Payment deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
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

  const handleConfirm90 = useCallback(async (start: Date, end: Date, includeImages: boolean) => {
    if (!rentalFor90) return;
    try {
      toast.loading(`Generating 90-day agreement ${includeImages ? 'with images' : '(text only)'}...`);

      const vehicle = vehicles.find(v => v.id === rentalFor90.vehicleId);
      const customer = customers.find(c => c.id === rentalFor90.customerId);
      if (!vehicle || !customer) throw new Error('Vehicle or Customer data not found');

      const originalStart = new Date(rentalFor90.startDate);
      const originalEnd = new Date(rentalFor90.endDate);

      const finalStart = new Date(start);
      finalStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds());

      const finalEnd = new Date(end);
      finalEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes(), originalEnd.getSeconds());

      const docs = await generateDocumentsWithTimeout(rentalFor90, vehicle, customer, { 
        periodOverride: { start: finalStart, end: finalEnd },
        includeImages: includeImages 
      });

      const key = `agreement_${finalStart.getTime()}${includeImages ? '' : '_no_img'}`;

      const uploadRes = await uploadRentalDocuments(rentalFor90.id, {
        agreements: { [key]: docs.agreement },
        invoice: docs.invoice,
        permit: docs.permit,
        claimDocuments: docs.claimDocuments
      });

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

  const handleConfirmExtension = async (newDate: Date) => {
    if (!extendingRental) return;
    try {
      toast.loading('Updating rental and substitute end dates...');
      
      const vehicle = vehicles.find(v => v.id === extendingRental.vehicleId);
      
      const newCost = calculateRentalCost(
        new Date(extendingRental.startDate),
        newDate,
        extendingRental.type,
        vehicle,
        extendingRental.reason,
        extendingRental.negotiatedRate ?? undefined,
        extendingRental.storageCost || 0,
        extendingRental.recoveryCost || 0,
        extendingRental.deliveryCharge || 0,
        extendingRental.collectionCharge || 0,
        extendingRental.insurancePerDay || 0,
        (extendingRental as any).insurancePerWeek || 0,
        extendingRental.includeVAT,
        extendingRental.deliveryChargeIncludeVAT,
        extendingRental.collectionChargeIncludeVAT,
        extendingRental.insurancePerDayIncludeVAT,
        (extendingRental as any).insurancePerWeekIncludeVAT,
        extendingRental.includeRecoveryCostVAT
      );

      let updatedSubs = extendingRental.hireSubstitutionDetails 
        ? [...extendingRental.hireSubstitutionDetails] 
        : null;

      if (updatedSubs && updatedSubs.length > 0) {
        const activeSubIndex = updatedSubs.findIndex(sub => {
          const subEnd = ensureValidDate(sub.expectedReturnAt)?.getTime();
          const rentalEnd = ensureValidDate(extendingRental.endDate)?.getTime();
          return subEnd === rentalEnd && !sub.returnCondition;
        });

        if (activeSubIndex !== -1) {
          updatedSubs[activeSubIndex] = {
            ...updatedSubs[activeSubIndex],
            expectedReturnAt: newDate
          };
        }
      }

      await updateDoc(doc(db, 'rentals', extendingRental.id), {
        endDate: newDate,
        cost: newCost,
        hireSubstitutionDetails: updatedSubs, 
        updatedAt: new Date(),
        updatedBy: (user as any)?.id
      });
      
      toast.dismiss();
      toast.success('Rental and substitute return date extended successfully');
      setExtendingRental(null);
    } catch (e) {
      console.error(e);
      toast.dismiss();
      toast.error('Failed to extend rental');
    }
  };

  const handleOpenReturnModal = (rental: Rental) => {
    if (!rental.hireSubstitutionDetails || rental.hireSubstitutionDetails.length === 0) {
      setCompletingRental(rental);
      setReturnTarget({ type: 'main' });
      return;
    }
    setCompletingRental(rental);
    setShowReturnSelector(true);
  };

  const handleSelectReturnTarget = (type: 'main' | 'sub', index?: number) => {
    if (!completingRental) return;

    if (type === 'sub' && typeof index === 'number') {
      const isEditing = !!completingRental.hireSubstitutionDetails?.[index]?.returnCondition;
      if (!isEditing) {
        for (let i = 0; i < index; i++) {
          if (!completingRental.hireSubstitutionDetails?.[i]?.returnCondition) {
            toast.error(`Please return Substitution Vehicle #${i + 1} before #${index + 1}.`);
            return;
          }
        }
      }
    } else if (type === 'main') {
      const activeSubs = completingRental.hireSubstitutionDetails?.some(s => !s.returnCondition);
      if (activeSubs && !completingRental.returnCondition) {
        if (!window.confirm("There are active substitution vehicles that haven't been returned yet. Are you sure you want to return the Main Vehicle now?")) {
          return;
        }
      }
    }

    setReturnTarget({ type, index });
    setShowReturnSelector(false);
  };

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

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search... (Agreement # / Customer / Vehicle / Loaner)"
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
                onChange={(e) => setShowAllRecords(e.target.checked)}
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
          isDisabled={false}
        />
      </div>

      <RentalTable
        rentals={filteredRentals}
        vehicles={vehicles}
        customers={customers}
        onView={setSelectedRental}
        onEdit={setEditingRental}
        onDelete={setDeletingRental}
        onComplete={handleOpenReturnModal}
        onDownloadAgreement={handleOpenAgreementModal} 
        onDownloadInvoice={handleDownloadInvoice}
        onRecordPayment={setPayingRental}
        onApplyDiscount={setDiscountingRental}
        onDeletePayment={handleDeletePayment}
        onGenerate90DayAgreement={(rental: Rental) => open90(rental)}
        onDownloadPermit={(rental) => handleDownloadPermitTrigger(rental)}
        onSetReturnExpectation={setReturnExpectationRental} 
        onShowNotes={setNotingRental}
        onExtend={setExtendingRental}
      />

      <Modal 
        isOpen={!!extendingRental} 
        onClose={() => setExtendingRental(null)} 
        title="Extend Ongoing Rental"
        size="sm"
      >
        {extendingRental && (
          <RentalExtensionModal 
            rental={extendingRental} 
            onClose={() => setExtendingRental(null)}
            onConfirm={handleConfirmExtension}
          />
        )}
      </Modal>

      <Modal isOpen={!!discountingRental} onClose={() => setDiscountingRental(null)} title="Apply Discount">
        {discountingRental && (
          <RentalDiscountModal rental={discountingRental} onClose={() => setDiscountingRental(null)} />
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Schedule Rental" size="xl">
        <RentalForm vehicles={vehicles} customers={customers} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={!!selectedRental} onClose={() => setSelectedRental(null)} title="Rental Details" size="xl">
        {selectedRental && (
          <RentalDetails
            rental={selectedRental}
            vehicle={vehicles.find(v => v.id === selectedRental.vehicleId) || null}
            customer={customers.find(c => c.id === selectedRental.customerId) || null}
            onDownloadInvoice={() => handleDownloadInvoice(selectedRental)}
            onDownloadPermit={() => handleDownloadPermitTrigger(selectedRental)}
          />
        )}
      </Modal>

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

      <Modal isOpen={!!deletingRental} onClose={() => setDeletingRental(null)} title="Delete Rental">
        {deletingRental && <RentalDeleteModal rental={deletingRental} onClose={() => setDeletingRental(null)} />}
      </Modal>

      <Modal isOpen={!!payingRental} onClose={() => setPayingRental(null)} title="Record Payment">
        {payingRental && (
          <RentalPaymentModal
            rental={payingRental}
            vehicle={vehicles.find(v => v.id === payingRental.vehicleId)}
            onClose={() => setPayingRental(null)}
          />
        )}
      </Modal>

      <Modal isOpen={showReturnSelector} onClose={() => { setShowReturnSelector(false); setCompletingRental(null); }} title="Select Vehicle to Return">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">This rental has substitution vehicles. Please select which vehicle is being returned:</p>
          
          <div className="space-y-2">
            {completingRental?.hireSubstitutionDetails?.map((sub, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectReturnTarget('sub', idx)}
                className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors ${
                  sub.returnCondition 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300' 
                    : 'bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-900">
                    Substitute #{idx + 1}: {sub.make} {sub.model}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{sub.registration}</div>
                </div>
                {sub.returnCondition ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Returned (Edit)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Active
                  </span>
                )}
              </button>
            ))}

            <button
              onClick={() => handleSelectReturnTarget('main')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors mt-4 ${
                completingRental?.returnCondition
                  ? 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                  : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <div>
                <div className="font-bold text-gray-900">Main Vehicle</div>
                <div className="text-xs text-gray-500">Original Rental Vehicle</div>
              </div>
              {completingRental?.returnCondition ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Returned (Edit)
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Select
                </span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!completingRental && !showReturnSelector} 
        onClose={() => { setCompletingRental(null); setReturnTarget(null); }} 
        title={`Return Condition: ${returnTarget?.type === 'sub' ? 'Substitution Vehicle' : 'Main Vehicle'}`} 
        size="xl"
      >
        {completingRental && returnTarget && (
          <ReturnConditionForm
            checkOutCondition={
              returnTarget.type === 'main'
                ? completingRental.checkOutCondition!
                : {
                    id: 'sub_checkout',
                    type: 'check-out',
                    date: new Date(completingRental.hireSubstitutionDetails![returnTarget.index!].givenAt),
                    mileage: completingRental.hireSubstitutionDetails![returnTarget.index!].mileage || 0,
                    fuelLevel: (completingRental.hireSubstitutionDetails![returnTarget.index!].fuelLevel as any) || '100',
                    isClean: completingRental.hireSubstitutionDetails![returnTarget.index!].isClean ?? true,
                    hasDamage: completingRental.hireSubstitutionDetails![returnTarget.index!].hasDamage ?? false,
                    damageDescription: completingRental.hireSubstitutionDetails![returnTarget.index!].damageDescription,
                    images: completingRental.hireSubstitutionDetails![returnTarget.index!].images || [],
                    createdAt: new Date(),
                    createdBy: ''
                  }
            }
            initialCondition={
              returnTarget.type === 'main'
                ? completingRental.returnCondition ?? undefined
                : completingRental.hireSubstitutionDetails![returnTarget.index!].returnCondition ?? undefined
            }
            onClose={() => { setCompletingRental(null); setReturnTarget(null); }}
            onSubmit={async (condition) => {
              try {
                const r = completingRental;
                
                if (returnTarget.type === 'sub' && typeof returnTarget.index === 'number') {
                  const updatedSubs = [...(r.hireSubstitutionDetails || [])];
                  
                  const existingReturn = updatedSubs[returnTarget.index].returnCondition;

                  updatedSubs[returnTarget.index] = {
                    ...updatedSubs[returnTarget.index],
                    returnCondition: {
                        ...condition,
                        id: existingReturn?.id ?? `sub_return_${Date.now()}`,
                        createdAt: existingReturn?.createdAt ?? new Date(),
                        createdBy: existingReturn?.createdBy ?? (user as any)?.id,
                    }
                  };
                  
                  await updateDoc(doc(db, 'rentals', r.id), {
                    hireSubstitutionDetails: updatedSubs,
                    updatedAt: new Date(),
                    updatedBy: (user as any)?.id,
                  });
                  
                  toast.success('Substitution return recorded.');
                } 
                else {
                  const prevReturn = r.returnCondition?.totalCharges ?? 0;
                  const subCharges = calculateTotalSubstitutionCharges(r);
                  
                  const baseCostWithoutExtras = ((r as any).cost ?? 0) - prevReturn - subCharges; 
                  
                  const newTotal = baseCostWithoutExtras + condition.totalCharges + subCharges;
                  const newRemaining = newTotal - ((r as any).paidAmount ?? 0);
                  
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
                    endDate: condition.date,
                    status: 'completed',
                    
                    cost: newTotal,
                    remainingAmount: Math.max(newRemaining, 0),
                    paymentStatus: newPaymentStatus,
                    updatedAt: new Date(),
                    updatedBy: (user as any)?.id,
                  });
                  toast.success('Main vehicle return saved. Rental marked as Completed.');
                }

                setCompletingRental(null);
                setReturnTarget(null);
              } catch (error) {
                console.error('Error saving return condition:', error);
                toast.error('Failed to save return condition');
              }
            }}
          />
        )}
      </Modal>

      <Modal isOpen={showAvailableVehicles} onClose={() => setShowAvailableVehicles(false)} title="Available Vehicles" size="xl">
        <AvailableVehiclesModal 
            vehicles={vehicles} 
            rentals={rentals} 
            onClose={() => setShowAvailableVehicles(false)} 
        />
      </Modal>

      <RentalAgreement90Modal
        rental={rentalFor90 as Rental}
        isOpen={show90}
        onClose={close90}
        onConfirm={handleConfirm90}
      />

      <Modal isOpen={!!notingRental} onClose={() => setNotingRental(null)} title="Rental Notes">
        {notingRental && <RentalNotesModal rental={notingRental} onClose={() => setNotingRental(null)} />}
      </Modal>

      <Modal 
        isOpen={!!agreementRental} 
        onClose={() => setAgreementRental(null)} 
        title="Generate Rental Agreement"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            How would you like to generate the rental agreement?
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => agreementRental && processAgreementGeneration(agreementRental, true)}
              className="flex flex-col items-center justify-center p-6 border-2 border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 hover:border-primary transition-all group"
            >
              <ImageIcon className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-gray-900">Include Images</span>
              <span className="text-xs text-gray-500 text-center mt-1">
                Full report with checkout & return photos
              </span>
            </button>

            <button
              onClick={() => agreementRental && processAgreementGeneration(agreementRental, false)}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 bg-white rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group"
            >
              <FileTextIcon className="w-10 h-10 text-gray-600 mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-gray-900">Text Only</span>
              <span className="text-xs text-gray-500 text-center mt-1">
                Faster generation, cleaner layout
              </span>
            </button>
          </div>
        </div>
      </Modal>
      
      {permitRental && (
        <ParkingPermitModal
          isOpen={!!permitRental}
          onClose={() => setPermitRental(null)}
          rental={permitRental}
          mainVehicle={vehicles.find(v => v.id === permitRental.vehicleId)}
          onSelect={(vehData, label) => handleGeneratePermit(permitRental, vehData, label)}
        />
      )}

      <Modal 
        isOpen={!!returnExpectationRental} 
        onClose={() => setReturnExpectationRental(null)} 
        title="Set Expected Return Time"
        size="sm"
      >
        {returnExpectationRental && (
          <ExpectedReturnModal
            rental={returnExpectationRental}
            onClose={() => setReturnExpectationRental(null)}
            
          />
        )}
      </Modal>
    </div>
  );
};

export default Rentals;