import React, { useState, useEffect } from 'react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

import { Vehicle, Customer, Claim } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, format, differenceInDays, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import { Search, Car } from 'lucide-react';
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
    endDate: '',
    endTime: '',
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
    // ---> NEW: Add new charge fields <---
    deliveryCharge: 0, // Keep as number
    collectionCharge: 0, // Keep as number
    insurancePerDay: 0, // Keep as number
    claimRef: '',
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
    formData.startDate ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
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
     if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || isAfter(startDateTime, endDateTime)) {
       return 0; // Return 0 for invalid date range
     }
  
    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;
  
    // Calculate storage cost separately ONLY if needed (e.g., for display or specific logic)
    // Note: The main calculateRentalCost now includes this internally if passed
    let calculatedStorageCost = 0;
    if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
      const storageStart = new Date(formData.storageStartDate);
      const storageEnd = new Date(formData.storageEndDate);
       if (!isNaN(storageStart.getTime()) && !isNaN(storageEnd.getTime()) && !isAfter(storageStart, storageEnd)) {
          const storageDays = differenceInDays(storageEnd, storageStart) + 1;
          const dailyCost = formData.storageCostPerDay || 0;
          calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1);
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
      formData.insurancePerDay
    );
  
    return totalCost;
  };
  
  // Calculate costs (Reverting variable names for JSX display)
  const totalCost = calculateTotalCost(); // <--- RENAME THIS BACK
  const discountAmount = (totalCost * (formData.discountPercentage || 0)) / 100; // Update calculation to use 'totalCost'
  const finalCostAfterDiscount = totalCost - discountAmount; // Calculate final cost
  const remainingAmount = finalCostAfterDiscount - (formData.paidAmount || 0); // Update calculation to use 'finalCostAfterDiscount'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
  
    // --- Initial Checks ---
    if (!user) {
      toast.error("You must be logged in to create a rental.");
      return;
    }
    // Retrieve selected vehicle and customer from state/props (ensure they exist)
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
  
    setLoading(true); // Set loading state
  
    try {
      // --- Date Parsing and Validation ---
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
  
      if (isNaN(startDateTime.getTime()) || !formData.startDate) {
          throw new Error('Invalid Start Date or Time.');
      }
       if (isNaN(endDateTime.getTime()) || !formData.endDate) {
          throw new Error('Invalid End Date or Time.');
      }
      if (isAfter(startDateTime, endDateTime)) {
         throw new Error('End Date cannot be before Start Date.');
      }
  
      // --- Cost Calculations ---
  
      // Calculate Storage Cost (only if applicable and dates are valid)
      let calculatedStorageCost = 0;
      let storageDays = 0;
      let storageStartDateObj: Date | undefined;
      let storageEndDateObj: Date | undefined;
  
       if (formData.type === 'claim' && formData.storageStartDate && formData.storageEndDate) {
          storageStartDateObj = new Date(formData.storageStartDate);
          storageEndDateObj = new Date(formData.storageEndDate);
  
          if (!isNaN(storageStartDateObj.getTime()) && !isNaN(storageEndDateObj.getTime()) && !isAfter(storageStartDateObj, storageEndDateObj)) {
              // Calculate days inclusive
              storageDays = differenceInDays(storageEndDateObj, storageStartDateObj) + 1;
              const dailyCost = formData.storageCostPerDay || 0;
              calculatedStorageCost = storageDays * dailyCost * (formData.includeStorageVAT ? 1.2 : 1); // Apply VAT if checked
          } else {
               console.warn("Invalid storage dates provided for cost calculation in submit. Storage cost set to 0.");
               storageStartDateObj = undefined; // Invalidate if dates were wrong
               storageEndDateObj = undefined;
               calculatedStorageCost = 0;
               storageDays = 0;
          }
       }
  
      // Calculate Standard Cost (Base rate without negotiation or specific extra charges, but WITH storage/recovery for claims)
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        selectedVehicle,
        formData.reason,
        undefined, // NO negotiated rate for standard cost
        formData.type === 'claim' ? calculatedStorageCost : undefined, // Include calculated storage if claim
        formData.type === 'claim' ? (formData.recoveryCost || 0) : undefined, // Include recovery if claim
        undefined, // NO delivery charge for standard cost
        undefined, // NO collection charge for standard cost
        undefined  // NO insurance per day for standard cost
      );
  
      // Calculate Total Cost (Including negotiation and ALL additional charges, BEFORE discount)
      // Ensure calculateTotalCost() is defined in the component scope and uses the updated calculateRentalCost utility
      const totalCost = calculateTotalCost(); // Uses the component's calculateTotalCost function which calls the utility
  
      // Calculate Discount Amount
      const discountAmount = (totalCost * (formData.discountPercentage || 0)) / 100;
  
      // Calculate Final Cost (after discount, the amount the customer actually owes before payments)
      const finalCostToSave = totalCost - discountAmount;
  
      // Calculate Remaining Amount
      const finalRemainingAmount = finalCostToSave - (formData.paidAmount || 0);
  
      // --- Create Initial Payment Record ---
      const payments: RentalPayment[] = []; // Use RentalPayment type if defined
      if (formData.paidAmount > 0) {
        payments.push({
          // Consider using a UUID library for more robust IDs
          id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date(), // Payment date is now
          amount: formData.paidAmount,
          method: formData.paymentMethod,
          reference: formData.paymentReference || undefined, // Use undefined if empty string
          notes: formData.paymentNotes || undefined, // Use undefined if empty string
          createdAt: new Date(),
          createdBy: user.id,
          // Ensure all required fields from RentalPayment type are included
        });
      }
  
      // --- Prepare Rental Data for Firestore ---
      const rentalData: Omit<Rental, 'id' | 'updatedAt' | 'checkOutCondition' | 'checkInCondition' | 'returnCondition'> & { updatedAt: Date } = { // Adjust type based on exact Rental definition
        vehicleId: formData.vehicleId,
        customerId: formData.customerId,
        startDate: startDateTime, // Store as Timestamp/Date
        endDate: endDateTime,     // Store as Timestamp/Date
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: finalCostToSave, // Final amount due after discount
        standardCost: standardCost, // Calculated standard cost
        paidAmount: formData.paidAmount || 0,
        remainingAmount: finalRemainingAmount, // Remaining amount after payment & discount
        paymentStatus: finalRemainingAmount <= 0.001 ? 'paid' : // Use small tolerance for float comparison
                      (formData.paidAmount || 0) > 0 ? 'partially_paid' : 'pending',
        payments, // Array of payment objects
        signature: formData.signature || undefined, // Use undefined if empty
  
        // Optional Fields - Use conditional spreading
        ...(formData.claimRef && { claimRef: formData.claimRef }),
  
        // Storage details (only add if applicable and cost > 0, use validated dates)
        ...(formData.type === 'claim' && calculatedStorageCost > 0 && storageStartDateObj && storageEndDateObj && {
          storageStartDate: storageStartDateObj,
          storageEndDate: storageEndDateObj,
          storageCostPerDay: formData.storageCostPerDay || 0,
          storageDays: storageDays,
          includeStorageVAT: formData.includeStorageVAT,
          storageCost: calculatedStorageCost // Store the calculated cost
        }),
  
        // Recovery cost (only add if applicable and > 0)
        ...(formData.type === 'claim' && formData.recoveryCost > 0 && {
          recoveryCost: formData.recoveryCost
        }),
  
        // New charges (delivery, collection, insurance - only add if > 0)
        ...(formData.deliveryCharge > 0 && { deliveryCharge: formData.deliveryCharge }),
        ...(formData.collectionCharge > 0 && { collectionCharge: formData.collectionCharge }),
        ...(formData.insurancePerDay > 0 && { insurancePerDay: formData.insurancePerDay }),
  
        // Negotiation details if applicable
        ...(formData.negotiatedRate ? {
          negotiatedRate: parseFloat(formData.negotiatedRate),
          negotiationNotes: formData.negotiationNotes || null // Use null if empty string
        } : {
          negotiatedRate: null, // Explicitly set to null if not provided
          negotiationNotes: null
        }),
  
        // Discount details if applicable
        ...(formData.discountPercentage > 0 ? {
          discountPercentage: formData.discountPercentage,
          discountAmount: discountAmount, // Store calculated discount amount
          discountNotes: formData.discountNotes || null // Use null if empty string
        } : {
          discountPercentage: null, // Explicitly set to null
          discountAmount: null,
          discountNotes: null
        }),
  
        // System Fields
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date(), // Set updatedAt on creation
        updatedBy: user.id,   // Set updatedBy on creation
        // ongoingCharges might need calculation/setting if used elsewhere
        ongoingCharges: 0, // Default or calculate if needed
        // Add defaults for other potentially mandatory fields from Rental type
        documents: {},
        extensionHistory: [],
        paymentMethod: formData.paymentMethod, // Save payment method used for initial payment?
        paymentReference: formData.paymentReference?.trim() || null,
        // Check if other fields like checkOutCondition, returnCondition need initial empty state
      };
  
      // --- Save to Firestore ---
      const docRef = await addDoc(collection(db, 'rentals'), rentalData);
      console.log("Rental document created successfully with ID: ", docRef.id);
  
      // --- Generate/Upload Documents ---
      // Note: Pass the prepared `rentalData` along with the new ID
      try {
        console.log("Generating rental documents...");
        const documents = await generateRentalDocuments(
          { id: docRef.id, ...rentalData } as any,
          selectedVehicle,
          selectedCustomer
        );
        console.log("Documents generated, uploading...");
        await uploadRentalDocuments(docRef.id, documents);
        console.log("Documents uploaded successfully");
      } catch (docError) {
        console.error("Error generating or uploading documents:", docError);
        toast.error("Rental created, but failed to generate documents: " + docError.message);
      }
  
      // --- Create Finance Transaction (If payment made) ---
      if (formData.paidAmount > 0) {
         try {
             await createFinanceTransaction({
               type: 'income',
               category: 'rental',
               amount: formData.paidAmount,
               description: `Rental payment for ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber}) - Rental ID: ${docRef.id.substring(0, 6)}`,
               date: new Date(), // Date of the transaction
               referenceId: docRef.id, // Link to the rental document
               vehicleId: selectedVehicle.id,
               customerId: selectedCustomer.id,
               paymentMethod: formData.paymentMethod,
               paymentReference: formData.paymentReference || null,
               status: 'completed',
               // Ensure this matches the expected type for createFinanceTransaction
             });
              console.log("Finance transaction recorded.");
         } catch (financeError) {
              console.error("Error creating finance transaction:", financeError);
              // Non-fatal error: Inform user but proceed
              toast.error("Rental created, but failed to record finance transaction.");
         }
      }
  
      // --- Success Feedback and Cleanup ---
      toast.success('Rental created successfully!');
      onClose(); // Close the form/modal
  
    } catch (error) {
      // --- Error Handling ---
      console.error('Error creating rental:', error);
      // Display specific error message if available
      toast.error(`Failed to create rental: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // --- Final Cleanup ---
      setLoading(false); // Ensure loading state is turned off
    }
  };

  // Update end date when type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = addWeeks(startDateTime, formData.numberOfWeeks);
      
      setFormData(prev => ({
        ...prev,
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: formData.startTime
      }));
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

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

        {formData.type === 'daily' && (
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

        
        {formData.type === 'claim' && (
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
      className="col-span-2" // Example: make it span full width if needed
    />

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
      className="col-span-2" // Example: make it span full width if needed
    />

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
      className="col-span-2" // Example: make it span full width if needed
    />
  
            <div className="border-t pt-4 mt-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Storage Start Date"
          value={formData.storageStartDate}
          onChange={(e) => {
            const startDate = new Date(e.target.value);
            const endDate = formData.storageEndDate ? new Date(formData.storageEndDate) : null;
            
            setFormData(prev => ({
              ...prev,
              storageStartDate: e.target.value,
              storageDays: endDate ? 
                Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
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
            const startDate = formData.storageStartDate ? new Date(formData.storageStartDate) : null;
            const endDate = new Date(e.target.value);
            
            setFormData(prev => ({
              ...prev,
              storageEndDate: e.target.value,
              storageDays: startDate ? 
                Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 
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
                  const endDateTime = addWeeks(startDateTime, weeks);
                  return {
                    ...prev,
                    numberOfWeeks: weeks,
                    endDate: endDateTime.toISOString().split('T')[0],
                    endTime: prev.startTime
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
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  endDate: e.target.value,
                  // Recalculate number of weeks based on new end date
                  numberOfWeeks: Math.ceil(
                    differenceInDays(
                      new Date(`${e.target.value}T${prev.endTime}`),
                      new Date(`${prev.startDate}T${prev.startTime}`)
                    ) / 7
                  )
                }))}
                min={formData.startDate}
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
            onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
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
              0, 0, 0, 0, 0
            ))}
          </span>
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

    {/* ---> NEW: Display Delivery Charge <--- */}
    {formData.deliveryCharge > 0 && (
      <div className="flex justify-between text-sm">
        <span>Delivery Charge:</span>
        <span className="font-medium">{formatCurrency(formData.deliveryCharge)}</span>
      </div>
    )}

    {/* ---> NEW: Display Collection Charge <--- */}
    {formData.collectionCharge > 0 && (
      <div className="flex justify-between text-sm">
        <span>Collection Charge:</span>
        <span className="font-medium">{formatCurrency(formData.collectionCharge)}</span>
      </div>
    )}

    {/* ---> NEW: Display Insurance Cost <--- */}
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
        })() // Immediately invoke the function
    }

    {/* Subtotal before discount */}
    <div className="flex justify-between text-sm pt-2 border-t">
        <span>Subtotal:</span>
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
              onChange={(e) => setConditionData({ ...conditionData, mileage: parseInt(e.target.value) })}
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
              label="Vehicle Condition Images"
              accept="image/*"
              multiple
              onChange={setImages}
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
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) })}
            min="0"
            max={totalCost - discountAmount}
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