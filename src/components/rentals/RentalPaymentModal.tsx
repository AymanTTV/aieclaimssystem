// src/components/rentals/RentalPaymentModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, RentalPayment, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { calculateOverdueCost, calculateRentalCostDetailed } from '../../utils/rentalCalculations'; 
import { isAfter } from 'date-fns';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Pencil, Trash2, Receipt, CreditCard, AlertCircle, CheckCircle, Car } from 'lucide-react';
import { deleteRentalPayment, updateRentalPayment } from '../../utils/paymentUtils';

const formatDateForInput = (t?: any) => {
  if (!t) return new Date().toISOString().slice(0, 10);
  const d = t?.toDate ? t.toDate() : new Date(t);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

interface RentalPaymentModalProps {
  rental: Rental;
  vehicle?: Vehicle;
  vehicles?: Vehicle[]; 
  onClose: () => void;
}

const RentalPaymentModal: React.FC<RentalPaymentModalProps> = ({
  rental,
  vehicle,
  vehicles = [],
  onClose
}) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);

  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const editingPayment = useMemo(
    () => rental.payments?.find(p => p.id === editingPaymentId) || null,
    [editingPaymentId, rental.payments]
  );

  const [formData, setFormData] = useState({
    paymentDate: formatDateForInput(new Date()), 
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: '',
    allocatedVehicleId: rental.vehicleId 
  });

  const { customers } = useCustomers();
  const paymentCustomer = customers.find(c => c.id === rental.customerId);

  const substituteOptions = useMemo(() => {
    if (!rental.hireSubstitutionDetails || rental.hireSubstitutionDetails.length === 0) return [];
    
    return rental.hireSubstitutionDetails.map((sub, index) => {
      const fleetVehicle = vehicles.find(v => 
        (v.registrationNumber || '').toLowerCase().replace(/\s+/g, '') === (sub.registration || '').toLowerCase().replace(/\s+/g, '')
      );
      
      return {
        id: fleetVehicle ? fleetVehicle.id : `external_sub_${index}`,
        label: fleetVehicle 
          ? `Substitute: ${fleetVehicle.make} ${fleetVehicle.model} (${fleetVehicle.registrationNumber})` 
          : `Substitute: ${sub.make} ${sub.model} (${sub.registration}) - External`,
        vehicle: fleetVehicle
      };
    });
  }, [rental.hireSubstitutionDetails, vehicles]);

  const detailedCosts = useMemo(() => {
    if (!vehicle) return { net: 0, vat: 0, gross: 0, discountAmount: 0 };

    const startDateTime = (rental as any)?.startDate?.toDate 
      ? (rental as any).startDate.toDate() 
      : new Date(rental.startDate);
      
    const endDateTime = (rental as any)?.endDate?.toDate 
      ? (rental as any).endDate.toDate() 
      : new Date(rental.endDate);

    const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;

    const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    return calculateRentalCostDetailed(
      startDateTime, endDateTime, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      storageNet,
      rental.type === 'claim' ? (rental.recoveryCost || 0) : 0,
      rental.deliveryCharge || 0, rental.collectionCharge || 0,
      rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0,
      rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
      rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
      rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
      rental.discountPercentage || 0, rental.discountAmount || 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate,
      extraTotal,
      rental.discounts || [] 
    );
  }, [rental, vehicle]);

  const now = new Date();
  const ongoingCharges =
    rental.status === 'active' && isAfter(now, rental.endDate)
      ? calculateOverdueCost(rental, now, vehicle)
      : 0;

  const mainReturnCharges = rental.returnCondition?.totalCharges || 0;
  const subCharges = (rental.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
  const totalReturnCharges = mainReturnCharges + subCharges;

  const totalAmountDue = detailedCosts.gross + ongoingCharges + totalReturnCharges;
  const paid = rental.paidAmount || 0;
  const remainingAmount = totalAmountDue - paid;

  const prefillFromPayment = (p: RentalPayment) => {
    setFormData({
      paymentDate: formatDateForInput(p.date), 
      amountToPay: p.amount.toString(),
      method: p.method as any,
      reference: p.reference || '',
      notes: p.notes || '',
      allocatedVehicleId: p.allocatedVehicleId || rental.vehicleId
    });
  };

  const resetForm = () => {
    setEditingPaymentId(null);
    setFormData({
      paymentDate: formatDateForInput(new Date()), 
      amountToPay: '0',
      method: 'cash',
      reference: '',
      notes: '',
      allocatedVehicleId: rental.vehicleId
    });
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      setLoading(true);
      
      const paymentToDelete = rental.payments?.find(p => p.id === paymentId);
      
      // ✅ Pass the appropriately allocated vehicle object to the delete utility
      // so it correctly reverses from the allocated account/group.
      const allocatedVId = paymentToDelete?.allocatedVehicleId || rental.vehicleId;
      const allocatedVehicle = vehicles.find(v => v.id === allocatedVId) || vehicle;

      await deleteRentalPayment(rental, paymentId, allocatedVehicle);
      toast.success('Payment deleted successfully');
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated.');
      return;
    }

    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    const originalAmt = editingPayment?.amount ?? 0;
    const effectiveMax = editingPaymentId ? remainingAmount + originalAmt : remainingAmount;

    if (paymentAmount > effectiveMax + 0.05) {
      toast.error(`Invalid payment amount. Maximum allowed is ${formatCurrency(effectiveMax)}`);
      return;
    }

    setLoading(true);

    try {
      const parsedPaymentDate = new Date(formData.paymentDate); 

      // Determine which vehicle account/group should receive the money
      let targetVehicle = vehicle;
      let allocatedName = vehicle ? `Main Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : 'Main Vehicle';

      if (formData.allocatedVehicleId !== rental.vehicleId) {
        const selectedSub = substituteOptions.find(o => o.id === formData.allocatedVehicleId);
        if (selectedSub) {
          targetVehicle = selectedSub.vehicle; 
          allocatedName = selectedSub.label;
        }
      }

      if (editingPaymentId) {
        await updateRentalPayment(
          rental,
          editingPaymentId,
          {
            amount: paymentAmount,
            date: parsedPaymentDate, 
            method: formData.method,
            reference: formData.reference || null,
            notes: formData.notes || null,
            allocatedVehicleId: formData.allocatedVehicleId,
            allocatedVehicleName: allocatedName,
          },
          targetVehicle 
        );
        toast.success('Payment updated successfully');
        onClose();
        return;
      }

      const payment: RentalPayment = {
        id: Date.now().toString(),
        date: parsedPaymentDate, 
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference || null,
        notes: formData.notes || null,
        createdAt: new Date(),
        createdBy: user.id,
        allocatedVehicleId: formData.allocatedVehicleId,
        allocatedVehicleName: allocatedName
      };

      const newPaidAmount = paid + paymentAmount;
      const newRemainingAmount = totalAmountDue - newPaidAmount;
      const newPaymentStatus = newRemainingAmount <= 0.001 ? 'paid' : 'partially_paid';

      await updateDoc(doc(db, 'rentals', rental.id), {
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(newRemainingAmount, 0),
        paymentStatus: newPaymentStatus,
        payments: [...(rental.payments || []), payment],
        updatedAt: new Date()
      });

      const ongoingNet = rental.includeVAT ? ongoingCharges / 1.2 : ongoingCharges;
      const returnNet = rental.includeVAT ? totalReturnCharges / 1.2 : totalReturnCharges;
      const totalNetDue = detailedCosts.net + ongoingNet + returnNet;
      const totalVatDue = Math.max(0, totalAmountDue - totalNetDue);

      const vatRatio = totalAmountDue > 0 ? totalVatDue / totalAmountDue : 0;
      const netRatio = totalAmountDue > 0 ? totalNetDue / totalAmountDue : 1;

      const paymentVatAmount = paymentAmount * vatRatio;
      const paymentNetAmount = paymentAmount * netRatio;

      const vehicleOwner = targetVehicle?.owner
        ? { name: targetVehicle.owner.name, isDefault: targetVehicle.owner.isDefault ?? false }
        : undefined;

      await createFinanceTransaction({
        type: 'income',
        category: 'Rental',
        amount: paymentAmount,
        netAmount: parseFloat(paymentNetAmount.toFixed(2)), 
        vatAmount: parseFloat(paymentVatAmount.toFixed(2)), 
        description: `A ${rental.type} rental payment from customer (${paymentCustomer?.name || 'N/A'})${formData.notes ? ` – ${formData.notes}` : ''}`,
        referenceId: rental.id,
        vehicleId: targetVehicle ? targetVehicle.id : formData.allocatedVehicleId,
        vehicleName: allocatedName,
        vehicleOwner,
        customerId: rental.customerId,
        customerName: paymentCustomer?.name,
        paymentMethod: formData.method,
        paymentReference: formData.reference || undefined,
        status: 'completed',
        paymentStatus: newPaymentStatus,
        date: parsedPaymentDate, 
        accountTo: targetVehicle?.owner?.accountId || undefined,
        groupId: targetVehicle?.assignedGroupId || undefined // ✅ Attach Group ID correctly mapped to allocations
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Financial Breakdown Card */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow-xl text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white/90">
          <Receipt className="w-5 h-5 text-green-400" /> Financial Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Calculated Total</p>
             <p className="text-xl font-mono">{formatCurrency(totalAmountDue)}</p>
           </div>
           <div>
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Amount Paid</p>
             <p className="text-xl font-mono text-green-400">{formatCurrency(paid)}</p>
           </div>
           <div className="col-span-2 bg-white/10 p-4 rounded-xl border border-white/20 flex items-center justify-between">
             <p className="text-white text-sm font-bold uppercase tracking-wider">Gross Remaining</p>
             <p className={`text-3xl font-black font-mono ${remainingAmount <= 0.001 ? 'text-green-400' : 'text-amber-400'}`}>
                {formatCurrency(remainingAmount)}
             </p>
           </div>
        </div>
      </div>

      {/* Existing Payments List */}
      {can('rentals', 'viewPayment') && rental.payments && rental.payments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Recorded Payments
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {rental.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white border border-gray-200 shadow-sm p-4 rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 p-2 rounded-lg text-green-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">£{p.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 capitalize flex flex-wrap items-center gap-2">
                      <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-full">{p.method.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date((p.date as any)?.toDate ? (p.date as any).toDate() : new Date(p.date)).toLocaleDateString()}</span>
                    </div>
                    {p.allocatedVehicleName && (
                       <div className="text-[10px] text-blue-600 font-bold mt-1 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full inline-block">
                          Allocated: {p.allocatedVehicleName}
                       </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {can('rentals', 'editPayment') && (
                    <button
                      type="button"
                      onClick={() => { setEditingPaymentId(p.id); prefillFromPayment(p); }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Payment"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {can('rentals', 'deletePayment') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Payment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New / Edit Payment Form */}
      {remainingAmount > 0 || editingPaymentId ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-3">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               {editingPaymentId ? <><Pencil className="w-5 h-5 text-blue-600" /> Edit Payment</> : <><CreditCard className="w-5 h-5 text-primary" /> Record New Payment</>}
             </h3>
             {editingPaymentId && (
               <button type="button" onClick={resetForm} className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 px-2 py-1 rounded">Cancel Edit</button>
             )}
          </div>

          <div className="space-y-5">
            {substituteOptions.length > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Vehicle Fund Allocation
                </label>
                <select
                  value={formData.allocatedVehicleId}
                  onChange={e => setFormData({ ...formData, allocatedVehicleId: e.target.value })}
                  className="block w-full rounded-lg border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white p-2.5"
                  required
                >
                  <option value={rental.vehicleId}>Main Vehicle: {vehicle?.make} {vehicle?.model} ({vehicle?.registrationNumber})</option>
                  {substituteOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-blue-700 font-medium">Select which vehicle's finance account should receive this ledger payment.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                type="date"
                label="Date Payment Received"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                required
              />
              <FormField
                type="number"
                label={editingPaymentId ? 'Updated Amount (£)' : 'Amount to Pay (£)'}
                value={formData.amountToPay}
                onChange={e => setFormData({ ...formData, amountToPay: e.target.value })}
                required
                min="0.01"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value as any })}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2.5"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <FormField
                label="Payment Reference"
                value={formData.reference}
                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Transaction ID / Check #"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-3"
                placeholder="Add any additional context for this payment..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2"
              >
                {loading ? 'Processing...' : editingPaymentId ? <><CheckCircle className="w-4 h-4"/> Update Payment</> : <><CheckCircle className="w-4 h-4"/> Record Payment</>}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
           <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
           <h3 className="text-lg font-bold text-green-900">Balance Fully Paid</h3>
           <p className="text-green-700 text-sm mt-1">There is no remaining balance due for this rental.</p>
           <button onClick={onClose} className="mt-4 px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-sm">
             Close Window
           </button>
        </div>
      )}
    </div>
  );
};

export default RentalPaymentModal;