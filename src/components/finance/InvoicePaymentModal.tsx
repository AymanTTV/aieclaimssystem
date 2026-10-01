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
import { generateAndUploadDocument, getCompanyDetails } from '../../utils/documentGenerator';
import { InvoiceDocument } from '../pdf/documents';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import { fetchUnifiedProfitAndCosts, syncInvoiceRecord } from '../../services/unifiedSync.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useRecordInvoicePayment } from '../../hooks/useRecordInvoicePayment';

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
  const { formatCurrency } = useFormattedDisplay();
  const { recordInvoicePayment } = useRecordInvoicePayment();
  const [loading, setLoading] = useState(false);
  const [subcontractorCost, setSubcontractorCost] = useState<string>(
    invoice.subcontractorCost !== undefined && Number(invoice.subcontractorCost) > 0
      ? String(invoice.subcontractorCost)
      : '0'
  );

  useEffect(() => {
    if (invoice.subcontractorCost !== undefined && Number(invoice.subcontractorCost) > 0) {
      setSubcontractorCost(String(invoice.subcontractorCost));
    } else {
      fetchUnifiedProfitAndCosts({
        id: invoice.id,
        referenceId: invoice.referenceId,
        orderNumber: invoice.orderNumber || invoice.orderId,
        invoiceNumber: invoice.invoiceNumber,
      }).then((unified) => {
        if (unified && unified.subcontractorCost !== undefined && unified.subcontractorCost > 0) {
          setSubcontractorCost(String(unified.subcontractorCost));
        }
      });
    }
  }, [invoice.id, invoice.subcontractorCost, invoice.referenceId, invoice.orderNumber, invoice.orderId, invoice.invoiceNumber]);
  
  const billedAmount = invoice.total || invoice.customerBilled || invoice.amount || 0;
  const subCostNum = Math.max(0, parseFloat(subcontractorCost) || 0);
  const profitMetrics = calculateProfitMetrics(billedAmount, subCostNum);
  
  const [accountName, setAccountName] = useState(invoice.accountName || '');
  const [accountTo, setAccountTo] = useState((invoice as any).accountTo || invoice.accountId || '');
  const [accountTo2, setAccountTo2] = useState('');

  const hasItemVehicles = useMemo(() => {
    return invoice.lineItems?.some(li => !!li.vehicleId);
  }, [invoice.lineItems]);

  const [paymentMode, setPaymentMode] = useState<'general' | 'item'>(hasItemVehicles ? 'item' : 'general');
  const [selectedLineItemId, setSelectedLineItemId] = useState<string>('');

  const [formData, setFormData] = useState({
    amountToPay: (invoice.remainingAmount !== undefined && !isNaN(invoice.remainingAmount)) ? invoice.remainingAmount.toString() : '0',
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

    // Optimistic calculations for instant feedback
    const optimisticPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
    const optimisticRemaining = Math.max(0, invoice.total - optimisticPaidAmount);
    const optimisticStatus: 'paid' | 'partially_paid' = optimisticRemaining <= 0.001 ? 'paid' : 'partially_paid';
    const tempPaymentId = `inv_pay_${Date.now()}`;

    // Optimistic UI update: instantly close modal and notify user
    toast.success('Payment recorded successfully');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('invoiceRecordUpdated', {
          detail: {
            id: invoice.id,
            entityId: invoice.id,
            paidAmount: optimisticPaidAmount,
            remainingAmount: optimisticRemaining,
            paymentStatus: optimisticStatus,
            action: 'RECORD_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            id: tempPaymentId,
            entityId: invoice.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: paymentAmount,
            type: 'income',
            transactionType: 'INCOME',
            paymentMethod: formData.method,
            paymentReference: formData.reference || invoice.invoiceNumber,
            action: 'RECORD_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
    }
    onClose();

    // Execute background persistence and document generation asynchronously
    (async () => {
      try {
        let documentUrl: string | null = null;
        if (formData.document) {
          const storageRef = ref(storage, `receipts/${Date.now()}_${formData.document.name}`);
          const snap = await uploadBytes(storageRef, formData.document);
          documentUrl = await getDownloadURL(snap.ref);
        }

        const res = await recordInvoicePayment({
          invoice,
          paymentAmount,
          paymentMethod: formData.method,
          paymentDate: formData.paymentDate,
          paymentReference: formData.reference,
          notes: formData.notes,
          documentUrl,
          allocatedVehicleId: formData.allocatedVehicleId,
          accountToId: accountTo,
          accountTo2Id: accountTo2,
          vehicles,
          accounts,
          customers,
          groups,
        });

        if (res.success) {
          // Asynchronously update the invoice PDF document in the background
          try {
            const companyDetails = await getCompanyDetails();
            const targetVehicle = formData.allocatedVehicleId ? vehicles.find(v => v.id === formData.allocatedVehicleId) : vehicle;
            const updatedInvoice = {
              ...invoice,
              paidAmount: res.newPaidAmount ?? optimisticPaidAmount,
              remainingAmount: res.newRemaining ?? optimisticRemaining,
              paymentStatus: (res.paymentStatus as any) || optimisticStatus,
              payments: [
                ...(invoice.payments || []),
                {
                  id: res.paymentId || tempPaymentId,
                  date: new Date(formData.paymentDate),
                  amount: paymentAmount,
                  method: formData.method,
                  reference: formData.reference || 'N/A',
                  document: documentUrl || null,
                  notes: formData.notes || null,
                }
              ],
              vehicle: targetVehicle || vehicle,
              customer: customers.find(c => c.id === invoice.customerId) || (invoice.customerName ? { name: invoice.customerName, mobile: invoice.customerPhone } : undefined)
            };
            await generateAndUploadDocument(
              InvoiceDocument,
              updatedInvoice,
              'invoices',
              invoice.id,
              'invoices',
              companyDetails,
              'documentUrl'
            );
          } catch (docErr) {
            console.warn('Background invoice document update error:', docErr);
          }
        }
      } catch (bgError: any) {
        console.error('Background payment recording error:', bgError);
        toast.error('Failed to sync payment to server: ' + (bgError?.message || 'Network error'));
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-1.5">
        <div className="flex justify-between text-sm font-bold text-[#D97706]">
          <span>Total:</span>
          <span className="font-mono">£{invoice.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#15803D] font-bold">
          <span>Paid:</span>
          <span className="font-mono">£{(invoice.paidAmount || 0).toFixed(2)}</span>
        </div>
        <div className={`flex justify-between text-sm font-bold pt-2 border-t border-slate-200 ${invoice.remainingAmount > 0.001 ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
          <span>Owing:</span>
          <span className="font-mono">£{invoice.remainingAmount.toFixed(2)}</span>
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
              {invoice.lineItems?.map((item, idx) => {
                const gross = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                const discountAmt = ((Number(item.discount) || 0) / 100) * gross;
                const netAfterDiscount = gross - discountAmt;
                const vatAmt = item.includeVAT ? netAfterDiscount * 0.2 : 0;
                const totalLine = netAfterDiscount + vatAmt;
                const itemKey = item.id || `line-item-${idx}`;
                return (
                  <option key={itemKey} value={item.id || String(idx)}>
                    {item.description || `Item #${idx + 1}`} - £{totalLine.toFixed(2)} {item.vehicleName ? `(${item.vehicleName})` : ''}
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
        max={isNaN(Number(invoice.remainingAmount)) ? 0 : Number(invoice.remainingAmount)}
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

      {/* Dealer / Subcontractor Cost & Live Profit Tracking Card */}
      <div className="bg-slate-50 p-3.5 rounded-xl border-2 border-indigo-200/90 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-indigo-100 text-indigo-700 rounded-md">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Dealer / Subcontractor Cost & Profit Tracking
              </h4>
              <p className="text-[10px] text-slate-500">
                Adjust subcontractor cost at payment recording to update live profit metrics
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded">
            Invoice Total: {formatCurrency(billedAmount)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dealer / Subcontractor Cost (£)
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-bold">
                £
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={subcontractorCost}
                onChange={(e) => setSubcontractorCost(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Live Profit Preview Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`p-2 rounded-lg border flex flex-col justify-between ${
                profitMetrics.netProfit >= 0
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                <span>Live Net Profit</span>
                {profitMetrics.netProfit >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-600" />
                )}
              </div>
              <p
                className={`text-sm font-black font-mono mt-0.5 ${
                  profitMetrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {profitMetrics.netProfit >= 0 ? '+' : ''}
                {formatCurrency(profitMetrics.netProfit)}
              </p>
              <span className="text-[9px] text-slate-500">Customer Billed – Dealer Cost</span>
            </div>

            <div
              className={`p-2 rounded-lg border flex flex-col justify-between ${
                profitMetrics.profitMarginPercent >= 0
                  ? 'bg-indigo-50/80 border-indigo-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase">
                <span>Profit Margin</span>
                <Percent className="w-3 h-3 text-indigo-600" />
              </div>
              <p
                className={`text-sm font-black font-mono mt-0.5 ${
                  profitMetrics.profitMarginPercent >= 0 ? 'text-indigo-700' : 'text-rose-700'
                }`}
              >
                {profitMetrics.profitMarginPercent.toFixed(1)}%
              </p>
              <span className="text-[9px] text-slate-500">Margin on billed</span>
            </div>
          </div>
        </div>
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