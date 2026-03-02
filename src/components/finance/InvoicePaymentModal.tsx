// src/components/finance/InvoicePaymentModal.tsx

import React, { useState, useEffect } from 'react';
import { Invoice, Vehicle, Customer, Account } from '../../types/finance';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface InvoicePaymentModalProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  customers: Customer[];
  onClose: () => void;
}

const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  vehicle,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // State for finding the account name if not on the invoice object
  const [accountName, setAccountName] = useState(invoice.accountName || '');

  const [formData, setFormData] = useState({
    amountToPay: invoice.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: '',
    document: null as File | null
  });

  // Fetch account name if ID exists but name is missing
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
    if (paymentAmount <= 0 || paymentAmount > (invoice.remainingAmount + 0.01)) { // Added tolerance
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);

    try {
      // ✅ FIX: Initialize as null, not undefined
      let documentUrl: string | null = null;
      
      if (formData.document) {
        const storageRef = ref(storage, `receipts/${Date.now()}_${formData.document.name}`);
        const snap = await uploadBytes(storageRef, formData.document);
        documentUrl = await getDownloadURL(snap.ref);
      }

      const newPayment = {
        id: uuidv4(),
        date: new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference,
        // ✅ FIX: This will now be string or null, never undefined
        document: documentUrl, 
        notes: formData.notes,
        createdAt: new Date(),
        createdBy: user.id
      };

      const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
      const newRemaining = invoice.total - newPaidAmount;
      const newStatus = newRemaining <= 0.001 ? 'paid' : 'partially_paid';

      await updateDoc(doc(db, 'invoices', invoice.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        paymentStatus: newStatus,
        payments: [...(invoice.payments || []), newPayment],
        updatedAt: new Date()
      });

      await createFinanceTransaction({
        type: 'income',
        category: 'Invoice Payment',
        amount: paymentAmount,
        description: `Payment for ${invoice.invoiceNumber || 'Invoice'}`,
        referenceId: invoice.id,
        vehicleId: invoice.vehicleId,
        vehicleName: invoice.vehicleName || undefined,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        paymentMethod: formData.method,
        paymentReference: formData.reference,
        status: 'completed',
        paymentStatus: newStatus,
        date: new Date(),
        // ✅ Pass Account To (Credit this account)
        accountTo: invoice.accountId || undefined 
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
        
        {/* ✅ Show linked account if exists */}
        {accountName && (
           <div className="text-xs text-gray-500 mt-2 text-right">
             Linked Finance Account: <span className="font-semibold">{accountName}</span>
           </div>
        )}
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
        label="Reference" 
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

      {/* Upload */}
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