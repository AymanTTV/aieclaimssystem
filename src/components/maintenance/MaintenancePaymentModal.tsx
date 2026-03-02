import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MaintenanceLog, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction, reverseFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { Pencil, Trash2 } from 'lucide-react';

// Local interface matching the Rental structure
interface MaintenancePayment {
  id: string;
  date: any;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  createdAt: any;
  createdBy: string;
}

type ExtendedMaintenanceLog = MaintenanceLog & { payments?: MaintenancePayment[] };

interface MaintenancePaymentModalProps {
  log: ExtendedMaintenanceLog;
  vehicle?: Vehicle;
  onClose: () => void;
}

const MaintenancePaymentModal: React.FC<MaintenancePaymentModalProps> = ({
  log,
  vehicle,
  onClose
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);

  // --- Editing State ---
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  // --- 1. Consolidate Payments (Handling Legacy Data) ---
  const allPayments = useMemo(() => {
    // If we have the new array structure, use it
    if (log.payments && log.payments.length > 0) {
      return log.payments;
    }
    
    // Fallback: If we have a legacy paidAmount but no list, create a "Virtual" payment
    if ((log.paidAmount || 0) > 0) {
      return [{
        id: 'legacy_migration', // Special ID to flag migration
        date: log.date,
        amount: log.paidAmount!,
        method: log.paymentMethod || 'cash',
        reference: log.paymentReference || 'Legacy Record',
        notes: 'Legacy payment (migrated)',
        createdAt: new Date(),
        createdBy: 'system'
      }] as MaintenancePayment[];
    }

    return [] as MaintenancePayment[];
  }, [log]);

  // Find the payment currently being edited from our consolidated list
  const editingPayment = useMemo(
    () => allPayments.find(p => p.id === editingPaymentId) || null,
    [allPayments, editingPaymentId]
  );

  // --- Calculations ---
  const totalCost = log.cost || 0;
  
  const calculatedPaid = useMemo(() => {
    return allPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments]);

  const remaining = Math.max(0, totalCost - calculatedPaid);

  // --- Actions ---

  const resetForm = () => {
    setEditingPaymentId(null);
    setFormData({
      amountToPay: '0',
      method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const prefillFromPayment = (p: MaintenancePayment) => {
    setFormData({
      amountToPay: p.amount.toString(),
      method: p.method as any,
      reference: p.reference || '',
      notes: p.notes || ''
    });
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Delete this payment? This will update the maintenance log total.')) return;
    setLoading(true);
    try {
      // 1. Remove payment from the virtual list
      const updatedPayments = allPayments.filter(p => p.id !== paymentId);
      
      // 2. Recalculate totals
      const newPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = totalCost - newPaid;
      const newStatus = newRemaining <= 0.001 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      // 3. Update Firestore (This forces migration to the new array structure)
      await updateDoc(doc(db, 'maintenanceLogs', log.id), {
        payments: updatedPayments,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        updatedAt: new Date(),
        updatedBy: user?.id
      });

      // 4. Reverse Finance Transaction
      // If it was a legacy payment, we might not find a transaction by paymentId, 
      // but we try to reverse by referenceId (the log ID) if it's the only one.
      await reverseFinanceTransaction({
        referenceId: log.id,
        paymentId: paymentId === 'legacy_migration' ? undefined : paymentId
      });

      toast.success('Payment deleted');
      if (editingPaymentId === paymentId) resetForm();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete payment');
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
    
    // Determine the max allowed amount
    const originalAmt = editingPayment?.amount ?? 0;
    // If editing, we add back the old amount to the remaining budget
    const effectiveMax = editingPaymentId ? remaining + originalAmt : remaining;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    
    // Check constraint (with small float margin)
    if (paymentAmount > effectiveMax + 0.05) {
      toast.error(`Amount cannot exceed ${formatCurrency(effectiveMax)}`);
      return;
    }

    setLoading(true);
    try {
      // If editing the legacy item, we generate a NEW proper ID for it
      const isLegacyEdit = editingPaymentId === 'legacy_migration';
      const paymentId = (editingPaymentId && !isLegacyEdit) ? editingPaymentId : Date.now().toString();
      
      const newPaymentObj: MaintenancePayment = {
        id: paymentId,
        date: editingPayment ? editingPayment.date : new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        createdAt: editingPayment ? editingPayment.createdAt : new Date(),
        createdBy: editingPayment ? editingPayment.createdBy : user.id
      };

      // 1. Update local payments array
      let updatedPayments = [...allPayments];
      
      if (editingPaymentId) {
        // Replace the old one (or the legacy placeholder) with the new one
        updatedPayments = updatedPayments.map(p => p.id === editingPaymentId ? newPaymentObj : p);
      } else {
        // Add new
        updatedPayments.push(newPaymentObj);
      }

      // 2. Recalculate totals
      const newPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, totalCost - newPaid);
      const newStatus = newRemaining <= 0.001 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

      // 3. Update Maintenance Log
      await updateDoc(doc(db, 'maintenanceLogs', log.id), {
        payments: updatedPayments,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        paymentMethod: formData.method,
        paymentReference: formData.reference || null,
        notes: formData.notes || log.notes || null,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // 4. Handle Finance Transaction
      const vehicleOwner = vehicle?.owner
        ? {
            name: vehicle.owner.name,
            isDefault: vehicle.owner.isDefault ?? false,
          }
        : undefined;

      // If Editing: Reverse old transaction first
      if (editingPaymentId) {
        await reverseFinanceTransaction({
          referenceId: log.id,
          paymentId: isLegacyEdit ? undefined : editingPaymentId
        });
      }

      // Create new transaction
      await createFinanceTransaction({
  type: 'expense',
  category: log.type,
  amount: paymentAmount,
  // UPDATED DESCRIPTION: Reference the specific log's Order and Invoice
  description: `Payment for Maintenance | Order: ${log.orderNumber || 'N/A'} | Inv: ${log.invoiceNumber || 'N/A'}${formData.notes ? ` - ${formData.notes}` : ''}`,
  customerName: log.serviceProvider,
  referenceId: log.id,
  vehicleId: log.vehicleId,
  vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : undefined,
  vehicleOwner,
  accountFrom: vehicle?.owner?.accountId || undefined,
  paymentMethod: formData.method,
  // UPDATED REFERENCE: Link the finance record to the maintenance invoice number
  paymentReference: log.invoiceNumber || paymentId, 
  paymentStatus: newStatus,
  status: 'completed',
  date: new Date()
});

      toast.success(editingPaymentId ? 'Payment updated' : 'Payment recorded');
      onClose();
    } catch (err) {
      console.error('Error recording maintenance payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      {/* Existing Payments List */}
      {allPayments.length > 0 && (
        <div className="space-y-2 mb-4 border-b border-gray-200 pb-4">
          <h3 className="text-sm font-medium text-gray-700">Payment History</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {allPayments.map((p) => {
                // Handle date conversion if it's a Firestore timestamp
                const dateObj = p.date && (p.date as any).toDate ? (p.date as any).toDate() : new Date(p.date);
                
                return (
                  <div
                    key={p.id}
                    className={`flex items-start justify-between p-3 rounded-md border ${p.id === 'legacy_migration' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{formatCurrency(p.amount)}</div>
                      <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                        <span>{p.method.replace('_', ' ')}</span>
                        <span className="text-gray-300">|</span>
                        <span>{dateObj.toLocaleDateString()}</span>
                      </div>
                      {p.reference && <div className="text-xs text-gray-400 mt-0.5">Ref: {p.reference}</div>}
                      {p.id === 'legacy_migration' && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Old Record</span>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPaymentId(p.id);
                          prefillFromPayment(p);
                        }}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-white rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
          {editingPaymentId && (
            <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <span>Editing {editingPaymentId === 'legacy_migration' ? 'Old Payment' : 'Payment'}...</span>
              <button type="button" onClick={resetForm} className="underline font-medium hover:text-amber-900">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>NET:</span>
          <span>{formatCurrency(log.netAmount || 0)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT:</span>
          <span>{formatCurrency(log.vatAmount || 0)}</span>
        </div>
        {log.totalDiscount! > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Discount:</span>
            <span>–{formatCurrency(log.totalDiscount!)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span>{formatCurrency(log.cost)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Paid:</span>
          <span>{formatCurrency(calculatedPaid)}</span>
        </div>
        <div className="flex justify-between text-sm text-amber-600 font-medium">
          <span>Owing:</span>
          <span>{formatCurrency(remaining)}</span>
        </div>
      </div>

      {/* Payment Inputs */}
      <FormField
        type="number"
        label={editingPaymentId ? "New Amount" : "Amount to Pay"}
        value={formData.amountToPay}
        onChange={(e) => setFormData(prev => ({ ...prev, amountToPay: e.target.value }))}
        required
        min="0.01"
        step="0.01"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.method}
          onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      <FormField
        label="Reference (Optional)"
        value={formData.reference}
        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
        placeholder="Transaction ID or check number"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add any payment notes"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : editingPaymentId ? 'Update Payment' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default MaintenancePaymentModal;