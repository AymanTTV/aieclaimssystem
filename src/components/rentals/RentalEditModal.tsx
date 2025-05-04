import React, { useState, useEffect } from 'react';
import { doc, updateDoc, Timestamp, query, collection, where, getDocs, addDoc } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Rental, Vehicle, Customer, VehicleCondition, Claim, RentalPayment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import FileUpload from '../ui/FileUpload';
import SignaturePad from '../ui/SignaturePad';
import { X, Search, Car } from 'lucide-react';
import { addWeeks, format, differenceInDays, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles'; // Assuming this hook is available


interface RentalEditModalProps {
  rental: Rental;
  vehicles: Vehicle[]; // Needed to find selected vehicle details
  customers: Customer[]; // Needed to find selected customer details
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
  const [customerSearchQuery, setCustomerSearchQuery] = useState(''); // Added customer search state
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false); // Added customer search results state
  const [existingImages, setExistingImages] = useState<string[]>(
    rental.checkOutCondition?.images || []
  );

  // State for search functionalities (similar to RentalForm)
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [showClaimResults, setShowClaimResults] = useState(false);
  const [manualClaimRef, setManualClaimRef] = useState(true);

  // Helper function to safely format dates/timestamps
  const safeFormatDate = (dateInput: Date | Timestamp | string | number | null | undefined, formatString: string): string => {
    if (!dateInput) return '';
    let dateObject: Date | null = null;
    if (dateInput instanceof Date) {
      dateObject = dateInput;
    } else if (typeof (dateInput as any)?.toDate === 'function') {
      dateObject = (dateInput as Timestamp).toDate();
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) dateObject = parsed;
    }
    if (dateObject instanceof Date && !isNaN(dateObject.getTime())) {
      try {
        return format(dateObject, formatString);
      } catch (error) {
        console.error(`Error formatting date: ${dateObject}`, error);
        return '';
      }
    }
    console.warn(`Could not format invalid date value: ${dateInput}`);
    return '';
  };

  // --- Initialize formData mirroring RentalForm state ---
  const [formData, setFormData] = useState({
    // Core Rental Fields
    vehicleId: rental.vehicleId, // Keep track of vehicleId (can now be changed via search)
    customerId: rental.customerId, // Keep track of customerId (can now be changed via search)
    startDate: safeFormatDate(rental.startDate, 'yyyy-MM-dd'),
    startTime: safeFormatDate(rental.startDate, 'HH:mm'),
    endDate: safeFormatDate(rental.endDate, 'yyyy-MM-dd'),
    endTime: safeFormatDate(rental.endDate, 'HH:mm'),
    type: rental.type,
    reason: rental.reason,
    status: rental.status,
    signature: rental.signature || '',

    // Weekly Specific
    numberOfWeeks: rental.numberOfWeeks || 1, // Default from rental or 1

    // Claim Specific / Additional Charges
    claimRef: rental.claimRef || '',
    deliveryCharge: rental.deliveryCharge || 0,
    collectionCharge: rental.collectionCharge || 0,
    insurancePerDay: rental.insurancePerDay || 0,
    recoveryCost: rental.recoveryCost || 0,

    // Storage Specific
    storageStartDate: safeFormatDate(rental.storageStartDate, 'yyyy-MM-dd'),
    storageEndDate: safeFormatDate(rental.storageEndDate, 'yyyy-MM-dd'),
    storageCostPerDay: rental.storageCostPerDay || 0,
    storageDays: rental.storageDays || 0, // Will be recalculated if dates change
    includeStorageVAT: rental.includeStorageVAT || false,

    // Negotiation
    negotiatedRate: rental.negotiatedRate?.toString() || '',
    negotiationNotes: rental.negotiationNotes || '',

    // Discount
    discountPercentage: rental.discountPercentage || 0,
    discountNotes: rental.discountNotes || '',

    // Payment fields (for ADDING new payment in edit modal)
    amountToAdd: 0, // Changed name for clarity
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
  });

  // --- Find Selected Vehicle/Customer (from props or formData) ---
  // ** Moved these up to be available for conditionData initialization **
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  // --- Initialize conditionData ---
  // Now selectedVehicle is defined when this state is initialized
  const [conditionData, setConditionData] = useState<Partial<VehicleCondition>>(
    rental.checkOutCondition || {
      mileage: selectedVehicle?.mileage || 0, // Use selectedVehicle's mileage if available
      fuelLevel: '100',
      isClean: true,
      hasDamage: false,
      damageDescription: '',
      images: []
    }
  );

  // --- Set initial search queries based on current rental ---
  useEffect(() => {
    if (selectedVehicle) {
      setVehicleSearchQuery(`${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.registrationNumber}`);
      // Also initialize mileage in conditionData if it was 0 and a vehicle is selected
      if (conditionData.mileage === 0 && selectedVehicle.mileage !== undefined) {
           setConditionData(prev => ({ ...prev, mileage: selectedVehicle.mileage }));
      }
    }
    if (selectedCustomer) {
      setCustomerSearchQuery(`${selectedCustomer.name} - ${selectedCustomer.mobile}`);
    }
    if (rental.claimRef) {
        setClaimSearchQuery(rental.claimRef);
    }
     // Listen for changes to formData.vehicleId and formData.customerId to update search inputs
  }, [selectedVehicle, selectedCustomer, rental.claimRef, conditionData.mileage]);


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
  }, []); // Empty dependency array means run once on mount

  // Filter claims based on search
  const filteredClaims = (claims || []).filter(claim => {
    // Only filter if there is a search query entered
    if (!claimSearchQuery) {
      return false; // Don't show any claims if the search box is empty
    }

    // Prepare values for case-insensitive comparison
    const searchLower = claimSearchQuery.toLowerCase();
    const clientNameLower = claim.clientInfo.name.toLowerCase();
    const clientRefLower = claim.clientRef?.toLowerCase() || '';
    const claimIdLower = claim.id.toLowerCase();

    // Return true only if the current claim matches the search query in any relevant field
    return (
      clientNameLower.includes(searchLower) ||
      clientRefLower.includes(searchLower) ||
      claimIdLower.includes(searchLower)
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


  // Get available vehicles based on selected dates (using formData dates)
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  // Filter vehicles based on search and availability
  const filteredVehicles = availableVehicles.filter(vehicle => {
    const searchLower = vehicleSearchQuery.toLowerCase();
     // Always include the currently selected vehicle in results, even if dates overlap
    if (vehicle.id === formData.vehicleId) return true;
    return (
      vehicle.make.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.registrationNumber.toLowerCase().includes(searchLower)
    );
  });

  // --- Recalculate storage days when dates change (from RentalForm) ---
  useEffect(() => {
    if (formData.storageStartDate && formData.storageEndDate) {
      const startDate = new Date(formData.storageStartDate);
      const endDate = new Date(formData.storageEndDate);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && !isAfter(startDate, endDate)) {
        const days = differenceInDays(endDate, startDate) + 1;
        setFormData(prev => ({ ...prev, storageDays: days }));
      } else {
        setFormData(prev => ({ ...prev, storageDays: 0 }));
      }
    } else {
      setFormData(prev => ({ ...prev, storageDays: 0 }));
    }
  }, [formData.storageStartDate, formData.storageEndDate]);

  // --- Recalculate end date for weekly rentals (from RentalForm) ---
   useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate && formData.startTime && formData.numberOfWeeks > 0) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
       if (!isNaN(startDateTime.getTime())) {
           const endDateTime = addWeeks(startDateTime, formData.numberOfWeeks);
           setFormData(prev => ({
             ...prev,
             endDate: endDateTime.toISOString().split('T')[0],
             endTime: prev.startTime // Keep start time as end time for weekly
           }));
       }
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);


  // --- Dynamic Cost Calculation (mirroring RentalForm) ---
  const calculateCurrentTotalCost = () => {
    // Use selectedVehicle based on current formData.vehicleId
    const currentSelectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

    if (!currentSelectedVehicle || !formData.startDate || !formData.endDate || !formData.startTime || !formData.endTime) {
      return 0;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || isAfter(startDateTime, endDateTime)) {
      return 0;
    }

    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;

    let calculatedStorageCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
        const storageDays = formData.storageDays || 0; // Use calculated days from state
        const dailyCost = formData.storageCostPerDay || 0;
        calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
    }

    const totalCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      currentSelectedVehicle, // Use the selected vehicle
      formData.reason,
      negotiatedRate,
      formData.type === 'claim' ? calculatedStorageCost : undefined,
      formData.type === 'claim' ? formData.recoveryCost : undefined,
      formData.deliveryCharge, // Added
      formData.collectionCharge, // Added
      formData.insurancePerDay // Added
    );

    return totalCost;
  };

  const currentTotalCost = calculateCurrentTotalCost();
  const currentDiscountAmount = (currentTotalCost * (formData.discountPercentage || 0)) / 100;
  const currentFinalCostAfterDiscount = currentTotalCost - currentDiscountAmount; // Final amount *due* for the rental period itself
  const currentRemainingAmount = currentFinalCostAfterDiscount - (rental.paidAmount || 0); // How much is left considering what's already paid


  // --- Image Handling ---
  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    // Optional: Add logic here to delete the image from Firebase Storage if needed
  };

  // --- Submit Handler (Adapted for Update) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use selectedVehicle based on current formData.vehicleId for submission
    const submitSelectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
    const submitSelectedCustomer = customers.find(c => c.id === formData.customerId);

    if (!user || !submitSelectedVehicle || !submitSelectedCustomer) {
      toast.error('User, vehicle, or customer data missing.');
      return;
    }
    setLoading(true);

    try {
      // --- Date Parsing and Validation ---
       const submitStartDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
       const submitEndDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

       if (isNaN(submitStartDateTime.getTime()) || !formData.startDate || !formData.startTime) {
           throw new Error('Invalid Start Date or Time.');
       }
        if (isNaN(submitEndDateTime.getTime()) || !formData.endDate || !formData.endTime) {
           throw new Error('Invalid End Date or Time.');
       }
       if (isAfter(submitStartDateTime, submitEndDateTime)) {
          throw new Error('End Date cannot be before Start Date.');
       }

      // --- Cost Calculations (for submission, using final formData) ---

      // Storage Cost
      let submitStorageCost = 0;
      let submitStorageDays = 0;
      let storageStartDateObj: Date | null = null;
      let storageEndDateObj: Date | null = null;

      if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
        storageStartDateObj = new Date(formData.storageStartDate);
        storageEndDateObj = new Date(formData.storageEndDate);

        if (!isNaN(storageStartDateObj.getTime()) && !isNaN(storageEndDateObj.getTime()) && !isAfter(storageStartDateObj, storageEndDateObj)) {
            submitStorageDays = differenceInDays(storageEndDateObj, storageStartDateObj) + 1;
            const dailyCost = formData.storageCostPerDay || 0;
            submitStorageCost = submitStorageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
        } else {
             console.warn("Invalid storage dates provided during submit. Storage cost set to 0.");
             storageStartDateObj = null; // Invalidate if dates were wrong
             storageEndDateObj = null;
             submitStorageCost = 0;
             submitStorageDays = 0;
        }
      }

      // Standard Cost (Base rate without negotiation but WITH storage/recovery/delivery/collection/insurance for claims)
      const submitStandardCost = calculateRentalCost(
        submitStartDateTime,
        submitEndDateTime,
        formData.type,
        submitSelectedVehicle, // Use the selected vehicle
        formData.reason,
        undefined, // NO negotiated rate
        formData.type === 'claim' ? submitStorageCost : undefined,
        formData.type === 'claim' ? (formData.recoveryCost || 0) : undefined,
        formData.deliveryCharge || 0, // Include delivery
        formData.collectionCharge || 0, // Include collection
        formData.insurancePerDay || 0 // Include insurance
      );

      // Total Cost (Including negotiation and ALL additional charges, BEFORE discount)
      const negotiatedRateValue = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;
      const submitTotalCost = calculateRentalCost(
        submitStartDateTime,
        submitEndDateTime,
        formData.type,
        submitSelectedVehicle, // Use the selected vehicle
        formData.reason,
        negotiatedRateValue,
        formData.type === 'claim' ? submitStorageCost : undefined,
        formData.type === 'claim' ? (formData.recoveryCost || 0) : undefined,
        formData.deliveryCharge || 0,
        formData.collectionCharge || 0,
        formData.insurancePerDay || 0
      );

      // Discount Amount
      const submitDiscountAmount = (submitTotalCost * (formData.discountPercentage || 0)) / 100;

      // Final Cost (after discount, the amount the customer actually owes for the rental period)
      const submitFinalCostAfterDiscount = submitTotalCost - submitDiscountAmount;

      // --- Handle Payments ---
      const newPaymentAmount = parseFloat(formData.amountToAdd.toString()) || 0; // Use amountToAdd state
      const updatedTotalPaidAmount = (rental.paidAmount || 0) + newPaymentAmount;
      const updatedPayments: RentalPayment[] = [...(rental.payments || [])]; // Copy existing payments

      if (newPaymentAmount > 0) {
        updatedPayments.push({
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(),
          amount: newPaymentAmount,
          method: formData.paymentMethod,
          reference: formData.paymentReference || undefined,
          notes: formData.paymentNotes || undefined,
          createdAt: new Date(),
          createdBy: user.id,
        });
      }

      // Final Remaining Amount & Payment Status
      const submitRemainingAmount = submitFinalCostAfterDiscount - updatedTotalPaidAmount;
      const submitPaymentStatus = submitRemainingAmount <= 0.001 ? 'paid' :
                                  updatedTotalPaidAmount > 0 ? 'partially_paid' : 'pending';


      // --- Handle Images ---
      const newImageUrls = await Promise.all(
        newImages.map(async (file) => {
          const timestamp = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${rental.id}/${timestamp}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        })
      );
      const allImages = [...existingImages, ...newImageUrls]; // Combined list

      // --- Create updated check-out condition ---
       const updatedCondition: VehicleCondition = {
          type: 'check-out',
          date: rental.checkOutCondition?.date || new Date(), // Keep original date or set new if none
          mileage: conditionData.mileage || 0,
          fuelLevel: conditionData.fuelLevel || '100',
          isClean: conditionData.isClean === undefined ? true : conditionData.isClean,
          hasDamage: conditionData.hasDamage || false,
          damageDescription: conditionData.hasDamage ? (conditionData.damageDescription || '') : '',
          images: allImages,
          createdAt: rental.checkOutCondition?.createdAt || new Date(),
          createdBy: rental.checkOutCondition?.createdBy || user.id,
          id: rental.checkOutCondition?.id || `cond_${Date.now()}`, // Use existing or generate ID
          notes: conditionData.notes || rental.checkOutCondition?.notes || '', // Preserve notes
      };


      // --- Prepare Rental Data for Update ---
      const rentalUpdateData: Partial<Rental> = {
        vehicleId: formData.vehicleId, // Use potentially updated vehicleId
        customerId: formData.customerId, // Use potentially updated customerId
        startDate: submitStartDateTime,
        endDate: submitEndDateTime,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: submitFinalCostAfterDiscount, // Final amount due after discount
        standardCost: submitStandardCost, // Calculated standard cost
        paidAmount: updatedTotalPaidAmount, // Updated total paid
        remainingAmount: submitRemainingAmount,
        paymentStatus: submitPaymentStatus,
        payments: updatedPayments, // Updated payments array
        signature: formData.signature || null, // Use null if empty

        // Optional Fields
        claimRef: formData.claimRef || null,

        // Storage details (only add if applicable and cost > 0)
        storageStartDate: storageStartDateObj, // Store Date object or null
        storageEndDate: storageEndDateObj, // Store Date object or null
        storageCostPerDay: formData.type === 'claim' ? (formData.storageCostPerDay || 0) : null,
        storageDays: formData.type === 'claim' ? submitStorageDays : null,
        includeStorageVAT: formData.type === 'claim' ? formData.includeStorageVAT : null,
        storageCost: formData.type === 'claim' ? submitStorageCost : null, // Store calculated cost

        // Recovery cost (only add if applicable and > 0)
        recoveryCost: formData.type === 'claim' && formData.recoveryCost > 0 ? formData.recoveryCost : null,

        // New charges (delivery, collection, insurance - only add if > 0)
        deliveryCharge: formData.deliveryCharge > 0 ? formData.deliveryCharge : null,
        collectionCharge: formData.collectionCharge > 0 ? formData.collectionCharge : null,
        insurancePerDay: formData.insurancePerDay > 0 ? formData.insurancePerDay : null,

        // Negotiation details
        negotiatedRate: negotiatedRateValue ?? null,
        negotiationNotes: formData.negotiationNotes || null,

        // Discount details
        discountPercentage: formData.discountPercentage > 0 ? formData.discountPercentage : null,
        discountAmount: submitDiscountAmount > 0 ? submitDiscountAmount : null,
        discountNotes: formData.discountPercentage > 0 ? (formData.discountNotes || null) : null,

        // Weekly specific
        numberOfWeeks: formData.type === 'weekly' ? (formData.numberOfWeeks || 1) : null,

        // Update check-out condition
        checkOutCondition: updatedCondition,

        // System Fields
        updatedAt: new Date(),
        updatedBy: user.id,
      };

      // Update Firestore
      const rentalRef = doc(db, 'rentals', rental.id);
      await updateDoc(rentalRef, rentalUpdateData);

      // --- Generate and upload new documents ---
      // Merge the update data with the original rental for document generation context
      // Note: Ensure generateRentalDocuments can handle Partial<Rental> or cast if necessary
      const completeUpdatedRental = { ...rental, ...rentalUpdateData } as Rental; // Cast needed if types slightly differ
      try {
          const documents = await generateRentalDocuments(
              completeUpdatedRental,
              submitSelectedVehicle, // Use the selected vehicle for documents
              submitSelectedCustomer // Use the selected customer for documents
          );
          await uploadRentalDocuments(rental.id, documents);
          console.log("Rental documents regenerated and uploaded.");
      } catch (docError) {
          console.error("Error generating or uploading documents:", docError);
          // Non-fatal error: Inform user but proceed with rental update success
          toast.error("Rental updated, but failed to regenerate/upload documents.");
      }

      // --- Create finance transaction ONLY for the NEW payment added ---
      if (newPaymentAmount > 0) {
        try {
            await createFinanceTransaction({
              type: 'income',
              category: 'rental', // Ensure category matches
              amount: newPaymentAmount,
              description: `Additional rental payment for ${submitSelectedVehicle.make} ${submitSelectedVehicle.model} (${submitSelectedVehicle.registrationNumber}) - Rental ID: ${rental.id.substring(0, 6)}`,
              date: new Date(),
              referenceId: rental.id,
              vehicleId: submitSelectedVehicle.id, // Use the selected vehicle's ID
              customerId: submitSelectedCustomer.id, // Use the selected customer's ID
              paymentMethod: formData.paymentMethod,
              paymentReference: formData.paymentReference || null,
              status: 'completed', // Assume payment is completed
            });
            console.log("Finance transaction recorded for new payment.");
        } catch (financeError) {
            console.error("Error creating finance transaction:", financeError);
            // Non-fatal error: Inform user but proceed with rental update success
            toast.error("Rental updated, but failed to record finance transaction for new payment.");
        }
      }

      toast.success('Rental updated successfully!');
      onClose();

    } catch (error) {
      console.error('Error updating rental:', error);
      toast.error(`Failed to update rental: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }; 
  
  // --- Render Form ---
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Vehicle Search/Selection */}
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
             onBlur={() => setTimeout(() => setShowVehicleResults(false), 100)} // Hide results after a short delay
             placeholder="Search vehicles..."
             className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
             aria-autocomplete="list"
             aria-controls="vehicle-results"
           />
            {vehicleSearchQuery && (
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => {
                        setVehicleSearchQuery('');
                        setFormData(prev => ({ ...prev, vehicleId: '' }));
                         // Optional: Reset mileage if vehicle is cleared
                        // setConditionData(prev => ({ ...prev, mileage: 0 }));
                    }}
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
         </div>

         {/* Vehicle Search Results */}
         {showVehicleResults && (
           <div
             id="vehicle-results"
             className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
           >
             {loadingVehicles ? (
               <div className="px-4 py-2 text-sm text-gray-500">Loading vehicles...</div>
             ) : filteredVehicles.length > 0 ? (
               filteredVehicles.map((vehicle) => (
                 <div
                   key={vehicle.id}
                   className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                   onMouseDown={(e) => { // Use onMouseDown to trigger before onBlur hides results
                     e.preventDefault(); // Prevent input blur
                     setFormData((prev) => ({ ...prev, vehicleId: vehicle.id }));
                     setVehicleSearchQuery(`${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`);
                     setShowVehicleResults(false);
                     // Optionally set mileage when a vehicle is selected
                     // setConditionData(prev => ({ ...prev, mileage: vehicle.mileage || 0 }));
                   }}
                   role="option"
                   aria-selected={formData.vehicleId === vehicle.id}
                 >
                   <div className="flex items-center">
                     <Car className="h-5 w-5 text-gray-400 mr-2" />
                     <div>
                       <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                       <div className="text-sm text-gray-500">
                         {vehicle.registrationNumber}
                         {vehicle.weeklyRentalPrice && ` - ${formatCurrency(vehicle.weeklyRentalPrice)}/week`}
                       </div>
                     </div>
                     {formData.vehicleId === vehicle.id && (
                         <span className="ml-auto text-primary-600">Selected</span>
                     )}
                   </div>
                 </div>
               ))
             ) : (
               <div className="px-4 py-2 text-sm text-gray-500">No available vehicles found</div>
             )}
           </div>
         )}
          {/* Display current selection clearly if search results are hidden */}
           {!showVehicleResults && selectedVehicle && (
             <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
                <Car className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0" />
                <div>
                   <div className="font-semibold">{selectedVehicle.make} {selectedVehicle.model}</div>
                   <div className="text-sm text-gray-600">{selectedVehicle.registrationNumber}</div>
                 </div>
             </div>
           )}
          {!showVehicleResults && !selectedVehicle && formData.vehicleId && (
               <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
                   Warning: Vehicle with ID "{formData.vehicleId}" not found in the provided vehicle list.
               </div>
           )}
      </div>

      {/* Customer Search/Selection */}
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
             onBlur={() => setTimeout(() => setShowCustomerResults(false), 100)} // Hide results after a short delay
             placeholder="Search customers..."
             className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
             aria-autocomplete="list"
             aria-controls="customer-results"
           />
             {customerSearchQuery && (
                <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => {
                        setCustomerSearchQuery('');
                        setFormData(prev => ({ ...prev, customerId: '' }));
                    }}
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
         </div>

         {/* Customer Search Results */}
         {showCustomerResults && (
           <div
             id="customer-results"
             className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
           >
             {filteredCustomers.length > 0 ? (
               filteredCustomers.map((customer) => (
                 <div
                   key={customer.id}
                   className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                   onMouseDown={(e) => { // Use onMouseDown to trigger before onBlur hides results
                     e.preventDefault(); // Prevent input blur
                     setFormData((prev) => ({ ...prev, customerId: customer.id }));
                     setCustomerSearchQuery(`${customer.name} - ${customer.mobile}`);
                     setShowCustomerResults(false);
                   }}
                   role="option"
                   aria-selected={formData.customerId === customer.id}
                 >
                   <div className="flex items-center">
                     <div>
                       <div className="font-medium">{customer.name}</div>
                       <div className="text-sm text-gray-500">{customer.mobile}</div>
                     </div>
                     {formData.customerId === customer.id && (
                         <span className="ml-auto text-primary-600">Selected</span>
                     )}
                   </div>
                 </div>
               ))
             ) : (
               <div className="px-4 py-2 text-sm text-gray-500">No customers found</div>
             )}
           </div>
         )}
          {/* Display current selection clearly if search results are hidden */}
           {!showCustomerResults && selectedCustomer && (
             <div className="mt-2 p-3 bg-white border border-gray-300 rounded-md flex items-center">
                <div>
                   <div className="font-semibold">{selectedCustomer.name}</div>
                   <div className="text-sm text-gray-600">{selectedCustomer.mobile}</div>
                 </div>
             </div>
           )}
           {!showCustomerResults && !selectedCustomer && formData.customerId && (
               <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md text-sm text-yellow-800">
                   Warning: Customer with ID "{formData.customerId}" not found in the provided customer list.
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

        


        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />

        <FormField
          type="time"
          label="Start Time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />

        {/* End Date/Time logic based on type */}
        {formData.type !== 'weekly' && ( // Daily and Claim
          <>
            <FormField
              type="date"
              label="End Date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
              min={formData.startDate}
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              required
            />
          </>
        )}

         {/* --- Fields specific to CLAIM type (from RentalForm) --- */}
        {formData.type === 'claim' && (
          <>
            {/* Delivery Charge */}
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

            {/* Collection Charge */}
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

            {/* Insurance Per Day */}
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
              className="col-span-2" // Span across both columns
            />

            {/* Storage Details Section (from RentalForm) */}
            <div className="col-span-2 border-t pt-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  type="date"
                  label="Storage Start Date"
                  value={formData.storageStartDate}
                  onChange={(e) => setFormData({ ...formData, storageStartDate: e.target.value })}
                />

                <FormField
                  type="date"
                  label="Storage End Date"
                  value={formData.storageEndDate}
                  onChange={(e) => setFormData({ ...formData, storageEndDate: e.target.value })}
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

                {/* Storage Cost Calculation Display (from RentalForm) */}
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

            {/* Recovery Cost */}
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
              className="col-span-2" // Span across both columns
            />
          </>
        )}

        {/* --- Fields specific to WEEKLY type (from RentalForm) --- */}
        {formData.type === 'weekly' && (
          <>
            <FormField
              type="number"
              label="Number of Weeks"
              value={formData.numberOfWeeks}
              onChange={(e) => setFormData(prev => ({
                  ...prev,
                   // Let useEffect handle date calculation based on weeks
                  numberOfWeeks: parseInt(e.target.value) || 1
              }))}
              min="1"
              required
            />
             {/* Optional End Date/Time override for weekly */}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <FormField
                type="date"
                label="End Date (Auto-calculated)"
                value={formData.endDate} // Display calculated date
                 onChange={(e) => {
                     // Allow override, but recalculate weeks
                     const newEndDate = e.target.value;
                     setFormData(prev => {
                         let weeks = prev.numberOfWeeks;
                         if(prev.startDate && prev.startTime && newEndDate && prev.endTime) {
                             const start = new Date(`${prev.startDate}T${prev.startTime}`);
                             const end = new Date(`${newEndDate}T${prev.endTime}`);
                             if(!isNaN(start.getTime()) && !isNaN(end.getTime()) && !isAfter(start, end)) {
                                 weeks = Math.max(1, Math.ceil(differenceInDays(end, start) / 7)); // Ensure at least 1 week
                             }
                         }
                         return {
                           ...prev,
                           endDate: newEndDate,
                           numberOfWeeks: weeks
                         }
                     });
                 }}
                min={formData.startDate}
                // Consider making readOnly if strict calculation is desired
              />
              <FormField
                type="time"
                label="End Time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  endTime: e.target.value
                }))}
              />
            </div>
          </>
        )}

      </div> {/* End of main grid */}


      {/* Negotiation Section (from RentalForm/Edit) */}
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
            <TextArea
                label="Negotiation Notes"
                value={formData.negotiationNotes}
                onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
                rows={2}
                placeholder="Add notes about rate negotiation..."
              />
          )}
        </div>
      </div>

      {/* Discount Section (from RentalForm/Edit) */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Discount</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Discount Percentage"
            value={formData.discountPercentage}
            onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
            min="0"
            max="100"
            step="0.1"
          />

          {formData.discountPercentage > 0 && (
             <TextArea
                label="Discount Notes"
                value={formData.discountNotes}
                onChange={(e) => setFormData({ ...formData, discountNotes: e.target.value })}
                rows={2}
                placeholder="Add notes about the discount..."
                required={formData.discountPercentage > 0} // Require if discount applied
              />
          )}
        </div>
      </div>

      {/* --- COST SUMMARY (Structure from RentalForm) --- */}
      <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">

                {/* Base Cost (calculated WITHOUT additional charges) */}
                <div className="flex justify-between text-sm">
                    <span>Base Rental Cost:</span>
                    <span className="font-medium">{formatCurrency(calculateRentalCost(
                        new Date(`${formData.startDate}T${formData.startTime}`),
                        new Date(`${formData.endDate}T${formData.endTime}`),
                        formData.type,
                        selectedVehicle,
                        formData.reason,
                        formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined,
                        0, 0, 0, 0, 0 // Base cost doesn't include extras here
                    ))}</span>
                </div>

                {/* Storage Cost */}
                {formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate && formData.storageCostPerDay > 0 && (
                    <div className="flex justify-between text-sm">
                    <span>Storage Cost ({formData.storageDays || 0} days):</span>
                    <span className="font-medium">{formatCurrency(
                        (formData.storageDays || 0) * (formData.storageCostPerDay || 0) * (formData.includeStorageVAT ? 1.2 : 1)
                    )}</span>
                    </div>
                )}

                {/* Recovery Cost */}
                {formData.type === 'claim' && formData.recoveryCost > 0 && (
                    <div className="flex justify-between text-sm">
                    <span>Recovery Cost:</span>
                    <span className="font-medium">{formatCurrency(formData.recoveryCost)}</span>
                    </div>
                )}

                {/* Delivery Charge */}
                {formData.deliveryCharge > 0 && (
                    <div className="flex justify-between text-sm">
                    <span>Delivery Charge:</span>
                    <span className="font-medium">{formatCurrency(formData.deliveryCharge)}</span>
                    </div>
                )}

                {/* Collection Charge */}
                {formData.collectionCharge > 0 && (
                    <div className="flex justify-between text-sm">
                    <span>Collection Charge:</span>
                    <span className="font-medium">{formatCurrency(formData.collectionCharge)}</span>
                    </div>
                )}

                {/* Insurance Cost */}
                {formData.insurancePerDay > 0 && formData.startDate && formData.endDate && (
                    () => {
                        const start = new Date(formData.startDate);
                        const end = new Date(formData.endDate);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && !isAfter(start, end)) {
                            const days = differenceInDays(end, start) + 1;
                            const insuranceCost = days * formData.insurancePerDay;
                            return (
                                <div className="flex justify-between text-sm">
                                    <span>Insurance ({days} days):</span>
                                    <span className="font-medium">{formatCurrency(insuranceCost)}</span>
                                </div>
                            );
                        }
                        return null;
                    })()
                }

                {/* Subtotal before discount */}
                <div className="flex justify-between text-sm pt-2 border-t">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(currentTotalCost)}</span>
                </div>

                {/* Discount */}
                {formData.discountPercentage > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({formData.discountPercentage}%):</span>
                    <span>-{formatCurrency(currentDiscountAmount)}</span>
                    </div>
                )}

                {/* Final Amount Due for Rental Period */}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t mt-2">
                    <span>Total Amount Due:</span>
                    <span className="font-medium">{formatCurrency(currentFinalCostAfterDiscount)}</span>
                </div>

                {/* Amount Already Paid */}
                <div className="flex justify-between text-sm text-green-600">
                    <span>Amount Paid (Previously):</span>
                    <span>{formatCurrency(rental.paidAmount || 0)}</span>
                </div>

                {/* Remaining Amount (Current) */}
                <div className="flex justify-between text-sm font-medium text-red-600">
                    <span>Remaining Amount Due:</span>
                    <span>{formatCurrency(currentRemainingAmount)}</span>
                </div>

                 {/* Payment Status Display */}
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Payment Status:</span>
                     {/* Status calculated based on total paid vs total due */}
                    <span className={`capitalize font-semibold ${
                        (rental.paidAmount || 0) >= currentFinalCostAfterDiscount - 0.001 ? 'text-green-600' :
                        (rental.paidAmount || 0) > 0 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                        {(rental.paidAmount || 0) >= currentFinalCostAfterDiscount - 0.001 ? 'Paid' :
                        (rental.paidAmount || 0) > 0 ? 'Partially Paid' : 'Pending'}
                    </span>
                 </div>
            </div>
       </div>


      {/* Vehicle Condition Section (from Edit) */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Check-Out Condition</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Mileage at Check-Out"
            value={conditionData.mileage}
            onChange={(e) => setConditionData({ ...conditionData, mileage: parseInt(e.target.value) || 0 })}
            min={selectedVehicle?.mileage} // Min should be vehicle's base mileage
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
                required={conditionData.hasDamage} // Require if damage is checked
              />
            )}
          </div>

           {/* Existing Images */}
           {existingImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existing Images ({existingImages.length})
              </label>
              <div className="grid grid-cols-3 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Condition ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(url)}
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

          {/* New Images Upload */}
          <FileUpload
            label="Add New Condition Images"
            accept="image/*"
            multiple
            onChange={setNewImages} // Pass the setter directly
            showPreview
          />
        </div>
      </div>

      {/* Payment Addition Section (from Edit) */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Payment</h3>
         <p className="text-sm text-gray-500 mb-3">Record a new payment made towards this rental's balance.</p>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Amount to Add (£)" // Changed label
            value={formData.amountToAdd} // Use dedicated state field
            onChange={(e) => setFormData({ ...formData, amountToAdd: parseFloat(e.target.value) || 0 })}
            min="0"
             // Max can be the remaining amount, provide feedback if exceeded
            max={Math.max(0, currentRemainingAmount)} // Prevent negative max
            step="0.01"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              disabled={formData.amountToAdd <= 0} // Disable if no amount entered
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
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="Transaction ID, check number, etc."
            disabled={formData.amountToAdd <= 0}
          />

          <TextArea
            label="Payment Notes (Optional)"
            value={formData.paymentNotes}
            onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
            rows={2}
            placeholder="Notes about this specific payment"
            disabled={formData.amountToAdd <= 0}
          />
        </div>
      </div>

      {/* Customer Signature (from Edit) */}
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
         <p className="text-sm text-gray-500 mb-3">If changes require re-confirmation, ask the customer to sign again.</p>
        <SignaturePad
          value={formData.signature} // Bind to state
          onChange={(signature) => setFormData({ ...formData, signature })} // Update state
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
          disabled={loading || !selectedVehicle || !selectedCustomer} // Disable if loading or essential data missing
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
