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
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Percent, DollarSign } from 'lucide-react';
import { checkVehicleStatus, updateVehicleStatus } from '../../utils/vehicleStatusManager';
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import { fetchUnifiedProfitAndCosts, syncMaintenanceRecord, sanitizeForFirestore } from '../../services/unifiedSync.service';

interface MaintenanceEditModalProps {
  log: MaintenanceLog;
  vehicles: Vehicle[];
  onClose: () => void;
}

interface PartSuggestion {
  name: string;
  lastCost: number;
}

const MAINTENANCE_TYPE_OPTIONS = [
  { id: 'yearly-service', label: 'Yearly Service' },
  { id: 'mileage-service', label: 'Mileage Service' },
  { id: 'repair', label: 'Repair' },
  { id: 'emergency-repair', label: 'Emergency Repair' },
  { id: 'mot', label: 'MOT' },
  { id: 'nsl', label: 'NSL' },
  { id: 'tfl', label: 'TFL' },
  { id: 'service', label: 'Service' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'bodywork', label: 'Bodywork' },
  { id: 'accident-repair', label: 'Accident Repair' },
  { id: 'oil-change', label: 'Oil Change' },
  { id: 'brake-service', label: 'Brake Service' },
  { id: 'tire-replacement', label: 'Tire Replacement' },
  { id: 'battery-check', label: 'Battery Check' },
  { id: 'engine-diagnostics', label: 'Engine Diagnostics' },
  { id: 'air-conditioning-service', label: 'Air Conditioning Service' },
  { id: 'wheel-alignment', label: 'Wheel Alignment' },
  { id: 'transmission-service', label: 'Transmission Service' },
  { id: 'exhaust-repair', label: 'Exhaust Repair' },
  { id: 'suspension-check', label: 'Suspension Check' },
  { id: 'coolant-flush', label: 'Coolant Flush' },
  { id: 'filter-replacement', label: 'Filter Replacement' },
  { id: 'windscreen-repair', label: 'Windscreen Repair' },
  { id: 'software-update', label: 'Software Update' },
  { id: 'recall-service', label: 'Recall Service' },
  { id: 'erad', label: 'ERAD' },
  { id: 'driveshaft', label: 'Driveshaft' },
  { id: 'iem', label: 'IEM' },
  { id: 'hv-battery', label: 'HV Battery' },
  { id: 'lower-arms', label: 'Lower Arms' },
  { id: 'steering-passiv', label: 'Steering Passive' },
  { id: 'brake-vacuum-pump', label: 'Brake Vacuum Pump' },
  { id: 'brake-servo', label: 'Brake Servo' },
  { id: 'anti-rubber-bushes', label: 'Anti-Rubber Bushes' },
  { id: 'auto-handbrake-failure', label: 'Auto Handbrake Failure' },
  { id: 'taxi-meter', label: 'Taxi Meter' },
  { id: 'car-wash', label: 'Car Wash' },
  { id: 'full-valeting', label: 'Full Valeting' },
];

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
  const [subcontractorCost, setSubcontractorCost] = useState<string>(
    log.subcontractorCost !== undefined && Number(log.subcontractorCost) > 0
      ? String(log.subcontractorCost)
      : '0'
  );

  useEffect(() => {
    if (log.subcontractorCost !== undefined && Number(log.subcontractorCost) > 0) {
      setSubcontractorCost(String(log.subcontractorCost));
    } else {
      fetchUnifiedProfitAndCosts({
        id: log.id,
        orderNumber: log.orderNumber || log.orderId,
        invoiceNumber: log.invoiceNumber,
      }).then((unified) => {
        if (unified && unified.subcontractorCost !== undefined && unified.subcontractorCost > 0) {
          setSubcontractorCost(String(unified.subcontractorCost));
        }
      });
    }
  }, [log.id, log.subcontractorCost, log.orderNumber, log.orderId, log.invoiceNumber]);
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

  // Off-road & Accident Condition State
  const [isOffRoad, setIsOffRoad] = useState<boolean>(
    log.isOffRoad ?? (log.type === 'accident-repair' || false)
  );
  const [isNonDrivable, setIsNonDrivable] = useState<boolean>(
    log.isNonDrivable ?? (log.type === 'accident-repair' || false)
  );
  const [dueToAccident, setDueToAccident] = useState<boolean>(
    log.dueToAccident ?? (log.type === 'accident-repair' || false)
  );

  const handleToggleOffRoadAccident = (checked: boolean) => {
    setIsOffRoad(checked);
    setIsNonDrivable(checked);
    setDueToAccident(checked);
    if (checked && !formData.type) {
      setFormData(prev => ({ ...prev, type: 'accident-repair' }));
    }
  };

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

  const subCostNum = Math.max(0, parseFloat(subcontractorCost) || 0);
  const profitMetrics = calculateProfitMetrics(costs.totalAmount, subCostNum);


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

    if (formData.status !== 'parts-backorder' && !formData.date) {
      toast.error('Please select a date');
      return;
    }

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
        date: formData.date ? new Date(formData.date) : null,
        currentMileage: formData.currentMileage,
        nextServiceMileage: formData.nextServiceMileage,
        nextServiceDate: formData.nextServiceDate
          ? new Date(formData.nextServiceDate)
          : (formData.date ? addYears(new Date(formData.date), 1) : null),
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
        isOffRoad,
        isNonDrivable,
        dueToAccident,
        notes: formData.notes,
        // Subcontractor Cost & Profit Tracking
        subcontractorCost: profitMetrics.subcontractorCost,
        customerBilled: costs.totalAmount,
        netProfit: profitMetrics.netProfit,
        profitMarginPercent: profitMetrics.profitMarginPercent,
        isProfitEdited: true,
        vatDetails: {
          partsVAT: parts.map(part => ({
            partName: part.name,
            includeVAT: part.includeVAT
          })),
          laborVAT: includeVATOnLabor
        },
        updatedAt: new Date(),
        updatedBy: user?.id || (user as any)?.uid || 'system'
      };

      await syncMaintenanceRecord(log.id, {
        ...maintenanceData,
        orderId: log.orderNumber || log.id,
        orderNumber: log.orderNumber || log.id,
        invoiceNumber: log.invoiceNumber,
      });

      const newFiles = attachments.filter(f => f instanceof File) as File[];
      if (newFiles.length) {
        await uploadMaintenanceAttachments(log.id, newFiles);
      }

      // Sync vehicle availability:
      // When vehicle is off-road non-drivable due to accident, or in maintenance, it remains unavailable until marked completed
      if (log.vehicleId) {
        if (formData.status === 'completed') {
          await checkVehicleStatus(log.vehicleId);
        } else {
          const reason = formData.status === 'parts-backorder'
            ? 'Awaiting parts backorder'
            : formData.status === 'workshop'
            ? 'In workshop'
            : formData.status === 'bodywork'
            ? 'In bodywork'
            : formData.status === 'off-road' || dueToAccident || isNonDrivable
            ? 'Off-road non-drivable due to accident repair'
            : formData.status === 'pending'
            ? 'Pending maintenance authorization'
            : 'In maintenance';
          await updateVehicleStatus(log.vehicleId, 'maintenance', reason);
        }
      }

      // Handle finance transaction
      if (additionalPayment > 0) {
        if (existingTransaction) {
          await updateDoc(
            doc(db, 'transactions', existingTransaction.id),
            sanitizeForFirestore({
              amount: existingTransaction.amount + additionalPayment,
              category: formData.type,
              description: formData.description,
              paymentMethod: paymentMethod || null,
              paymentReference: paymentReference || null,
              paymentStatus: paymentStatus || null,
              dealerCost: profitMetrics.subcontractorCost,
              subcontractorCost: profitMetrics.subcontractorCost,
              customerBilled: costs.totalAmount,
              netProfit: profitMetrics.netProfit,
              profitMarginPercent: profitMetrics.profitMarginPercent,
              isProfitEdited: true,
              isEdited: true,
              linkedInvoiceRef: log.id,
              orderId: log.orderNumber || log.id,
              orderNumber: log.orderNumber || log.id,
              invoiceNumber: log.invoiceNumber || null,
              updatedAt: new Date()
            })
          );
          toast.success('Maintenance and transaction updated successfully');
        } else {
          await createFinanceTransaction({
            type: 'expense',
            category: formData.type,
            amount: additionalPayment,
            description: formData.description,
            referenceId: log.id,
            sourceReferenceId: log.id,
            linkedInvoiceRef: log.id,
            vehicleId: log.vehicleId,
            vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
            paymentMethod,
            paymentReference,
            paymentStatus,
            dealerCost: profitMetrics.subcontractorCost,
            subcontractorCost: profitMetrics.subcontractorCost,
            customerBilled: costs.totalAmount,
            netProfit: profitMetrics.netProfit,
            profitMarginPercent: profitMetrics.profitMarginPercent,
            isProfitEdited: true,
            isEdited: true,
            orderId: log.orderNumber || log.id,
            orderNumber: log.orderNumber || log.id,
            invoiceNumber: log.invoiceNumber,
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

      {/* Off-Road Non-Drivable Accident Status Card */}
      <div className={`p-4 rounded-2xl border transition-all ${
        (isOffRoad && dueToAccident) || isNonDrivable || formData.type === 'accident-repair'
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-slate-50 border-[#E2E8F0]'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${
              (isOffRoad && dueToAccident) || isNonDrivable ? 'text-rose-600' : 'text-slate-400'
            }`} />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Road Condition & Accident Status
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Specify if vehicle is off the road and non-drivable due to accident damage.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isOffRoad && dueToAccident}
              onChange={(e) => handleToggleOffRoadAccident(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {/* Detail Options & Availability Notice */}
        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={isOffRoad}
                onChange={(e) => setIsOffRoad(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Vehicle is Off-Road</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={isNonDrivable}
                onChange={(e) => setIsNonDrivable(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Non-Drivable</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={dueToAccident}
                onChange={(e) => setDueToAccident(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Due to Accident</span>
            </label>
          </div>

          {(isOffRoad || isNonDrivable || dueToAccident || formData.type === 'accident-repair') && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Fleet Availability Notice:</strong> The vehicle will be marked <strong>Maintenance (Unavailable)</strong> in the fleet until this repair is marked <strong>Completed</strong>.
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <SearchableSelect
          label="Type"
          options={MAINTENANCE_TYPE_OPTIONS}
          value={formData.type}
          onChange={(val) => setFormData({ ...formData, type: Array.isArray(val) ? val[0] : (val || '') })}
          placeholder="Search and select type..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormField
            type="date"
            label={formData.status === 'parts-backorder' ? "Date (Optional - Parts Backorder)" : "Date"}
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required={formData.status !== 'parts-backorder'}
          />
          {formData.status === 'parts-backorder' && (
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Parts Backorder: Scheduled date/time is not required until parts arrive and status changes.
            </p>
          )}
        </div>

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
          <SearchableSelect
            label="Status"
            options={[
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'in-progress', label: 'In Progress' },
              { id: 'workshop', label: 'In Workshop' },
              { id: 'parts-backorder', label: 'Awaiting Parts (Backorder)' },
              { id: 'bodywork', label: 'Bodywork' },
              { id: 'off-road', label: 'OFF ROAD (VOR)' },
              { id: 'pending', label: 'Pending Approval' },
              { id: 'inspection', label: 'Inspection / MOT' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ]}
            value={formData.status}
            onChange={(val) => setFormData({ ...formData, status: (Array.isArray(val) ? val[0] : val) as any })}
            placeholder="Select status..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3"
          required
        />
      </div>

      {/* Parts Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-base font-bold text-white">Parts</label>
          <button
            type="button"
            onClick={() => setParts([...parts, { name: '', quantity: 1, cost: 0, includeVAT: false }])}
            className="text-sm text-blue-400 hover:text-blue-300 font-semibold px-3 py-1 border border-blue-500/40 rounded-lg hover:bg-blue-500/10 transition-colors"
          >
            + Add Part
          </button>
        </div>
        <div className="space-y-3">
          {parts.map((part, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-3 border border-[#2B314E] rounded-xl bg-[#0F111A] text-white shadow-sm">
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
                    <ul className="absolute z-10 w-full bg-white border-[1.5px] border-[#CBD5E1] rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto text-[#0F172A]">
                      {partSuggestions
                        .filter(suggestion =>
                          suggestion.name.toLowerCase().includes(part.name.toLowerCase())
                        )
                        .map((suggestion, i) => (
                          <li
                            key={i}
                            className="px-4 py-2 cursor-pointer hover:bg-slate-50 text-slate-900 flex items-center justify-between transition-colors border-b border-slate-100 last:border-b-0"
                            onMouseDown={() => handlePartNameSelect(suggestion, index)} // Use onMouseDown to prevent blur before click
                          >
                            <span className="font-medium">{suggestion.name}</span>
                            <span className="text-slate-500 text-sm ml-2 font-mono">({formatCurrency(suggestion.lastCost)})</span>
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
                    className="rounded border-[#2B314E] bg-[#0F111A] text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300 font-semibold">VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => setParts(parts.filter((_, i) => i !== index))}
                  className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-sm font-semibold"
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
            <SearchableSelect
              label="Payment Method"
              options={[
                { id: 'cash', label: 'Cash' },
                { id: 'card', label: 'Card' },
                { id: 'bank_transfer', label: 'Bank Transfer' },
                { id: 'cheque', label: 'Cheque' },
              ]}
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(Array.isArray(val) ? val[0] : (val || 'cash'))}
              placeholder="Select payment method..."
            />
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

        {/* Dealer / Subcontractor Cost & Live Profit Tracking Card */}
        <div className="bg-slate-50 p-4 rounded-xl border-2 border-indigo-200/90 space-y-3 text-slate-900 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Dealer / Subcontractor Cost & Profit Tracking
                </h4>
                <p className="text-[11px] text-slate-500">Live profit margin preview based on billed job total</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
              Billed: {formatCurrency(costs.totalAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dealer / Subcontractor Cost (£)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm font-bold">
                  £
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={subcontractorCost}
                  onChange={(e) => setSubcontractorCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Live Profit Preview Badges */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  profitMetrics.netProfit >= 0
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                  <span>Live Net Profit</span>
                  {profitMetrics.netProfit >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </div>
                <p
                  className={`text-base font-black font-mono mt-0.5 ${
                    profitMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {profitMetrics.netProfit >= 0 ? '+' : ''}
                  {formatCurrency(profitMetrics.netProfit)}
                </p>
                <span className="text-[10px] text-slate-500">Billed – Dealer Cost</span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  profitMetrics.profitMarginPercent >= 0
                    ? 'bg-indigo-50/80 border-indigo-200'
                    : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                  <span>Profit Margin</span>
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <p
                  className={`text-base font-black font-mono mt-0.5 ${
                    profitMetrics.profitMarginPercent >= 0 ? 'text-indigo-700' : 'text-rose-700'
                  }`}
                >
                  {profitMetrics.profitMarginPercent.toFixed(1)}%
                </p>
                <span className="text-[10px] text-slate-500">Margin on billed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="bg-[#0F111A] p-4 rounded-xl border border-[#2B314E] space-y-2.5 text-slate-100 shadow-md">
          {/* NET Amount */}
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-300 font-semibold">NET Amount:</span>
            <span className="font-mono text-white font-bold">{formatCurrency(costs.netAmount)}</span>
          </div>

          {/* VAT Amount */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-semibold">VAT (20%):</span>
            <span className="font-mono text-white font-bold">{formatCurrency(costs.vatAmount)}</span>
          </div>

          {/* Total Amount */}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-[#2B314E] text-white">
            <span>Total Amount:</span>
            <span className="font-mono text-lg font-black text-white">{formatCurrency(costs.totalAmount)}</span>
          </div>

          {/* Payment Status */}
          <div className="pt-3 border-t border-[#2B314E] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400 font-semibold">Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-400">{formatCurrency(paidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-400 font-semibold">Remaining Amount:</span>
                <span className="font-mono font-bold text-amber-400">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-[#2B314E]/60">
              <span className="text-slate-300 font-semibold">Payment Status:</span>
              <span className="font-semibold capitalize text-white">{paymentStatus.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-[#2B314E]/60">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-slate-300 bg-[#1E2238] border border-[#2B314E] rounded-xl hover:bg-[#2B314E] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-semibold text-white bg-primary border border-transparent rounded-xl hover:bg-primary-600 shadow-md transition-colors"
        >
          {loading ? 'Updating...' : 'Update Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceEditModal;
