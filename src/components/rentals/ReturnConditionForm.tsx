// src/components/rentals/ReturnConditionForm.tsx
import React, { useEffect, useState } from 'react';
import { VehicleCondition, ReturnCondition } from '../../types/rental';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import FormField from '../ui/FormField';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  AlertTriangle, 
  Camera, 
  Calendar, 
  Clock, 
  Gauge, 
  Fuel, 
  X, 
  Receipt
} from 'lucide-react';

interface ReturnConditionFormProps {
  checkOutCondition: VehicleCondition;
  initialCondition?: ReturnCondition; // Prefill if editing existing return
  onSubmit: (condition: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
  // ✅ NEW: Callback to trigger the global vehicle mileage update
  onMileageUpdate?: (newMileage: number) => void; 
}

const ReturnConditionForm: React.FC<ReturnConditionFormProps> = ({
  checkOutCondition,
  initialCondition,
  onSubmit,
  onClose,
  onMileageUpdate
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);

  // Safe fallbacks if checkOutCondition is missing at runtime
  const checkoutMileage = Number(checkOutCondition?.mileage ?? 0);
  const checkoutFuel = (checkOutCondition?.fuelLevel ?? '100') as VehicleCondition['fuelLevel'];

  // New uploads only
  const [images, setImages] = useState<File[]>([]);
  // Existing images (editable/removable in edit mode)
  const [existingImgs, setExistingImgs] = useState<string[]>(initialCondition?.images ?? []);

  // Normalize date value
  const asDate = (v: any): Date | null => {
    try {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v?.toDate === 'function') return v.toDate();
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // ---- FORM STATE ----
  const initDT = asDate(initialCondition?.date) ?? new Date();
  const [formData, setFormData] = useState({
    date: initDT.toISOString().split('T')[0],
    time: initDT.toTimeString().slice(0, 5),
    mileage: initialCondition?.mileage ?? checkoutMileage,
    fuelLevel: (initialCondition?.fuelLevel ?? checkoutFuel) as VehicleCondition['fuelLevel'],
    isClean: initialCondition?.isClean ?? true,
    hasDamage: initialCondition?.hasDamage ?? false,
    damageDescription: initialCondition?.damageDescription ?? '',
    damageCost: initialCondition?.damageCost ?? 0,
    fuelCharge: initialCondition?.fuelCharge ?? 0,
    cleaningCharge: initialCondition?.cleaningCharge ?? 0
  });

  // Refill the form when initialCondition arrives/changes
  useEffect(() => {
    if (!initialCondition) return;
    const d = asDate(initialCondition.date) ?? new Date();
    setFormData({
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      mileage: initialCondition.mileage ?? checkoutMileage,
      fuelLevel: (initialCondition.fuelLevel ?? checkoutFuel) as VehicleCondition['fuelLevel'],
      isClean: initialCondition.isClean ?? true,
      hasDamage: initialCondition.hasDamage ?? false,
      damageDescription: initialCondition.damageDescription ?? '',
      damageCost: initialCondition.damageCost ?? 0,
      fuelCharge: initialCondition.fuelCharge ?? 0,
      cleaningCharge: initialCondition.cleaningCharge ?? 0
    });
    setExistingImgs(initialCondition.images ?? []);
  }, [initialCondition, checkoutMileage, checkoutFuel]);

  // Show fields if condition applies OR there is already a stored non-zero value
  const showFuelChargeField =
    Number(formData.fuelCharge) > 0 ||
    ((parseInt(formData.fuelLevel as string, 10) || 0) < (parseInt(checkoutFuel as string, 10) || 0));

  const showCleaningChargeField = !formData.isClean || Number(formData.cleaningCharge) > 0;

  const calculateCharges = (): number => {
    let total = 0;
    if (formData.hasDamage) total += Number(formData.damageCost) || 0;

    const fuelDiff = (parseInt(checkoutFuel as string, 10) || 0) - (parseInt(formData.fuelLevel as string, 10) || 0);

    if (fuelDiff > 0 || Number(formData.fuelCharge) > 0) {
      total += Number(formData.fuelCharge) || 0;
    }
    if (!formData.isClean || Number(formData.cleaningCharge) > 0) {
      total += Number(formData.cleaningCharge) || 0;
    }

    return total;
  };

  const handleRemoveExistingImage = (idx: number) => {
    setExistingImgs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // ✅ Validation: Mileage must be entered and cannot be less than checkout
    const enteredMileage = Number(formData.mileage) || 0;
    if (enteredMileage < checkoutMileage) {
        toast.error('Return mileage cannot be less than check-out mileage.');
        return;
    }

    setLoading(true);

    try {
      const newImageUrls = await Promise.all(
        images.map(async (file) => {
          const ts = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${ts}_${file.name}`);
          const snap = await uploadBytes(storageRef, file);
          return getDownloadURL(snap.ref);
        })
      );

      const conditionData: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'> = {
        type: 'check-in',
        date: new Date(`${formData.date}T${formData.time}`),
        mileage: enteredMileage,
        fuelLevel: formData.fuelLevel as VehicleCondition['fuelLevel'],
        isClean: !!formData.isClean,
        hasDamage: !!formData.hasDamage,
        damageDescription: formData.hasDamage ? formData.damageDescription : '',
        damageCost: formData.hasDamage ? (Number(formData.damageCost) || 0) : 0,
        fuelCharge: showFuelChargeField ? (Number(formData.fuelCharge) || 0) : 0,
        cleaningCharge: showCleaningChargeField ? (Number(formData.cleaningCharge) || 0) : 0,
        totalCharges: calculateCharges(),
        images: [...existingImgs, ...newImageUrls],
      };

      // Trigger the parent submission (saves to rental)
      await onSubmit(conditionData);
      
      // ✅ Trigger the mileage update callback
      if (onMileageUpdate && enteredMileage > checkoutMileage) {
          onMileageUpdate(enteredMileage);
      }

    } catch (err) {
      console.error('Error saving return condition:', err);
      toast.error('Failed to save return condition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {!checkOutCondition && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-600 mt-0.5" />
          <p className="text-sm font-medium">No check-out condition found for this vehicle. Using safe defaults (0 miles, 100% fuel).</p>
        </div>
      )}

      {/* --- TIME & DATE --- */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1 sm:col-span-2 flex items-center gap-2 mb-1 border-b border-gray-200 pb-2">
           <Calendar className="w-4 h-4 text-gray-500" />
           <h4 className="font-bold text-gray-800">Return Time & Date</h4>
        </div>
        <FormField
          type="date" label="Date" value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
        <FormField
          type="time" label="Time" value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>

      {/* --- MILEAGE & FUEL --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm relative">
           <div className="flex items-center gap-2 mb-3 border-b border-blue-200/50 pb-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              <h4 className="font-bold text-blue-900">Mileage In</h4>
           </div>
           <FormField
             type="number" label="Current Mileage" value={formData.mileage}
             onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value || '0', 10) })}
             required min={checkoutMileage} // ✅ Front-end required validation
           />
           <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
              Check-Out: {checkoutMileage.toLocaleString()}
           </div>
        </div>

        <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100 shadow-sm relative">
           <div className="flex items-center gap-2 mb-3 border-b border-orange-200/50 pb-2">
              <Fuel className="w-4 h-4 text-orange-600" />
              <h4 className="font-bold text-orange-900">Fuel Level In</h4>
           </div>
           <div>
             <select
               value={formData.fuelLevel}
               onChange={(e) => setFormData({ ...formData, fuelLevel: e.target.value as VehicleCondition['fuelLevel'] })}
               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm font-medium"
               required
             >
               <option value="0">Empty (0%)</option>
               <option value="25">Quarter (25%)</option>
               <option value="50">Half (50%)</option>
               <option value="75">Three Quarters (75%)</option>
               <option value="100">Full (100%)</option>
             </select>
           </div>
           <div className="mt-3 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block">
              Check-Out: {checkoutFuel}%
           </div>
        </div>
      </div>

      {/* --- INSPECTION & PENALTIES --- */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-6">
         <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <h4 className="font-bold text-gray-800">Vehicle Inspection</h4>
         </div>

         {/* Cleanliness */}
         <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox" checked={formData.isClean}
                onChange={(e) => setFormData({ ...formData, isClean: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="font-medium text-gray-800">Vehicle was returned clean</span>
            </label>

            {showCleaningChargeField && (
               <div className="pl-8">
                  <FormField
                    type="number" label="Cleaning Penalty Charge (£)"
                    value={formData.cleaningCharge}
                    onChange={(e) => setFormData({ ...formData, cleaningCharge: parseFloat(e.target.value || '0') })}
                    min="0" step="0.01" required={!formData.isClean}
                  />
               </div>
            )}
         </div>

         {/* Damage */}
         <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="checkbox" checked={formData.hasDamage}
                onChange={(e) => setFormData({ ...formData, hasDamage: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-medium text-gray-800">New Damage Found</span>
            </label>

            {formData.hasDamage && (
              <div className="pl-8 space-y-4 bg-red-50 p-4 rounded-xl border border-red-100">
                <TextArea
                  label="Detailed Damage Description"
                  value={formData.damageDescription}
                  onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                  required
                />
                <FormField
                  type="number" label="Damage Penalty Cost (£)"
                  value={formData.damageCost}
                  onChange={(e) => setFormData({ ...formData, damageCost: parseFloat(e.target.value || '0') })}
                  min="0" step="0.01" required
                />
              </div>
            )}
         </div>

         {/* Fuel Deficit Penalty */}
         {showFuelChargeField && (
           <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col">
                <span className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                   <AlertTriangle className="w-4 h-4"/> Fuel Deficit Detected
                </span>
                <FormField
                  type="number" label="Fuel Penalty Charge (£)"
                  value={formData.fuelCharge}
                  onChange={(e) => setFormData({ ...formData, fuelCharge: parseFloat(e.target.value || '0') })}
                  min="0" step="0.01"
                  required={(parseInt(formData.fuelLevel as string, 10) || 0) < (parseInt(checkoutFuel as string, 10) || 0)}
                />
              </div>
           </div>
         )}
      </div>

      {/* --- EVIDENCE --- */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
         <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Camera className="w-4 h-4 text-gray-500" />
            <h4 className="font-bold text-gray-800">Condition Evidence</h4>
         </div>
         
         {existingImgs.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Existing Images ({existingImgs.length})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {existingImgs.map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={url} className="w-full h-full object-cover rounded-lg border border-gray-200" alt={`Existing ${i}`} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <FileUpload
            label="Add Return Condition Images"
            accept="image/*"
            multiple
            onChange={setImages}
            showPreview
          />
        </div>
      </div>

      {/* --- FINANCIAL SUMMARY --- */}
      <div className="bg-gray-900 text-white p-5 rounded-xl shadow-lg relative overflow-hidden">
        <Receipt className="absolute -right-4 -top-4 w-24 h-24 text-white/5" />
        <h4 className="font-bold text-gray-200 mb-4 flex items-center gap-2 relative z-10">
           <Receipt className="w-4 h-4 text-gray-400" /> Penalty Charges Summary
        </h4>
        
        <div className="space-y-2 relative z-10">
          {formData.hasDamage && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-400 font-medium">Damage Cost:</span>
              <span className="font-mono text-red-400">{formatCurrency(Number(formData.damageCost || 0))}</span>
            </div>
          )}
          {showFuelChargeField && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-400 font-medium">Fuel Deficit Charge:</span>
              <span className="font-mono text-orange-400">{formatCurrency(Number(formData.fuelCharge || 0))}</span>
            </div>
          )}
          {showCleaningChargeField && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-400 font-medium">Cleaning Charge:</span>
              <span className="font-mono text-amber-400">{formatCurrency(Number(formData.cleaningCharge || 0))}</span>
            </div>
          )}
          
          <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t border-white/20 items-center">
            <span className="uppercase tracking-wider text-xs">Total Added to Balance:</span>
            <span className="font-mono text-xl text-green-400">{formatCurrency(calculateCharges())}</span>
          </div>
        </div>
      </div>

      {/* --- ACTIONS --- */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2"
        >
          {loading ? 'Processing...' : (initialCondition ? <><CheckCircle className="w-4 h-4"/> Update Return</> : <><CheckCircle className="w-4 h-4"/> Confirm Return</>)}
        </button>
      </div>
    </form>
  );
};

export default ReturnConditionForm;