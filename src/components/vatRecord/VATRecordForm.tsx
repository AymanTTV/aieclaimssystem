// src/components/vatRecord/VATRecordForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection, updateDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VATRecord, VATRecordDescription } from '../../types/vatRecord';
import { Customer } from '../../types/customer';
import { Vehicle } from '../../types'; 
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import TextArea from '../ui/TextArea';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import productService from '../../services/product.service';
import { useVATCategories } from '../../hooks/useVATCategories';
import { useVATGroups } from '../../hooks/useVATGroups';
import { RefreshCw } from 'lucide-react';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface VATRecordFormProps {
  record?: VATRecord;
  customers: Customer[];
  vehicles?: Vehicle[];
  onClose: () => void;
  initialIsRecurring?: boolean; 
}

interface ProductSuggestion {
  id: string;
  partNumber: string;
  name: string;
  price: number;
}

const VATRecordForm: React.FC<VATRecordFormProps> = ({
  record,
  customers,
  vehicles = [], 
  onClose,
  initialIsRecurring = false
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(initialIsRecurring || !!record?.isRecurring);
  const [frequency, setFrequency] = useState<string>(record?.recurringFrequency || 'monthly');

  const [manualCustomer, setManualCustomer] = useState(false);
  const [manualSupplier, setManualSupplier] = useState(false); 
  const [manualReg, setManualReg] = useState(false); 

  const [descriptions, setDescriptions] = useState<VATRecordDescription[]>(
    record?.descriptions || []
  );

  const { categories } = useVATCategories();
  const { groups } = useVATGroups();

  const { formatCurrency } = useFormattedDisplay();
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([]);

  const companyCustomers = useMemo(() => 
    customers.filter(c => c.type === 'company'), 
  [customers]);

  useEffect(() => {
    productService.getAll()
      .then(products => {
        setProductSuggestions(products.map(p => ({ id: p.id, partNumber: p.partNumber ?? '', name: p.name ?? '', price: Number(p.retailPrice ?? 0), })));
      })
      .catch(error => console.error("Failed to fetch products:", error));
  }, []);

  useEffect(() => {
    setShowSuggestions(new Array(descriptions.length).fill(false));
  }, [descriptions.length]);

  const toDateTimeLocal = (dateVal: string | Date) => {
    const date = new Date(dateVal);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    receiptNo: record?.receiptNo || '',
    accountant: record?.accountant || '',
    supplier: record?.supplier || '',
    supplierId: '',
    regNo: record?.regNo || '',
    regId: '', 
    customerName: record?.customerName || '',
    customerId: record?.customerId || '',
    categoryId: record?.categoryId || '',
    categoryName: record?.categoryName || '',
    groupId: record?.groupId || '',
    groupName: record?.groupName || '',
    vatNo: record?.vatNo || '',
    status: record?.status || 'awaiting',
    notes: record?.notes || '',
    date: record?.date ? toDateTimeLocal(record.date) : toDateTimeLocal(new Date()),
    vatReceived: record?.vatReceived !== undefined ? record.vatReceived : 0,
    accountNo: record?.accountNo || '',
    dueDate: record?.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '',
  });

  const calculateTotals = () => {
    return descriptions.reduce((acc, desc) => ({
      net: acc.net + desc.net,
      vat: acc.vat + desc.vat,
      gross: acc.gross + desc.gross
    }), { net: 0, vat: 0, gross: 0 });
  };

  const addDescription = () => {
    const newDescription: VATRecordDescription = { id: uuidv4(), description: '', net: 0, includeVAT: false, vat: 0, gross: 0 };
    setDescriptions([...descriptions, newDescription]);
  };

  const updateDescription = (id: string, updates: Partial<VATRecordDescription>) => {
    setDescriptions(prevDescriptions =>
      prevDescriptions.map(desc => {
        if (desc.id === id) {
          const updatedDesc = { ...desc, ...updates };
          if ('net' in updates || 'includeVAT' in updates) {
            updatedDesc.vat = updatedDesc.includeVAT ? updatedDesc.net * 0.2 : 0;
            updatedDesc.gross = updatedDesc.net + updatedDesc.vat;
          }
          return updatedDesc;
        }
        return desc;
      })
    );
  };

  const removeDescription = (id: string) => {
    setDescriptions(descriptions.filter(desc => desc.id !== id));
  };

  const calculateNextDate = (dateStr: string, freq: string): Date => {
    const date = new Date(dateStr);
    switch (freq) {
      case 'daily': return addDays(date, 1);
      case 'weekly': return addWeeks(date, 1);
      case 'monthly': return addMonths(date, 1);
      case 'quarterly': return addMonths(date, 3);
      case 'biannually': return addMonths(date, 6);
      case 'yearly': return addYears(date, 1);
      default: return addMonths(date, 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const totals = calculateTotals();
      const vatRecord: any = {
        ...formData,
        descriptions,
        ...totals,
        date: new Date(formData.date), // Date object with time
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        vatReceived: formData.vatReceived,
        categoryId: formData.categoryId || '',
        categoryName: formData.categoryName || '',
        groupId: formData.groupId || '',
        groupName: formData.groupName || '',
      };

      if (isRecurring) {
        vatRecord.isRecurring = true;
        vatRecord.recurringFrequency = frequency;
        
        // Preserve next date on edit if it exists
        if (!record || !record.isRecurring) {
            vatRecord.nextRecurringDate = calculateNextDate(formData.date, frequency);
        }
      } else {
        vatRecord.isRecurring = false;
        vatRecord.recurringFrequency = null;
        vatRecord.nextRecurringDate = null;
      }

      if (record) {
        await updateDoc(doc(db, 'vatRecords', record.id), {
            ...vatRecord,
            updatedAt: new Date(),
        });
        toast.success('VAT record updated successfully');
      } else {
        await addDoc(collection(db, 'vatRecords'), {
          ...vatRecord,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.id
        });
        toast.success('VAT record created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving VAT record:', error);
      toast.error('Failed to save VAT record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="border border-indigo-100 bg-indigo-50/50 rounded-md p-4 space-y-3">
        <div className="flex items-center">
             <input id="isRecurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-900 flex items-center">
                <RefreshCw className="w-4 h-4 mr-1 text-indigo-600" />
                Re-occurring Record
              </label>
        </div>
        {isRecurring && (
          <div className="animate-fadeIn">
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (3 Months)</option>
              <option value="biannually">Biannually (6 Months)</option>
              <option value="yearly">Yearly</option>
            </select>
            <p className="mt-2 text-xs text-indigo-600">
               Next record will be automatically generated based on the date and time selected below.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Receipt/Invoice No" value={formData.receiptNo} onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })} required />
        <FormField label="Inquiry/Order No" value={formData.accountant} onChange={(e) => setFormData({ ...formData, accountant: e.target.value })} required />
        
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <label className="flex items-center space-x-2"><input type="checkbox" checked={manualSupplier} onChange={(e) => setManualSupplier(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /><span className="text-xs text-gray-500">Manual</span></label>
          </div>
          {manualSupplier ? (
            <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
          ) : (
            <SearchableSelect options={companyCustomers.map(c => ({ id: c.id, label: c.name, subLabel: c.email }))} value={formData.supplierId} onChange={(id) => { const company = companyCustomers.find(c => c.id === id); if (company) { setFormData(prev => ({ ...prev, supplierId: company.id, supplier: company.name, accountNo: company.accountNumber || prev.accountNo, vatNo: company.vatNumber || prev.vatNo })); } }} placeholder="Select company..." />
          )}
        </div>

        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">REG No</label>
            <label className="flex items-center space-x-2"><input type="checkbox" checked={manualReg} onChange={(e) => setManualReg(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" /><span className="text-xs text-gray-500">Manual</span></label>
          </div>
          {manualReg ? (
            <input type="text" value={formData.regNo} onChange={(e) => setFormData({ ...formData, regNo: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
          ) : (
            <SearchableSelect options={vehicles.map(v => ({ id: v.id, label: `${v.registrationNumber} - ${v.make} ${v.model}`, subLabel: v.registrationNumber }))} value={formData.regId} onChange={(id) => { const vehicle = vehicles.find(v => v.id === id); if (vehicle) { setFormData(prev => ({ ...prev, regId: vehicle.id, regNo: vehicle.registrationNumber })); } }} placeholder="Select vehicle..." />
          )}
        </div>

        <FormField label="VAT No" value={formData.vatNo} onChange={(e) => setFormData({ ...formData, vatNo: e.target.value })} />
        <FormField label="Account No" value={formData.accountNo} onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })} />
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select value={formData.categoryId} onChange={(e) => { const id = e.target.value; const name = categories.find(c => c.id === id)?.name || ''; setFormData({ ...formData, categoryId: id, categoryName: name }); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
            <option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <select value={formData.groupId} onChange={(e) => { const id = e.target.value; const name = groups.find(g => g.id === id)?.name || ''; setFormData({ ...formData, groupId: id, groupName: name }); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
            <option value="">Select group</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-gray-900">Descriptions</h3><button type="button" onClick={addDescription} className="text-primary hover:text-primary-600">Add Description</button></div>
        {descriptions.map((desc, index) => (
          <div key={desc.id} className="bg-gray-50 p-4 rounded-lg space-y-4 border rounded">
            <div className="grid grid-cols-3 gap-4">
              <div className="relative col-span-1">
                <FormField label="Description" value={desc.description} onChange={(e) => updateDescription(desc.id, { description: e.target.value })} onFocus={() => { const newShow = [...showSuggestions]; newShow[index] = true; setShowSuggestions(newShow); }} onBlur={() => { setTimeout(() => { const newShow = [...showSuggestions]; newShow[index] = false; setShowSuggestions(newShow); }, 150); }} placeholder="Type to search products..." required />
                {showSuggestions[index] && desc.description && (() => { const query = desc.description.toLowerCase(); const matches = productSuggestions.filter(p => p.name.toLowerCase().includes(query) || p.partNumber.toLowerCase().includes(query) ); return matches.length > 0 ? ( <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">{matches.map((product) => ( <li key={product.id} className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between" onMouseDown={() => { updateDescription(desc.id, { description: product.name, net: product.price, }); }} > <span className="truncate">{product.name}{product.partNumber && <span className="text-gray-500 text-sm"> — {product.partNumber}</span>}</span> <span className="font-semibold text-sm">{formatCurrency(product.price)}</span> </li> ))} </ul> ) : null; })()}
              </div>
              <FormField type="number" label="NET" value={desc.net} onChange={(e) => updateDescription(desc.id, { net: parseFloat(e.target.value) || 0 })} required min="0" step="0.01" />
              <div className="col-span-1"><FormField label="V" value={desc.vType || ''} onChange={(e) => updateDescription(desc.id, { vType: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="flex items-center space-x-2"><label className="flex items-center space-x-2"><input type="checkbox" checked={desc.includeVAT} onChange={(e) => updateDescription(desc.id, { includeVAT: e.target.checked })} className="rounded border-gray-300 text-primary focus:ring-primary" /><span className="text-sm text-gray-700">Include VAT (20%)</span></label></div>
              <div><label className="block text-sm font-medium text-gray-700">VAT</label><input type="text" value={desc.vat.toFixed(2)} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" disabled /></div>
              <div><label className="block text-sm font-medium text-gray-700">GROSS</label><input type="text" value={desc.gross.toFixed(2)} className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" disabled /></div>
            </div>
            <div className="flex justify-end mt-4"><button type="button" onClick={() => removeDescription(desc.id)} className="text-red-600 hover:text-red-800">Remove Description</button></div>
          </div>
        ))}
      </div>

      <FormField type="number" label="VAT Received" value={formData.vatReceived} onChange={(e) => setFormData({ ...formData, vatReceived: parseFloat(e.target.value) || 0 })} min="0" step="0.01" />

      <div className="bg-gray-100 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm"><span>Total NET:</span><span className="font-medium">{formatCurrency(calculateTotals().net)}</span></div>
        <div className="flex justify-between text-sm"><span>Total VAT:</span><span className="font-medium">{formatCurrency(calculateTotals().vat)}</span></div>
        {record && <div className="flex justify-between text-sm"><span>VAT Received:</span><span className="font-medium">{formatCurrency(formData.vatReceived)}</span></div>}
        <div className="flex justify-between text-sm font-bold"><span>Total GROSS:</span><span>{formatCurrency(calculateTotals().gross)}</span></div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between"><label className="block text-sm font-medium text-gray-700">Customer</label><label className="flex items-center space-x-2"><input type="checkbox" checked={manualCustomer} onChange={(e) => setManualCustomer(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" /><span className="text-sm text-gray-700">Enter Manually</span></label></div>
        {manualCustomer ? ( <FormField label="Customer Name" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required /> ) : ( <SearchableSelect label="Select Customer" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile} - ${c.email}` }))} value={formData.customerId} onChange={(id) => { const customer = customers.find(c => c.id === id); if (customer) { setFormData({ ...formData, customerId: customer.id, customerName: customer.name }); } }} placeholder="Search customers..." /> )}
      </div>

      <div><label className="block text-sm font-medium text-gray-700">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as VATRecord['status'] })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"><option value="awaiting">Awaiting</option><option value="processing">Processing</option><option value="paid">Paid</option></select></div>
      <TextArea label="Notes (Optional)" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
      
      <div className="grid grid-cols-2 gap-4">
        {/* Date Time Input */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
           <input type="datetime-local" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
        </div>
        
        <FormField type="date" label="Due Date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
      </div>

      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">{loading ? 'Saving...' : record ? 'Update Record' : 'Create Record'}</button>
      </div>
    </form>
  );
};

export default VATRecordForm;