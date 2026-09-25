// src/components/finance/InvoiceEditModal.tsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection, query, orderBy, where, writeBatch } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { InvoiceLineItem, Invoice, Account } from '../../types/finance'; 
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { generateAndUploadDocument, getCompanyDetails } from '../../utils/documentGenerator';
import { InvoiceDocument } from '../pdf/documents';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import productService from '../../services/product.service';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import ProductFormModal from '../products/ProductFormModal'; 
import { PlusCircle, CheckCircle, MessageCircle, Mail, Printer } from 'lucide-react'; 
import Modal from '../ui/Modal';
import InvoiceCommunicationModal from './InvoiceCommunicationModal';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';

interface InvoiceEditModalProps {
  invoice: Invoice;
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

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({ invoice, vehicles, customers, accounts: propAccounts = [], groups = [], departments = [], onClose }) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<Account[]>(propAccounts);

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>((invoice.lineItems || []).map(li => ({ ...li })));
  
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
  
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingLineIndex, setPendingLineIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    invoiceNumber: invoice.invoiceNumber || '',
    date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    category: invoice.category || '',
    paymentStatus: invoice.paymentStatus || 'unpaid',
    customCategory: invoice.customCategory || '',
    description: invoice.description || '', 
    groupId: invoice.groupId || '',
    departmentId: invoice.departmentId || '',
    vehicleId: invoice.vehicleId || '',
    vehicleName: invoice.vehicleName || '', 
    manualVehicleEntry: false,
    manualVehicleMake: '',
    manualVehicleModel: '',
    manualVehicleReg: '',
    useCustomCustomer: !!invoice.customerName && !invoice.customerId,
    customerId: invoice.customerId || '',
    customerName: invoice.customerName || '',
    customerPhone: invoice.customerPhone || '',
    accountFrom: (invoice as any).accountFrom || '', 
    accountTo: (invoice as any).accountTo || invoice.accountId || '', 
    isAddingPayment: false,
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    isLoan: invoice.isLoan ?? false,
    uploadedDocument: null as File | null
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const snap = await getDocs(collection(db, 'invoiceCategories'));
        const fetched: string[] = [];
        snap.forEach(s => fetched.push((s.data() as any).name));
        fetched.sort((a, b) => a.localeCompare(b));
        setCategories(fetched);
      } catch (err) {
        toast.error('Failed to load categories');
      }
    };
    fetchCats();

    if (financeAccounts.length === 0) {
        (async () => {
            try {
                const snap = await getDocs(collection(db, 'accounts'));
                const accs: Account[] = [];
                snap.forEach(doc => accs.push({ id: doc.id, ...doc.data() } as Account));
                setFinanceAccounts(accs.sort((a, b) => a.name.localeCompare(b.name)));
            } catch {
                console.error("Failed to load accounts");
            }
        })();
    }

    (async () => {
      try {
        const prods = await productService.getAll();
        setProductSuggestions(prods.map(p => ({ 
            id: p.id, 
            partNumber: p.partNumber ?? '', 
            name: p.name ?? '', 
            lastPrice: Number(p.retailPrice ?? p.price ?? 0),
            vehicleId: p.vehicleId, 
            vehicleName: p.vehicleName, 
        })));
      } catch {
        console.error('Error fetching products');
      }
    })();
  }, []); 

  useEffect(() => {
    const isManualVeh = !!invoice.vehicleName && !invoice.vehicleId;
    let make = '', model = '', reg = '';
    if (isManualVeh && invoice.vehicleName) {
        const match = invoice.vehicleName.match(/(.+?)\s+\((.+?)\)$/);
        if (match) {
            const makeModel = match[1];
            reg = match[2];
            const parts = makeModel.split(' ');
            make = parts[0] || '';
            model = parts.slice(1).join(' ') || '';
        } else {
            make = invoice.vehicleName;
        }
    }
    setFormData(fd => ({ ...fd, manualVehicleEntry: isManualVeh, manualVehicleMake: make, manualVehicleModel: model, manualVehicleReg: reg }));
  }, [invoice]);

  useEffect(() => {
    setShowSuggestions(new Array(lineItems.length).fill(false));
  }, [lineItems.length]);

  const handleProductCreated = (product: any) => {
    const newSuggestion = { id: product.id, partNumber: product.partNumber ?? '', name: product.name ?? '', lastPrice: Number(product.retailPrice ?? 0) };
    setProductSuggestions(prev => [...prev, newSuggestion]);

    if (pendingLineIndex !== null) {
      setLineItems(prev => {
         const copy = [...prev];
         copy[pendingLineIndex] = { ...copy[pendingLineIndex], description: newSuggestion.name, unitPrice: newSuggestion.lastPrice };
         return copy;
      });
      const arr = [...showSuggestions]; 
      arr[pendingLineIndex] = false; 
      setShowSuggestions(arr);
    }
    setPendingLineIndex(null);
  };

  const computeTotals = () => {
    let subTotal = 0; let vatAmount = 0; let totalDiscount = 0;
    lineItems.forEach(item => {
      const lineNet = item.quantity * item.unitPrice;
      const discountAmt = (item.discount / 100) * lineNet;
      totalDiscount += discountAmt;
      const netAfterDiscount = lineNet - discountAmt;
      subTotal += netAfterDiscount;
      if (item.includeVAT) { vatAmount += netAfterDiscount * 0.2; }
    });
    return { subTotal, vatAmount, total: subTotal + vatAmount, totalDiscount };
  };

  const { subTotal, vatAmount, total, totalDiscount } = computeTotals();

  useEffect(() => {
    if (formData.isAddingPayment) {
      const remaining = Math.max(0, total - (invoice.paidAmount || 0));
      setFormData(fd => ({ ...fd, amountToPay: remaining.toFixed(2) }));
    }
  }, [formData.isAddingPayment, total, invoice.paidAmount]);

  const filterMatches = (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return productSuggestions.filter(ps => ps.name.toLowerCase().includes(s) || ps.partNumber.toLowerCase().includes(s));
  };

  const tryAutofillUnitPrice = (desc: string, idx: number) => {
    const q = desc.trim().toLowerCase();
    if (!q) return;
    const hit = productSuggestions.find(ps => ps.name.toLowerCase() === q || ps.partNumber.toLowerCase() === q);
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

  const showAt = (idx: number, on: boolean) => setShowSuggestions(arr => { const copy = [...arr]; copy[idx] = on; return copy; });

  const handleLineChange = (idx: number, field: keyof Omit<InvoiceLineItem, 'id'>, value: string | boolean) => {
    setLineItems(items => {
      const copy = [...items]; const it = { ...copy[idx] };
      if (field === 'description') it.description = value as string;
      else if (field === 'quantity') it.quantity = parseInt(value as string) || 0;
      else if (field === 'unitPrice') it.unitPrice = parseFloat(value as string) || 0;
      else if (field === 'discount') it.discount = parseFloat(value as string) || 0;
      else if (field === 'includeVAT') it.includeVAT = value as boolean;
      else if (field === 'vehicleId' || field === 'vehicleName') (it as any)[field] = value as string; 
      copy[idx] = it; return copy;
    });
  };
  
  const handleSuggestionSelect = (prod: ProductSuggestion, idx: number) => {
    handleLineChange(idx, 'description', prod.name);
    handleLineChange(idx, 'unitPrice', prod.lastPrice.toString());
    
    if (prod.vehicleId) {
       handleLineChange(idx, 'vehicleId', prod.vehicleId);
       handleLineChange(idx, 'vehicleName', prod.vehicleName || '');
    }

    showAt(idx, false);
  };

  const addLineItem = () => setLineItems(prev => [...prev, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, discount: 0, includeVAT: false, vehicleId: '', vehicleName: '' }]);
  const removeLineItem = (idx: number) => setLineItems(items => items.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if ((!formData.useCustomCustomer && !formData.customerId) || (formData.useCustomCustomer && !formData.customerName.trim())) {
      toast.error('A customer is required. Please select one or enter their details manually.');
      return;
    }
    if (lineItems.length === 0 || lineItems.every(li => li.quantity * li.unitPrice - (li.discount / 100) * (li.quantity * li.unitPrice) === 0)) {
      toast.error('Add at least one line item with a non-zero value.');
      return;
    }

    const payNow = parseFloat(formData.amountToPay) || 0;
    const currentRemaining = total - (invoice.paidAmount || 0);

    if (formData.isAddingPayment && payNow > currentRemaining + 0.01) { 
      toast.error('Payment cannot exceed the remaining amount.');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndSave = async () => {
    setLoading(true);
    try {
      let invoiceNumberToSave = formData.invoiceNumber || invoice.invoiceNumber;
      if (!invoiceNumberToSave) invoiceNumberToSave = await getNextInvoiceNumber();

      const payNow = parseFloat(formData.amountToPay) || 0;
      const paidSoFar = invoice.paidAmount || 0;
      const newTotalPaid = paidSoFar + (formData.isAddingPayment ? payNow : 0);
      const newRemaining = parseFloat((total - newTotalPaid).toFixed(2));
      
      let newStatus = 'unpaid';
      if (newTotalPaid >= total - 0.01 && total > 0) newStatus = 'paid';
      else if (newTotalPaid > 0) newStatus = 'partially_paid';

      const newPaymentId = `inv_pay_${Date.now()}`;
      const actualReference = formData.paymentReference || formData.paymentNotes || invoiceNumberToSave || 'N/A';

      const updatedPayments = [...(invoice.payments || [])];
      if (formData.isAddingPayment && payNow > 0) {
        updatedPayments.push({
          id: newPaymentId, date: new Date(), amount: payNow, method: formData.paymentMethod,
          reference: actualReference, notes: formData.paymentNotes, createdAt: new Date(), createdBy: user!.id, document: undefined
        });
      }

      const combinedManualVehicleName = formData.manualVehicleEntry 
        ? `${formData.manualVehicleMake.trim()} ${formData.manualVehicleModel.trim()} (${formData.manualVehicleReg.trim()})`.trim()
        : null;

      const mainVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedGroup = groups.find(g => g.id === formData.groupId || g.name === formData.groupId);
      const selectedDepartment = departments.find(d => d.id === formData.departmentId || d.name === formData.departmentId);

      const payload: Partial<Invoice> = {
        invoiceNumber: invoiceNumberToSave,
        date: new Date(formData.date), dueDate: new Date(formData.dueDate),
        lineItems: lineItems.map(li => ({ ...li })),
        subTotal, vatAmount, total, amount: total,
        paidAmount: newTotalPaid, remainingAmount: newRemaining,
        paymentStatus: newStatus as any, category: formData.category, description: formData.description,
        customCategory: formData.category === 'Other' ? formData.customCategory : null,
        groupId: formData.groupId || mainVehicle?.assignedGroupId || null,
        groupName: selectedGroup?.name || null, 
        departmentId: formData.departmentId || null, 
        departmentName: selectedDepartment?.name || null, 
        vehicleId: formData.manualVehicleEntry ? null : (formData.vehicleId || null), 
        vehicleName: formData.manualVehicleEntry ? combinedManualVehicleName : (formData.vehicleName || null),
        customerId: formData.useCustomCustomer ? null : (formData.customerId || null),
        customerName: formData.useCustomCustomer ? formData.customerName : customers.find(c => c.id === formData.customerId)?.name || '',
        customerPhone: formData.useCustomCustomer ? formData.customerPhone : customers.find(c => c.id === formData.customerId)?.mobile || '',
        payments: updatedPayments, isLoan: formData.isLoan,
        accountFrom: formData.accountFrom || null,
        accountTo: formData.accountTo || null,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'invoices', invoice.id), payload);

      const fullInv = { id: invoice.id, ...invoice, ...payload } as any;
      const pdfVehicle = mainVehicle;
      const pdfCustomer = customers.find(c => c.id === formData.customerId);
      
      let finalDocUrl = invoice.documentUrl || '';
      if (formData.uploadedDocument) {
         const stRef = ref(storage, `invoices/${invoice.id}/${formData.uploadedDocument.name}`);
         const snap = await uploadBytes(stRef, formData.uploadedDocument);
         finalDocUrl = await getDownloadURL(snap.ref);
         await updateDoc(doc(db, 'invoices', invoice.id), { documentUrl: finalDocUrl });
      } else {
         const companyDetails = await getCompanyDetails();
         if (companyDetails) {
            finalDocUrl = await generateAndUploadDocument(
              InvoiceDocument, { ...fullInv, vehicle: pdfVehicle, customer: pdfCustomer }, 
              'invoices', invoice.id, 'invoices', companyDetails
            );
         }
      }

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

      const txRef = collection(db, 'transactions');
      const qExp = query(txRef, where('referenceId', '==', invoice.id), where('type', '==', 'expense'));
      const txSnaps = await getDocs(qExp);
      const batch = writeBatch(db);
      txSnaps.forEach(d => {
        if (d.data().category === (invoice.category || 'Loan Provided') || d.data().category === 'Loan Provided') {
           batch.delete(d.ref);
        }
      });
      await batch.commit();

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
                  description: [formData.description, `Loan for Invoice ${invoiceNumberToSave}`].filter(Boolean).join(' - '),
                  referenceId: invoice.id,
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

      if (formData.isAddingPayment && payNow > 0) {
          let finalAccountId = formData.accountTo || formData.accountId;
          if (!finalAccountId) {
              const defaultAcc = financeAccounts.find(a => a.name.toUpperCase().includes('AIE SKYLINE ACCOUNT'));
              if (defaultAcc) finalAccountId = defaultAcc.id;
          }
            
          const actualCategory = formData.category === 'Other' && formData.customCategory 
              ? formData.customCategory 
              : (formData.category || 'Invoice Payment');

          for (const [vId, totals] of groupsByVehicle.entries()) {
              const targetVehicle = vehicles.find(v => v.id === vId);
              const vehicleOwner = targetVehicle?.owner 
                  ? { name: targetVehicle.owner.name, isDefault: targetVehicle.owner.isDefault ?? false }
                  : { name: 'AIE Skyline Limited', isDefault: true };

              const ratio = total > 0 ? totals.gross / total : 0;
              const allocatedPayment = payNow * ratio;

              const rawGroupId = targetVehicle?.assignedGroupId || payload.groupId;
              const resolvedGroupName = groups.find(g => g.id === rawGroupId || g.name === rawGroupId)?.name;
              const targetDeptId = payload.departmentId || targetVehicle?.assignedDepartmentId;
              const targetDeptName = payload.departmentName || targetVehicle?.assignedDepartmentName || departments.find(d => d.id === targetDeptId || d.name === targetDeptId)?.name;

              if (allocatedPayment > 0) {
                  await createFinanceTransaction({
                      type: 'income',
                      category: actualCategory,
                      amount: allocatedPayment,
                      description: [formData.description, formData.paymentNotes, formData.paymentReference ? `Ref: ${formData.paymentReference}` : ''].filter(Boolean).join(' - ') || `Payment for Invoice ${invoiceNumberToSave}`,
                      referenceId: invoice.id, 
                      vehicleId: vId === 'unassigned' ? undefined : vId,
                      vehicleName: totals.vehicleName,
                      vehicleOwner: vId === 'unassigned' && formData.manualVehicleEntry ? undefined : vehicleOwner,
                      customerId: payload.customerId || undefined,
                      customerName: payload.customerName || undefined,
                      paymentMethod: formData.paymentMethod,
                      paymentReference: actualReference, // ✅ Restored human-readable reference
                      paymentId: newPaymentId, // ✅ Dedicated system link
                      paymentStatus: newStatus as any,
                      date: new Date(),
                      accountTo: finalAccountId || undefined,
                      groupId: rawGroupId || undefined, 
                      groupName: resolvedGroupName || undefined, 
                      departmentId: targetDeptId || undefined, 
                      departmentName: targetDeptName || undefined 
                  });
              }
          }
      }

      const newPayments = updatedPayments;
      const totalPaid = newTotalPaid;

      const updatedInvoiceObj: Invoice = {
        ...invoice,
        ...payload,
        id: invoice.id,
        documentUrl: finalDocUrl || invoice.documentUrl,
        payments: newPayments,
        paidAmount: totalPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus as any,
      } as Invoice;

      setSavedInvoiceForShare(updatedInvoiceObj);
      setShowConfirmModal(false);

      // Execute selected post-save actions
      const hasWhatsApp = postSaveActions.whatsapp;
      const hasEmail = postSaveActions.email;
      const hasPrintPdf = postSaveActions.printPdf;

      if (hasPrintPdf) {
        handlePrintOrDownloadPDF(updatedInvoiceObj);
      }

      if (hasWhatsApp) {
        setShareInitialMode('whatsapp');
        setShowShareModal(true);
      } else if (hasEmail) {
        setShareInitialMode('email');
        setShowShareModal(true);
      } else {
        onClose();
      }

      toast.success(`Invoice ${invoiceNumberToSave} updated successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update invoice');
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

  // Build active invoice for sharing or printing before/after update
  const buildActiveInvoice = (): Invoice => {
    if (savedInvoiceForShare) return savedInvoiceForShare;

    const initialPayment = formData.isAddingPayment ? (parseFloat(formData.amountToPay) || 0) : 0;
    const paymentsList = invoice.payments || [];
    const paymentsSum = paymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const basePaid = Math.max(Number(invoice.paidAmount) || 0, paymentsSum);
    const totalPaid = initialPayment + basePaid;

    const totalAmount = total;
    const owingAmount = Math.max(0, parseFloat((totalAmount - totalPaid).toFixed(2)));
    const remainingAmount = owingAmount;

    let paymentStatus: 'paid' | 'unpaid' | 'partially_paid' = 'unpaid';
    if (totalPaid >= totalAmount - 0.01 && totalAmount > 0) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partially_paid';
    }

    const currentPayments = [...paymentsList];
    if (formData.isAddingPayment && initialPayment > 0) {
      currentPayments.push({
        id: `draft_pay_${Date.now()}`,
        date: new Date(),
        amount: initialPayment,
        method: formData.paymentMethod,
        reference: formData.paymentReference || formData.paymentNotes || 'Payment',
        notes: formData.paymentNotes,
        createdAt: new Date(),
        createdBy: user?.id || 'system'
      });
    }

    const selectedGroup = groups.find(g => g.id === formData.groupId || g.name === formData.groupId);
    const selectedDepartment = departments.find(d => d.id === formData.departmentId || d.name === formData.departmentId);

    return {
      ...invoice,
      invoiceNumber: formData.invoiceNumber || invoice.invoiceNumber,
      date: new Date(formData.date),
      dueDate: new Date(formData.dueDate),
      lineItems: lineItems.map(li => ({ ...li })),
      subTotal,
      vatAmount,
      total: totalAmount,
      amount: totalAmount,
      paidAmount: totalPaid,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus as any,
      category: formData.category === 'Other' ? formData.customCategory : formData.category,
      description: formData.description,
      customCategory: formData.category === 'Other' ? formData.customCategory : undefined,
      groupId: formData.groupId || undefined,
      groupName: selectedGroup?.name || invoice.groupName || undefined,
      departmentId: formData.departmentId || undefined,
      departmentName: selectedDepartment?.name || invoice.departmentName || undefined,
      vehicleId: formData.vehicleId || undefined,
      vehicleName: formData.vehicleName || undefined,
      customerId: formData.customerId || undefined,
      customerName: getCustomerNameDisplay(),
      customerPhone: formData.useCustomCustomer ? formData.customerPhone : customers.find(c => c.id === formData.customerId)?.mobile || invoice.customerPhone || '',
      payments: currentPayments,
      isLoan: formData.isLoan,
      documentUrl: invoice.documentUrl,
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
        title="Confirm Invoice Updates" 
        size="lg"
        zIndex="z-[60]"
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Review details and confirm to update invoice
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
                Confirm & Update
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
                    <span className="font-mono font-medium">{formatCurrency(parseFloat(formData.amountToPay) || 0)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between items-center">
                    <span className="text-base font-black text-gray-900 uppercase">Remaining Amount</span>
                    <span className="text-2xl font-black text-primary font-mono">{formatCurrency(Math.max(0, total - (parseFloat(formData.amountToPay) || 0)))}</span>
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
                      id="postEditWhatsApp"
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
                      id="postEditEmail"
                      checked={postSaveActions.email}
                      onChange={e => setPostSaveActions(prev => ({ ...prev, email: e.target.checked }))}
                      className="h-4 w-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                    />
                    <Mail className="w-4 h-4 text-sky-400 shrink-0" />
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
                      id="postEditPrintPdf"
                      checked={postSaveActions.printPdf}
                      onChange={e => setPostSaveActions(prev => ({ ...prev, printPdf: e.target.checked }))}
                      className="h-4 w-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <Printer className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold">Print / Download PDF</span>
                  </label>
                </div>
            </div>
         </div>
      </Modal>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white text-[#0F172A]">
        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              Edit Invoice {invoice.invoiceNumber && <span className="text-primary font-black ml-1">#{invoice.invoiceNumber}</span>}
            </h2>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Invoice Number" value={formData.invoiceNumber} onChange={e => setFormData(fd => ({ ...fd, invoiceNumber: e.target.value }))} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Account From (Debit)"
              options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
              value={formData.accountFrom}
              onChange={val => setFormData(fd => ({ ...fd, accountFrom: val as string || '' }))}
              placeholder="Select source account..."
            />
            <SearchableSelect
              label="Account To (Credit)"
              options={financeAccounts.map(a => ({ id: a.id, label: a.name }))}
              value={formData.accountTo}
              onChange={val => setFormData(fd => ({ ...fd, accountTo: val as string || '' }))}
              placeholder="Select destination account..."
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-4">
            <label className="flex items-center space-x-2">
                <input type="checkbox" checked={formData.useCustomCustomer} onChange={e => setFormData(fd => ({ ...fd, useCustomCustomer: e.target.checked, customerId: '', customerName: '' }))} className="rounded border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-gray-700">Enter Customer Manually</span>
            </label>
            {formData.useCustomCustomer ? (
                <>
                <FormField label="Customer Name" value={formData.customerName} onChange={e => setFormData(fd => ({ ...fd, customerName: e.target.value }))} required />
                <FormField type="tel" label="Phone Number" value={formData.customerPhone} onChange={e => setFormData(fd => ({ ...fd, customerPhone: e.target.value }))} />
                </>
            ) : (
                <SearchableSelect label="Select Customer" options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `${c.mobile} • ${c.email}` }))} value={formData.customerId} onChange={id => { const c = customers.find(x => x.id === id)!; setFormData(fd => ({ ...fd, customerId: id as string, customerName: c.name, customerPhone: c.mobile })); }} placeholder="Search…" required />
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
                      vehicleId: id as string || '',
                      vehicleName: v ? `${v.make} ${v.model} (${v.registrationNumber})` : '',
                      groupId: v?.assignedGroupId || fd.groupId,
                      departmentId: v?.assignedDepartmentId || fd.departmentId,
                    }));
                  }}
                  placeholder="Search…"
                />
              )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField type="date" label="Invoice Date" value={formData.date} onChange={e => setFormData(fd => ({ ...fd, date: e.target.value }))} required />
          <FormField type="date" label="Due Date" value={formData.dueDate} onChange={e => setFormData(fd => ({ ...fd, dueDate: e.target.value }))} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableSelect
            label="Category"
            options={categories.map(c => ({ id: c, label: c })).concat({ id: 'Other', label: 'Other' })}
            value={formData.category}
            onChange={val => setFormData(fd => ({ ...fd, category: val as string || '' }))}
            placeholder="Select category..."
            required
          />
          
          <SearchableSelect
            label="Group (Optional)"
            options={groups.map(g => ({ id: g.id, label: g.name }))}
            value={resolvedGroupId}
            onChange={val => setFormData(fd => ({ ...fd, groupId: val as string || '' }))}
            placeholder="Select a group..."
          />

          <SearchableSelect
            label="Department (Optional)"
            options={departments.map(d => ({ id: d.id, label: d.name }))}
            value={resolvedDeptId}
            onChange={val => setFormData(fd => ({ ...fd, departmentId: val as string || '' }))}
            placeholder="Select a department..."
          />
  
        </div>

        <div className="grid grid-cols-1 gap-4">
          {formData.category === 'Other' && ( <FormField label="Custom Category" value={formData.customCategory} onChange={e => setFormData(fd => ({ ...fd, customCategory: e.target.value }))} required /> )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea value={formData.description} onChange={e => setFormData(fd => ({ ...fd, description: e.target.value }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" rows={2} placeholder="General description or notes for this invoice..." />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Line Items</h3>
            <button type="button" onClick={addLineItem} className="text-sm text-primary hover:text-primary-600">+ Add Line</button>
          </div>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={item.id} className="relative p-3 border border-gray-200 rounded-md bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
                  <div className="sm:col-span-2 relative">
                    <FormField label="Description" value={item.description} onChange={e => { handleLineChange(idx, 'description', e.target.value); showAt(idx, true); }} onFocus={() => showAt(idx, true)} onBlur={() => { setTimeout(() => showAt(idx, false), 120); tryAutofillUnitPrice(item.description, idx); }} required />
                    {showSuggestions[idx] && item.description && (
                      <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-2xl mt-1 max-h-56 overflow-y-auto">
                        {filterMatches(item.description).map(s => (
                          <li key={s.id} className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between" onMouseDown={() => { handleSuggestionSelect(s, idx); }} title={`${s.name}${s.partNumber ? ` (${s.partNumber})` : ''}`}>
                            <span className="truncate">{s.name}{s.partNumber ? <span className="text-gray-500"> — {s.partNumber}</span> : null}</span>
                            <span className="text-gray-500 text-sm ml-3">£{s.lastPrice.toFixed(2)}</span>
                          </li>
                        ))}
                        <li className="px-4 py-2 text-primary font-medium cursor-pointer hover:bg-gray-50 border-t flex items-center gap-2 sticky bottom-0 bg-white" onMouseDown={(e) => { e.preventDefault(); setPendingLineIndex(idx); setShowProductModal(true); }}>
                          <PlusCircle className="w-4 h-4" /> Create New Product
                        </li>
                      </ul>
                    )}
                  </div>

                  <FormField type="number" label="Quantity" value={item.quantity} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} min="1" inputClassName="w-full" required />
                  <FormField type="number" label="Unit Price" value={item.unitPrice} onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)} min="0" step="0.01" inputClassName="w-full" required />
                  <FormField type="number" label="Discount (%)" value={item.discount} onChange={e => handleLineChange(idx, 'discount', e.target.value)} min="0" max="100" step="0.1" inputClassName="w-full" />
                  <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={item.includeVAT} onChange={e => handleLineChange(idx, 'includeVAT', e.target.checked) } className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="text-sm text-gray-600">+ VAT</span>
                    </label>
                    <button type="button" onClick={() => removeLineItem(idx)} className="text-red-600 hover:text-red-800" title="Remove Line">Remove</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 items-end">
                   <div className="w-full sm:w-1/2">
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
                        placeholder="-- No specific vehicle --"
                        isClearable={true}
                      />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm text-[#000000] font-semibold"><span>Net:</span><span className="font-mono">{formatCurrency(subTotal)}</span></div>
          <div className="flex justify-between text-sm text-[#2563EB] font-semibold"><span>VAT:</span><span className="font-mono">{formatCurrency(vatAmount)}</span></div>
          <div className="flex justify-between text-sm text-[#D97706] font-semibold"><span>Discount:</span><span className="font-mono">–{formatCurrency(totalDiscount)}</span></div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t text-[#D97706]"><span>Total:</span><span className="font-mono">{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-sm text-[#15803D] font-bold"><span>Paid (so far):</span><span className="font-mono">{formatCurrency(invoice.paidAmount || 0)}</span></div>
          <div className="flex justify-between text-sm text-[#DC2626] font-bold"><span>Owing:</span><span className="font-mono">{formatCurrency(Math.max(0, total - (invoice.paidAmount || 0)))}</span></div>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={formData.isAddingPayment} onChange={e => setFormData(fd => ({ ...fd, isAddingPayment: e.target.checked, amountToPay: e.target.checked ? (Math.max(0, total - (invoice.paidAmount || 0))).toFixed(2) : '0' }))} className="rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm text-gray-700">Add Payment</span>
          </label>
        </div>

        <FormField type="number" label="Amount to Pay (£)" value={formData.amountToPay} onChange={e => setFormData(fd => ({ ...fd, amountToPay: e.target.value }))} min="0" max={Math.max(0, total - (invoice.paidAmount || 0))} step="0.01" disabled={!formData.isAddingPayment} />

        {parseFloat(formData.amountToPay) > 0 && formData.isAddingPayment && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select value={formData.paymentMethod} onChange={e => setFormData(fd => ({ ...fd, paymentMethod: e.target.value as any }))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required>
                <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
              </select>
            </div>
            <FormField label="Payment Reference" value={formData.paymentReference} onChange={e => setFormData(fd => ({ ...fd, paymentReference: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
              <textarea value={formData.paymentNotes} onChange={e => setFormData(fd => ({ ...fd, paymentNotes: e.target.value }))} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" placeholder="Any notes" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Upload Document (Manual Override)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <p className="text-gray-500 text-sm">Drag & drop or click to upload</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFormData(fd => ({ ...fd, uploadedDocument: e.currentTarget.files?.[0] || null }))} className="sr-only" />
              <p className="text-xs text-gray-500">PDF/image up to 10MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Action Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">
              Quick Actions:
            </span>
            <button
              type="button"
              onClick={() => {
                setShareInitialMode('whatsapp');
                setShowShareModal(true);
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
              title="Share Invoice via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Send WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setShareInitialMode('email');
                setShowShareModal(true);
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs cursor-pointer"
              title="Send Invoice via Email"
            >
              <Mail className="w-3.5 h-3.5 mr-1 text-sky-600" />
              Send Email
            </button>
            <button
              type="button"
              onClick={handlePrintOrDownloadPDF}
              disabled={isPrintingPdf}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Print or Download Invoice PDF"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-purple-600" />
              {isPrintingPdf ? 'Generating...' : 'Print / Download PDF'}
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-600 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Review Details
            </button>
          </div>
        </div>
      </form>

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

export default InvoiceEditModal;