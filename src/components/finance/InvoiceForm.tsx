// src/components/finance/InvoiceForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';
import toast from 'react-hot-toast';
import { InvoiceLineItem, Invoice, Account } from '../../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import productService from '../../services/product.service';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import ProductFormModal from '../products/ProductFormModal';
import { PlusCircle } from 'lucide-react';

interface InvoiceFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  accounts?: Account[];
  groups?: { id: string; name: string }[];
  onClose: () => void;
}

interface ProductSuggestion {
  id: string;
  partNumber: string;
  name: string;
  lastPrice: number; 
}

const getNextInvoiceNumber = async (): Promise<string> => {
  const invoicesRef = collection(db, 'invoices');
  const q = query(invoicesRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  let maxNum = 0;
  querySnapshot.forEach((doc) => {
    const data = doc.data() as Invoice;
    if (data.invoiceNumber && data.invoiceNumber.startsWith('INV')) {
      const numPart = data.invoiceNumber.substring(3);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `INV${String(nextNum).padStart(4, '0')}`;
};

const InvoiceForm: React.FC<InvoiceFormProps> = ({ vehicles, customers, accounts: propAccounts = [], groups = [], onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<Account[]>(propAccounts);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }
  ]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    customCategory: '',
    description: '', 
    vehicleId: '',
    vehicleName: '',
    manualVehicleEntry: false,
    manualVehicleMake: '',
    manualVehicleModel: '',
    manualVehicleReg: '',
    useCustomCustomer: false,
    customerId: '',
    customerName: '',
    customerPhone: '',
    amountToPay: '0',
    isPaid: false,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    isLoan: true, // Default to true
    groupId: '',
    accountFrom: '',
    accountTo: '',
    isRecurring: false,
    recurringFrequency: 'monthly',
    uploadedDocument: null as File | null
  });

  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingLineIndex, setPendingLineIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'invoiceCategories'));
        const fetched: string[] = [];
        snap.forEach(s => fetched.push((s.data() as any).name));
        fetched.sort((a, b) => a.localeCompare(b));
        setCategories(fetched);
      } catch {
        toast.error('Failed to load categories');
      }
    })();

    if (financeAccounts.length === 0) {
        (async () => {
        try {
            const snap = await getDocs(collection(db, 'accounts')); 
            const accs: Account[] = [];
            snap.forEach(doc => accs.push({ id: doc.id, ...doc.data() } as Account));
            setFinanceAccounts(accs.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
            console.error("Failed to load accounts", e);
        }
        })();
    }

    (async () => {
      try {
        const prods = await productService.getAll();
        setProductSuggestions(
          prods.map(p => ({
            id: p.id,
            partNumber: p.partNumber ?? '',
            name: p.name ?? '',
            lastPrice: Number(p.retailPrice ?? p.price ?? 0),
          }))
        );
      } catch {
        console.error('Error fetching products');
      }
    })();
  }, []);

  const handleProductCreated = (product: any) => {
    const newSuggestion = {
      id: product.id,
      partNumber: product.partNumber ?? '',
      name: product.name ?? '',
      lastPrice: Number(product.retailPrice ?? 0),
    };
    setProductSuggestions(prev => [...prev, newSuggestion]);

    if (pendingLineIndex !== null) {
      setLineItems(prev => {
         const copy = [...prev];
         copy[pendingLineIndex] = {
           ...copy[pendingLineIndex],
           description: newSuggestion.name,
           unitPrice: newSuggestion.lastPrice
         };
         return copy;
      });
      const arr = [...showSuggestions]; 
      arr[pendingLineIndex] = false; 
      setShowSuggestions(arr);
    }
    setPendingLineIndex(null);
  };

  const filterMatches = (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return productSuggestions.filter(ps =>
      ps.name.toLowerCase().includes(s) || ps.partNumber.toLowerCase().includes(s)
    );
  };

  const tryAutofillUnitPrice = (desc: string, idx: number) => {
    const q = desc.trim().toLowerCase();
    if (!q) return;
    const hit = productSuggestions.find(
      ps => ps.name.toLowerCase() === q || ps.partNumber.toLowerCase() === q
    );
    if (hit) {
      setLineItems(items => {
        const copy = [...items];
        copy[idx] = { ...copy[idx], unitPrice: hit.lastPrice };
        return copy;
      });
    }
  };

  useEffect(() => {
    setShowSuggestions(new Array(lineItems.length).fill(false));
  }, [lineItems.length]);

  const computeTotals = () => {
    let subTotal = 0, vatAmount = 0, totalDiscount = 0;
    lineItems.forEach(item => {
      const lineNet = item.quantity * item.unitPrice;
      const disc = (item.discount / 100) * lineNet;
      totalDiscount += disc;
      const netAfter = lineNet - disc;
      subTotal += netAfter;
      if (item.includeVAT) vatAmount += netAfter * 0.2;
    });
    return { subTotal, vatAmount, total: subTotal + vatAmount, totalDiscount };
  };
  const { subTotal, vatAmount, total, totalDiscount } = computeTotals();
  const paidNow = parseFloat(formData.amountToPay) || 0;
  const owing = total - paidNow;

  useEffect(() => {
    if (formData.isPaid) {
      setFormData(fd => ({ ...fd, amountToPay: total.toFixed(2) }));
    }
  }, [formData.isPaid, total]);

  const handleLineChange = (
    idx: number,
    field: keyof Omit<InvoiceLineItem, 'id'>,
    value: string | boolean
  ) => {
    setLineItems(items => {
      const copy = [...items];
      const it = { ...copy[idx] };
      if (field === 'includeVAT') {
        it.includeVAT = value as boolean;
      } else if (field === 'quantity') {
        it.quantity = parseInt(value as string) || 0;
      } else if (field === 'unitPrice') {
        it.unitPrice = parseFloat(value as string) || 0;
      } else if (field === 'discount') {
        it.discount = parseFloat(value as string) || 0;
      } else {
        it.description = value as string;
      }
      copy[idx] = it;
      return copy;
    });
  };

  const addLineItem = () =>
    setLineItems(prev => [
      ...prev,
      { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false }
    ]);

  const removeLineItem = (idx: number) =>
    setLineItems(items => items.filter((_, i) => i !== idx));

  const handleDescriptionChange = (idx: number, value: string) => {
    handleLineChange(idx, 'description', value);
    const arr = [...showSuggestions]; arr[idx] = true; setShowSuggestions(arr);
  };
  const handleSuggestionSelect = (prod: ProductSuggestion, idx: number) => {
    handleLineChange(idx, 'description', prod.name);
    handleLineChange(idx, 'unitPrice', prod.lastPrice.toString());
    const arr = [...showSuggestions]; arr[idx] = false; setShowSuggestions(arr);
  };
  const handleFieldFocus = (idx: number) => {
    const arr = [...showSuggestions]; arr[idx] = true; setShowSuggestions(arr);
  };
  const handleFieldBlur = (idx: number) => {
    setTimeout(() => {
      const arr = [...showSuggestions]; arr[idx] = false; setShowSuggestions(arr);
    }, 200); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    if (!formData.isLoan) {
      toast.error('The "Is it a Loan?" checkbox must be checked before saving.');
      setLoading(false);
      return;
    }

    if (
      (!formData.useCustomCustomer && !formData.customerId) ||
      (formData.useCustomCustomer && !formData.customerName.trim())
    ) {
      toast.error('A customer is required. Please select one or enter their details manually.');
      setLoading(false);
      return;
    }

    if (!lineItems.length || lineItems.every(li => li.quantity * li.unitPrice - (li.discount/100)*li.quantity*li.unitPrice === 0)) {
      toast.error('Add at least one line item with a non-zero value.');
      setLoading(false);
      return;
    }
    if (paidNow > total) {
      toast.error('Amount paid cannot exceed the total amount.');
      setLoading(false);
      return;
    }
    
    try {
        const newInvoiceNumber = await getNextInvoiceNumber();
        const remaining = parseFloat((total - paidNow).toFixed(2));
        
        let status: 'paid' | 'unpaid' | 'partially_paid' = 'unpaid';
        if (paidNow >= total - 0.01 && total > 0) status = 'paid';
        else if (paidNow > 0) status = 'partially_paid';

        const payments: Invoice['payments'] = paidNow > 0 ? [{
          id: Date.now().toString(),
          date: new Date(),
          amount: paidNow,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id,
          document: undefined
        }] : [];
    
        const combinedManualVehicleName = formData.manualVehicleEntry 
          ? `${formData.manualVehicleMake.trim()} ${formData.manualVehicleModel.trim()} (${formData.manualVehicleReg.trim()})`.trim()
          : null;

        const vehicle = vehicles.find(v => v.id === formData.vehicleId); // ✅ Find vehicle

        const payload: any = {
          invoiceNumber: newInvoiceNumber,
          date: new Date(formData.date),
          dueDate: new Date(formData.dueDate),
          lineItems: lineItems.map(li => ({ ...li })),
          subTotal,
          vatAmount,
          total,
          amount: total,
          paidAmount: paidNow,
          remainingAmount: remaining,
          paymentStatus: status,
          category: formData.category,
          description: formData.description, 
          customCategory: formData.category === 'Other' ? formData.customCategory : null,
          groupId: formData.groupId || vehicle?.assignedGroupId || null, // ✅ Assign fallback group
          vehicleId: formData.manualVehicleEntry ? null : (formData.vehicleId || null),
          vehicleName: formData.manualVehicleEntry ? combinedManualVehicleName : (formData.vehicleName || null),
          customerId: formData.useCustomCustomer ? null : (formData.customerId || null),
          customerName: formData.useCustomCustomer
            ? formData.customerName
            : customers.find(c => c.id === formData.customerId)?.name || '',
          customerPhone: formData.useCustomCustomer
            ? formData.customerPhone
            : customers.find(c => c.id === formData.customerId)?.mobile || '',
          payments,
          isLoan: formData.isLoan,
          accountFrom: formData.accountFrom || null,
          accountTo: formData.accountTo || null,
          isRecurring: formData.isRecurring,
          recurringFrequency: formData.isRecurring ? (formData.recurringFrequency as any) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.id
        };

        const docRef = await addDoc(collection(db, 'invoices'), payload as any);

        let documentUrl = '';
        if (formData.uploadedDocument) {
             const stRef = ref(storage, `invoices/${docRef.id}/${formData.uploadedDocument.name}`);
             const snap = await uploadBytes(stRef, formData.uploadedDocument);
             documentUrl = await getDownloadURL(snap.ref);
        } else {
             const blob = await generateInvoicePDF(
                { id: docRef.id, ...payload } as any,
                vehicles.find(v => v.id === formData.vehicleId)!
             );
             const stRef = ref(storage, `invoices/${docRef.id}/invoice.pdf`);
             const snap = await uploadBytes(stRef, blob);
             documentUrl = await getDownloadURL(snap.ref);
        }
        await updateDoc(doc(db, 'invoices', docRef.id), { documentUrl: documentUrl });

        const vehicleOwner = formData.manualVehicleEntry ? null : (vehicle?.owner
            ? { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false }
            : { name: 'AIE Skyline Limited', isDefault: true });

        if (formData.isLoan) {
            await createFinanceTransaction({
            type: 'expense',
            category: formData.category || 'Loan Provided',
            amount: total,
            description: [formData.description, `Loan for Invoice ${newInvoiceNumber}`].filter(Boolean).join(' - '),
            referenceId: docRef.id,
            vehicleId: payload.vehicleId || undefined,
            vehicleName: payload.vehicleName || undefined,
            vehicleOwner,
            customerId: payload.customerId || undefined,
            customerName: payload.customerName || undefined,
            paymentMethod: 'internal',
            paymentStatus: 'paid',
            accountFrom: formData.accountFrom || undefined,
            accountTo: formData.accountTo || undefined,
            groupId: payload.groupId || undefined // ✅ Attach Group ID
            });
        }

        let finalAccountId = formData.accountTo;
        if (!finalAccountId) {
            const defaultAcc = financeAccounts.find(a => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT'));
            if (defaultAcc) finalAccountId = defaultAcc.id;
        }

        if (paidNow > 0) {
            await createFinanceTransaction({
            type: 'income',
            category: formData.category,
            amount: paidNow,
            description: [formData.description, formData.paymentNotes].filter(Boolean).join(' - ') || `Payment for Invoice ${newInvoiceNumber}`,
            referenceId: docRef.id, 
            vehicleId: payload.vehicleId || undefined,
            vehicleName: payload.vehicleName || undefined,
            vehicleOwner,
            customerId: payload.customerId || undefined,
            customerName: payload.customerName || undefined,
            paymentMethod: formData.paymentMethod,
            paymentReference: formData.paymentReference,
            paymentStatus: status as any,
            accountTo: finalAccountId || undefined,
            groupId: payload.groupId || undefined // ✅ Attach Group ID
            });
        }

        toast.success(`Invoice ${newInvoiceNumber} created successfully`);
        onClose();
    } catch (err: any) {
        console.error(err);
        toast.error('Failed to create invoice: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <ProductFormModal 
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onProductCreated={handleProductCreated}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-end">
          <label className="flex items-center space-x-2 cursor-pointer p-2 bg-amber-50 border border-amber-200 rounded-md">
            <input
              type="checkbox"
              checked={formData.isLoan}
              required
              onChange={e => setFormData(fd => ({ ...fd, isLoan: e.target.checked }))}
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <span className="text-sm font-bold text-amber-800">Is it a Loan? (Required)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Account From (Debit)"
              options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
              value={formData.accountFrom}
              onChange={val => setFormData(fd => ({ ...fd, accountFrom: val || '' }))}
              placeholder="Select source account..."
            />
            <SearchableSelect
              label="Account To (Credit)"
              options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
              value={formData.accountTo}
              onChange={val => setFormData(fd => ({ ...fd, accountTo: val || '' }))}
              placeholder="Select destination account..."
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.useCustomCustomer}
                  onChange={e =>
                    setFormData(fd => ({
                      ...fd,
                      useCustomCustomer: e.target.checked,
                      customerId: '',
                      customerName: ''
                    }))
                  }
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Enter Customer Manually</span>
              </label>
              {formData.useCustomCustomer ? (
                <>
                  <FormField
                    label="Customer Name"
                    value={formData.customerName}
                    onChange={e => setFormData(fd => ({ ...fd, customerName: e.target.value }))}
                    required
                  />
                  <FormField
                    type="tel"
                    label="Phone Number"
                    value={formData.customerPhone}
                    onChange={e => setFormData(fd => ({ ...fd, customerPhone: e.target.value }))}
                  />
                </>
              ) : (
                <SearchableSelect
                  label="Select Customer"
                  options={customers.map(c => ({
                    id: c.id,
                    label: c.name,
                    subLabel: `${c.mobile} • ${c.email}`
                  }))}
                  value={formData.customerId}
                  onChange={id => {
                    const c = customers.find(x => x.id === id)!;
                    setFormData(fd => ({
                      ...fd,
                      customerId: id,
                      customerName: c.name,
                      customerPhone: c.mobile
                    }));
                  }}
                  placeholder="Search…"
                  required
                />
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={formData.manualVehicleEntry} onChange={e => { setFormData({...formData, manualVehicleEntry: e.target.checked, vehicleId: '', manualVehicleMake: '', manualVehicleModel: '', manualVehicleReg: '' }); }} className="rounded border-gray-300 text-primary focus:ring-primary" /> 
                <span className="text-sm text-gray-700">Enter Vehicle Manually</span>
              </label>
              
              {formData.manualVehicleEntry ? (
                <div className="grid grid-cols-1 gap-3 border border-gray-200 bg-gray-50 p-3 rounded-md">
                  <FormField label="Make" value={formData.manualVehicleMake} onChange={e => setFormData({...formData, manualVehicleMake: e.target.value})} placeholder="e.g. Toyota" required={formData.manualVehicleEntry} />
                  <FormField label="Model" value={formData.manualVehicleModel} onChange={e => setFormData({...formData, manualVehicleModel: e.target.value})} placeholder="e.g. Prius" required={formData.manualVehicleEntry} />
                  <FormField label="Registration" value={formData.manualVehicleReg} onChange={e => setFormData({...formData, manualVehicleReg: e.target.value})} placeholder="e.g. AB12 CDE" required={formData.manualVehicleEntry} />
                </div>
              ) : (
                <SearchableSelect
                  label="Related Vehicle (optional)"
                  options={vehicles.map(v => ({
                    id: v.id,
                    label: `${v.make} ${v.model} (${v.registrationNumber})`,
                    subLabel: v.registrationNumber
                  }))}
                  value={formData.vehicleId}
                  onChange={id => { 
                    const v = vehicles.find(vh => vh.id === id);
                    setFormData(fd => ({
                      ...fd,
                      vehicleId: id || '',
                      vehicleName: v ? `${v.make} ${v.model} (${v.registrationNumber})` : ''
                    }));
                  }}
                  placeholder="Search…"
                />
              )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="date"
            label="Invoice Date"
            value={formData.date}
            onChange={e => setFormData(fd => ({ ...fd, date: e.target.value }))}
            required
          />
          <FormField
            type="date"
            label="Due Date"
            value={formData.dueDate}
            onChange={e => setFormData(fd => ({ ...fd, dueDate: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={formData.category}
              onChange={e => setFormData(fd => ({ ...fd, category: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="">Select…</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              <option value="Other">Other</option>
            </select>
          </div>

          <SearchableSelect
            label="Group (Optional)"
            options={groups.map(g => ({ id: g.id, label: g.name }))}
            value={formData.groupId}
            onChange={val => setFormData(fd => ({ ...fd, groupId: val || '' }))}
            placeholder="Select a group..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {formData.category === 'Other' && (
            <FormField
              label="Custom Category"
              value={formData.customCategory}
              onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))}
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(fd => ({ ...fd, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              rows={2}
              placeholder="General description or notes for this invoice..."
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={e => setFormData(fd => ({ ...fd, isRecurring: e.target.checked }))}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">Recurring Invoice</label>
        </div>
        
        {formData.isRecurring && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Frequency</label>
            <select
              value={formData.recurringFrequency}
              onChange={e => setFormData(fd => ({ ...fd, recurringFrequency: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Line Items</h3>
            <button type="button" onClick={addLineItem} className="text-sm text-primary hover:text-primary-600">
              + Add Line
            </button>
          </div>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div
                key={item.id}
                className="relative grid grid-cols-1 sm:grid-cols-6 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50"
              >
                <div className="sm:col-span-2 relative">
                  <FormField
                    label="Description"
                    value={item.description}
                    onChange={e => handleDescriptionChange(idx, e.target.value)}
                    onFocus={() => handleFieldFocus(idx)}
                    onBlur={() => {
                      setTimeout(() => handleFieldBlur(idx), 120);
                      tryAutofillUnitPrice(item.description, idx);
                    }}
                    required
                  />
                  {showSuggestions[idx] && item.description && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
                      {filterMatches(item.description).map(s => (
                        <li
                          key={s.id}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                          onMouseDown={() => handleSuggestionSelect(s, idx)}
                          title={`${s.name}${s.partNumber ? ` (${s.partNumber})` : ''}`}
                        >
                          <span className="truncate">
                            {s.name}
                            {s.partNumber ? <span className="text-gray-500"> — {s.partNumber}</span> : null}
                          </span>
                          <span className="text-gray-500 text-sm ml-3">
                            {formatCurrency(s.lastPrice)}
                          </span>
                        </li>
                      ))}
                      <li 
                        className="px-4 py-2 text-primary font-medium cursor-pointer hover:bg-gray-50 border-t flex items-center gap-2 sticky bottom-0 bg-white"
                        onMouseDown={(e) => {
                          e.preventDefault(); 
                          setPendingLineIndex(idx);
                          setShowProductModal(true);
                        }}
                      >
                        <PlusCircle className="w-4 h-4" /> Create New Product
                      </li>
                    </ul>
                  )}
                </div>
                <FormField
                  type="number"
                  label="Quantity"
                  value={item.quantity}
                  onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                  min="1"
                  inputClassName="w-full"
                  required
                />
                <FormField
                  type="number"
                  label="Unit Price"
                  value={item.unitPrice}
                  onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                  min="0"
                  step="0.01"
                  inputClassName="w-full"
                  required
                />
                <FormField
                  type="number"
                  label="Discount (%)"
                  value={item.discount}
                  onChange={e => handleLineChange(idx, 'discount', e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  inputClassName="w-full"
                />
                <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={item.includeVAT}
                      onChange={e => handleLineChange(idx, 'includeVAT', e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">+ VAT</span>
                  </label>
                  <button type="button" onClick={() => removeLineItem(idx)} className="text-red-600 hover:text-red-800">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm"><span>Net:</span><span>{formatCurrency(subTotal)}</span></div>
          <div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-600">–{formatCurrency(totalDiscount)}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total:</span><span>{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-sm"><span>Paid:</span><span>{formatCurrency(paidNow)}</span></div>
          <div className="flex justify-between text-sm"><span>Owing:</span><span>{formatCurrency(Math.max(0, owing))}</span></div>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isPaid}
            onChange={e => setFormData(fd => ({ ...fd, isPaid: e.target.checked, amountToPay: e.target.checked ? total.toFixed(2) : '0' }))}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Mark as Paid now</span>
        </label>
        <FormField
          type="number"
          label="Amount to Pay (£)"
          value={formData.amountToPay}
          onChange={e => setFormData(fd => ({ ...fd, amountToPay: e.target.value }))}
          min="0"
          max={total || 0}
          step="0.01"
          disabled={!formData.isPaid}
        />

        {paidNow > 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={e => setFormData(fd => ({ ...fd, paymentMethod: e.target.value as any }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                required
              >
                <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <FormField label="Payment Reference" value={formData.paymentReference} onChange={e => setFormData(fd => ({ ...fd, paymentReference: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
              <textarea rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="Any notes" value={formData.paymentNotes} onChange={e => setFormData(fd => ({ ...fd, paymentNotes: e.target.value }))} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Document</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <p className="text-gray-500 text-sm">Drag & drop or click to upload</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFormData(fd => ({ ...fd, uploadedDocument: e.currentTarget.files?.[0] || null }))} className="sr-only" />
              <p className="text-xs text-gray-500">PDF/image up to 10MB</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">
            {loading ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </>
  );
};

export default InvoiceForm;