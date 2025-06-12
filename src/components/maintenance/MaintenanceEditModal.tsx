import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateCosts } from '../../utils/maintenanceCostUtils';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FileUpload from '../ui/FileUpload';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import toast from 'react-hot-toast';
import { formatDateForInput, ensureValidDate } from '../../utils/dateHelpers';
import { addYears } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { uploadMaintenanceAttachments } from '../../utils/maintenanceUpload';

interface MaintenanceEditModalProps {
  log: MaintenanceLog;
  vehicles: Vehicle[];
  onClose: () => void;
}

interface PartSuggestion {
  name: string;
  lastCost: number;
}

const MaintenanceEditModal: React.FC<MaintenanceEditModalProps> = ({ log, vehicles, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<(Part & { includeVAT: boolean })[]>(
    log.parts.map(part => ({
      ...part,
      includeVAT: log.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false
    })) || []
  );
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(log.vatDetails?.laborVAT || false);
  const [paidAmount, setPaidAmount] = useState(log.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState(log.paymentMethod || 'cash');
  const [paymentReference, setPaymentReference] = useState(log.paymentReference || '');
  const [existingTransaction, setExistingTransaction] = useState<any | null>(null);
  const [amountToPay, setAmountToPay] = useState('0');
  const { formatCurrency } = useFormattedDisplay();
  const [attachments, setAttachments] = useState<(File | string)[]>(
    log.attachments?.map(a => a.url) || []
  );
  const [partSuggestions, setPartSuggestions] = useState<PartSuggestion[]>([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState<boolean[]>([]); // To control visibility per part input


  const [formData, setFormData] = useState({
    type: log.type,
    description: log.description,
    serviceProvider: log.serviceProvider,
    location: log.location,
    date: formatDateForInput(log.date),
    currentMileage: log.currentMileage,
    laborHours: log.laborHours,
    laborRate: log.laborRate,
    nextServiceMileage: log.nextServiceMileage,
    nextServiceDate: formatDateForInput(log.nextServiceDate) || formatDateForInput(addYears(log.date, 1)),
    notes: log.notes || '',
    status: log.status
  });

  // Fetch existing transaction when component mounts
  useEffect(() => {
    const fetchExistingTransaction = async () => {
      try {
        const transactionsRef = collection(db, 'transactions');
        const q = query(
          transactionsRef,
          where('referenceId', '==', log.id),
          where('category', '==', 'maintenance')
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setExistingTransaction({
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          });
        }
      } catch (error) {
        console.error('Error fetching existing transaction:', error);
      }
    };

    fetchExistingTransaction();
  }, [log.id]);

  // Fetch part suggestions
  useEffect(() => {
    const fetchPartSuggestions = async () => {
      try {
        const q = query(collection(db, 'maintenanceLogs'));
        const querySnapshot = await getDocs(q);
        const allParts: { [key: string]: number } = {}; // Store latest cost for each part

        querySnapshot.forEach((doc) => {
          const log = doc.data() as MaintenanceLog;
          log.parts.forEach(part => {
            allParts[part.name.toLowerCase()] = part.cost; // Store latest cost
          });
        });

        const suggestions: PartSuggestion[] = Object.keys(allParts).map(name => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize for display
          lastCost: allParts[name]
        }));
        setPartSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching part suggestions:', error);
      }
    };

    fetchPartSuggestions();
  }, []);

  // Initialize showPartSuggestions array when parts change
  useEffect(() => {
    setShowPartSuggestions(new Array(parts.length).fill(false));
  }, [parts.length]);


  const costs = calculateCosts(parts, formData.laborHours, formData.laborRate, includeVATOnLabor);
  const remainingAmount = parseFloat(
    (costs.totalAmount - paidAmount).toFixed(2)
  );


  const paymentStatus = paidAmount >= costs.totalAmount ? 'paid' :
    paidAmount > 0 ? 'partially_paid' : 'unpaid';

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      value = Math.round(value * 100) / 100; // Ensures only two decimal places
      setPaidAmount(value);
    } else {
      setPaidAmount(0);
    }
  };

  const handlePartNameChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], name: e.target.value };
    setParts(newParts);
    // Show suggestions when typing
    const newShowSuggestions = [...showPartSuggestions];
    newShowSuggestions[index] = true;
    setShowPartSuggestions(newShowSuggestions);
  };

  const handlePartNameSelect = (suggestion: PartSuggestion, index: number) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], name: suggestion.name, cost: suggestion.lastCost };
    setParts(newParts);
    // Hide suggestions after selection
    const newShowSuggestions = [...showPartSuggestions];
    newShowSuggestions[index] = false;
    setShowPartSuggestions(newShowSuggestions);
  };

  const handlePartInputFocus = (index: number) => {
    const newShowSuggestions = [...showPartSuggestions];
    newShowSuggestions[index] = true;
    setShowPartSuggestions(newShowSuggestions);
  };

  const handlePartInputBlur = (index: number) => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      const newShowSuggestions = [...showPartSuggestions];
      newShowSuggestions[index] = false;
      setShowPartSuggestions(newShowSuggestions);
    }, 100);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'maintenanceLogs', log.id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Maintenance log not found');
      }

      const selectedVehicle = vehicles.find(v => v.id === log.vehicleId);
      if (!selectedVehicle) throw new Error('Vehicle not found');

      // Calculate new payment amounts
      const additionalPayment = parseFloat(amountToPay) || 0;
      const totalPaidAmount = paidAmount;
      const remainingAmount = costs.totalAmount - totalPaidAmount;
      const paymentStatus = totalPaidAmount >= costs.totalAmount ? 'paid' :
        totalPaidAmount > 0 ? 'partially_paid' : 'unpaid';

      // Update maintenance log
      const maintenanceData = {
        ...formData,
        type: formData.type,
        description: formData.description,
        serviceProvider: formData.serviceProvider,
        location: formData.location,
        date: new Date(formData.date),
        currentMileage: formData.currentMileage,
        nextServiceMileage: formData.nextServiceMileage,
        nextServiceDate: new Date(formData.nextServiceDate || addYears(new Date(formData.date), 1)),
        parts: parts.map(({ includeVAT, ...part }) => part),
        laborHours: formData.laborHours,
        laborRate: formData.laborRate,
        laborCost: costs.laborTotal,
        cost: costs.totalAmount,
        paidAmount: totalPaidAmount,
        remainingAmount,
        paymentStatus,
        paymentMethod,
        paymentReference,
        status: formData.status,
        notes: formData.notes,
        vatDetails: {
          partsVAT: parts.map(part => ({
            partName: part.name,
            includeVAT: part.includeVAT
          })),
          laborVAT: includeVATOnLabor
        },
        updatedAt: new Date(),
        updatedBy: user.id
      };

      await updateDoc(docRef, maintenanceData);

      const newFiles = attachments.filter(f => f instanceof File) as File[];
      if (newFiles.length) {
        await uploadMaintenanceAttachments(log.id, newFiles);
      }


      // Handle finance transaction
      if (additionalPayment > 0) {
        if (existingTransaction) {
          // Update existing transaction
          await updateDoc(doc(db, 'transactions', existingTransaction.id), {
            amount: existingTransaction.amount + additionalPayment,
            description: `Updated maintenance payment for ${formData.description}`,
            paymentMethod,
            paymentReference,
            paymentStatus,
            updatedAt: new Date()
          });

          toast.success('Maintenance and transaction updated successfully');
        } else {
          // Create new transaction
          await createFinanceTransaction({
            type: 'expense',
            category: 'maintenance',
            amount: additionalPayment,
            description: `Maintenance payment for ${formData.description}`,
            referenceId: log.id,
            vehicleId: log.vehicleId,
            vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
            paymentMethod,
            paymentReference,
            paymentStatus
          });

          toast.success('Maintenance updated and transaction created successfully');
        }
      } else {
        toast.success('Maintenance updated successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error updating maintenance log:', error);
      toast.error('Failed to update maintenance log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SearchableSelect
        label="Vehicle"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={log.vehicleId}
        onChange={() => { }}
        placeholder="Search vehicles by make, model or registration..."
        disabled={true}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="yearly-service">Yearly Service</option>
          <option value="mileage-service">Mileage Service</option>
          <option value="repair">Repair</option>
          <option value="emergency-repair">Emergency Repair</option>
          <option value="mot">MOT</option>
          <option value="nsl">NSL</option>
          <option value="tfl">TFL</option>
          <option value="service">Service</option>
          <option value="maintenance">Maintenance</option>
          <option value="bodywork">Bodywork</option>
          <option value="accident-repair">Accident Repair</option>
          <option value="oil-change">Oil Change</option>
          <option value="brake-service">Brake Service</option>
          <option value="tire-replacement">Tire Replacement</option>
          <option value="battery-check">Battery Check</option>
          <option value="engine-diagnostics">Engine Diagnostics</option>
          <option value="air-conditioning-service">Air Conditioning Service</option>
          <option value="wheel-alignment">Wheel Alignment</option>
          <option value="transmission-service">Transmission Service</option>
          <option value="exhaust-repair">Exhaust Repair</option>
          <option value="suspension-check">Suspension Check</option>
          <option value="coolant-flush">Coolant Flush</option>
          <option value="filter-replacement">Filter Replacement</option>
          <option value="windscreen-repair">Windscreen Repair</option>
          <option value="software-update">Software Update</option>
          <option value="recall-service">Recall Service</option>
          <option value="erad">ERAD</option>
          <option value="driveshaft">Driveshaft</option>
          <option value="iem">IEM</option>
          <option value="hv-battery">HV Battery</option>
          <option value="lower-arms">Lower Arms</option>
          <option value="steering-passiv">Steering Passive</option>
          <option value="brake-vacuum-pump">Brake Vacuum Pump</option>
          <option value="brake-servo">Brake Servo</option>
          <option value="anti-rubber-bushes">Anti-Rubber Bushes</option>
          <option value="auto-handbrake-failure">Auto Handbrake Failure</option>
          <option value="taxi-meter">Taxi Meter</option>
          <option value="car-wash">Car Wash</option>
          <option value="full-valeting">Full Valeting</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Service Center</label>
          <ServiceCenterDropdown
            value={formData.serviceProvider}
            onChange={(center) => {
              setFormData({
                ...formData,
                serviceProvider: center.name,
                location: `${center.address}, ${center.postcode}`,
                laborRate: center.hourlyRate
              });
            }}
            onInputChange={(value) => setFormData({ ...formData, serviceProvider: value })}
          />
        </div>

        <FormField
          type="number"
          label="Current Mileage"
          value={formData.currentMileage}
          onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) })}
          required
          min="0"
        />

        <FormField
          type="number"
          label="Next Service Mileage"
          value={formData.nextServiceMileage}
          onChange={(e) => setFormData({ ...formData, nextServiceMileage: parseInt(e.target.value) })}
          required
          min={formData.currentMileage}
        />

        <FormField
          type="date"
          label="Next Service Date"
          value={formData.nextServiceDate}
          onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Parts Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Parts</label>
          <button
            type="button"
            onClick={() => setParts([...parts, { name: '', quantity: 1, cost: 0, includeVAT: false }])}
            className="text-sm text-primary hover:text-primary-600 px-3 py-1 border border-primary rounded-md"
          >
            Add Part
          </button>
        </div>
        <div className="space-y-3">
          {parts.map((part, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50">
              <div className="relative col-span-1 sm:col-span-2"> {/* Part Name takes more space */}
                <FormField
                  label="Part Name"
                  value={part.name}
                  onChange={(e) => handlePartNameChange(e, index)}
                  onFocus={() => handlePartInputFocus(index)}
                  onBlur={() => handlePartInputBlur(index)}
                  placeholder="Part name"
                  inputClassName="w-full" // Ensure input fills the FormField
                />
                {showPartSuggestions[index] && part.name && partSuggestions.filter(
                  suggestion => suggestion.name.toLowerCase().includes(part.name.toLowerCase())
                ).length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {partSuggestions
                        .filter(suggestion =>
                          suggestion.name.toLowerCase().includes(part.name.toLowerCase())
                        )
                        .map((suggestion, i) => (
                          <li
                            key={i}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onMouseDown={() => handlePartNameSelect(suggestion, index)} // Use onMouseDown to prevent blur before click
                          >
                            {suggestion.name} <span className="text-gray-500 text-sm">(Last cost: {formatCurrency(suggestion.lastCost)})</span>
                          </li>
                        ))}
                    </ul>
                  )}
              </div>
              <FormField
                type="number"
                label="Quantity"
                value={part.quantity}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, quantity: parseInt(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min="1"
                inputClassName="w-full"
              />
              <FormField
                type="number"
                label="Price"
                value={part.cost}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, cost: parseFloat(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min="0"
                step="0.01"
                inputClassName="w-full"
              />
              <div className="flex items-center space-x-4 col-span-1 sm:col-span-1"> {/* Adjusted col-span for alignment */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={part.includeVAT}
                    onChange={(e) => {
                      const newParts = [...parts];
                      newParts[index] = { ...part, includeVAT: e.target.checked };
                      setParts(newParts);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => setParts(parts.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"
                  title="Remove Part"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Labor Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Labor</label>
        <div className="flex items-center space-x-2 mt-1">
          <input
            type="number"
            value={formData.laborHours}
            onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || 0 })}
            placeholder="Hours"
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.5"
          />
          <span className="py-2">×</span>
          <input
            type="number"
            value={formData.laborRate}
            onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) || 0 })}
            placeholder="Rate/hour"
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.01"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeVATOnLabor}
              onChange={(e) => setIncludeVATOnLabor(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">+VAT</span>
          </label>
          <span className="py-2 font-medium text-gray-800">= {formatCurrency(costs.laborTotal)}</span>
        </div>
      </div>

      <FileUpload
        label="Attachments"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        value={attachments}
        onChange={setAttachments}
        showPreview   // make sure this is true (it defaults to true)
      />


      {/* Payment Section */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>

        {/* Show existing payment amount if editing */}
        {log && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span>Previously Paid Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(log.paidAmount || 0)}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            step="0.01"
            label="Current Paid Amount"
            value={paidAmount}
            onChange={handlePaidAmountChange}
            min="0"
            max={costs.totalAmount}
            placeholder={`Up to ${formatCurrency(costs.totalAmount)}`}
          />

          <FormField
            type="number"
            label="Additional Payment"
            value={amountToPay}
            onChange={e => {
              // we'll clamp & round below
              setAmountToPay(e.target.value);
            }}
            min="0"
            max={remainingAmount}
            placeholder={`Up to ${formatCurrency(remainingAmount)}`}
            step="0.01"
          />


          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div className="col-span-2">
            <FormField
              label="Payment Reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter payment reference or transaction ID"
            />
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          {/* NET Amount */}
          <div className="flex justify-between text-sm font-medium">
            <span>NET Amount:</span>
            <span>{formatCurrency(costs.netAmount)}</span>
          </div>

          {/* VAT Amount */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>VAT (20%):</span>
            <span>{formatCurrency(costs.vatAmount)}</span>
          </div>

          {/* Total Amount */}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total Amount:</span>
            <span>{formatCurrency(costs.totalAmount)}</span>
          </div>

          {/* Payment Status */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Amount Paid:</span>
              <span className="text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Remaining Amount:</span>
                <span className="text-amber-600">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Payment Status:</span>
              <span className="font-medium capitalize">{paymentStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
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
          {loading ? 'Updating...' : 'Update Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceEditModal;
