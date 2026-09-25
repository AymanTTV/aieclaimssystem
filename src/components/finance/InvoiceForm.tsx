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
import { PlusCircle, CheckCircle, MessageCircle, Mail, Printer, Users, Receipt, CreditCard, Paperclip, ArrowRight, ArrowLeft, Car, FileText, Plus, Building2, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import InvoiceCommunicationModal from './InvoiceCommunicationModal';

interface InvoiceFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  accounts?: Account[];
  groups?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  onClose: () => void;
}

interface ProductSuggestion {
  id: string;
  partNumber: string;
  name: string;
  lastPrice: number; 
  vehicleId?: string; 
  vehicleName?: string; 
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

type InvoiceFormTab = 'client_accounts' | 'line_items' | 'payment_settlement' | 'documents_actions';

const InvoiceForm: React.FC<InvoiceFormProps> = ({ vehicles, customers, accounts: propAccounts = [], groups = [], departments = [], onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const [activeTab, setActiveTab] = useState<InvoiceFormTab>('client_accounts');

  const tabOrder: InvoiceFormTab[] = ['client_accounts', 'line_items', 'payment_settlement', 'documents_actions'];

  const handleNextTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<Account[]>(propAccounts);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false, vehicleId: '', vehicleName: '' }
  ]);

  // Share Modal & Post-Save trigger states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareInitialMode, setShareInitialMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [savedInvoiceForShare, setSavedInvoiceForShare] = useState<Invoice | null>(null);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  // Post-Save Quick Actions Selection State (Checkboxes in confirmation modal)
  const [postSaveActions, setPostSaveActions] = useState<{
    whatsapp: boolean;
    email: boolean;
    printPdf: boolean;
  }>({
    whatsapp: false,
    email: false,
    printPdf: false,
  });

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
    isLoan: false, 
    groupId: '',
    departmentId: '',
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
            vehicleId: p.vehicleId, 
            vehicleName: p.vehicleName,
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
      vehicleId: product.vehicleId, 
      vehicleName: product.vehicleName, 
    };
    setProductSuggestions(prev => [...prev, newSuggestion]);

    if (pendingLineIndex !== null) {
      setLineItems(prev => {
         const copy = [...prev];
         copy[pendingLineIndex] = {
           ...copy[pendingLineIndex],
           description: newSuggestion.name,
           unitPrice: newSuggestion.lastPrice,
           vehicleId: newSuggestion.vehicleId || '', 
           vehicleName: newSuggestion.vehicleName || '', 
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
        copy[idx] = { 
           ...copy[idx], 
           unitPrice: hit.lastPrice,
           ...(hit.vehicleId ? { vehicleId: hit.vehicleId, vehicleName: hit.vehicleName } : {}) 
        };
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
      } else if (field === 'vehicleId' || field === 'vehicleName') {
        (it as any)[field] = value as string;
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
      { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false, vehicleId: '', vehicleName: '' }
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
    if (prod.vehicleId) {
       handleLineChange(idx, 'vehicleId', prod.vehicleId);
       handleLineChange(idx, 'vehicleName', prod.vehicleName || '');
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if ((!formData.useCustomCustomer && !formData.customerId) || (formData.useCustomCustomer && !formData.customerName.trim())) {
      setActiveTab('client_accounts');
      toast.error('A customer is required. Please select one or enter their details manually.');
      return;
    }
    if (!lineItems.length || lineItems.every(li => li.quantity * li.unitPrice - (li.discount/100)*li.quantity*li.unitPrice === 0)) {
      setActiveTab('line_items');
      toast.error('Add at least one line item with a non-zero value.');
      return;
    }
    if (paidNow > total) {
      setActiveTab('payment_settlement');
      toast.error('Amount paid cannot exceed the total amount.');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndSave = async () => {
    setLoading(true);
    try {
        const newInvoiceNumber = await getNextInvoiceNumber();
        const remaining = parseFloat((total - paidNow).toFixed(2));
        
        let status: 'paid' | 'unpaid' | 'partially_paid' = 'unpaid';
        if (paidNow >= total - 0.01 && total > 0) status = 'paid';
        else if (paidNow > 0) status = 'partially_paid';

        const newPaymentId = `inv_pay_${Date.now()}`;
        const actualReference = formData.paymentReference || formData.paymentNotes || newInvoiceNumber || 'N/A'; 

        const payments: Invoice['payments'] = paidNow > 0 ? [{
          id: newPaymentId,
          date: new Date(),
          amount: paidNow,
          method: formData.paymentMethod,
          reference: actualReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user!.id,
          document: undefined
        }] : [];
    
        const combinedManualVehicleName = formData.manualVehicleEntry 
          ? `${formData.manualVehicleMake.trim()} ${formData.manualVehicleModel.trim()} (${formData.manualVehicleReg.trim()})`.trim()
          : null;

        const mainVehicle = vehicles.find(v => v.id === formData.vehicleId); 
        const selectedGroup = groups.find(g => g.id === formData.groupId || g.name === formData.groupId);
        const selectedDepartment = departments.find(d => d.id === formData.departmentId || d.name === formData.departmentId);

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
          groupId: formData.groupId || mainVehicle?.assignedGroupId || null, 
          groupName: selectedGroup?.name || null, 
          departmentId: formData.departmentId || null, 
          departmentName: selectedDepartment?.name || null, 
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
          createdBy: user!.id
        };

        const docRef = await addDoc(collection(db, 'invoices'), payload);

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

        const groupsByVehicle = new Map<string, { net: number, vat: number, gross: number, vehicleName: string }>();
        lineItems.forEach(li => {
            const gross = li.quantity * li.unitPrice;
            const discountAmt = (li.discount / 100) * gross;
            const itemNet = gross - discountAmt;
            const itemVat = li.includeVAT ? itemNet * 0.2 : 0;
            const itemTotal = itemNet + itemVat;

            const vId = li.vehicleId || formData.vehicleId || 'unassigned';
            const vName = li.vehicleName || formData.vehicleName || 'Unassigned / General';

            if (!groupsByVehicle.has(vId)) {
                groupsByVehicle.set(vId, { net: 0, vat: 0, gross: 0, vehicleName: vName });
            }
            const group = groupsByVehicle.get(vId)!;
            group.net += itemNet;
            group.vat += itemVat;
            group.gross += itemTotal;
        });

        if (formData.isLoan) {
            for (const [vId, totals] of groupsByVehicle.entries()) {
                const targetVehicle = vehicles.find(v => v.id === vId);
                const vehicleOwner = targetVehicle?.owner 
                    ? { name: targetVehicle.owner.name, isDefault: targetVehicle.owner.isDefault ?? false }
                    : { name: 'AIE Skyline Limited', isDefault: true };

                const rawGroupId = targetVehicle?.assignedGroupId || payload.groupId;
                const resolvedGroupName = groups.find(g => g.id === rawGroupId || g.name === rawGroupId)?.name;
                const targetDeptId = payload.departmentId || targetVehicle?.assignedDepartmentId;
                const targetDeptName = payload.departmentName || targetVehicle?.assignedDepartmentName || departments.find(d => d.id === targetDeptId || d.name === targetDeptId)?.name;

                await createFinanceTransaction({
                    type: 'expense',
                    category: formData.category || 'Loan Provided',
                    amount: totals.gross,
                    description: [formData.description, `Loan for Invoice ${newInvoiceNumber}`].filter(Boolean).join(' - '),
                    referenceId: docRef.id,
                    vehicleId: vId === 'unassigned' ? undefined : vId,
                    vehicleName: totals.vehicleName,
                    vehicleOwner: vId === 'unassigned' && formData.manualVehicleEntry ? undefined : vehicleOwner,
                    customerId: payload.customerId || undefined,
                    customerName: payload.customerName || undefined,
                    paymentMethod: 'internal',
                    paymentStatus: 'paid',
                    date: new Date(formData.date),
                    accountFrom: formData.accountFrom || undefined,
                    accountTo: formData.accountTo || undefined,
                    groupId: rawGroupId || undefined, 
                    groupName: resolvedGroupName || undefined, 
                    departmentId: targetDeptId || undefined, 
                    departmentName: targetDeptName || undefined 
                });
            }
        }

        let finalAccountId = formData.accountTo;
        if (!finalAccountId) {
            const defaultAcc = financeAccounts.find(a => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT'));
            if (defaultAcc) finalAccountId = defaultAcc.id;
        }

        if (paidNow > 0) {
            for (const [vId, totals] of groupsByVehicle.entries()) {
                const targetVehicle = vehicles.find(v => v.id === vId);
                const vehicleOwner = targetVehicle?.owner 
                    ? { name: targetVehicle.owner.name, isDefault: targetVehicle.owner.isDefault ?? false }
                    : { name: 'AIE Skyline Limited', isDefault: true };

                const ratio = total > 0 ? totals.gross / total : 0;
                const allocatedPayment = paidNow * ratio;

                const rawGroupId = targetVehicle?.assignedGroupId || payload.groupId;
                const resolvedGroupName = groups.find(g => g.id === rawGroupId || g.name === rawGroupId)?.name;
                const targetDeptId = payload.departmentId || targetVehicle?.assignedDepartmentId;
                const targetDeptName = payload.departmentName || targetVehicle?.assignedDepartmentName || departments.find(d => d.id === targetDeptId || d.name === targetDeptId)?.name;

                if (allocatedPayment > 0) {
                    await createFinanceTransaction({
                        type: 'income',
                        category: formData.category,
                        amount: allocatedPayment,
                        description: [formData.description, formData.paymentNotes, formData.paymentReference ? `Ref: ${formData.paymentReference}` : ''].filter(Boolean).join(' - ') || `Payment for Invoice ${newInvoiceNumber}`,
                        referenceId: docRef.id, 
                        vehicleId: vId === 'unassigned' ? undefined : vId,
                        vehicleName: totals.vehicleName,
                        vehicleOwner: vId === 'unassigned' && formData.manualVehicleEntry ? undefined : vehicleOwner,
                        customerId: payload.customerId || undefined,
                        customerName: payload.customerName || undefined,
                        paymentMethod: formData.method,
                        paymentReference: actualReference, // ✅ Restored human-readable invoice reference
                        paymentId: newPaymentId, // ✅ Dedicated system link for strict deletion tracking
                        paymentStatus: status as any,
                        date: new Date(formData.date), 
                        accountTo: finalAccountId || undefined,
                        groupId: rawGroupId || undefined, 
                        groupName: resolvedGroupName || undefined, 
                        departmentId: targetDeptId || undefined, 
                        departmentName: targetDeptName || undefined 
                    });
                }
            }
        }

        const savedInvoiceObj: Invoice = {
          id: docRef.id,
          ...payload,
          documentUrl: documentUrl,
        } as Invoice;

        setSavedInvoiceForShare(savedInvoiceObj);
        setShowConfirmModal(false);

        // Execute selected post-save actions
        const hasWhatsApp = postSaveActions.whatsapp;
        const hasEmail = postSaveActions.email;
        const hasPrintPdf = postSaveActions.printPdf;

        if (hasPrintPdf) {
          handlePrintOrDownloadPDF(savedInvoiceObj);
        }

        if (hasWhatsApp) {
          setShareInitialMode('whatsapp');
          setShowShareModal(true);
        } else if (hasEmail) {
          setShareInitialMode('email');
          setShowShareModal(true);
        } else {
          // Neither WhatsApp nor Email selected: close form
          onClose();
        }

        toast.success(`Invoice ${newInvoiceNumber} created successfully!`);
    } catch (err: any) {
        console.error(err);
        toast.error('Failed to create invoice: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const getCustomerNameDisplay = () => {
    if (formData.useCustomCustomer) return formData.customerName || 'N/A';
    return customers.find(c => c.id === formData.customerId)?.name || 'N/A';
  };

  const resolvedGroupId = groups.find(g => g.id === formData.groupId || g.name === formData.groupId)?.id || formData.groupId;
  const resolvedDeptId = departments.find(d => d.id === formData.departmentId || d.name === formData.departmentId)?.id || formData.departmentId;

  // Build active invoice for sharing or printing before/after save
  const buildActiveInvoice = (): Invoice => {
    if (savedInvoiceForShare) return savedInvoiceForShare;
    const paidNow = parseFloat(formData.amountToPay) || 0;
    const remaining = Math.max(0, parseFloat((total - paidNow).toFixed(2)));
    let status: 'paid' | 'unpaid' | 'partially_paid' = 'unpaid';
    if (paidNow >= total - 0.01 && total > 0) status = 'paid';
    else if (paidNow > 0) status = 'partially_paid';

    const selectedGroup = groups.find(g => g.id === formData.groupId || g.name === formData.groupId);
    const selectedDepartment = departments.find(d => d.id === formData.departmentId || d.name === formData.departmentId);

    return {
      id: 'draft_' + Date.now(),
      invoiceNumber: formData.invoiceNumber || 'NEW-INVOICE',
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
      category: formData.category === 'Other' ? formData.customCategory : formData.category,
      description: formData.description,
      customCategory: formData.category === 'Other' ? formData.customCategory : undefined,
      groupId: formData.groupId || undefined,
      groupName: selectedGroup?.name || undefined,
      departmentId: formData.departmentId || undefined,
      departmentName: selectedDepartment?.name || undefined,
      vehicleId: formData.vehicleId || undefined,
      vehicleName: formData.vehicleName || undefined,
      customerId: formData.customerId || undefined,
      customerName: getCustomerNameDisplay(),
      customerPhone: formData.useCustomCustomer ? formData.customerPhone : customers.find(c => c.id === formData.customerId)?.mobile || '',
      payments: paidNow > 0 ? [{
        id: 'init_payment',
        date: new Date(),
        amount: paidNow,
        method: formData.paymentMethod,
        reference: formData.paymentReference || 'Initial',
        notes: formData.paymentNotes,
        createdAt: new Date(),
        createdBy: user?.id || 'system'
      }] : [],
      isLoan: formData.isLoan,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // Direct PDF printing or download execution without leaving view
  const handlePrintOrDownloadPDF = async (invoiceOverride?: Invoice) => {
    try {
      setIsPrintingPdf(true);
      toast.loading('Preparing PDF for printing / download...');
      const activeInv = invoiceOverride || buildActiveInvoice();
      const vehicle = vehicles.find(v => v.id === activeInv.vehicleId);

      let url = activeInv.documentUrl;
      if (!url) {
        const blob = await generateInvoicePDF(activeInv, vehicle);
        url = URL.createObjectURL(blob);
      }
      toast.dismiss();
      const printWin = window.open(url, '_blank');
      if (printWin) {
        printWin.focus();
        toast.success('PDF opened for printing / download');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${activeInv.invoiceNumber || 'Document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('PDF download started');
      }
    } catch (err) {
      toast.dismiss();
      console.error('Error generating PDF for print:', err);
      toast.error('Failed to generate PDF for printing');
    } finally {
      setIsPrintingPdf(false);
    }
  };

  return (
    <>
      <ProductFormModal 
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onProductCreated={handleProductCreated}
      />

      <Modal 
        isOpen={showConfirmModal} 
        onClose={() => setShowConfirmModal(false)} 
        title="Confirm Invoice Details" 
        size="lg"
        zIndex="z-[60]"
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Review details and confirm to create invoice
            </span>
            <div className="flex items-center justify-end space-x-3 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-sm"
              >
                Back to Edit
              </button>
              <button 
                type="button" 
                onClick={confirmAndSave} 
                disabled={loading} 
                className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 font-black shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer text-sm"
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <CheckCircle className="w-5 h-5" />}
                Confirm & Save
              </button>
            </div>
          </div>
        }
      >
         <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
                <h3 className="text-lg font-black text-gray-900 mb-4 border-b border-gray-200 pb-3">Complete Summary Breakdown</h3>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-bold text-gray-900">{getCustomerNameDisplay()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Vehicles Involved</p>
                    <p className="font-bold text-gray-900">{Array.from(new Set(lineItems.map(li => li.vehicleName || formData.vehicleName || 'General / None'))).filter(v => v !== 'General / None').join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Invoice Date</p>
                    <p className="font-medium text-gray-900">{formData.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className="font-medium text-gray-900">{formData.dueDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium text-gray-900">{formData.category === 'Other' ? formData.customCategory : formData.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Group</p>
                    <p className="font-medium text-gray-900">{groups.find(g => g.id === formData.groupId)?.name || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account From (Debit)</p>
                    <p className="font-medium text-red-600">{financeAccounts.find(a => a.id === formData.accountFrom)?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account To (Credit)</p>
                    <p className="font-medium text-green-600">{financeAccounts.find(a => a.id === formData.accountTo)?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Invoice Total (Gross)</span>
                    <span className="font-mono font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700">
                    <span>Initial Payment</span>
                    <span className="font-mono font-medium">{formatCurrency(paidNow)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-base font-black text-gray-900 uppercase">Remaining Amount</span>
                    <span className="text-2xl font-black text-primary font-mono">{formatCurrency(Math.max(0, total - paidNow))}</span>
                  </div>
                </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
                <input 
                  type="checkbox" 
                  id="confirmLoan" 
                  checked={formData.isLoan} 
                  onChange={e => setFormData(fd => ({ ...fd, isLoan: e.target.checked }))} 
                  className="mt-1 h-5 w-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer" 
                />
                <label htmlFor="confirmLoan" className="text-sm font-bold text-amber-900 cursor-pointer">
                  Is this a Loan Account? <br/>
                  <span className="font-normal text-amber-700">Check this if an expense transaction should be recorded to the ledger.</span>
                </label>
            </div>

            {/* Quick Actions (Selectable Checkboxes) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Quick Actions:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Select option(s) to automatically trigger upon saving
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* WhatsApp Checkbox */}
                  <label 
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      postSaveActions.whatsapp 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="postSaveWhatsApp"
                      checked={postSaveActions.whatsapp}
                      onChange={e => setPostSaveActions(prev => ({ ...prev, whatsapp: e.target.checked }))}
                      className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">Send via WhatsApp</span>
                  </label>

                  {/* Email Checkbox */}
                  <label 
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      postSaveActions.email 
                        ? 'bg-sky-50 border-sky-500 text-sky-800 ring-1 ring-sky-500' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="postSaveEmail"
                      checked={postSaveActions.email}
                      onChange={e => setPostSaveActions(prev => ({ ...prev, email: e.target.checked }))}
                      className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                    />
                    <Mail className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="text-xs font-bold">Send via Email</span>
                  </label>

                  {/* Print / Download PDF Checkbox */}
                  <label 
                    className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      postSaveActions.printPdf 
                        ? 'bg-purple-50 border-purple-500 text-purple-800 ring-1 ring-purple-500' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="postSavePrintPdf"
                      checked={postSaveActions.printPdf}
                      onChange={e => setPostSaveActions(prev => ({ ...prev, printPdf: e.target.checked }))}
                      className="h-4 w-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <Printer className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-xs font-bold">Print / Download PDF</span>
                  </label>
                </div>
            </div>
         </div>
      </Modal>

      {/* ── Navigation Sections Container ── */}
      <div className="flex flex-col h-full flex-1 min-h-0 overflow-hidden bg-white text-slate-900">
        {/* ── Navigation Sections Bar ── */}
        <div className="flex border-b border-[#E2E8F0] px-3 sm:px-5 shrink-0 bg-[#F8FAFC] overflow-x-auto no-scrollbar">
          {[
            { id: 'client_accounts' as const, label: '1. Client & Accounts', icon: Users },
            { id: 'line_items' as const, label: '2. Line Items & Billing', icon: Receipt, count: lineItems.length },
            { id: 'payment_settlement' as const, label: '3. Payment & Settlement', icon: CreditCard, badge: formData.isPaid ? 'Paid' : (paidNow > 0 ? 'Partial' : undefined) },
            { id: 'documents_actions' as const, label: '4. Documents & Actions', icon: Paperclip, badge: formData.uploadedDocument ? 'Attached' : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 pointer-events-none shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Tab Content Body - Streamlined to fit without scrolling */}
          <div className="p-3.5 sm:p-4.5 flex-1 min-h-0 overflow-y-auto no-scrollbar text-slate-900">
            {/* SECTION 1: CLIENT & ACCOUNTS */}
            {activeTab === 'client_accounts' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 animate-in fade-in duration-150">
                {/* Left Column: Customer, Vehicle & Dates */}
                <div className="space-y-3">
                  {/* Customer Card */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer</h4>
                      </div>
                      <label className="flex items-center space-x-1.5 cursor-pointer select-none">
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
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-600 font-semibold">Enter Manually</span>
                      </label>
                    </div>

                    {formData.useCustomCustomer ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <FormField
                          label="Customer Name"
                          value={formData.customerName}
                          onChange={e => setFormData(fd => ({ ...fd, customerName: e.target.value }))}
                          placeholder="e.g. John Doe"
                          inputClassName="py-1.5 text-xs"
                          required
                        />
                        <FormField
                          type="tel"
                          label="Phone Number"
                          value={formData.customerPhone}
                          onChange={e => setFormData(fd => ({ ...fd, customerPhone: e.target.value }))}
                          placeholder="e.g. +44 7123 456789"
                          inputClassName="py-1.5 text-xs"
                        />
                      </div>
                    ) : (
                      <SearchableSelect
                        label="Select Client"
                        options={customers.map(c => ({
                          id: c.id,
                          label: c.name,
                          subLabel: `${c.mobile} • ${c.email}`
                        }))}
                        value={formData.customerId}
                        onChange={id => {
                          const c = customers.find(x => x.id === id);
                          if (c) {
                            setFormData(fd => ({
                              ...fd,
                              customerId: id as string,
                              customerName: c.name,
                              customerPhone: c.mobile
                            }));
                          }
                        }}
                        placeholder="Search client…"
                        required
                      />
                    )}
                  </div>

                  {/* Vehicle Card */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Related Vehicle (Optional)</h4>
                      </div>
                      <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.manualVehicleEntry}
                          onChange={e => {
                            setFormData({
                              ...formData,
                              manualVehicleEntry: e.target.checked,
                              vehicleId: '',
                              manualVehicleMake: '',
                              manualVehicleModel: '',
                              manualVehicleReg: ''
                            });
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-600 font-semibold">Enter Manually</span>
                      </label>
                    </div>

                    {formData.manualVehicleEntry ? (
                      <div className="grid grid-cols-3 gap-2">
                        <FormField label="Make" value={formData.manualVehicleMake} onChange={e => setFormData({...formData, manualVehicleMake: e.target.value})} placeholder="e.g. Toyota" inputClassName="py-1.5 text-xs" required={formData.manualVehicleEntry} />
                        <FormField label="Model" value={formData.manualVehicleModel} onChange={e => setFormData({...formData, manualVehicleModel: e.target.value})} placeholder="e.g. Prius" inputClassName="py-1.5 text-xs" required={formData.manualVehicleEntry} />
                        <FormField label="Reg" value={formData.manualVehicleReg} onChange={e => setFormData({...formData, manualVehicleReg: e.target.value})} placeholder="e.g. AB12 CDE" inputClassName="py-1.5 text-xs" required={formData.manualVehicleEntry} />
                      </div>
                    ) : (
                      <SearchableSelect
                        label="Assign Fleet Vehicle"
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
                            vehicleId: id as string || '',
                            vehicleName: v ? `${v.make} ${v.model} (${v.registrationNumber})` : '',
                            groupId: v?.assignedGroupId || fd.groupId,
                            departmentId: v?.assignedDepartmentId || fd.departmentId,
                          }));
                        }}
                        placeholder="Search fleet vehicle…"
                        isClearable
                      />
                    )}
                  </div>

                  {/* Dates & Schedule */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        type="date"
                        label="Invoice Date"
                        value={formData.date}
                        onChange={e => setFormData(fd => ({ ...fd, date: e.target.value }))}
                        inputClassName="py-1 text-xs"
                        required
                      />
                      <FormField
                        type="date"
                        label="Due Date"
                        value={formData.dueDate}
                        onChange={e => setFormData(fd => ({ ...fd, dueDate: e.target.value }))}
                        inputClassName="py-1 text-xs"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="isRecurring"
                          checked={formData.isRecurring}
                          onChange={e => setFormData(fd => ({ ...fd, isRecurring: e.target.checked }))}
                          className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-xs font-semibold text-gray-800">Recurring Invoice</span>
                      </label>
                      {formData.isRecurring && (
                        <select
                          value={formData.recurringFrequency}
                          onChange={e => setFormData(fd => ({ ...fd, recurringFrequency: e.target.value }))}
                          className="rounded-lg border border-gray-300 text-xs py-1 px-2 focus:border-primary focus:ring-primary"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Account, Classification & Notes */}
                <div className="space-y-3">
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account & Classification</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <SearchableSelect
                        label="Account From (Debit)"
                        options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
                        value={formData.accountFrom}
                        onChange={val => setFormData(fd => ({ ...fd, accountFrom: val as string || '' }))}
                        placeholder="Select source..."
                      />
                      <SearchableSelect
                        label="Account To (Credit)"
                        options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
                        value={formData.accountTo}
                        onChange={val => setFormData(fd => ({ ...fd, accountTo: val as string || '' }))}
                        placeholder="Select destination..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <SearchableSelect
                        label="Category"
                        options={categories.map(c => ({ id: c, label: c })).concat({ id: 'Other', label: 'Other' })}
                        value={formData.category}
                        onChange={val => setFormData(fd => ({ ...fd, category: val as string || '' }))}
                        placeholder="Category..."
                        required
                      />
                      <SearchableSelect
                        label="Group (Optional)"
                        options={groups.map(g => ({ id: g.id, label: g.name }))}
                        value={resolvedGroupId}
                        onChange={val => setFormData(fd => ({ ...fd, groupId: val as string || '' }))}
                        placeholder="Group..."
                      />
                      <SearchableSelect
                        label="Dept (Optional)"
                        options={departments.map(d => ({ id: d.id, label: d.name }))}
                        value={resolvedDeptId}
                        onChange={val => setFormData(fd => ({ ...fd, departmentId: val as string || '' }))}
                        placeholder="Dept..."
                      />
                    </div>

                    {formData.category === 'Other' && (
                      <FormField
                        label="Custom Category"
                        value={formData.customCategory}
                        onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))}
                        inputClassName="py-1 text-xs"
                        required
                      />
                    )}
                  </div>

                  {/* Notes / Description */}
                  <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-1.5 shadow-2xs">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Invoice Notes / Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(fd => ({ ...fd, description: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 shadow-2xs text-xs p-2 focus:border-primary focus:ring-primary"
                      rows={2}
                      placeholder="Add billing notes or customer comments..."
                    />
                  </div>

                  {/* Snapshot Card */}
                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                    <div className="space-y-0.5">
                      <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wider">Active Client:</span>
                      <p className="font-semibold text-blue-900 truncate max-w-[260px]">
                        {getCustomerNameDisplay() !== 'N/A' ? getCustomerNameDisplay() : 'No client selected'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextTab}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-2xs cursor-pointer shrink-0"
                    >
                      Line Items <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: LINE ITEMS & BILLING */}
            {activeTab === 'line_items' && (
              <div className="space-y-3 animate-in fade-in duration-150 flex flex-col">
                <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Line Items</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>

                  {/* Compact items list container */}
                  <div className="space-y-2 overflow-y-auto max-h-[290px] pr-1 custom-scrollbar">
                    {lineItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 border border-slate-200 rounded-xl bg-white shadow-2xs hover:border-slate-300 transition-all space-y-2"
                      >
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Item number & description */}
                          <div className="col-span-12 sm:col-span-5 relative">
                            <FormField
                              label={`#${idx + 1} Description`}
                              value={item.description}
                              onChange={e => handleDescriptionChange(idx, e.target.value)}
                              onFocus={() => handleFieldFocus(idx)}
                              onBlur={() => {
                                setTimeout(() => handleFieldBlur(idx), 120);
                                tryAutofillUnitPrice(item.description, idx);
                              }}
                              placeholder="Part, labor, or service description..."
                              inputClassName="py-1 text-xs"
                              required
                            />
                            {showSuggestions[idx] && item.description && (
                              <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-2xl mt-1 max-h-48 overflow-y-auto">
                                {filterMatches(item.description).map(s => (
                                  <li
                                    key={s.id}
                                    className="px-3 py-1.5 cursor-pointer hover:bg-gray-100 flex items-center justify-between text-xs"
                                    onMouseDown={() => handleSuggestionSelect(s, idx)}
                                  >
                                    <span className="truncate">{s.name}</span>
                                    <span className="text-gray-500 font-mono ml-2">{formatCurrency(s.lastPrice)}</span>
                                  </li>
                                ))}
                                <li 
                                  className="px-3 py-1.5 text-primary text-xs font-bold cursor-pointer hover:bg-gray-50 border-t flex items-center gap-1.5 sticky bottom-0 bg-white"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); 
                                    setPendingLineIndex(idx);
                                    setShowProductModal(true);
                                  }}
                                >
                                  <PlusCircle className="w-3.5 h-3.5" /> Create Product
                                </li>
                              </ul>
                            )}
                          </div>

                          {/* Qty */}
                          <div className="col-span-4 sm:col-span-2">
                            <FormField
                              type="number"
                              label="Qty"
                              value={item.quantity}
                              onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                              min="1"
                              inputClassName="py-1 text-xs"
                              required
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="col-span-4 sm:col-span-2">
                            <FormField
                              type="number"
                              label="Unit Price (£)"
                              value={item.unitPrice}
                              onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                              min="0"
                              step="0.01"
                              inputClassName="py-1 text-xs"
                              required
                            />
                          </div>

                          {/* Discount */}
                          <div className="col-span-4 sm:col-span-1">
                            <FormField
                              type="number"
                              label="Disc%"
                              value={item.discount}
                              onChange={e => handleLineChange(idx, 'discount', e.target.value)}
                              min="0"
                              max="100"
                              inputClassName="py-1 text-xs"
                            />
                          </div>

                          {/* VAT & Delete */}
                          <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-4">
                            <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.includeVAT}
                                onChange={e => handleLineChange(idx, 'includeVAT', e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                              <span className="text-[11px] font-bold text-slate-700">+VAT</span>
                            </label>
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Vehicle assignment per item */}
                        <div className="w-full sm:w-1/2 pt-0.5">
                          <SearchableSelect
                            label="Assign to Vehicle (Optional)"
                            options={vehicles.map(v => ({ id: v.id, label: `${v.registrationNumber} - ${v.make} ${v.model}` }))}
                            value={item.vehicleId || ''}
                            onChange={(val) => {
                              const vId = Array.isArray(val) ? val[0] : val;
                              const v = vehicles.find(vh => vh.id === vId);
                              handleLineChange(idx, 'vehicleId', vId || '');
                              handleLineChange(idx, 'vehicleName', v ? `${v.make} ${v.model} (${v.registrationNumber})` : '');
                            }}
                            placeholder="-- Assign vehicle for item --"
                            isClearable
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact Billing Calculation Strip */}
                <div className="bg-slate-50/90 p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs shrink-0">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-medium">Net Subtotal</p>
                      <p className="text-xs font-bold font-mono text-slate-900">{formatCurrency(subTotal)}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-medium">VAT (20%)</p>
                      <p className="text-xs font-bold font-mono text-blue-600">{formatCurrency(vatAmount)}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-medium">Discount</p>
                      <p className="text-xs font-bold font-mono text-amber-600">–{formatCurrency(totalDiscount)}</p>
                    </div>
                    <div className="bg-blue-50/90 p-2 rounded-lg border border-blue-300">
                      <p className="text-[10px] text-blue-700 font-bold uppercase">Total Due</p>
                      <p className="text-sm font-black font-mono text-blue-950">{formatCurrency(total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PAYMENT & SETTLEMENT */}
            {activeTab === 'payment_settlement' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Balance Metrics - 3 compact tiles */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-blue-700 uppercase">Gross Billing</p>
                    <p className="text-lg font-black font-mono text-blue-950 mt-0.5">{formatCurrency(total)}</p>
                  </div>
                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Paid Now</p>
                    <p className="text-lg font-black font-mono text-emerald-950 mt-0.5">{formatCurrency(paidNow)}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border shadow-2xs ${
                    owing <= 0.005 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/80 border-rose-200'
                  }`}>
                    <p className={`text-[10px] font-bold uppercase ${owing <= 0.005 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {owing <= 0.005 ? 'Status' : 'Owing'}
                    </p>
                    <p className={`text-lg font-black font-mono mt-0.5 ${owing <= 0.005 ? 'text-emerald-900' : 'text-rose-950'}`}>
                      {owing <= 0.005 ? '£0.00 (Settled)' : formatCurrency(Math.max(0, owing))}
                    </p>
                  </div>
                </div>

                {/* Payment Allocation Card */}
                <div className="bg-slate-50/90 p-3 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Allocation</h4>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isPaid}
                        onChange={e => setFormData(fd => ({
                          ...fd,
                          isPaid: e.target.checked,
                          amountToPay: e.target.checked ? total.toFixed(2) : '0'
                        }))}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="text-xs font-bold text-slate-800">Mark as Paid Now</span>
                    </label>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                      <div className="flex-1">
                        <FormField
                          type="number"
                          label="Amount to Pay (£)"
                          value={formData.amountToPay}
                          onChange={e => {
                            const val = e.target.value;
                            const numVal = parseFloat(val) || 0;
                            setFormData(fd => ({
                              ...fd,
                              amountToPay: val,
                              isPaid: numVal > 0
                            }));
                          }}
                          min="0"
                          max={total || 0}
                          step="0.01"
                          placeholder="0.00"
                          inputClassName="py-1 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setFormData(fd => ({ ...fd, isPaid: true, amountToPay: total.toFixed(2) }))}
                          className="px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          100% Full
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(fd => ({ ...fd, isPaid: true, amountToPay: (total * 0.5).toFixed(2) }))}
                          className="px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          50% Deposit
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(fd => ({ ...fd, isPaid: false, amountToPay: '0' }))}
                          className="px-2 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {paidNow > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Method</label>
                          <select
                            value={formData.paymentMethod}
                            onChange={e => setFormData(fd => ({ ...fd, paymentMethod: e.target.value as any }))}
                            className="w-full rounded-lg border border-gray-300 text-xs py-1 px-2 focus:border-primary focus:ring-primary"
                            required
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>
                        <div>
                          <FormField
                            label="Reference"
                            value={formData.paymentReference}
                            onChange={e => setFormData(fd => ({ ...fd, paymentReference: e.target.value }))}
                            placeholder="e.g. BACS-8849"
                            inputClassName="py-1 text-xs"
                          />
                        </div>
                        <div>
                          <FormField
                            label="Payment Notes"
                            value={formData.paymentNotes}
                            onChange={e => setFormData(fd => ({ ...fd, paymentNotes: e.target.value }))}
                            placeholder="Settlement notes..."
                            inputClassName="py-1 text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 pt-0.5">
                        ℹ️ No upfront payment recorded. Invoice will be created as <strong>Unpaid</strong> with full balance owing.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: DOCUMENTS & ACTIONS */}
            {activeTab === 'documents_actions' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                {/* Left Column: Attachment */}
                <div className="bg-slate-50/90 p-3.5 rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Attachment</h4>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors text-center relative cursor-pointer flex-1 flex flex-col items-center justify-center min-h-[120px]">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => setFormData(fd => ({ ...fd, uploadedDocument: e.currentTarget.files?.[0] || null }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 pointer-events-none">
                      <Paperclip className="w-5 h-5 text-slate-400 mx-auto" />
                      {formData.uploadedDocument ? (
                        <div>
                          <p className="text-xs font-bold text-emerald-700 truncate max-w-[220px]">{formData.uploadedDocument.name}</p>
                          <p className="text-[10px] text-slate-500">{(formData.uploadedDocument.size / (1024 * 1024)).toFixed(2)} MB • Click to replace</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-700">Drag & drop or click to upload</p>
                          <p className="text-[10px] text-slate-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Pre-Dispatch & Checklist */}
                <div className="space-y-2.5">
                  <div className="bg-slate-50/90 p-3.5 rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Actions & Direct Dispatch</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShareInitialMode('whatsapp');
                          setShowShareModal(true);
                        }}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Send via WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShareInitialMode('email');
                          setShowShareModal(true);
                        }}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-all cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-sky-600" />
                        Send via Email
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintOrDownloadPDF()}
                        disabled={isPrintingPdf}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-600" />
                        {isPrintingPdf ? 'Generating...' : 'Print / Download PDF'}
                      </button>
                    </div>
                  </div>

                  {/* Summary Review */}
                  <div className="bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 space-y-0.5">
                      <p className="font-bold text-[11px]">Ready to Save & Generate</p>
                      <p className="text-blue-800 text-[10px]">
                        Customer: <span className="font-semibold text-blue-950">{getCustomerNameDisplay()}</span> • Total: <span className="font-semibold text-blue-950">{formatCurrency(total)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Pinned Bottom Navigation Footer ── */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            {/* Left: Previous Section or Cancel */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {activeTab !== 'client_accounts' && (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Previous Section
                </button>
              )}
            </div>

            {/* Center: Live Totals Badges */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-800">
                <span>Total:</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
              {total > 0 && (
                owing <= 0.005 ? (
                  <span className="inline-flex items-center px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg">
                    ✓ Paid in Full
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800">
                    <span>Owing:</span>
                    <span className="font-mono">{formatCurrency(Math.max(0, owing))}</span>
                  </div>
                )
              )}
            </div>

            {/* Right: Next Section / Review Details */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {activeTab !== 'documents_actions' ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-all shadow-2xs cursor-pointer"
                >
                  Next Section
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Review Details
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Share / Communication Modal (Triggered automatically post-save or via Quick Actions) */}
      <InvoiceCommunicationModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          if (savedInvoiceForShare) {
            onClose();
          }
        }}
        invoice={savedInvoiceForShare || buildActiveInvoice()}
        customer={customers.find(c => c.id === formData.customerId) || (formData.useCustomCustomer ? { name: formData.customerName, mobile: formData.customerPhone } as any : undefined)}
        vehicle={vehicles.find(v => v.id === formData.vehicleId)}
        initialMode={shareInitialMode}
      />
    </>
  );
};

export default InvoiceForm;