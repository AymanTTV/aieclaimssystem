// src/components/rentals/RentalDiscountModal.tsx
import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, RentalDiscount } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useVehicles } from '../../hooks/useVehicles';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { isAfter } from 'date-fns';
import { calculateRentalCostDetailed, calculateOverdueCost, calculateTotalSubstitutionCharges } from '../../utils/rentalCalculations';
import { Percent, CheckCircle, Receipt, Trash2, Plus, Calendar, History, Pencil, ShieldAlert } from 'lucide-react';
import { ensureValidDate, formatDate } from '../../utils/dateHelpers';

interface RentalDiscountModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalDiscountModal: React.FC<RentalDiscountModalProps> = ({ rental, onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);

  const vehicle = useMemo(() => vehicles.find(v => v.id === rental.vehicleId), [vehicles, rental.vehicleId]);

  // Load existing discounts or migrate legacy discount
  const [discounts, setDiscounts] = useState<RentalDiscount[]>(() => {
    if (rental.discounts && rental.discounts.length > 0) {
      return rental.discounts.map(d => ({ ...d, applyTo: d.applyTo || 'base' }));
    }
    if (rental.discountAmount && rental.discountAmount > 0) {
      return [{
         id: `disc_legacy_${Date.now()}`,
         percentage: rental.discountPercentage || 0,
         amount: rental.discountAmount,
         reason: rental.discountNotes || 'Legacy Discount Applied',
         createdAt: new Date(rental.createdAt),
         createdBy: rental.createdBy,
         applyTo: 'base'
      }];
    }
    return [];
  });

  const [formData, setFormData] = useState({
    freeDays: 0,
    freeWeeks: 0,
    discountPercentage: 0,
    discountAmount: 0,
    notes: '',
    applyTo: 'base' as 'base' | 'insurance'
  });

  // State for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    discountPercentage: 0,
    discountAmount: 0,
    notes: '',
    applyTo: 'base' as 'base' | 'insurance'
  });

  // Determine the effective rates for both Days and Weeks calculation
  const effectiveRates = useMemo(() => {
    if (!vehicle) return { daily: 0, weekly: 0 };
    const dailyRate = rental.negotiatedRate ?? vehicle.dailyRentalPrice ?? 60;
    const weeklyRate = rental.negotiatedRate ?? vehicle.weeklyRentalPrice ?? 360;
    const claimRate = rental.negotiatedRate ?? vehicle.claimRentalPrice ?? 340;
    
    const pastDaily = rental.lockedDailyRate ?? dailyRate;
    const pastWeekly = rental.lockedWeeklyRate ?? weeklyRate;
    const pastClaim = rental.lockedClaimRate ?? claimRate;
    
    let calculatedDaily = pastDaily;
    
    // Fix: If it's a weekly rental, calculate daily based on weekly / 7
    if (rental.type === 'weekly') {
      calculatedDaily = pastWeekly / 7;
    } else if (rental.type === 'claim' || rental.reason === 'claim') {
      calculatedDaily = pastClaim;
    }
    
    return {
      daily: calculatedDaily,
      weekly: pastWeekly
    };
  }, [rental, vehicle]);

  // RAW base gross cost WITHOUT any prior discounts
  const detailedCostsPreDiscount = useMemo(() => {
    if (!vehicle) return { baseNet: 0, baseVat: 0, baseGross: 0, pureHireNet: 0, pureInsuranceNet: 0, discountAmount: 0, net: 0, vat: 0, gross: 0 };
    const start = ensureValidDate(rental.startDate);
    const end = ensureValidDate(rental.endDate);
    const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;
    const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    return calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      storageNet, rental.type === 'claim' ? (rental.recoveryCost || 0) : 0, rental.deliveryCharge || 0, rental.collectionCharge || 0,
      rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0, rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
      rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
      rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
      0, 0, // Force 0 legacy discount
      rental.status, rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, extraTotal, []
    );
  }, [rental, vehicle]);

  // Target boundaries based on dropdown selection
  const currentTargetBaseLine = formData.applyTo === 'insurance' ? detailedCostsPreDiscount.pureInsuranceNet : detailedCostsPreDiscount.pureHireNet;
  const targetAppliedSum = discounts.filter(d => (d.applyTo || 'base') === formData.applyTo).reduce((acc, d) => acc + d.amount, 0);
  const remainingTargetNet = Math.max(0, currentTargetBaseLine - targetAppliedSum);

  const currentTotalDiscount = discounts.reduce((acc, d) => acc + d.amount, 0);

  const handleAddDiscount = () => {
    if (!user) return;
    if (formData.discountAmount <= 0) return toast.error('Enter a valid amount or percentage');
    if (!formData.notes.trim()) return toast.error('Justification note is required');
    if (formData.discountAmount > remainingTargetNet + 0.05) return toast.error(`Discount exceeds remaining ${formData.applyTo} balance`);

    const newDisc: RentalDiscount = {
       id: `disc_${Date.now()}`,
       percentage: formData.discountPercentage,
       amount: formData.discountAmount,
       reason: formData.notes,
       createdAt: new Date(),
       createdBy: user.id,
       applyTo: formData.applyTo
    };

    setDiscounts([...discounts, newDisc]);
    setFormData({ ...formData, freeDays: 0, freeWeeks: 0, discountPercentage: 0, discountAmount: 0, notes: '' });
  };

  const handleRemoveDiscount = (id: string) => {
    setDiscounts(discounts.filter(d => d.id !== id));
  };

  // --- Inline Edit Handlers ---
  const handleStartEdit = (d: RentalDiscount) => {
    setEditingId(d.id);
    setEditFormData({
      discountPercentage: d.percentage,
      discountAmount: d.amount,
      notes: d.reason,
      applyTo: d.applyTo || 'base'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (editFormData.discountAmount <= 0) return toast.error('Enter a valid amount or percentage');
    if (!editFormData.notes.trim()) return toast.error('Justification note is required');

    const editTargetBaseLine = editFormData.applyTo === 'insurance' ? detailedCostsPreDiscount.pureInsuranceNet : detailedCostsPreDiscount.pureHireNet;
    const otherDiscountsTotal = discounts.filter(current => current.id !== id && (current.applyTo || 'base') === editFormData.applyTo).reduce((acc, current) => acc + current.amount, 0);
    const maxAllowed = Math.max(0, editTargetBaseLine - otherDiscountsTotal);
    
    if (editFormData.discountAmount > maxAllowed + 0.05) return toast.error(`Discount exceeds remaining ${editFormData.applyTo} balance`);

    setDiscounts(discounts.map(d => d.id === id ? {
      ...d,
      percentage: editFormData.discountPercentage,
      amount: editFormData.discountAmount,
      reason: editFormData.notes,
      applyTo: editFormData.applyTo
    } : d));
    
    setEditingId(null);
    toast.success('Discount updated');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vehicle) return;
    setLoading(true);

    try {
      const finalTotalDiscount = discounts.reduce((acc, d) => acc + d.amount, 0);

      const start = ensureValidDate(rental.startDate);
      const end = ensureValidDate(rental.endDate);
      const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;
      const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

      const finalEngineCalc = calculateRentalCostDetailed(
        start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
        storageNet, rental.type === 'claim' ? (rental.recoveryCost || 0) : 0, rental.deliveryCharge || 0, rental.collectionCharge || 0,
        rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0, rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
        rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
        rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
        0, 0, // Force legacy to 0
        rental.status, rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate, extraTotal,
        discounts // Pass the array into the engine
      );
      
      const now = new Date();
      const ongoingCharges = rental.status === 'active' && isAfter(now, end) ? calculateOverdueCost(rental, now, vehicle) : 0;
      const returnCharges = (rental.returnCondition?.totalCharges ?? 0) + calculateTotalSubstitutionCharges(rental);

      const totalAmountDue = finalEngineCalc.gross + ongoingCharges + returnCharges;
      const paid = rental.paidAmount || 0;
      const newRemainingAmount = totalAmountDue - paid;
      const newPaymentStatus = newRemainingAmount <= 0.001 ? 'paid' : (paid > 0 ? 'partially_paid' : 'pending');

      await updateDoc(doc(db, 'rentals', rental.id), {
        cost: finalEngineCalc.gross,
        discounts: discounts, 
        discountPercentage: null, 
        discountAmount: finalTotalDiscount, 
        discountNotes: null, 
        remainingAmount: Math.max(0, newRemainingAmount), 
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      toast.success('Discounts saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save discounts');
    } finally {
      setLoading(false);
    }
  };

  // Predict exact Live Totals for UI
  const liveNet = detailedCostsPreDiscount.baseNet - currentTotalDiscount;
  const scalingFactor = detailedCostsPreDiscount.baseNet > 0 ? (liveNet / detailedCostsPreDiscount.baseNet) : 1;
  const liveVat = detailedCostsPreDiscount.baseVat * scalingFactor;
  const liveGross = liveNet + liveVat;

  const now = new Date();
  const end = ensureValidDate(rental.endDate);
  const ongoing = rental.status === 'active' && vehicle && isAfter(now, end) ? calculateOverdueCost(rental, now, vehicle) : 0;
  const returnChg = (rental.returnCondition?.totalCharges ?? 0) + calculateTotalSubstitutionCharges(rental);
  const projectedTotalDue = liveGross + ongoing + returnChg;
  const newRemainingAfterCurrentDiscount = projectedTotalDue - (rental.paidAmount || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* 1. Live Financial Dashboard */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow-xl text-white">
         <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white/90">
            <Receipt className="w-5 h-5 text-purple-400" /> Projected Financial Impact
         </h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Base Net</p>
               <p className="text-xl font-mono">{formatCurrency(detailedCostsPreDiscount.baseNet)}</p>
            </div>
            <div>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Discount</p>
               <p className="text-xl font-mono text-purple-400">-{formatCurrency(currentTotalDiscount)}</p>
            </div>
            <div>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">New VAT</p>
               <p className="text-xl font-mono">{formatCurrency(liveVat)}</p>
            </div>
            <div>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">New Gross</p>
               <p className="text-xl font-mono">{formatCurrency(liveGross)}</p>
            </div>
            
            <div className="col-span-2 md:col-span-4 bg-white/10 p-4 rounded-xl border border-white/20 flex items-center justify-between mt-2">
               <div>
                  <p className="text-white text-sm font-bold uppercase tracking-wider">Projected Remaining</p>
                  <p className="text-xs text-gray-300 mt-0.5">Including {formatCurrency(rental.paidAmount||0)} paid</p>
               </div>
               <p className={`text-3xl font-black font-mono ${newRemainingAfterCurrentDiscount <= 0.001 ? 'text-green-400' : 'text-amber-400'}`}>
                  {formatCurrency(Math.max(0, newRemainingAfterCurrentDiscount))}
               </p>
            </div>
         </div>
      </div>

      {/* 2. Discount History Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
         <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
            <History className="w-5 h-5 text-gray-400" /> Discount History
         </h4>
         {discounts.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-2 text-center">No discounts applied yet.</p>
         ) : (
            <div className="space-y-3">
               {discounts.map(d => (
                  <div key={d.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    {editingId === d.id ? (
                      <div className="flex flex-col gap-3 w-full bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Application</label>
                            <select
                              value={editFormData.applyTo}
                              onChange={(e) => {
                                 setEditFormData({ ...editFormData, applyTo: e.target.value as any, discountPercentage: 0, discountAmount: 0 });
                              }}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary p-2 border bg-white"
                            >
                              <option value="base">Base Rental Rate</option>
                              <option value="insurance">Insurance Rate</option>
                            </select>
                          </div>
                          <FormField
                            type="number" label="Percentage (%)" value={editFormData.discountPercentage || ''}
                            onChange={(e) => {
                               const editTargetBaseLine = editFormData.applyTo === 'insurance' ? detailedCostsPreDiscount.pureInsuranceNet : detailedCostsPreDiscount.pureHireNet;
                               const pct = parseFloat(e.target.value) || 0;
                               const amt = (editTargetBaseLine * pct) / 100;
                               setEditFormData({ ...editFormData, discountPercentage: pct, discountAmount: Number(amt.toFixed(2)) });
                            }}
                            min="0" step="0.01"
                          />
                          <FormField
                            type="number" label="Fixed Amount (£)" value={editFormData.discountAmount || ''}
                            onChange={(e) => {
                               const editTargetBaseLine = editFormData.applyTo === 'insurance' ? detailedCostsPreDiscount.pureInsuranceNet : detailedCostsPreDiscount.pureHireNet;
                               const amt = parseFloat(e.target.value) || 0;
                               const pct = editTargetBaseLine > 0 ? (amt / editTargetBaseLine) * 100 : 0;
                               setEditFormData({ ...editFormData, discountAmount: amt, discountPercentage: Number(pct.toFixed(2)) });
                            }}
                            min="0" step="0.01"
                          />
                          <div className="sm:col-span-2">
                            <FormField label="Discount Justification Notes" value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button type="button" onClick={handleCancelEdit} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 font-bold border rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                          <button type="button" onClick={() => handleSaveEdit(d.id)} className="px-3 py-1.5 text-sm bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors">Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-lg">{formatCurrency(d.amount)}</span>
                              {d.applyTo === 'insurance' 
                                 ? <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Insurance</span>
                                 : <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Percent className="w-3 h-3"/> Base Hire</span>
                              }
                              {d.percentage > 0 && <span className="text-[10px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full font-bold">{d.percentage}% Line Item</span>}
                           </div>
                           <p className="text-sm text-gray-600 italic leading-snug">"{d.reason}"</p>
                           <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 uppercase font-bold"><Calendar className="w-3 h-3"/> {formatDate(d.createdAt)}</p>
                        </div>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => handleStartEdit(d)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Edit">
                              <Pencil className="w-5 h-5"/>
                           </button>
                           <button type="button" onClick={() => handleRemoveDiscount(d.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Remove">
                              <Trash2 className="w-5 h-5"/>
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
               ))}
               <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-100 font-bold text-purple-900 text-sm">
                  <span>Total Discount Amount:</span>
                  <span>{formatCurrency(currentTotalDiscount)}</span>
               </div>
            </div>
         )}
      </div>

      {/* 3. Add New Discount Form */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
         <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" /> Add New Discount
            </h4>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700 mb-1">Target Application <span className="text-red-500">*</span></label>
               <select
                 value={formData.applyTo}
                 onChange={(e) => setFormData({ ...formData, applyTo: e.target.value as any, discountPercentage: 0, discountAmount: 0, freeDays: 0, freeWeeks: 0 })}
                 className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary p-2 border bg-white"
               >
                 <option value="base">Base Rental Rate ({formatCurrency(detailedCostsPreDiscount.pureHireNet)} available)</option>
                 <option value="insurance">Insurance Rate ({formatCurrency(detailedCostsPreDiscount.pureInsuranceNet)} available)</option>
               </select>
            </div>

            {formData.applyTo === 'base' && rental.type === 'weekly' && (
              <FormField
                type="number" label={`Free Weeks (@ ${formatCurrency(effectiveRates.weekly)}/week)`} value={formData.freeWeeks || ''}
                onChange={(e) => {
                   const weeks = parseInt(e.target.value) || 0;
                   const days = formData.freeDays || 0;
                   const amt = (weeks * effectiveRates.weekly) + (days * effectiveRates.daily);
                   const pct = currentTargetBaseLine > 0 ? (amt / currentTargetBaseLine) * 100 : 0;
                   
                   const notesArr = [];
                   if (weeks > 0) notesArr.push(`${weeks} Free Week${weeks === 1 ? '' : 's'}`);
                   if (days > 0) notesArr.push(`${days} Free Day${days === 1 ? '' : 's'}`);

                   setFormData({ 
                     ...formData, 
                     freeWeeks: weeks, 
                     discountPercentage: Number(pct.toFixed(2)), 
                     discountAmount: Number(amt.toFixed(2)), 
                     notes: notesArr.length > 0 ? `${notesArr.join(' & ')} Applied` : formData.notes 
                   });
                }}
                min="0" step="1"
                disabled={remainingTargetNet <= 0}
              />
            )}

            {formData.applyTo === 'base' && (
              <FormField
                type="number" label={`Free Days (@ ${formatCurrency(effectiveRates.daily)}/day)`} value={formData.freeDays || ''}
                onChange={(e) => {
                   const days = parseInt(e.target.value) || 0;
                   const weeks = formData.freeWeeks || 0;
                   const amt = (weeks * effectiveRates.weekly) + (days * effectiveRates.daily);
                   const pct = currentTargetBaseLine > 0 ? (amt / currentTargetBaseLine) * 100 : 0;
                   
                   const notesArr = [];
                   if (weeks > 0) notesArr.push(`${weeks} Free Week${weeks === 1 ? '' : 's'}`);
                   if (days > 0) notesArr.push(`${days} Free Day${days === 1 ? '' : 's'}`);

                   setFormData({ 
                     ...formData, 
                     freeDays: days, 
                     discountPercentage: Number(pct.toFixed(2)), 
                     discountAmount: Number(amt.toFixed(2)), 
                     notes: notesArr.length > 0 ? `${notesArr.join(' & ')} Applied` : formData.notes 
                   });
                }}
                min="0" step="1"
                disabled={remainingTargetNet <= 0}
              />
            )}

            <FormField
              type="number" label="Percentage (%)" value={formData.discountPercentage || ''}
              onChange={(e) => {
                 const pct = parseFloat(e.target.value) || 0;
                 const amt = (currentTargetBaseLine * pct) / 100;
                 setFormData({ ...formData, freeDays: 0, freeWeeks: 0, discountPercentage: pct, discountAmount: Number(amt.toFixed(2)) });
              }}
              min="0" step="0.01"
              disabled={remainingTargetNet <= 0}
            />

            <FormField
              type="number" label="Fixed Amount (£)" value={formData.discountAmount || ''}
              onChange={(e) => {
                 const amt = parseFloat(e.target.value) || 0;
                 const pct = currentTargetBaseLine > 0 ? (amt / currentTargetBaseLine) * 100 : 0;
                 setFormData({ ...formData, freeDays: 0, freeWeeks: 0, discountAmount: amt, discountPercentage: Number(pct.toFixed(2)) });
              }}
              min="0" max={remainingTargetNet} step="0.01"
              disabled={remainingTargetNet <= 0}
            />

            <div className={formData.applyTo === 'base' && rental.type !== 'weekly' ? "md:col-span-1" : "md:col-span-2"}>
               <TextArea
                 label="Discount Justification Notes" value={formData.notes}
                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                 placeholder="Why is this discount being applied?..."
                 disabled={remainingTargetNet <= 0}
               />
            </div>
         </div>
         
         <div className="flex justify-between items-center pt-2">
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg border">Target Remaining: {formatCurrency(remainingTargetNet)}</span>
            <button type="button" onClick={handleAddDiscount} disabled={remainingTargetNet <= 0} className="px-4 py-2 text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 shadow-sm flex items-center gap-2">
               <Plus className="w-4 h-4"/> Add to History
            </button>
         </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">Cancel</button>
        <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 border border-transparent rounded-lg shadow-sm hover:bg-green-700 flex items-center gap-2">
          {loading ? 'Saving...' : <><CheckCircle className="w-4 h-4"/> Save All Changes</>}
        </button>
      </div>
    </form>
  );
};

export default RentalDiscountModal;