// src/components/finance/InvoicePaymentModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, Vehicle, Customer, Account } from '../../types/finance';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface InvoicePaymentModalProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  vehicles: Vehicle[]; 
  customers: Customer[];
  accounts: Account[];
  groups?: { id: string; name: string }[]; 
  onClose: () => void;
}

const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  vehicle,
  vehicles,
  customers,
  accounts,
  groups = [], 
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [accountName, setAccountName] = useState(invoice.accountName || '');
  const [accountTo, setAccountTo] = useState((invoice as any).accountTo || invoice.accountId || '');
  const [accountTo2, setAccountTo2] = useState('');

  const hasItemVehicles = useMemo(() => {
    return invoice.lineItems?.some(li => !!li.vehicleId);
  }, [invoice.lineItems]);

  const [paymentMode, setPaymentMode] = useState<'general' | 'item'>(hasItemVehicles ? 'item' : 'general');
  const [selectedLineItemId, setSelectedLineItemId] = useState<string>('');

  const [formData, setFormData] = useState({
    amountToPay: invoice.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: '',
    document: null as File | null,
    allocatedVehicleId: invoice.vehicleId || '',
    paymentDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  });

  useEffect(() => {
    if (invoice.accountId && !invoice.accountName) {
        (async () => {
            try {
                const snap = await getDocs(collection(db, 'accounts'));
                snap.forEach(doc => {
                    if (doc.id === invoice.accountId) setAccountName(doc.data().name);
                });
            } catch (e) { console.error("Err fetching accounts", e); }
        })();
    }
  }, [invoice.accountId, invoice.accountName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const paymentAmount = parseFloat(formData.amountToPay);
    if (paymentAmount <= 0 || paymentAmount > (invoice.remainingAmount + 0.01)) { 
      toast.error('Invalid payment amount');
      return;
    }

    if (paymentMode === 'item' && !selectedLineItemId) {
      toast.error('Please select a line item to pay for.');
      return;
    }

    setLoading(true);

    try {
      let documentUrl: string | null = null;
      
      if (formData.document) {
        const storageRef = ref(storage, `receipts/${Date.now()}_${formData.document.name}`);
        const snap = await uploadBytes(storageRef, formData.document);
        documentUrl = await getDownloadURL(snap.ref);
      }

      const targetVehicle = formData.allocatedVehicleId ? vehicles.find(v => v.id === formData.allocatedVehicleId) : vehicle;
      const allocatedVehicleName = targetVehicle ? `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.registrationNumber})` : undefined;

      const selectedPaymentDate = new Date(formData.paymentDate);
      const newPaymentId = `inv_pay_${Date.now()}_${uuidv4().substring(0,6)}`;

      const actualReference = formData.reference || formData.notes || invoice.invoiceNumber || 'N/A';

      const newPayment = {
        id: newPaymentId,
        date: selectedPaymentDate,
        amount: paymentAmount,
        method: formData.method,
        reference: actualReference, 
        document: documentUrl || null, 
        notes: formData.notes || null, 
        createdAt: new Date(),
        createdBy: user.id,
        allocatedVehicleId: targetVehicle?.id || null, 
        allocatedVehicleName: allocatedVehicleName || null
      };

      const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
      const newRemaining = invoice.total - newPaidAmount;
      
      let newStatus = 'unpaid';
      if (newPaidAmount >= invoice.total - 0.01 && invoice.total > 0) newStatus = 'paid';
      else if (newPaidAmount > 0) newStatus = 'partially_paid';

      await updateDoc(doc(db, 'invoices', invoice.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        paymentStatus: newStatus,
        payments: [...(invoice.payments || []), newPayment],
        updatedAt: new Date()
      });

      const totalLogCost = invoice.total || 1; 
      const vatRatio = (invoice.vatAmount || 0) / totalLogCost;
      const netRatio = (invoice.subTotal || invoice.total || 0) / totalLogCost;

      const paymentVatAmount = paymentAmount * vatRatio;
      const paymentNetAmount = paymentAmount * netRatio;

      let finalAccountId = accountTo;
      if (!finalAccountId) {
          const defaultAcc = accounts.find(a => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT'));
          if (defaultAcc) finalAccountId = defaultAcc.id;
      }

      const mergedAccountsTo = [];
      if (finalAccountId) mergedAccountsTo.push(finalAccountId);
      if (accountTo2) mergedAccountsTo.push(accountTo2);

      let mappedVehicleOwner = undefined;
      if (targetVehicle) {
         if (targetVehicle.owner) {
             mappedVehicleOwner = { name: targetVehicle.owner.name, isDefault: targetVehicle.owner.isDefault ?? false };
         } else {
             mappedVehicleOwner = { name: 'AIE Skyline Limited', isDefault: true };
         }
      }

      const actualCategory = invoice.category === 'Other' && invoice.customCategory 
        ? invoice.customCategory 
        : (invoice.category || 'Invoice Payment');

      const rawGroupId = targetVehicle?.assignedGroupId || invoice.groupId;
      const resolvedGroupName = groups.find(g => g.id === rawGroupId || g.name === rawGroupId)?.name || ((invoice as any).groupName !== rawGroupId ? (invoice as any).groupName : undefined);

      const targetDeptId = invoice.departmentId || targetVehicle?.assignedDepartmentId;
      const targetDeptName = invoice.departmentName || targetVehicle?.assignedDepartmentName;

      await createFinanceTransaction({
        type: 'income',
        category: actualCategory,
        amount: paymentAmount,
        netAmount: parseFloat(paymentNetAmount.toFixed(2)),
        vatAmount: parseFloat(paymentVatAmount.toFixed(2)),
        description: [invoice.invoiceNumber, invoice.description, formData.notes, formData.reference ? `Ref: ${formData.reference}` : ''].filter(Boolean).join(' - ') || `Payment for ${invoice.invoiceNumber || 'Invoice'}`,
        referenceId: invoice.id,
        vehicleId: targetVehicle?.id || invoice.vehicleId,
        vehicleName: allocatedVehicleName || invoice.vehicleName || undefined,
        vehicleOwner: mappedVehicleOwner, 
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        groupId: rawGroupId || undefined, 
        groupName: resolvedGroupName || undefined, 
        departmentId: targetDeptId || undefined, 
        departmentName: targetDeptName || undefined, 
        paymentMethod: formData.method,
        paymentReference: actualReference, // ✅ Restored human-readable invoice reference
        paymentId: newPaymentId, // ✅ Dedicated system link for strict deletion tracking
        status: 'completed',
        paymentStatus: newStatus as any,
        date: selectedPaymentDate,
        accountsTo: mergedAccountsTo 
      });

      toast.success('Payment recorded');
      onClose();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded mb-4">
        <div className="flex justify-between text-sm">
          <span>Total:</span>
          <span className="font-bold">£{invoice.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Paid:</span>
          <span>£{(invoice.paidAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-red-600 border-t pt-2 mt-2">
          <span>Remaining:</span>
          <span className="font-bold">£{invoice.remainingAmount.toFixed(2)}</span>
        </div>
        
        {accountName && (
           <div className="text-xs text-gray-500 mt-2 text-right">
             Linked Finance Account: <span className="font-semibold">{accountName}</span>
           </div>
        )}
      </div>

      <div className="pb-4 mb-4 border-b border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Target</label>
          <select
            value={paymentMode}
            disabled={hasItemVehicles}
            onChange={e => {
              const mode = e.target.value as 'general' | 'item';
              setPaymentMode(mode);
              if (mode === 'general') {
                setFormData(prev => ({ 
                  ...prev, 
                  amountToPay: invoice.remainingAmount.toString(), 
                  allocatedVehicleId: invoice.vehicleId || '',
                  notes: ''
                }));
                setSelectedLineItemId('');
              }
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 disabled:bg-gray-100"
          >
            {!hasItemVehicles && <option value="general">General Invoice Payment</option>}
            <option value="item">Pay Specific Product / Line Item</option>
          </select>
          {hasItemVehicles && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Because this invoice contains line items specifically assigned to vehicles, you must log payments per-item to ensure the finance ledgers balance correctly.
            </p>
          )}
        </div>

        {paymentMode === 'item' && (
          <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100">
            <label className="block text-sm font-medium text-blue-900 mb-1">Select Line Item</label>
            <select
              value={selectedLineItemId}
              onChange={e => {
                const itemId = e.target.value;
                setSelectedLineItemId(itemId);
                const item = invoice.lineItems?.find(li => li.id === itemId);
                
                if (item) {
                  const gross = item.quantity * item.unitPrice;
                  const discountAmt = (item.discount / 100) * gross;
                  const netAfterDiscount = gross - discountAmt;
                  const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
                  const totalLine = netAfterDiscount + vatAmt;
                  
                  setFormData(prev => ({
                    ...prev,
                    amountToPay: Math.min(totalLine, invoice.remainingAmount).toFixed(2), 
                    allocatedVehicleId: item.vehicleId || invoice.vehicleId || '',
                    notes: `Payment for item: ${item.description}`
                  }));
                }
              }}
              className="block w-full rounded-md border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
            >
              <option value="">-- Select Item to Pay --</option>
              {invoice.lineItems?.map(item => {
                const gross = item.quantity * item.unitPrice;
                const discountAmt = (item.discount / 100) * gross;
                const netAfterDiscount = gross - discountAmt;
                const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
                const totalLine = netAfterDiscount + vatAmt;
                return (
                  <option key={item.id} value={item.id}>
                    {item.description} - £{totalLine.toFixed(2)} {item.vehicleName ? `(${item.vehicleName})` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-blue-700 mt-2">
              The payment amount and allocated vehicle below have been automatically updated based on the selected product.
            </p>
          </div>
        )}
      </div>

      <div className="pb-4 mb-4 border-b border-gray-100">
        <SearchableSelect
          label="Vehicle Allocation (Optional)"
          options={vehicles.map(v => ({ id: v.id, label: `${v.registrationNumber} - ${v.make} ${v.model}` }))}
          value={formData.allocatedVehicleId}
          onChange={(val) => {
             const vId = Array.isArray(val) ? val[0] : val;
             setFormData(prev => ({ ...prev, allocatedVehicleId: vId || '' }))
          }}
          placeholder="Select a vehicle to credit..."
        />
        <p className="mt-1 text-xs text-gray-500">
          This payment will be logged against this vehicle's ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-gray-100">
        <SearchableSelect
          label="Account To (Main Credit)"
          options={accounts.map(a => ({ id: a.id, label: a.name }))}
          value={accountTo}
          onChange={(val) => {
             const aId = Array.isArray(val) ? val[0] : val;
             setAccountTo(aId || '');
          }}
          placeholder="Select main account..."
        />
        <SearchableSelect
          label="Also Credit Account (Merged into Record)"
          options={accounts.map(a => ({ id: a.id, label: a.name }))}
          value={accountTo2}
          onChange={(val) => {
             const aId = Array.isArray(val) ? val[0] : val;
             setAccountTo2(aId || '');
          }}
          placeholder="Select second account..."
        />
      </div>

      <FormField 
        label="Payment Date & Time" 
        type="datetime-local" 
        value={formData.paymentDate} 
        onChange={e => setFormData({...formData, paymentDate: e.target.value})}
        required
      />

      <FormField 
        label="Amount" 
        type="number" 
        value={formData.amountToPay} 
        onChange={e => setFormData({...formData, amountToPay: e.target.value})} 
        max={invoice.remainingAmount}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Method</label>
        <select 
          value={formData.method} 
          onChange={e => setFormData({...formData, method: e.target.value as any})}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
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
        onChange={e => setFormData({...formData, reference: e.target.value})} 
        placeholder="Transaction ID" 
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea 
          value={formData.notes} 
          onChange={e => setFormData({...formData, notes: e.target.value})} 
          rows={2} 
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
        />
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
         <label className="cursor-pointer">
            <span className="text-primary text-sm font-medium">Upload Receipt</span>
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setFormData({...formData, document: e.target.files?.[0] || null})} />
         </label>
         {formData.document && <p className="text-xs text-gray-500 mt-1">{formData.document.name}</p>}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600">
            {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </form>
  );
};

export default InvoicePaymentModal;