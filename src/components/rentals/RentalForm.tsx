// RentalForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

import { Vehicle, Customer, Claim, RentalPayment, VehicleCondition, Rental } from '../../types'; // Ensure Rental is imported
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, format, differenceInDays, isAfter, isValid } from 'date-fns'; // Import isValid
import toast from 'react-hot-toast';
import { Search, Car, User } from 'lucide-react'; // Added User for profile icon suggestion
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';



interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [manualClaimRef, setManualClaimRef] = useState(false);
  const { formatCurrency } = useFormattedDisplay(); // Use the hook




  const [formData, setFormData] = useState({
    vehicleId: '',
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '', // Initialize as empty string
    endTime: '', // Initialize as empty string
    type: 'daily' as const,
    reason: 'hired' as const,
    status: 'scheduled' as const,
    numberOfWeeks: 1,
    signature: '',
    paidAmount: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    negotiatedRate: '', // Keep as string for input, parse later
    negotiationNotes: '',
    discountPercentage: 0, // Keep as number
    discountNotes: '',
    storageStartDate: '',
    storageEndDate: '',
    storageCostPerDay: 0, // Keep as number
    storageDays: 0,
    includeStorageVAT: false,
    recoveryCost: 0, // Keep as number
    includeRecoveryCostVAT: false, // NEW: Add field for Recovery Cost VAT
    // ---> NEW: Add new charge fields <---
    deliveryCharge: 0, // Keep as number
    collectionCharge: 0, // Keep as number
    insurancePerDay: 0, // Keep as number
    claimRef: '',
    includeVAT: false, // New field for overall rental VAT
    deliveryChargeIncludeVAT: false, // New field for delivery charge VAT
    collectionChargeIncludeVAT: false, // New field for collection charge VAT
    insurancePerDayIncludeVAT: false, // New field for insurance per day VAT
  });

  // Fetch claims when component mounts
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const claimsQuery = query(collection(db, 'claims'));
        const snapshot = await getDocs(claimsQuery);
        const claimsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Claim[];
        setClaims(claimsData);
      } catch (error) {
        console.error('Error fetching claims:', error);
        toast.error('Failed to fetch claims');
      }
    };

    fetchClaims();
  }, []);

  const filteredClaims = (claims || []).filter(claim => {
    // Only filter if there is a search query entered
    if (!claimSearchQuery) {
      return false; // Don't show any claims if the search box is empty
      // Alternatively, return true if you want to show ALL claims when search is empty
    }

    // Prepare values for case-insensitive comparison
    const searchLower = claimSearchQuery.toLowerCase();
    const clientNameLower = claim.clientInfo.name.toLowerCase();
    const clientRefLower = claim.clientRef?.toLowerCase() || '';
    const claimIdLower = claim.id.toLowerCase(); // Assuming claim.id is always a string

    // Return true only if the current claim matches the search query in any relevant field
    return (
      clientNameLower.includes(searchLower) ||
      clientRefLower.includes(searchLower) ||
      claimIdLower.includes(searchLower)
    );
  });

  const [conditionData, setConditionData] = useState<Partial<VehicleCondition>>({
    mileage: 0,
    fuelLevel: '100',
    isClean: true,
    hasDamage: false,
    damageDescription: '',
    images: []
  });

  // Get available vehicles based on selected dates
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    (formData.startDate && formData.startTime) ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    (formData.endDate && formData.endTime) ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  // Filter vehicles based on search and availability
  const filteredVehicles = availableVehicles.filter(vehicle => {
    const searchLower = vehicleSearchQuery.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.registrationNumber.toLowerCase().includes(searchLower)
    );
  });

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.mobile.includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower)
    );
  });

  // Get selected vehicle and customer
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  // Calculate costs
  const calculateTotalCost = () => {
    // Basic checks
    if (!selectedVehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
        return 0;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    // Ensure dates are valid
     if (!isValid(startDateTime) || !isValid(endDateTime) || isAfter(startDateTime, endDateTime)) {
       return 0; // Return 0 for invalid date range
     }

    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

    // Calculate storage cost separately ONLY if needed (e.g., for display or specific logic)
    // Note: The main calculateRentalCost now includes this internally if passed
    let calculatedStorageCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      const storageStart = new Date(formData.storageStartDate);
      const storageEnd = new Date(formData.storageEndDate);
       if (isValid(storageStart) && isValid(storageEnd) && !isAfter(storageStart, storageEnd)) {
          const storageDays = differenceInDays(storageEnd, storageStart) + 1;
          const dailyCost = formData.storageCostPerDay || 0;
          calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1); // Apply VAT if checked
       }
    }

    // Use the updated utility function, passing all costs
    const totalCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason,
      negotiatedRate,
      // Pass calculated storage/recovery only if applicable (claim type)
      formData.type === 'claim' ? calculatedStorageCost : undefined,
      formData.type === 'claim' ? formData.recoveryCost : undefined,
      // ---> NEW: Pass new charges <---
      formData.deliveryCharge,
      formData.collectionCharge,
      formData.insurancePerDay,
      formData.includeVAT, // Pass includeVAT
      formData.deliveryChargeIncludeVAT, // Pass deliveryChargeIncludeVAT
      formData.collectionChargeIncludeVAT, // Pass collectionChargeIncludeVAT
      formData.insurancePerDayIncludeVAT, // Pass insurancePerDayIncludeVAT
      formData.includeRecoveryCostVAT // NEW: Pass includeRecoveryCostVAT
    );

    return totalCost;
  };

  // Calculate costs (Reverting variable names for JSX display)
  const totalCost = calculateTotalCost(); // <--- RENAME THIS BACK
  const discountAmount = (totalCost * (formData.discountPercentage || 0)) / 100; // Update calculation to use 'totalCost'
  const finalCostAfterDiscount = totalCost - discountAmount; // Calculate final cost
  const remainingAmount = finalCostAfterDiscount - (formData.paidAmount || 0); // Update calculation to use 'finalCostAfterDiscount'

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // --- Initial Checks ---
  if (!user) {
    toast.error("You must be logged in to create a rental.");
    return;
  }
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  if (!selectedVehicle) {
    toast.error("Please select a vehicle.");
    return;
  }
  if (!selectedCustomer) {
    toast.error("Please select a customer.");
    return;
  }

  setLoading(true);

  try {
    // --- Date Parsing and Validation ---
    if (!formData.startDate || !formData.startTime) {
      toast.error("Start Date and Time are required.");
      setLoading(false);
      return;
    }
    if (!formData.endDate || !formData.endTime) {
      toast.error("End Date and Time are required.");
      setLoading(false);
      return;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime   = new Date(`${formData.endDate}T${formData.endTime}`);

    if (!isValid(startDateTime)) {
      toast.error("Invalid Start Date or Time.");
      setLoading(false);
      return;
    }
    if (!isValid(endDateTime)) {
      toast.error("Invalid End Date or Time.");
      setLoading(false);
      return;
    }
    if (isAfter(startDateTime, endDateTime)) {
      throw new Error("End Date cannot be before Start Date.");
    }

    // --- Cost Calculations (including “claim” extras, VAT flags, etc.) ---
    let calculatedStorageCost = 0, storageDays = 0;
    let storageStartDateObj: Date | undefined, storageEndDateObj: Date | undefined;

    if (
      formData.type === "claim" &&
      formData.storageStartDate &&
      formData.storageEndDate
    ) {
      storageStartDateObj = new Date(formData.storageStartDate);
      storageEndDateObj   = new Date(formData.storageEndDate);

      if (
        isValid(storageStartDateObj) &&
        isValid(storageEndDateObj) &&
        !isAfter(storageStartDateObj, storageEndDateObj)
      ) {
        storageDays = differenceInDays(storageEndDateObj, storageStartDateObj) + 1;
        const dailyCost = formData.storageCostPerDay || 0;
        calculatedStorageCost =
          storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
      } else {
        console.warn(
          "Invalid storage dates provided for cost calculation in submit. Storage cost set to 0."
        );
        storageStartDateObj = undefined;
        storageEndDateObj   = undefined;
        calculatedStorageCost = 0;
        storageDays = 0;
      }
    }

    const standardCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason,
      undefined,
      formData.type === "claim" ? calculatedStorageCost : undefined,
      formData.type === "claim" ? formData.recoveryCost || 0 : undefined,
      formData.type === "claim" ? formData.deliveryCharge || 0 : undefined,
      formData.type === "claim" ? formData.collectionCharge || 0 : undefined,
      formData.type === "claim" ? formData.insurancePerDay || 0 : undefined,
      // overall VAT = false here, since this is “standard” (no overall VAT)
      false,
      formData.deliveryChargeIncludeVAT,
      formData.collectionChargeIncludeVAT,
      formData.insurancePerDayIncludeVAT,
      formData.includeRecoveryCostVAT
    );

    const totalCostBeforeDiscount = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason,
      formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
      formData.type === "claim" ? calculatedStorageCost : undefined,
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

    const discountAmount =
      (totalCostBeforeDiscount * (formData.discountPercentage || 0)) / 100;
    const finalCostToSave = totalCostBeforeDiscount - discountAmount;
    const finalRemainingAmount = finalCostToSave - (formData.paidAmount || 0);

    // --- Build initial payments array ---
    const payments: RentalPayment[] = [];
    if (formData.paidAmount > 0) {
      payments.push({
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        date: new Date(),
        amount: formData.paidAmount,
        method: formData.paymentMethod,
        reference: formData.paymentReference || undefined,
        notes: formData.paymentNotes   || undefined,
        createdAt: new Date(),
        createdBy: user.id,
      });
    }

    // --- Construct Firestore payload ---
    const rentalData: Omit<
      Rental,
      | "id"
      | "updatedAt"
      | "checkOutCondition"
      | "checkInCondition"
      | "returnCondition"
    > & { updatedAt: Date } = {
      vehicleId: formData.vehicleId,
      customerId: formData.customerId,
      startDate: startDateTime,
      endDate:   endDateTime,
      type:      formData.type,
      reason:    formData.reason,
      status:    formData.status,
      cost:      finalCostToSave,
      standardCost: standardCost,
      paidAmount:   formData.paidAmount || 0,
      remainingAmount: finalRemainingAmount,
      paymentStatus:
        finalRemainingAmount <= 0.001
          ? "paid"
          : (formData.paidAmount || 0) > 0
          ? "partially_paid"
          : "pending",
      payments,
      signature: formData.signature || undefined,

      ...(formData.claimRef && { claimRef: formData.claimRef }),

      // “claim”-only fields, if applicable
      ...(formData.type === "claim" &&
        calculatedStorageCost > 0 &&
        storageStartDateObj &&
        storageEndDateObj && {
          storageStartDate: storageStartDateObj,
          storageEndDate:   storageEndDateObj,
          storageCostPerDay: formData.storageCostPerDay || 0,
          storageDays,
          includeStorageVAT: formData.includeStorageVAT,
          storageCost:        calculatedStorageCost,
        }),

      ...(formData.type === "claim" &&
        formData.recoveryCost > 0 && {
          recoveryCost:         formData.recoveryCost,
          includeRecoveryCostVAT: formData.includeRecoveryCostVAT,
        }),

      ...(formData.deliveryCharge > 0 && {
        deliveryCharge:
          formData.deliveryCharge *
          (formData.deliveryChargeIncludeVAT ? 1.2 : 1),
      }),
      ...(formData.collectionCharge > 0 && {
        collectionCharge:
          formData.collectionCharge *
          (formData.collectionChargeIncludeVAT ? 1.2 : 1),
      }),
      ...(formData.insurancePerDay > 0 && {
        insurancePerDay: formData.insurancePerDay,
      }),

      includeVAT:                   formData.includeVAT,
      deliveryChargeIncludeVAT:     formData.deliveryChargeIncludeVAT,
      collectionChargeIncludeVAT:   formData.collectionChargeIncludeVAT,
      insurancePerDayIncludeVAT:    formData.insurancePerDayIncludeVAT,

      ...(formData.negotiatedRate
        ? {
            negotiatedRate:    parseFloat(formData.negotiatedRate),
            negotiationNotes:  formData.negotiationNotes || null,
          }
        : {
            negotiatedRate:   null,
            negotiationNotes: null,
          }),

      ...(formData.discountPercentage > 0
        ? {
            discountPercentage: formData.discountPercentage,
            discountAmount:     discountAmount,
            discountNotes:      formData.discountNotes || null,
          }
        : {
            discountPercentage: null,
            discountAmount:     null,
            discountNotes:      null,
          }),

      ...(formData.type === "weekly" && {
        numberOfWeeks: formData.numberOfWeeks || 1,
      }),

      // System fields
      createdAt:    new Date(),
      createdBy:    user.id,
      updatedAt:    new Date(),
      updatedBy:    user.id,
      ongoingCharges: 0,
      documents:      {},
      extensionHistory: [],
      paymentMethod:   formData.paymentMethod,
      paymentReference: formData.paymentReference?.trim() || null,
    };

    // --- Save rental document to Firestore ---
    const docRef = await addDoc(collection(db, "rentals"), rentalData);
    console.log("Rental document created successfully with ID:", docRef.id);

    // --- Upload check-out images (if any) ---
    let conditionImageUrls: string[] = [];
    if (images.length > 0) {
      const uploadPromises = images.map(async (file) => {
        const ts = Date.now();
        const storageRef = ref(
          storage,
          `vehicle-conditions/${docRef.id}/${ts}_${file.name}`
        );
        const snap = await uploadBytes(storageRef, file);
        return getDownloadURL(snap.ref);
      });

      try {
        conditionImageUrls = await Promise.all(uploadPromises);
      } catch (imgErr) {
        console.error("Failed to upload condition images:", imgErr);
        toast.error("Rental created, but failed to upload condition images.");
      }
    }

    if (conditionImageUrls.length > 0) {
      const checkOutCondition = {
        id: `cond_${Date.now()}`,
        type: "check-out" as const,
        date: new Date(),
        mileage: 0,
        fuelLevel: "100",
        isClean: true,
        hasDamage: false,
        damageDescription: "",
        images: conditionImageUrls,
        createdAt: new Date(),
        createdBy: user.id,
      };
      await updateDoc(doc(db, "rentals", docRef.id), {
        checkOutCondition,
      });
    }

    //
    // --- BACKGROUND TASKS: PDF Generation/Upload + Finance Transaction ---
    //

    // 1) Close modal, clear loading, and show success toast immediately:
    setLoading(false);
    onClose();
    toast.success("Rental created! Generating documents in background…");

    // 2) Kick off PDF gen/upload asynchronously:
    setTimeout(async () => {
      try {
        const fullRental = { id: docRef.id, ...rentalData } as Rental;
        const documents = await generateRentalDocuments(
          fullRental,
          selectedVehicle,
          selectedCustomer
        );
        await uploadRentalDocuments(docRef.id, documents);
        toast.success("Agreement & Invoice uploaded!");
      } catch (err) {
        console.error("Background PDF gen/upload failed:", err);
        toast.error("Created rental, but failed to generate documents.");
      }
    }, 0);

    // 3) If there was an initial payment, record it in the background:
    if (formData.paidAmount > 0) {
      setTimeout(async () => {
        try {
          await createFinanceTransaction({
            type: "income",
            category: "rental",
            amount: formData.paidAmount,
            description: `Rental payment for ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber}) - Rental ID: ${docRef.id.substring(
              0,
              6
            )}`,
            date: new Date(),
            referenceId: docRef.id,
            vehicleId: selectedVehicle.id,
            customerId: selectedCustomer.id,
            paymentMethod: formData.paymentMethod,
            paymentReference: formData.paymentReference || null,
            status: "completed",
          });
        } catch {
          toast.error("Rental created, but failed to record finance transaction.");
        }
      }, 0);
    }

    // 4) Return here so nothing else runs on the main thread:
    return;

  } catch (error: any) {
    console.error("Error creating rental:", error);
    toast.error(`Failed to create rental: ${error.message || String(error)}`);
  } finally {
    setLoading(false);
  }
};




  // Update end date when type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate && formData.startTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      if (isValid(startDateTime)) { // Check if startDateTime is valid
        const endDateTime = addWeeks(startDateTime, formData.numberOfWeeks);

        setFormData(prev => ({
          ...prev,
          endDate: endDateTime.toISOString().split('T')[0],
          endTime: formData.startTime
        }));
      } else {
        // If start date/time is invalid, clear end date/time
        setFormData(prev => ({
          ...prev,
          endDate: '',
          endTime: '',
        }));
      }
    } else if (formData.type !== 'weekly') {
       // Clear end date/time and weeks if switching from weekly or if endDate is empty
        setFormData(prev => ({
           ...prev,
           endDate: '',
           endTime: '',
           numberOfWeeks: 1 // Reset weekly count
        }));
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);


    // Recalculate storage days when dates change
    useEffect(() => {
        if (formData.storageStartDate && formData.storageEndDate) {
          const startDate = new Date(formData.storageStartDate);
          const endDate = new Date(formData.storageEndDate);

          // Ensure dates are valid before calculating difference
          if (isValid(startDate) && isValid(endDate) && !isAfter(startDate, endDate)) {
             const days = differenceInDays(endDate, startDate) + 1; // Include end date
             setFormData(prev => ({ ...prev, storageDays: days }));
          } else {
             setFormData(prev => ({ ...prev, storageDays: 0 })); // Reset if dates are invalid
          }

        } else {
          setFormData(prev => ({ ...prev, storageDays: 0 }));
        }
      }, [formData.storageStartDate, formData.storageEndDate]);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Vehicle</label>
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
            placeholder="Search vehicles..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Vehicle Search Results */}
        {showVehicleResults && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {loadingVehicles ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading vehicles...</div>
            ) : filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, vehicleId: vehicle.id }));
                    setVehicleSearchQuery(`${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`);
                    setShowVehicleResults(false);
                     // Update mileage in condition data when vehicle is selected
                    setConditionData(prev => ({ ...prev, mileage: vehicle.mileage || 0 }));
                  }}
                >
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                      <div className="text-sm text-gray-500">
                        {vehicle.registrationNumber}
                        {vehicle.weeklyRentalPrice && ` - £${vehicle.weeklyRentalPrice}/week`}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No available vehicles found</div>
            )}
          </div>
        )}
      </div>

      {/* Customer Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Customer</label>
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
            placeholder="Search customers..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Customer Search Results */}
        {showCustomerResults && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    customerId: customer.id,
                    signature: customer.signature || ''
                  }));
                  setCustomerSearchQuery(customer.name);
                  setShowCustomerResults(false);
                }}
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">
                  {customer.mobile} - {customer.email}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Customer Details */}
        {selectedCustomer && (
          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900">Selected Customer</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2">{selectedCustomer.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Mobile:</span>
                <span className="ml-2">{selectedCustomer.mobile}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="text-gray-500">License Expiry:</span>
                <span className="ml-2">{format(selectedCustomer.licenseExpiry, 'dd/MM/yyyy')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rental Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        {/* Claim Reference Field - Only show when type is claim */}
      {formData.type === 'claim' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Claim Reference</label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={manualClaimRef}
                onChange={(e) => setManualClaimRef(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Enter Manually</span>
            </label>
          </div>

          {manualClaimRef ? (
            <FormField
              label="Claim Reference"
              value={formData.claimRef}
              onChange={(e) => setFormData({ ...formData, claimRef: e.target.value })}
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
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              {showClaimResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                  {filteredClaims.length > 0 ? (
                    filteredClaims.map(claim => (
                      <div
                        key={claim.id}
                        className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                        onClick={() => {
                          const claimRef = claim.clientRef || claim.id.slice(-8).toUpperCase();
                          setFormData(prev => ({ ...prev, claimRef }));
                          setClaimSearchQuery(claimRef);
                          setShowClaimResults(false);
                        }}
                      >
                        <div className="font-medium">
                          {claim.clientRef || `Claim #${claim.id.slice(-8).toUpperCase()}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {claim.clientInfo?.name} - {claim.clientVehicle?.registration}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">No claims found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
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
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value as typeof formData.reason })}
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

        {/* Include VAT checkbox for overall rental */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="includeVAT"
          checked={formData.includeVAT}
          onChange={(e) => setFormData({ ...formData, includeVAT: e.target.checked })}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="includeVAT" className="text-sm font-medium text-gray-700">
          Include HIRE VAT (20%)
        </label>
      </div>



        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value || '' })} // Handle empty string
          required
        />

        <FormField
          type="time"
          label="Start Time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value || '' })} // Handle empty string
          required
        />

        {formData.type === 'daily' && (
          <>
            <FormField
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value || '' })} // Handle empty string
              required
              min={formData.startDate}
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value || '' })} // Handle empty string
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
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value || '' })} // Handle empty string
              required
              min={formData.startDate}
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value || '' })} // Handle empty string
              required
            />
            <FormField
              type="number"
              label="Delivery Charge (£)"
              value={formData.deliveryCharge}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                deliveryCharge: parseFloat(e.target.value) || 0
              }))}
              min="0"
              step="0.01"
            />
             <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="deliveryChargeIncludeVAT"
                checked={formData.deliveryChargeIncludeVAT}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  deliveryChargeIncludeVAT: e.target.checked
                }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="deliveryChargeIncludeVAT" className="text-sm text-gray-700">
                Include VAT on Delivery Charge
              </label>
            </div>

            {/* ---> NEW: Add Collection Charge Field <--- */}
            <FormField
              type="number"
              label="Collection Charge (£)"
              value={formData.collectionCharge}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                collectionCharge: parseFloat(e.target.value) || 0
              }))}
              min="0"
              step="0.01"
            />
            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="collectionChargeIncludeVAT"
                checked={formData.collectionChargeIncludeVAT}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  collectionChargeIncludeVAT: e.target.checked
                }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="collectionChargeIncludeVAT" className="text-sm text-gray-700">
                Include VAT on Collection Charge
              </label>
            </div>

            {/* ---> NEW: Add Insurance Per Day Field <--- */}
            <FormField
              type="number"
              label="Insurance Per Day (£)"
              value={formData.insurancePerDay}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                insurancePerDay: parseFloat(e.target.value) || 0
              }))}
              min="0"
              step="0.01"
            />
            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="insurancePerDayIncludeVAT"
                checked={formData.insurancePerDayIncludeVAT}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  insurancePerDayIncludeVAT: e.target.checked
                }))}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="insurancePerDayIncludeVAT" className="text-sm text-gray-700">
                Include VAT on Insurance Per Day
              </label>
            </div>

            <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Storage Start Date"
          value={formData.storageStartDate}
          onChange={(e) => {
            const newStartDate = e.target.value || '';
            const startDateObj = newStartDate ? new Date(newStartDate) : null;
            const endDateObj = formData.storageEndDate ? new Date(formData.storageEndDate) : null;

            setFormData(prev => ({
              ...prev,
              storageStartDate: newStartDate,
              storageDays: (startDateObj && endDateObj && isValid(startDateObj) && isValid(endDateObj) && !isAfter(startDateObj, endDateObj)) ?
                differenceInDays(endDateObj, startDateObj) + 1 :
                0
            }));
          }}
          min={formData.startDate}
        />

        <FormField
          type="date"
          label="Storage End Date"
          value={formData.storageEndDate}
          onChange={(e) => {
            const newEndDate = e.target.value || '';
            const startDateObj = formData.storageStartDate ? new Date(formData.storageStartDate) : null;
            const endDateObj = newEndDate ? new Date(newEndDate) : null;

            setFormData(prev => ({
              ...prev,
              storageEndDate: newEndDate,
              storageDays: (startDateObj && endDateObj && isValid(startDateObj) && isValid(endDateObj) && !isAfter(startDateObj, endDateObj)) ?
                differenceInDays(endDateObj, startDateObj) + 1 :
                0
            }));
          }}
          min={formData.storageStartDate}
        />

        <FormField
          type="number"
          label="Storage Cost per Day (£)"
          value={formData.storageCostPerDay}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            storageCostPerDay: parseFloat(e.target.value) || 0
          }))}
          min="0"
          step="0.01"
        />

        <div className="flex items-center space-x-2 mt-6">
          <input
            type="checkbox"
            id="includeStorageVAT"
            checked={formData.includeStorageVAT}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              includeStorageVAT: e.target.checked
            }))}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="includeStorageVAT" className="text-sm text-gray-700">
            Include VAT on Storage Cost
          </label>
        </div>

        <div className="col-span-2 bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Days of Storage:</span>
            <span>{formData.storageDays || 0} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Base Storage Cost:</span>
            <span>£{((formData.storageDays || 0) * (formData.storageCostPerDay || 0)).toFixed(2)}</span>
          </div>
          {formData.includeStorageVAT && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>VAT (20%):</span>
              <span>£{((formData.storageDays || 0) * (formData.storageCostPerDay || 0) * 0.2).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Total Storage Cost:</span>
            <span>£{(
              (formData.storageDays || 0) *
              (formData.storageCostPerDay || 0) *
              (formData.includeStorageVAT ? 1.2 : 1)
            ).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <FormField
      type="number"
      label="Recovery Cost (£)"
      value={formData.recoveryCost}
      onChange={(e) => setFormData(prev => ({
        ...prev,
        recoveryCost: parseFloat(e.target.value) || 0
      }))}
      min="0"
      step="0.01"
    />
     {/* NEW: Add checkbox for Recovery Cost VAT */}
     <div className="flex items-center space-x-2 mt-6">
        <input
          type="checkbox"
          id="includeRecoveryCostVAT"
          checked={formData.includeRecoveryCostVAT}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            includeRecoveryCostVAT: e.target.checked
          }))}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="includeRecoveryCostVAT" className="text-sm text-gray-700">
          Include VAT on Recovery Cost
        </label>
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
                const weeks = parseInt(e.target.value);
                setFormData(prev => {
                  const startDateTime = new Date(`${prev.startDate}T${prev.startTime}`);
                  if (isValid(startDateTime)) { // Check validity
                      const endDateTime = addWeeks(startDateTime, weeks);
                      return {
                          ...prev,
                          numberOfWeeks: weeks,
                          endDate: endDateTime.toISOString().split('T')[0],
                          endTime: prev.startTime
                      };
                  }
                  return { // Fallback if start date is invalid
                      ...prev,
                      numberOfWeeks: weeks,
                      endDate: '',
                      endTime: ''
                  };
                });
              }}
              min="1"
              required
            />
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <FormField
                type="date"
                label="End Date (Optional Override)"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => {
                    const newEndDate = e.target.value || '';
                    const startDateObj = prev.startDate ? new Date(`${prev.startDate}T${prev.startTime}`) : null;
                    const endDateObj = newEndDate ? new Date(`${newEndDate}T${prev.endTime}`) : null;

                    let newNumberOfWeeks = prev.numberOfWeeks;
                    if (startDateObj && endDateObj && isValid(startDateObj) && isValid(endDateObj) && !isAfter(startDateObj, endDateObj)) {
                        newNumberOfWeeks = Math.ceil(differenceInDays(endDateObj, startDateObj) / 7);
                        if (newNumberOfWeeks < 1) newNumberOfWeeks = 1; // Ensure minimum 1 week
                    }

                    return {
                        ...prev,
                        endDate: newEndDate,
                        numberOfWeeks: newNumberOfWeeks,
                    };
                })}
                min={formData.startDate}
              />
              <FormField
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  endTime: e.target.value || ''
                }))}
              />
            </div>
          </>
        )}
      </div>

      

      {/* Negotiation Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Negotiation</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Negotiated Rate (Optional)"
            value={formData.negotiatedRate}
            onChange={(e) => setFormData({ ...formData, negotiatedRate: e.target.value })}
            min="0"
            step="0.01"
            placeholder={`Enter custom ${formData.type === 'weekly' ? 'weekly' : 'daily'} rate`}
          />

          {formData.negotiatedRate && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
              <textarea
                value={formData.negotiationNotes}
                onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about rate negotiation..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Discount Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Discount</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Discount Percentage"
            value={formData.discountPercentage}
            onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })} // Ensure parsing handles empty string
            min="0"
            max="100"
            step="0.1"
          />

          {formData.discountPercentage > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Notes</label>
              <textarea
                value={formData.discountNotes}
                onChange={(e) => setFormData({ ...formData, discountNotes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about the discount..."
                required
              />
            </div>
          )}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="border-t pt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        {/* Base Cost (calculated WITHOUT additional charges passed to the display helper) */}
        <div className="flex justify-between text-sm">
          <span>Base Rental Cost:</span>
          <span className="font-medium">{formatCurrency(calculateRentalCost(
              new Date(`${formData.startDate}T${formData.startTime}`),
              new Date(`${formData.endDate}T${formData.endTime}`),
              formData.type,
              selectedVehicle,
              formData.reason,
              formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
              // Pass 0/undefined here for BASE display
              0, 0, 0, 0, 0,
              false, false, false, false, false // Pass false for VAT flags in base cost display
            ))}
          </span>
        </div>

    {/* Storage Cost */}
    {formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate && formData.storageCostPerDay > 0 && (
      <div className="flex justify-between text-sm">
        <span>Storage Cost ({formData.storageDays || 0} days){formData.includeStorageVAT ? ' (Inc. VAT)' : ''}:</span>
        <span className="font-medium">{formatCurrency(
          (formData.storageDays || 0) * (formData.storageCostPerDay || 0) * (formData.includeStorageVAT ? 1.2 : 1)
        )}</span>
      </div>
    )}

    {/* Recovery Cost */}
    {formData.type === 'claim' && formData.recoveryCost > 0 && (
      <div className="flex justify-between text-sm">
        <span>Recovery Cost{formData.includeRecoveryCostVAT ? ' (Inc. VAT)' : ''}:</span> {/* NEW: Display VAT inclusion */}
        <span className="font-medium">{formatCurrency(formData.recoveryCost * (formData.includeRecoveryCostVAT ? 1.2 : 1))}</span> {/* NEW: Apply VAT for display */}
      </div>
    )}

    {/* ---> NEW: Display Delivery Charge <--- */}
    {formData.deliveryCharge > 0 && (
      <div className="flex justify-between text-sm">
        <span>Delivery Charge{formData.deliveryChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
        <span className="font-medium">{formatCurrency(formData.deliveryCharge * (formData.deliveryChargeIncludeVAT ? 1.2 : 1))}</span>
      </div>
    )}

    {/* ---> NEW: Display Collection Charge <--- */}
    {formData.collectionCharge > 0 && (
      <div className="flex justify-between text-sm">
        <span>Collection Charge{formData.collectionChargeIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
        <span className="font-medium">{formatCurrency(formData.collectionCharge * (formData.collectionChargeIncludeVAT ? 1.2 : 1))}</span>
      </div>
    )}

    {/* ---> NEW: Display Insurance Cost <--- */}
    {formData.insurancePerDay > 0 && formData.startDate && formData.endDate && (
        (() => { // Using an IIFE to keep logic contained
            const start = new Date(`${formData.startDate}T${formData.startTime}`);
            const end = new Date(`${formData.endDate}T${formData.endTime}`);
            if (isValid(start) && isValid(end) && !isAfter(start, end)) {
                const days = differenceInDays(end, start) + 1;
                const insuranceCost = days * formData.insurancePerDay * (formData.insurancePerDayIncludeVAT ? 1.2 : 1);
                return (
                    <div className="flex justify-between text-sm">
                        <span>Insurance ({days} days){formData.insurancePerDayIncludeVAT ? ' (Inc. VAT)' : ''}:</span>
                        <span className="font-medium">{formatCurrency(insuranceCost)}</span>
                    </div>
                );
            }
            return null;
        })()
      )}

    {/* Subtotal before VAT */}
     <div className="flex justify-between text-sm pt-2 border-t">
        <span>Subtotal (before VAT):</span>
        <span className="font-medium">{formatCurrency(totalCost / (formData.includeVAT ? 1.2 : 1))}</span>
     </div>
     {/* VAT Amount */}
     {formData.includeVAT && (
        <div className="flex justify-between text-sm text-blue-600">
            <span>VAT (20%):</span>
            <span className="font-medium">{formatCurrency(totalCost - (totalCost / (formData.includeVAT ? 1.2 : 1)))}</span>
        </div>
     )}
    {/* Subtotal before discount */}
    <div className="flex justify-between text-sm pt-2 border-t">
        <span>Subtotal (with VAT):</span>
        {/* Use the reverted variable name */}
        <span className="font-medium">{formatCurrency(totalCost)}</span>
     </div>

    {/* Discount */}
    {formData.discountPercentage > 0 && (
      <div className="flex justify-between text-sm text-green-600">
        <span>Discount ({formData.discountPercentage}%):</span>
        {/* discountAmount calculation remains the same */}
        <span>-{formatCurrency(discountAmount)}</span>
      </div>
    )}

    {/* Final Amount */}
    <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
      <span>Final Amount Due:</span>
      {/* Use the final cost after discount */}
      <span className="font-medium">{formatCurrency(finalCostAfterDiscount)}</span>
      {/* Or calculate inline: formatCurrency(totalCost - discountAmount) */}
    </div>

     {/* Amount Paid */}
     <div className="flex justify-between text-sm">
        <span>Amount Paid:</span>
        <span>{formatCurrency(formData.paidAmount || 0)}</span>
     </div>

     {/* Remaining Amount */}
      <div className="flex justify-between text-sm font-medium text-red-600">
         <span>Remaining Amount:</span>
         {/* remainingAmount is already calculated based on finalCostAfterDiscount */}
         <span>{formatCurrency(remainingAmount)}</span>
      </div>

  </div>
</div>

       {/* Vehicle Condition Check Section */}
       {selectedVehicle && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Condition Check</h3>
          <div className="space-y-4">
            <FormField
              type="number"
              label="Current Mileage"
              value={conditionData.mileage}
              onChange={(e) => setConditionData({ ...conditionData, mileage: parseInt(e.target.value) || 0 })} // Handle empty string
              min={selectedVehicle.mileage}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
              <select
                value={conditionData.fuelLevel}
                onChange={(e) => setConditionData({ ...conditionData, fuelLevel: e.target.value as VehicleCondition['fuelLevel'] })}
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
                  onChange={(e) => setConditionData({ ...conditionData, isClean: e.target.checked })}
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
                  onChange={(e) => setConditionData({ ...conditionData, hasDamage: e.target.checked })}
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
                  onChange={(e) => setConditionData({ ...conditionData, damageDescription: e.target.value })}
                  required
                />
              )}
            </div>

            <FileUpload
  label="Vehicle Condition Images (max 5)"
  accept="image/*"
  multiple
  onChange={files => {
    // Enforce a maximum of 5 images
    const arr = Array.from(files).slice(0, 5);
    if (files.length > 5) {
      toast.error("You can only upload up to 5 condition images.");
    }
    setImages(arr);
  }}
  showPreview
/>

          </div>
        </div>
      )}
    

      {/* Payment Details */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Amount to Pay"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })} // Handle empty string
            min="0"
            max={finalCostAfterDiscount} // Max amount should be the final cost after discount and including VAT
            step="0.01"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <FormField
            label="Payment Reference"
            value={formData.paymentReference}
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="Enter payment reference or transaction ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
            <textarea
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Add any notes about this payment"
            />
          </div>
        </div>
      </div>



      {/* Customer Signature */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer Signature</label>
        <SignaturePad
          value={formData.signature}
          onChange={(signature) => setFormData({ ...formData, signature })}
          className="mt-1 border rounded-md"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Creating...' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;