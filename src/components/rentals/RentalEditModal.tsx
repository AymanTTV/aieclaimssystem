// RentalEditModal.tsx
import React, { useState, useEffect } from 'react';
import {
  doc,
  updateDoc,
  Timestamp,
  query,
  collection,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import {
  Rental,
  Vehicle,
  Customer,
  VehicleCondition,
  Claim,
  RentalPayment
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import FileUpload from '../ui/FileUpload';
import SignaturePad from '../ui/SignaturePad';
import { X, Search, Car, User } from 'lucide-react';
import {
  addWeeks,
  format,
  differenceInDays,
  isAfter,
  isValid
} from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';


interface RentalEditModalProps {
  rental: Rental;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({
  rental,
  vehicles,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [hasModifiedWeeks, setHasModifiedWeeks] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<
    'percentage' | 'amount' | null
  >(null);
  const [existingImages, setExistingImages] = useState<string[]>(
    rental.checkOutCondition?.images || []
  );

  // Search state for claims
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [manualClaimRef, setManualClaimRef] = useState(true);

  // Helper to format dates/timestamps safely
  const safeFormatDate = (dateInput: Date | Timestamp | string | null | undefined, formatString: string): string => {
    if (!dateInput) return '';
    let dateObj: Date | null = null;
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof (dateInput as any)?.toDate === 'function') {
      dateObj = (dateInput as Timestamp).toDate();
    } else {
      const parsed = new Date(dateInput as any);
      if (isValid(parsed)) dateObj = parsed;
    }
    if (dateObj && isValid(dateObj)) {
      try {
        return format(dateObj, formatString);
      } catch {
        return '';
      }
    }
    return '';
  };

  // --- Initialize formData with discountAmount included ---
  const [formData, setFormData] = useState({
    vehicleId: rental.vehicleId,
    customerId: rental.customerId,
    startDate: safeFormatDate(rental.startDate, 'yyyy-MM-dd'),
    startTime: safeFormatDate(rental.startDate, 'HH:mm'),
    endDate: safeFormatDate(rental.endDate, 'yyyy-MM-dd'),
    endTime: safeFormatDate(rental.endDate, 'HH:mm'),
    type: rental.type,
    reason: rental.reason,
    status: rental.status,
    signature: rental.signature || '',

    numberOfWeeks: rental.numberOfWeeks || 1,

    claimRef: rental.claimRef || '',
    deliveryCharge: rental.deliveryCharge || 0,
    collectionCharge: rental.collectionCharge || 0,
    insurancePerDay: rental.insurancePerDay || 0,
    recoveryCost: rental.recoveryCost || 0,
    includeRecoveryCostVAT: rental.includeRecoveryCostVAT || false,

    storageStartDate: safeFormatDate(rental.storageStartDate, 'yyyy-MM-dd'),
    storageEndDate: safeFormatDate(rental.storageEndDate, 'yyyy-MM-dd'),
    storageCostPerDay: rental.storageCostPerDay || 0,
    storageDays: rental.storageDays || 0,
    includeStorageVAT: rental.includeStorageVAT || false,

    includeVAT: rental.includeVAT || false,
    deliveryChargeIncludeVAT: rental.deliveryChargeIncludeVAT || false,
    collectionChargeIncludeVAT: rental.collectionChargeIncludeVAT || false,
    insurancePerDayIncludeVAT: rental.insurancePerDayIncludeVAT || false,

    negotiatedRate: rental.negotiatedRate?.toString() || '',
    negotiationNotes: rental.negotiationNotes || '',

    // Discount fields
    discountPercentage: rental.discountPercentage || 0,
    discountAmount: rental.discountAmount || 0,
    discountNotes: rental.discountNotes || '',

    amountToAdd: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: ''
  });

  // --- Find selected vehicle/customer ---
  const selectedVehicle = vehicles.find(
    (v) => v.id === formData.vehicleId
  );
  const selectedCustomer = customers.find(
    (c) => c.id === formData.customerId
  );

  // --- Initialize vehicle condition data ---
  const [conditionData, setConditionData] = useState<
    Partial<VehicleCondition>
  >(
    rental.checkOutCondition || {
      mileage: selectedVehicle?.mileage || 0,
      fuelLevel: '100',
      isClean: true,
      hasDamage: false,
      damageDescription: '',
      images: []
    }
  );

  // --- Populate search inputs on mount/when rental changes ---
  useEffect(() => {
    if (selectedVehicle) {
      setVehicleSearchQuery(
        `${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.registrationNumber}`
      );
      if (
        (conditionData.mileage === 0 ||
          conditionData.mileage === undefined) &&
        selectedVehicle.mileage !== undefined
      ) {
        setConditionData((prev) => ({
          ...prev,
          mileage: selectedVehicle.mileage
        }));
      }
    }
    if (selectedCustomer) {
      setCustomerSearchQuery(
        `${selectedCustomer.name} - ${selectedCustomer.mobile}`
      );
    }
    if (rental.claimRef) {
      setClaimSearchQuery(rental.claimRef);
      setManualClaimRef(true);
    } else {
      setManualClaimRef(false);
    }
  }, [selectedVehicle, selectedCustomer, rental.claimRef, conditionData.mileage]);

  // --- Fetch claims once ---
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const claimsQuery = query(collection(db, 'claims'));
        const snapshot = await getDocs(claimsQuery);
        const claimsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Claim[];
        setClaims(claimsData);
      } catch {
        toast.error('Failed to fetch claims');
      }
    };
    fetchClaims();
  }, []);

  // --- Filtered claims for search ---
  const filteredClaims = (claims || []).filter((claim) => {
    if (!claimSearchQuery) return false;
    const s = claimSearchQuery.toLowerCase();
    const name = claim.clientInfo?.name.toLowerCase() || '';
    const refLower = claim.clientRef?.toLowerCase() || '';
    const idLower = claim.id.toLowerCase();
    return (
      name.includes(s) || refLower.includes(s) || idLower.includes(s)
    );
  });

  // --- Filtered customers for search ---
  const filteredCustomers = customers.filter((customer) => {
    const s = customerSearchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(s) ||
      customer.mobile.includes(s) ||
      customer.email.toLowerCase().includes(s)
    );
  });

  // --- Available vehicles for date range search ---
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate && formData.startTime
      ? new Date(`${formData.startDate}T${formData.startTime}`)
      : undefined,
    formData.endDate && formData.endTime
      ? new Date(`${formData.endDate}T${formData.endTime}`)
      : undefined
  );

  const filteredVehicles = availableVehicles.filter((vehicle) => {
    const s = vehicleSearchQuery.toLowerCase();
    if (vehicle.id === formData.vehicleId) return true;
    return (
      vehicle.make.toLowerCase().includes(s) ||
      vehicle.model.toLowerCase().includes(s) ||
      vehicle.registrationNumber.toLowerCase().includes(s)
    );
  });

  // --- Recalculate storageDays when dates change ---
  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const start = new Date(formData.storageStartDate);
      const end = new Date(formData.storageEndDate);
      if (
        isValid(start) &&
        isValid(end) &&
        !isAfter(start, end)
      ) {
        const days = differenceInDays(end, start) + 1;
        setFormData((prev) => ({ ...prev, storageDays: days }));
      } else {
        setFormData((prev) => ({ ...prev, storageDays: 0 }));
      }
    } else {
      setFormData((prev) => ({ ...prev, storageDays: 0 }));
    }
  }, [formData.storageStartDate, formData.storageEndDate]);

  // --- Recalculate endDate/endTime for weekly rentals ---
  useEffect(() => {
    if (!initialized) {
      // First render: just mark “initialized” and do nothing else.
      setInitialized(true);
      return;
    }

    // If the user never modified the “# Weeks” field, we leave endDate/endTime alone:
    if (!hasModifiedWeeks) {
      return;
    }

    if (
      formData.type === 'weekly' &&
      formData.startDate &&
      formData.startTime &&
      formData.numberOfWeeks > 0
    ) {
      const startDT = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(startDT)) {
        const computedEnd = addWeeks(startDT, formData.numberOfWeeks);
        setFormData((prev) => ({
          ...prev,
          endDate: computedEnd.toISOString().split('T')[0],
          endTime: prev.startTime
        }));
      }
    }
    // If type !== 'weekly', we deliberately do NOT reset/clear endDate/endTime,
    // so whatever was loaded from Firestore (or manually typed) stays in place.
  }, [
    formData.type,
    formData.numberOfWeeks,
    formData.startDate,
    formData.startTime,
    hasModifiedWeeks,
    initialized
  ]);

  // --- Calculate current total cost (before discount) ---
  const calculateCurrentTotalCost = () => {
    const vehicle = vehicles.find(
      (v) => v.id === formData.vehicleId
    );
    if (
      !vehicle ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      return 0;
    }
    const startDT = new Date(
      `${formData.startDate}T${formData.startTime}`
    );
    const endDT = new Date(
      `${formData.endDate}T${formData.endTime}`
    );
    if (!isValid(startDT) || !isValid(endDT) || isAfter(startDT, endDT)) {
      return 0;
    }
    const negotiatedRate = formData.negotiatedRate
      ? parseFloat(formData.negotiatedRate)
      : undefined;
    let storageCostCalc = 0;
    if (
      formData.type === 'claim' &&
      formData.storageStartDate &&
      formData.storageEndDate
    ) {
      storageCostCalc =
        (formData.storageDays || 0) *
        (formData.storageCostPerDay || 0) *
        (formData.includeStorageVAT ? 1.2 : 1);
    }
    return calculateRentalCost(
      startDT,
      endDT,
      formData.type,
      vehicle,
      formData.reason,
      negotiatedRate,
      formData.type === 'claim' ? storageCostCalc : undefined,
      formData.type === 'claim' ? formData.recoveryCost : undefined,
      formData.deliveryCharge,
      formData.collectionCharge,
      formData.insurancePerDay,
      formData.includeVAT,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.includeRecoveryCostVAT
    );
  };

  const currentTotalCost = calculateCurrentTotalCost();
  // Use the state’s discountAmount directly
  const currentDiscountAmount = formData.discountAmount;
  const currentFinalCostAfterDiscount =
    currentTotalCost - currentDiscountAmount;
  const currentRemainingAmount =
    currentFinalCostAfterDiscount - (rental.paidAmount || 0);

  // --- Sync discountPercentage ↔ discountAmount ---
  useEffect(() => {
    if (currentTotalCost <= 0) {
      if (
        formData.discountAmount !== 0 ||
        formData.discountPercentage !== 0
      ) {
        setFormData((prev) => ({
          ...prev,
          discountAmount: 0,
          discountPercentage: 0
        }));
      }
      return;
    }

    if (lastEditedField === 'amount') {
      // Recalculate percentage from amount
      const newPct =
        formData.discountAmount > 0
          ? (formData.discountAmount / currentTotalCost) * 100
          : 0;
      setFormData((prev) => ({
        ...prev,
        discountPercentage: parseFloat(newPct.toFixed(2))
      }));
    } else if (lastEditedField === 'percentage') {
      // Recalculate amount from percentage
      const newAmt =
        (currentTotalCost * (formData.discountPercentage || 0)) / 100;
      setFormData((prev) => ({
        ...prev,
        discountAmount: parseFloat(newAmt.toFixed(2))
      }));
    } else {
      // Initial load: prefer rental.discountAmount if it exists
      if (rental.discountAmount != null) {
        const initPct =
          rental.discountAmount > 0
            ? (rental.discountAmount / currentTotalCost) * 100
            : 0;
        setFormData((prev) => ({
          ...prev,
          discountAmount: parseFloat(rental.discountAmount.toFixed(2)),
          discountPercentage: parseFloat(initPct.toFixed(2))
        }));
      } else if (rental.discountPercentage != null) {
        const initAmt =
          (currentTotalCost * (rental.discountPercentage || 0)) / 100;
        setFormData((prev) => ({
          ...prev,
          discountPercentage: parseFloat(
            rental.discountPercentage.toFixed(2)
          ),
          discountAmount: parseFloat(initAmt.toFixed(2))
        }));
      }
    }
  }, [
    currentTotalCost,
    formData.discountAmount,
    formData.discountPercentage,
    lastEditedField,
    rental.discountAmount,
    rental.discountPercentage
  ]);

  // --- Handle removing existing images ---
  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages((prev) =>
      prev.filter((img) => img !== imageUrl)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const submitVehicle  = vehicles.find((v) => v.id === formData.vehicleId);
  const submitCustomer = customers.find((c) => c.id === formData.customerId);
  if (!user || !submitVehicle || !submitCustomer) {
    toast.error("User, vehicle, or customer data missing.");
    return;
  }
  setLoading(true);

  try {
    if (!formData.startDate || !formData.startTime) {
      throw new Error("Start Date and Time are required.");
    }
    if (!formData.endDate || !formData.endTime) {
      throw new Error("End Date and Time are required.");
    }
    const submitStartDT = new Date(`${formData.startDate}T${formData.startTime}`);
    const submitEndDT   = new Date(`${formData.endDate}T${formData.endTime}`);
    if (!isValid(submitStartDT)) {
      throw new Error("Invalid Start Date or Time.");
    }
    if (!isValid(submitEndDT)) {
      throw new Error("Invalid End Date or Time.");
    }
    if (isAfter(submitStartDT, submitEndDT)) {
      throw new Error("End Date cannot be before Start Date.");
    }

    // --- Storage cost logic (for “claim” type) ---
    let submitStorageCost = 0, submitStorageDays = 0;
    let storageStartObj: Date | null = null, storageEndObj: Date | null = null;
    if (
      formData.type === "claim" &&
      formData.storageStartDate &&
      formData.storageEndDate
    ) {
      storageStartObj = new Date(formData.storageStartDate);
      storageEndObj   = new Date(formData.storageEndDate);
      if (
        isValid(storageStartObj) &&
        isValid(storageEndObj) &&
        !isAfter(storageStartObj, storageEndObj)
      ) {
        submitStorageDays = differenceInDays(storageEndObj, storageStartObj) + 1;
        const dailyCost = formData.storageCostPerDay || 0;
        submitStorageCost =
          submitStorageDays *
          dailyCost *
          (formData.includeStorageVAT ? 1.2 : 1);
      } else {
        storageStartObj = null;
        storageEndObj   = null;
        submitStorageCost = 0;
        submitStorageDays = 0;
      }
    }

    // --- Standard cost (no overall VAT, but includes “claim” extras VAT flags) ---
    const submitStandardCost = calculateRentalCost(
      submitStartDT,
      submitEndDT,
      formData.type,
      submitVehicle,
      formData.reason,
      undefined,
      formData.type === "claim" ? submitStorageCost : undefined,
      formData.type === "claim" ? formData.recoveryCost || 0 : undefined,
      formData.type === "claim" ? formData.deliveryCharge || 0 : undefined,
      formData.type === "claim" ? formData.collectionCharge || 0 : undefined,
      formData.type === "claim" ? formData.insurancePerDay || 0 : undefined,
      false,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.includeRecoveryCostVAT
    );

    // --- Total cost before discount (all VAT flags applied) ---
    const negotiatedRateValue = formData.negotiatedRate
      ? parseFloat(formData.negotiatedRate)
      : undefined;
    const totalCostBeforeDiscount = calculateRentalCost(
      submitStartDT,
      submitEndDT,
      formData.type,
      submitVehicle,
      formData.reason,
      negotiatedRateValue,
      formData.type === "claim" ? submitStorageCost : undefined,
      formData.type === "claim" ? formData.recoveryCost || 0 : undefined,
      formData.deliveryCharge || 0,
      formData.collectionCharge || 0,
      formData.insurancePerDay || 0,
      formData.includeVAT,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.includeRecoveryCostVAT
    );

    const submitDiscountAmount = formData.discountAmount;
    const submitFinalCostAfterDiscount = totalCostBeforeDiscount - submitDiscountAmount;

    // --- Handle “add new payment” if any ---
    const newPayment = parseFloat(formData.amountToAdd.toString()) || 0;
    const updatedTotalPaid = (rental.paidAmount || 0) + newPayment;
    const updatedPayments: RentalPayment[] = [...(rental.payments || [])];
    if (newPayment > 0) {
      updatedPayments.push({
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        date: new Date(),
        amount: newPayment,
        method: formData.paymentMethod,
        reference: formData.paymentReference || undefined,
        notes: formData.paymentNotes || undefined,
        createdAt: new Date(),
        createdBy: user.id,
      });
    }
    const submitRemainingAmount = submitFinalCostAfterDiscount - updatedTotalPaid;
    const submitPaymentStatus =
      submitRemainingAmount <= 0.001
        ? "paid"
        : updatedTotalPaid > 0
        ? "partially_paid"
        : "pending";

    // --- Upload any newly‐added condition images ---
    const newImageUrls = await Promise.all(
      newImages.map(async (file) => {
        const ts = Date.now();
        const storageRef = ref(
          storage,
          `vehicle-conditions/${rental.id}/${ts}_${file.name}`
        );
        const snap = await uploadBytes(storageRef, file);
        return getDownloadURL(snap.ref);
      })
    );
    const allImages = [...existingImages, ...newImageUrls];

    // --- Build updated “checkOutCondition” object ---
    const updatedCondition: VehicleCondition = {
      type: "check-out",
      date: rental.checkOutCondition?.date || new Date(),
      mileage: conditionData.mileage || 0,
      fuelLevel: conditionData.fuelLevel || "100",
      isClean: conditionData.isClean === undefined ? true : conditionData.isClean,
      hasDamage: conditionData.hasDamage || false,
      damageDescription: conditionData.hasDamage
        ? conditionData.damageDescription || ""
        : "",
      images: allImages,
      createdAt: rental.checkOutCondition?.createdAt || new Date(),
      createdBy: rental.checkOutCondition?.createdBy || user.id,
      id: rental.checkOutCondition?.id || `cond_${Date.now()}`,
      notes: conditionData.notes || rental.checkOutCondition?.notes || "",
    };

    // --- Compile the updated Rental fields for Firestore ---
    const rentalUpdateData: Partial<Rental> = {
      vehicleId: formData.vehicleId,
      customerId: formData.customerId,
      startDate: submitStartDT,
      endDate: submitEndDT,
      type: formData.type,
      reason: formData.reason,
      status: formData.status,
      cost: submitFinalCostAfterDiscount,
      standardCost: submitStandardCost,
      paidAmount: updatedTotalPaid,
      remainingAmount: submitRemainingAmount,
      paymentStatus: submitPaymentStatus,
      payments: updatedPayments,
      signature: formData.signature || null,
      claimRef: formData.claimRef || null,

      storageStartDate: storageStartObj,
      storageEndDate: storageEndObj,
      storageCostPerDay:
        formData.type === "claim" ? formData.storageCostPerDay || 0 : null,
      storageDays: formData.type === "claim" ? submitStorageDays : null,
      includeStorageVAT:
        formData.type === "claim" ? formData.includeStorageVAT : null,
      storageCost: formData.type === "claim" ? submitStorageCost : null,

      recoveryCost:
        formData.type === "claim" && formData.recoveryCost > 0
          ? formData.recoveryCost
          : null,
      includeRecoveryCostVAT:
        formData.type === "claim" ? formData.includeRecoveryCostVAT : null,

      deliveryCharge:
        formData.deliveryCharge > 0
          ? formData.deliveryCharge *
            (formData.deliveryChargeIncludeVAT ? 1.2 : 1)
          : null,
      collectionCharge:
        formData.collectionCharge > 0
          ? formData.collectionCharge *
            (formData.collectionChargeIncludeVAT ? 1.2 : 1)
          : null,
      insurancePerDay:
        formData.insurancePerDay > 0 ? formData.insurancePerDay : null,

      includeVAT: formData.includeVAT,
      deliveryChargeIncludeVAT: formData.deliveryChargeIncludeVAT,
      collectionChargeIncludeVAT: formData.collectionChargeIncludeVAT,
      insurancePerDayIncludeVAT: formData.insurancePerDayIncludeVAT,

      negotiatedRate: negotiatedRateValue ?? null,
      negotiationNotes: formData.negotiationNotes || null,

      discountPercentage: formData.discountPercentage || null,
      discountAmount:
        submitDiscountAmount > 0 ? submitDiscountAmount : null,
      discountNotes: formData.discountNotes || null,

      numberOfWeeks:
        formData.type === "weekly" ? formData.numberOfWeeks || 1 : null,

      checkOutCondition: updatedCondition,

      updatedAt: new Date(),
      updatedBy: user.id,
    };

    // --- Update the Firestore document ---
    const rentalRef = doc(db, "rentals", rental.id);
    await updateDoc(rentalRef, rentalUpdateData);

    //
    // --- BACKGROUND TASKS: PDF Regen/Upload + Finance Transaction ---
    //

    // 1) Immediately close modal, clear loading, and show toast:
    setLoading(false);
    onClose();
    toast.success("Rental updated! Regenerating documents in background…");

    // 2) Kick off PDF regen/upload asynchronously:
    setTimeout(async () => {
      try {
        const completeUpdatedRental = {
          ...rental,
          ...rentalUpdateData,
        } as Rental;
        const documents = await generateRentalDocuments(
          completeUpdatedRental,
          submitVehicle,
          submitCustomer
        );
        await uploadRentalDocuments(rental.id, documents);
        toast.success("PDF documents regenerated!");
      } catch (err) {
        console.error("Background PDF regen failed:", err);
        toast.error("Rental updated, but failed to regenerate documents.");
      }
    }, 0);

    // 3) If a new payment was added, record it in the background:
    if (newPayment > 0) {
      setTimeout(async () => {
        try {
          await createFinanceTransaction({
          type: 'income',
          category: 'Rental', // Capitalize R
          amount: formData.amountToAdd,
          description: `A ${rental.type} Rental payment from customer (${selectedCustomer?.name || 'N/A'}) - Rental ID: ${rental.id}`, // More descriptive
          referenceId: rental.id,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          status: 'completed',
          date: new Date(),
          vehicleId: rental.vehicleId,
          vehicleName: `${selectedVehicle?.make} ${selectedVehicle?.model}`,
          customerId: rental.customerId, // Pass customerId
          customerName: selectedCustomer?.name, // Pass customerName
        });
        } catch {
          toast.error(
            "Rental updated, but failed to record finance transaction for new payment."
          );
        }
      }, 0);
    }

    // 4) Return so nothing else runs synchronously:
    return;

  } catch (err: any) {
    toast.error(`Failed to update rental: ${err.message || String(err)}`);
  } finally {
    setLoading(false);
  }
};


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Search/Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Vehicle
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={vehicleSearchQuery}
            onChange={(e) => {
              setVehicleSearchQuery(e.target.value);
              setShowVehicleResults(true);
            }}
            onFocus={() => setShowVehicleResults(true)}
            onBlur={() => setTimeout(() => setShowVehicleResults(false), 100)}
            placeholder="Search vehicles..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            aria-autocomplete="list"
            aria-controls="vehicle-results"
          />
          {vehicleSearchQuery && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => {
                setVehicleSearchQuery('');
                setFormData((prev) => ({ ...prev, vehicleId: '' }));
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showVehicleResults && (
          <div
            id="vehicle-results"
            className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm"
          >
            {loadingVehicles ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Loading vehicles...
              </div>
            ) : filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFormData((prev) => ({
                      ...prev,
                      vehicleId: vehicle.id
                    }));
                    setVehicleSearchQuery(
                      `${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`
                    );
                    setShowVehicleResults(false);
                  }}
                  role="option"
                  aria-selected={formData.vehicleId === vehicle.id}
                >
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vehicle.registrationNumber}
                        {vehicle.weeklyRentalPrice &&
                          ` - ${formatCurrency(
                            vehicle.weeklyRentalPrice
                          )}/week`}
                      </div>
                    </div>
                    {formData.vehicleId === vehicle.id && (
                      <span className="ml-auto text-primary-600">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                No available vehicles found
              </div>
            )}
          </div>
        )}

        {!showVehicleResults && selectedVehicle && (
          <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
            <Car className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0" />
            <div>
              <div className="font-semibold">
                {selectedVehicle.make} {selectedVehicle.model}
              </div>
              <div className="text-sm text-gray-600">
                {selectedVehicle.registrationNumber}
              </div>
            </div>
          </div>
        )}

        {!showVehicleResults && !selectedVehicle && formData.vehicleId && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
            Warning: Vehicle with ID "{formData.vehicleId}" not found in the
            provided vehicle list.
          </div>
        )}
      </div>

      {/* Customer Search/Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Customer
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
              setShowCustomerResults(true);
            }}
            onFocus={() => setShowCustomerResults(true)}
            onBlur={() => setTimeout(() => setShowCustomerResults(false), 100)}
            placeholder="Search customers..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            aria-autocomplete="list"
            aria-controls="customer-results"
          />
          {customerSearchQuery && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => {
                setCustomerSearchQuery('');
                setFormData((prev) => ({ ...prev, customerId: '' }));
              }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showCustomerResults && (
          <div
            id="customer-results"
            className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm"
          >
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setFormData((prev) => ({
                      ...prev,
                      customerId: customer.id
                    }));
                    setCustomerSearchQuery(
                      `${customer.name} - ${customer.mobile}`
                    );
                    setShowCustomerResults(false);
                  }}
                  role="option"
                  aria-selected={formData.customerId === customer.id}
                >
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {customer.mobile}
                      </div>
                    </div>
                    {formData.customerId === customer.id && (
                      <span className="ml-auto text-primary-600">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">
                No customers found
              </div>
            )}
          </div>
        )}

        {!showCustomerResults && selectedCustomer && (
          <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
            <div>
              <div className="font-semibold">
                {selectedCustomer.name}
              </div>
              <div className="text-sm text-gray-600">
                {selectedCustomer.mobile}
              </div>
            </div>
          </div>
        )}

        {!showCustomerResults && !selectedCustomer && formData.customerId && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
            Warning: Customer with ID "{formData.customerId}" not found in
            the provided customer list.
          </div>
        )}
      </div>

      {/* Rental Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rental Type
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as typeof formData.type
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        {formData.type === 'claim' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Claim Reference
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={manualClaimRef}
                  onChange={(e) =>
                    setManualClaimRef(e.target.checked)
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Enter Manually
                </span>
              </label>
            </div>

            {manualClaimRef ? (
              <FormField
                label="Claim Reference"
                value={formData.claimRef}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    claimRef: e.target.value
                  }))
                }
                placeholder="Enter claim reference"
              />
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={claimSearchQuery}
                    onChange={(e) => {
                      setClaimSearchQuery(e.target.value);
                      setShowClaimResults(true);
                    }}
                    onFocus={() => setShowClaimResults(true)}
                    placeholder="Search claims..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                {showClaimResults && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto sm:text-sm">
                    {filteredClaims.length > 0 ? (
                      filteredClaims.map((claim) => (
                        <div
                          key={claim.id}
                          className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                          onClick={() => {
                            const refStr =
                              claim.clientRef ||
                              claim.id
                                .slice(-8)
                                .toUpperCase();
                            setFormData((prev) => ({
                              ...prev,
                              claimRef: refStr
                            }));
                            setClaimSearchQuery(refStr);
                            setShowClaimResults(false);
                          }}
                        >
                          <div className="font-medium">
                            {claim.clientRef ||
                              `Claim #${claim.id
                                .slice(-8)
                                .toUpperCase()}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {claim.clientInfo?.name} -{' '}
                            {claim.clientVehicle?.registration}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No claims found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as typeof formData.status
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reason
          </label>
          <select
            value={formData.reason}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reason: e.target.value as typeof formData.reason
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="hired">Hired</option>
            <option value="claim">Claim</option>
            <option value="o/d">O/D</option>
            <option value="staff">Staff</option>
            <option value="workshop">Workshop</option>
            <option value="c-substitute">C Substitute</option>
            <option value="h-substitute">H Substitute</option>
          </select>
        </div>

        {/* Include overall VAT */}
        <div className="border-t pt-6">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeVAT"
              checked={formData.includeVAT}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  includeVAT: e.target.checked
                }))
              }
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="includeVAT"
              className="text-sm font-medium text-gray-700"
            >
              Include Hire VAT (20%)
            </label>
          </div>
        </div>

        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              startDate: e.target.value || ''
            }))
          }
          required
        />
        <FormField
          type="time"
          label="Start Time"
          value={formData.startTime}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              startTime: e.target.value || ''
            }))
          }
          required
        />

        {formData.type === 'daily' && (
          <>
            <FormField
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: e.target.value || ''
                }))
              }
              required
              min={formData.startDate}
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  endTime: e.target.value || ''
                }))
              }
              required
            />
          </>
        )}

        {formData.type === 'claim' && (
          <>
            <FormField
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  endDate: e.target.value || ''
                }))
              }
              required
              min={formData.startDate}
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  endTime: e.target.value || ''
                }))
              }
              required
            />

            {/* Delivery Charge with VAT */}
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <FormField
                  type="number"
                  label="Delivery Charge (£)"
                  value={formData.deliveryCharge}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryCharge:
                        parseFloat(e.target.value) || 0
                    }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center pb-2">
                <input
                  type="checkbox"
                  id="deliveryChargeIncludeVAT"
                  checked={formData.deliveryChargeIncludeVAT}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryChargeIncludeVAT:
                        e.target.checked
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="deliveryChargeIncludeVAT"
                  className="text-sm text-gray-700 ml-1"
                >
                  VAT
                </label>
              </div>
            </div>

            {/* Collection Charge with VAT */}
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <FormField
                  type="number"
                  label="Collection Charge (£)"
                  value={formData.collectionCharge}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      collectionCharge:
                        parseFloat(e.target.value) || 0
                    }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center pb-2">
                <input
                  type="checkbox"
                  id="collectionChargeIncludeVAT"
                  checked={formData.collectionChargeIncludeVAT}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      collectionChargeIncludeVAT:
                        e.target.checked
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="collectionChargeIncludeVAT"
                  className="text-sm text-gray-700 ml-1"
                >
                  VAT
                </label>
              </div>
            </div>

            {/* Insurance Per Day with VAT */}
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <FormField
                  type="number"
                  label="Insurance Per Day (£)"
                  value={formData.insurancePerDay}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      insurancePerDay:
                        parseFloat(e.target.value) || 0
                    }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center pb-2">
                <input
                  type="checkbox"
                  id="insurancePerDayIncludeVAT"
                  checked={formData.insurancePerDayIncludeVAT}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      insurancePerDayIncludeVAT:
                        e.target.checked
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="insurancePerDayIncludeVAT"
                  className="text-sm text-gray-700 ml-1"
                >
                  VAT
                </label>
              </div>
            </div>

            {/* Storage Details */}
            <div className="col-span-2 border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Storage Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="date"
                  label="Storage Start Date"
                  value={formData.storageStartDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      storageStartDate:
                        e.target.value || ''
                    }))
                  }
                />
                <FormField
                  type="date"
                  label="Storage End Date"
                  value={formData.storageEndDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      storageEndDate: e.target.value || ''
                    }))
                  }
                  min={formData.storageStartDate}
                />

                <div className="flex items-end gap-2">
                  <div className="flex-grow">
                    <FormField
                      type="number"
                      label="Storage Cost per Day (£)"
                      value={formData.storageCostPerDay}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          storageCostPerDay:
                            parseFloat(e.target.value) || 0
                        }))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center pb-2">
                    <input
                      type="checkbox"
                      id="includeStorageVAT"
                      checked={formData.includeStorageVAT}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includeStorageVAT: e.target.checked
                        }))
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="includeStorageVAT"
                      className="text-sm text-gray-700 ml-1"
                    >
                      VAT
                    </label>
                  </div>
                </div>

                <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Days of Storage:</span>
                    <span>{formData.storageDays || 0} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Base Storage Cost:</span>
                    <span>
                      £
                      {(
                        (formData.storageDays || 0) *
                        (formData.storageCostPerDay || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  {formData.includeStorageVAT && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>VAT (20%):</span>
                      <span>
                        £
                        {(
                          (formData.storageDays || 0) *
                          (formData.storageCostPerDay || 0) *
                          0.2
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Total Storage Cost:</span>
                    <span>
                      £
                      {(
                        (formData.storageDays || 0) *
                        (formData.storageCostPerDay || 0) *
                        (formData.includeStorageVAT ? 1.2 : 1)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery Cost with VAT */}
            <div className="flex items-end gap-2 col-span-2">
              <div className="flex-grow">
                <FormField
                  type="number"
                  label="Recovery Cost (£)"
                  value={formData.recoveryCost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recoveryCost:
                        parseFloat(e.target.value) || 0
                    }))
                  }
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-center pb-2">
                <input
                  type="checkbox"
                  id="includeRecoveryCostVAT"
                  checked={formData.includeRecoveryCostVAT}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      includeRecoveryCostVAT: e.target.checked
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="includeRecoveryCostVAT"
                  className="text-sm text-gray-700 ml-1"
                >
                  VAT
                </label>
              </div>
            </div>
          </>
        )}

        {formData.type === 'weekly' && (
          <>
            <FormField
              type="number"
              label="Number of Weeks"
              value={formData.numberOfWeeks}
              onChange={(e) => {
                const newWeeks = parseInt(e.target.value) || 1;
                setHasModifiedWeeks(true);
                setFormData((prev) => ({
                  ...prev,
                  numberOfWeeks: newWeeks
                }));
              }}
              min="1"
              required
            />
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <FormField
                type="date"
                label="End Date (auto‐calculated)"
                value={formData.endDate}
                onChange={(e) => {
                  // If the user manually edits “End Date,” we do NOT want to override it.
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value || ''
                  }));
                }}
                min={formData.startDate}
              />
              <FormField
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endTime: e.target.value || ''
                  }))
                }
              />
            </div>
          </>
        )}
      </div>

      {/* Negotiation Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Rate Negotiation
        </h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Negotiated Rate (Optional)"
            value={formData.negotiatedRate}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                negotiatedRate: e.target.value
              }))
            }
            min="0"
            step="0.01"
            placeholder={`Enter custom ${
              formData.type === 'weekly' ? 'weekly' : 'daily'
            } rate`}
          />
          {formData.negotiatedRate && (
            <TextArea
              label="Negotiation Notes"
              value={formData.negotiationNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  negotiationNotes: e.target.value
                }))
              }
              rows={2}
              placeholder="Add notes about rate negotiation..."
            />
          )}
        </div>
      </div>

      {/* Discount Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Discount
        </h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Discount Percentage"
            value={formData.discountPercentage}
            onChange={(e) => {
              const pct = parseFloat(e.target.value) || 0;
              setFormData((prev) => ({
                ...prev,
                discountPercentage: pct
              }));
              setLastEditedField('percentage');
            }}
            min="0"
            max="100"
            step="0.01"
          />
          <FormField
            type="number"
            label="Discount Amount (£)"
            value={formData.discountAmount}
            onChange={(e) => {
              const amt = parseFloat(e.target.value) || 0;
              setFormData((prev) => ({
                ...prev,
                discountAmount: amt
              }));
              setLastEditedField('amount');
            }}
            min="0"
            step="0.01"
          />
          {(formData.discountPercentage > 0 ||
            formData.discountAmount > 0) && (
            <TextArea
              label="Discount Notes"
              value={formData.discountNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  discountNotes: e.target.value
                }))
              }
              rows={2}
              placeholder="Add notes about the discount..."
              required={
                formData.discountPercentage > 0 ||
                formData.discountAmount > 0
              }
            />
          )}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Cost Summary
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Rental Cost:</span>
            <span className="font-medium">
              {formatCurrency(
                calculateRentalCost(
                  new Date(`${formData.startDate}T${formData.startTime}`),
                  new Date(`${formData.endDate}T${formData.endTime}`),
                  formData.type,
                  selectedVehicle!,
                  formData.reason,
                  formData.negotiatedRate
                    ? parseFloat(formData.negotiatedRate)
                    : undefined,
                  0,
                  0,
                  0,
                  0,
                  0,
                  false,
                  false,
                  false,
                  false,
                  false
                )
              )}
            </span>
          </div>

          {formData.type === 'claim' &&
            formData.storageStartDate &&
            formData.storageEndDate &&
            formData.storageCostPerDay > 0 && (
              <div className="flex justify-between text-sm">
                <span>
                  Storage Cost ({formData.storageDays || 0} days)
                  {formData.includeStorageVAT ? ' (Inc. VAT)' : ''}:
                </span>
                <span className="font-medium">
                  {formatCurrency(
                    (formData.storageDays || 0) *
                      (formData.storageCostPerDay || 0) *
                      (formData.includeStorageVAT ? 1.2 : 1)
                  )}
                </span>
              </div>
            )}

          {formData.type === 'claim' && formData.recoveryCost > 0 && (
            <div className="flex justify-between text-sm">
              <span>
                Recovery Cost
                {formData.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:
              </span>
              <span className="font-medium">
                {formatCurrency(
                  formData.recoveryCost *
                    (formData.includeRecoveryCostVAT ? 1.2 : 1)
                )}
              </span>
            </div>
          )}

          {formData.deliveryCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>
                Delivery Charge
                {formData.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:
              </span>
              <span className="font-medium">
                {formatCurrency(
                  formData.deliveryCharge *
                    (formData.deliveryChargeIncludeVAT ? 1.2 : 1)
                )}
              </span>
            </div>
          )}

          {formData.collectionCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>
                Collection Charge
                {formData.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:
              </span>
              <span className="font-medium">
                {formatCurrency(
                  formData.collectionCharge *
                    (formData.collectionChargeIncludeVAT ? 1.2 : 1)
                )}
              </span>
            </div>
          )}

          {formData.insurancePerDay > 0 &&
            formData.startDate &&
            formData.endDate && (
              (() => {
                const start = new Date(
                  `${formData.startDate}T${formData.startTime}`
                );
                const end = new Date(
                  `${formData.endDate}T${formData.endTime}`
                );
                if (
                  isValid(start) &&
                  isValid(end) &&
                  !isAfter(start, end)
                ) {
                  const days =
                    differenceInDays(end, start) + 1;
                  const insuranceCost =
                    days *
                    formData.insurancePerDay *
                    (formData.insurancePerDayIncludeVAT
                      ? 1.2
                      : 1);
                  return (
                    <div className="flex justify-between text-sm">
                      <span>
                        Insurance ({days} days)
                        {formData.insurancePerDayIncludeVAT
                          ? ' (Inc. VAT)'
                          : ''}
                        :
                      </span>
                      <span className="font-medium">
                        {formatCurrency(insuranceCost)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()
            )}

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Subtotal (before overall VAT):</span>
            <span className="font-medium">
              {formatCurrency(
                currentTotalCost /
                  (formData.includeVAT ? 1.2 : 1)
              )}
            </span>
          </div>
          {formData.includeVAT && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Overall VAT (20%):</span>
              <span className="font-medium">
                {formatCurrency(
                  currentTotalCost -
                    (currentTotalCost /
                      (formData.includeVAT ? 1.2 : 1))
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Subtotal (with overall VAT):</span>
            <span className="font-medium">
              {formatCurrency(currentTotalCost)}
            </span>
          </div>

          {currentDiscountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({formData.discountPercentage}%):</span>
              <span>-{formatCurrency(currentDiscountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
            <span>Total Amount Due:</span>
            <span className="font-medium">
              {formatCurrency(currentFinalCostAfterDiscount)}
            </span>
          </div>

          <div className="flex justify-between text-sm text-green-600">
            <span>Amount Paid (Previously):</span>
            <span>{formatCurrency(rental.paidAmount || 0)}</span>
          </div>

          <div className="flex justify-between text-sm font-medium text-red-600">
            <span>Remaining Amount Due:</span>
            <span>{formatCurrency(currentRemainingAmount)}</span>
          </div>

          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Payment Status:</span>
            <span
              className={`capitalize font-semibold ${
                (rental.paidAmount || 0) >=
                currentFinalCostAfterDiscount - 0.001
                  ? 'text-green-600'
                  : (rental.paidAmount || 0) > 0
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`}
            >
              {(rental.paidAmount || 0) >=
              currentFinalCostAfterDiscount - 0.001
                ? 'Paid'
                : (rental.paidAmount || 0) > 0
                ? 'Partially Paid'
                : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Vehicle Condition Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Vehicle Check-Out Condition
        </h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Mileage at Check-Out"
            value={conditionData.mileage}
            onChange={(e) =>
              setConditionData((prev) => ({
                ...prev,
                mileage: parseInt(e.target.value) || 0
              }))
            }
            min={selectedVehicle?.mileage}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fuel Level
            </label>
            <select
              value={conditionData.fuelLevel}
              onChange={(e) =>
                setConditionData((prev) => ({
                  ...prev,
                  fuelLevel: e.target.value as VehicleCondition['fuelLevel']
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="0">Empty (0%)</option>
              <option value="25">Quarter (25%)</option>
              <option value="50">Half (50%)</option>
              <option value="75">Three Quarters (75%)</option>
              <option value="100">Full (100%)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isClean"
                checked={conditionData.isClean}
                onChange={(e) =>
                  setConditionData((prev) => ({
                    ...prev,
                    isClean: e.target.checked
                  }))
                }
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isClean" className="text-sm text-gray-700">
                Vehicle is clean
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasDamage"
                checked={conditionData.hasDamage}
                onChange={(e) =>
                  setConditionData((prev) => ({
                    ...prev,
                    hasDamage: e.target.checked
                  }))
                }
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="hasDamage" className="text-sm text-gray-700">
                Vehicle has damage
              </label>
            </div>

            {conditionData.hasDamage && (
              <TextArea
                label="Damage Description"
                value={conditionData.damageDescription}
                onChange={(e) =>
                  setConditionData((prev) => ({
                    ...prev,
                    damageDescription: e.target.value
                  }))
                }
                required={conditionData.hasDamage}
              />
            )}
          </div>

          {existingImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Images ({existingImages.length})
              </label>
              <div className="grid grid-cols-3 gap-4">
                {existingImages.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={url}
                      alt={`Condition ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveExistingImage(url)
                      }
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <FileUpload
            label="Add New Condition Images"
            accept="image/*"
            multiple
            onChange={setNewImages}
            showPreview
          />
        </div>
      </div>

      {/* Add New Payment */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Add New Payment
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Record a new payment made towards this rental's balance.
        </p>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Amount to Add (£)"
            value={formData.amountToAdd}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                amountToAdd: parseFloat(e.target.value) || 0
              }))
            }
            min="0"
            max={Math.max(0, currentRemainingAmount)}
            step="0.01"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  paymentMethod: e.target.value as any
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              disabled={formData.amountToAdd <= 0}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <FormField
            label="Payment Reference (Optional)"
            value={formData.paymentReference}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                paymentReference: e.target.value
              }))
            }
            placeholder="Transaction ID, check number, etc."
            disabled={formData.amountToAdd <= 0}
          />
          <TextArea
            label="Payment Notes (Optional)"
            value={formData.paymentNotes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                paymentNotes: e.target.value
              }))
            }
            rows={2}
            placeholder="Notes about this specific payment"
            disabled={formData.amountToAdd <= 0}
          />
        </div>
      </div>

      {/* Customer Signature */}
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Customer Signature
        </label>
        <p className="text-sm text-gray-500 mb-3">
          If changes require re-confirmation, ask the customer to sign again.
        </p>
        <SignaturePad
          value={formData.signature}
          onChange={(signature) =>
            setFormData((prev) => ({
              ...prev,
              signature
            }))
          }
          className="mt-1 border rounded-md"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 border-t pt-6 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !selectedVehicle || !selectedCustomer}
          className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            loading || !selectedVehicle || !selectedCustomer
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark focus:ring-primary'
          }`}
        >
          {loading ? 'Updating...' : 'Update Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalEditModal;
