// src/components/finance/InvoicePaymentModal.tsx
import React, { useState, useEffect } from 'react';
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
  customers: Customer[];
  accounts: Account[];
  onClose: () => void;
}

const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  vehicle,
  customers,
  accounts,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [accountName, setAccountName] = useState(invoice.accountName || '');

  // Initialize accounts with values from the invoice
  const [accountTo, setAccountTo] = useState((invoice as any).accountTo || invoice.accountId || '');
  const [accountTo2, setAccountTo2] = useState('');

  const [formData, setFormData] = useState({
    amountToPay: invoice.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: '',
    document: null as File | null
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

    setLoading(true);

    try {
      let documentUrl: string | null = null;
      
      if (formData.document) {
        const storageRef = ref(storage, `receipts/${Date.now()}_${formData.document.name}`);
        const snap = await uploadBytes(storageRef, formData.document);
        documentUrl = await getDownloadURL(snap.ref);
      }

      const newPaymentId = uuidv4();
      const newPayment = {
        id: newPaymentId,
        date: new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference || 'N/A', 
        document: documentUrl, 
        notes: formData.notes,
        createdAt: new Date(),
        createdBy: user.id
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

      // Map the vehicle owner properly so the Finance ledger can filter it instantly
      let mappedVehicleOwner = undefined;
      if (invoice.vehicleId) {
         if (vehicle && vehicle.owner) {
             mappedVehicleOwner = { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false };
         } else {
             mappedVehicleOwner = { name: 'AIE Skyline Limited', isDefault: true };
         }
      }

      await createFinanceTransaction({
        type: 'income',
        category: invoice.category || 'Invoice Payment',
        amount: paymentAmount,
        netAmount: parseFloat(paymentNetAmount.toFixed(2)),
        vatAmount: parseFloat(paymentVatAmount.toFixed(2)),
        description: [invoice.description, formData.notes].filter(Boolean).join(' - ') || `Payment for ${invoice.invoiceNumber || 'Invoice'}`,
        referenceId: invoice.id,
        vehicleId: invoice.vehicleId,
        vehicleName: invoice.vehicleName || undefined,
        vehicleOwner: mappedVehicleOwner, // Added Explicit Owner
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        paymentMethod: formData.method,
        paymentReference: formData.reference || 'N/A',
        status: 'completed',
        paymentStatus: newStatus as any,
        date: new Date(),
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-gray-100">
        <SearchableSelect
          label="Account To (Main Credit)"
          options={accounts.map(a => ({ id: a.id, label: a.name }))}
          value={accountTo}
          onChange={(val) => setAccountTo(val || '')}
          placeholder="Select main account..."
        />
        <SearchableSelect
          label="Also Credit Account (Merged into Record)"
          options={accounts.map(a => ({ id: a.id, label: a.name }))}
          value={accountTo2}
          onChange={(val) => setAccountTo2(val || '')}
          placeholder="Select second account..."
        />
      </div>

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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
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
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded">
            {loading ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </form>
  );
};

export default InvoicePaymentModal;