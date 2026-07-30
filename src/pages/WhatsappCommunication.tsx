// src/pages/WhatsappCommunication.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { format, addDays, isAfter } from 'date-fns';
import { calculateRentalCost, calculateOverdueCost, RENTAL_RATES } from '../utils/rentalCalculations';
import { Search, MessageSquareText, Trash2, User, Briefcase, Wrench, Wallet, Paperclip, X } from 'lucide-react'; 
import {
  collection,
  query,
  getDocs,
  getDoc,
  writeBatch,
  doc,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useServiceCenters } from '../hooks/useServiceCenters';
import { useInvoices } from '../hooks/useInvoices';
import { useClaims } from '../hooks/useClaims';
import { usePermissions } from '../hooks/usePermissions';
import { useFinances } from '../hooks/useFinances'; 
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes';

import { fetchLegalHandlers } from '../utils/legalHandlers';
import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { fillPlaceholders } from '../utils/templateUtils';
import { sendWhatsAppMessage, buildWhatsAppMessage } from '../utils/whatsapp';
import { useWhatsappHistory, logWhatsappHistory } from '../hooks/useWhatsappHistory';
import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';
import { Account } from '../types';

// PDF Document Generation Imports
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument, InvoiceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';

// ---------------- DEBUG TOGGLE ----------------
const DEBUG = true;
// ---------------- DEBUG HELPERS ----------------
const dlog = (...args: any[]) => DEBUG && console.log(...args);

// ────────────────────────────────────────────────────────────────────────────
// Helper Functions (render/format)
// ────────────────────────────────────────────────────────────────────────────
const escapeHtml = (s: string) =>
  (s || '')
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/"/g, '&quot;')
    .replaceAll(/'/g, '&#39;');

const waMdToHtml = (s: string) => {
  let out = escapeHtml(s || '');
  out = out.replace(/([^]+)/g, '<code class="px-1 rounded bg-gray-100">$1</code>');
  out = out.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  out = out.replace(/_(.+?)_/g, '<em>$1</em>');
  out = out.replace(/~(.+?)~/g, '<del>$1</del>');
  return out;
};

const norm = (s?: string) => (s || '').toLowerCase().trim();
const normEmail = (s?: string) => norm(s);
const normPhone = (s?: string) => (s || '').replace(/\D/g, '');
const splitMulti = (v?: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') return v.split(/[,\s;]+/).filter(Boolean);
  return [];
};

function nameLooseEqual(a?: string, b?: string) {
  const A = norm(a), B = norm(b);
  if (!A || !B) return false;
  return A === B || A.includes(B) || B.includes(A);
}

function anyEmailMatch(customerEmail?: string, ...candidates: any[]) {
  const ce = normEmail(customerEmail);
  if (!ce) return false;
  const flat = candidates.flatMap(splitMulti).map(normEmail);
  return flat.includes(ce);
}

function anyPhoneMatch(customerPhone?: string, ...candidates: any[]) {
  const cp = normPhone(customerPhone);
  if (!cp) return false;
  const flat = candidates.flatMap(splitMulti).map(normPhone).filter(Boolean);
  return flat.some(p => p.endsWith(cp) || cp.endsWith(p));
}

// date safety
const safeToDate = (d: any): Date | null => {
  try {
    if (!d) return null;
    if (typeof d?.toDate === 'function') return d.toDate();
    const dt = new Date(d);
    return isNaN(+dt) ? null : dt;
  } catch { return null; }
};
const safeFmt = (d: any, pat = 'dd/MM/yyyy') => {
  const dt = safeToDate(d);
  return dt ? format(dt, pat) : '';
};

const firstNonEmpty = (...vals: any[]) =>
  vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

const getInvoiceManualName = (inv: any) =>
  firstNonEmpty(
    inv?.manualCustomerName,
    inv?.customerName,
    inv?.billingName,
    inv?.recipientName,
    inv?.name
  );

const getInvoiceManualPhone = (inv: any) =>
  firstNonEmpty(
    inv?.manualCustomerPhone,
    inv?.customerPhone,
    inv?.billingPhone,
    inv?.recipientPhone,
    inv?.mobile,
    inv?.phone,
    inv?.whatsapp
  );

type RecipientFilterType = 'all' | 'customer' | 'serviceCenter' | 'legalHandler' | 'invoiceManual' | 'account' | 'owner';

const TARGET_PERMISSIONS: Record<string, any> = {
  custom: 'targetCustom',
  rental: 'targetRental',
  maintenance: 'targetMaintenance',
  invoice: 'targetInvoice',
  finance: 'targetFinance',
  claim: 'targetClaim',
};

export default function WhatsappCommunication() {
  const { user } = useAuth();
  const { can, isManager }  = usePermissions();

  if (!can('whatsapp', 'view')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const availableTabs = useMemo(() => {
    return (Object.keys(emailTemplates) as EmailType[]).filter(type => {
       const permKey = TARGET_PERMISSIONS[type];
       return permKey ? can('whatsapp', permKey) : false;
    });
  }, [can]);

  // ── State
  const [emailType, setEmailType] = useState<EmailType>(availableTabs[0] || 'custom');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilterType>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string>('');

  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const isUserEdited = useRef<boolean>(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Attachments State
  const [selectedSystemDocs, setSelectedSystemDocs] = useState<{name: string, url: string}[]>([]);
  const [customFiles, setCustomFiles] = useState<File[]>([]);

  // ── Data hooks
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { serviceCenters } = useServiceCenters();
  const { invoices } = useInvoices();
  const { claims } = useClaims();
  const { history } = useWhatsappHistory();
  const { transactions } = useFinances();

  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name'));
    getDocs(q).then(snap => {
        const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setAccounts(accs);
    }).catch(console.error);
  }, []);

  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);
  const [claimDocById, setClaimDocById] = useState<Record<string, any>>({});
  const [dbTemplates, setDbTemplates] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const fetchLiveTemplates = async () => {
      try {
        const snap = await getDocs(collection(db, 'messageTemplates'));
        if (!snap.empty) {
          const templatesData: Record<string, any[]> = {
            custom: [], rental: [], maintenance: [], invoice: [], claim: [], finance: []
          };
          snap.docs.forEach(doc => {
            const data = doc.data();
            if (data.category && templatesData[data.category]) {
              templatesData[data.category].push({ id: doc.id, ...data });
            }
          });
          setDbTemplates(templatesData);
        }
      } catch (e) {
        console.error('Failed to load live templates', e);
      }
    };
    fetchLiveTemplates();
  }, []);

  const templates = dbTemplates[emailType]?.length > 0 
    ? dbTemplates[emailType] 
    : (emailTemplates[emailType] || []);
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers().then(setLegalHandlers).catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  useEffect(() => {
    setSelectedSystemDocs([]);
    setCustomFiles([]);
  }, [selectedRecordId, emailType]);

  // High performance O(1) Dictionary Lookup Engine
  const recipientMap = useMemo(() => {
    const map = new Map<string, { phone: string; email: string; name: string }>();

    customers.forEach(c => {
      const phone = (c as any)?.whatsapp || (c as any)?.phone || (c as any)?.mobile || (c as any)?.tel || '';
      map.set(c.id, { phone, email: c.email || '', name: c.name || '' });
    });

    serviceCenters.forEach(sc => {
      map.set(sc.id, { phone: sc.phone || '', email: sc.email || '', name: sc.name || '' });
    });

    legalHandlers.forEach(lh => {
      map.set(lh.id, { phone: lh.phone || '', email: lh.email || '', name: lh.name || '' });
    });

    accounts.forEach(a => {
      map.set(a.id, { phone: '', email: '', name: a.name || 'Account' });
    });

    return map;
  }, [customers, serviceCenters, legalHandlers, accounts]);

  // Determine available system docs for the selected tab and record
  const availableSystemDocs = useMemo(() => {
    if (!selectedRecordId) return [];

    const docs: { name: string; url: string }[] = [];

    if (emailType === 'rental') {
      const r = rentals.find(x => x.id === selectedRecordId);
      if (r) {
        if ((r as any).agreementUrl) docs.push({ name: 'Rental_Agreement.pdf', url: (r as any).agreementUrl });
        if ((r as any).documentUrl) docs.push({ name: 'Rental_Document.pdf', url: (r as any).documentUrl });
        
        if (r.documents) {
          if (r.documents.invoice) docs.push({ name: 'Rental_Invoice.pdf', url: r.documents.invoice });
          if (r.documents.permit) docs.push({ name: 'Parking_Permit.pdf', url: r.documents.permit });
          
          if (r.documents.agreements && typeof r.documents.agreements === 'object') {
            const keys = Object.keys(r.documents.agreements).sort((a, b) => parseInt(a.split('_')[1] || '0') - parseInt(b.split('_')[1] || '0'));
            const latest = keys.pop();
            if (latest && r.documents.agreements[latest]) {
              docs.push({ name: 'Rental_Agreement.pdf', url: r.documents.agreements[latest] });
            }
          }
        }
      }
    } else if (emailType === 'finance') {
      const t = transactions.find(x => x.id === selectedRecordId);
      if (t) {
        if (t.receiptUrl) docs.push({ name: 'Receipt.pdf', url: t.receiptUrl });
        if (t.documentUrl) docs.push({ name: 'Finance_Document.pdf', url: t.documentUrl });
      }
    } else if (emailType === 'invoice') {
      const i = invoices.find(x => x.id === selectedRecordId);
      if (i && (i as any).documentUrl) {
        docs.push({ name: 'Invoice.pdf', url: (i as any).documentUrl });
      }
    }

    return docs;
  }, [emailType, selectedRecordId, rentals, transactions, invoices]);

  const toggleSystemDoc = (doc: {name: string, url: string}) => {
    setSelectedSystemDocs(prev => 
      prev.some(d => d.url === doc.url) 
        ? prev.filter(d => d.url !== doc.url)
        : [...prev, doc]
    );
  };

  const handleGenerateMissingDocument = async (docType: 'finance' | 'receipt' | 'invoice') => {
    if (!selectedRecordId) return;
    setIsGeneratingDoc(true);
    const toastId = toast.loading(`Generating ${docType} document...`);
    
    try {
      const companyDetails = await getCompanyDetails();
      
      if (docType === 'finance') {
        const t = transactions.find(x => x.id === selectedRecordId);
        if (!t) throw new Error('Transaction not found');
        const vehicle = vehicles.find(v => v.id === t.vehicleId);
        
        const url = await generateAndUploadDocument(
          FinanceDocument, 
          { ...t, vehicle, customer: { name: t.customerName }, accounts }, 
          'finance', 
          t.id, 
          'transactions'
        );
        await updateDoc(doc(db, 'transactions', t.id), { documentUrl: url });
        toast.success('Finance Document generated!', { id: toastId });
        
      } else if (docType === 'receipt') {
        const t = transactions.find(x => x.id === selectedRecordId);
        if (!t) throw new Error('Transaction not found');
        const vehicle = vehicles.find(v => v.id === t.vehicleId);
        
        const url = await generateAndUploadDocument(
          ReceiptDocument, 
          { ...t, vehicle, customer: { name: t.customerName } }, 
          'finance', 
          t.id, 
          'transactions', 
          'receiptUrl'
        );
        await updateDoc(doc(db, 'transactions', t.id), { receiptUrl: url });
        toast.success('Receipt generated!', { id: toastId });
        
      } else if (docType === 'invoice') {
        const i = invoices.find(x => x.id === selectedRecordId);
        if (!i) throw new Error('Invoice not found');
        const vehicle = vehicles.find(v => v.id === i.vehicleId);
        const customer = customers.find(c => c.id === i.customerId);
        
        const url = await generateAndUploadDocument(
          InvoiceDocument,
          { ...i, vehicle, customer }, 
          'invoices',
          i.id,
          'invoices',
          companyDetails
        );
        await updateDoc(doc(db, 'invoices', i.id), { documentUrl: url });
        toast.success('Invoice Document generated!', { id: toastId });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Generation failed: ${e.message}`, { id: toastId });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // HIGH PERFORMANCE RECIPIENT FILTER - STOPS FREEZING
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (!isManager && !q) return [];

    const matched: any[] = [];

    const checkMatch = (r: any, extraLabel: string = '') => {
      if (!q) return true;
      const name = (r.name || r.fullName || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const phone = ((r as any).phone || (r as any).mobile || (r as any).whatsapp || '').toLowerCase();
      const label = extraLabel.toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || label.includes(q);
    };

    const addIfMatches = (item: any, type: string, label: string = '') => {
      if (matched.length >= 50) return false;
      if (checkMatch(item, label)) {
        matched.push({ ...item, type, _label: label });
      }
      return matched.length < 50;
    };

    if (emailType === 'maintenance') {
      if (recipientFilter === 'serviceCenter' || recipientFilter === 'all') {
        for (const r of serviceCenters) { if (!addIfMatches(r, 'serviceCenter')) break; }
      }
      if (matched.length < 50 && (recipientFilter === 'customer' || recipientFilter === 'all')) {
        for (const r of customers) { if (!addIfMatches(r, 'customer')) break; }
      }
    }
    else if (emailType === 'claim') {
      if (recipientFilter === 'customer' || recipientFilter === 'all') {
        for (const r of customers) { if (!addIfMatches(r, 'customer')) break; }
      }
      if (matched.length < 50 && (recipientFilter === 'legalHandler' || recipientFilter === 'all')) {
        for (const r of legalHandlers) { if (!addIfMatches(r, 'legalHandler')) break; }
      }
    }
    else if (emailType === 'invoice') {
      for (const r of customers) { if (!addIfMatches(r, 'customer')) break; }
      if (matched.length < 50) {
        for (const inv of invoices) {
          if (inv.customerId) continue;
          const manualName = getInvoiceManualName(inv);
          const manualPhone = getInvoiceManualPhone(inv);
          if (!manualName || !manualPhone) continue;
          const invNo = inv.invoiceNumber || `INV-${String(inv.id || '').slice(-8).toUpperCase()}`;
          const label = [invNo, manualName, manualPhone].filter(Boolean).join(' • ');
          if (!addIfMatches({ id: `invoice:${inv.id}`, name: manualName, email: '', phone: manualPhone }, 'invoiceManual', label)) break;
        }
      }
    }
    else if (emailType === 'finance') {
      if (recipientFilter === 'account') {
        for (const a of accounts) { if (!addIfMatches({ ...a, name: a.name }, 'account', 'Account')) break; }
      } else if (recipientFilter === 'owner') {
        const ownerSet = new Set<string>();
        for (const v of vehicles) { if (v.owner?.name) ownerSet.add(v.owner.name); }
        for (const t of transactions) { if (t.vehicleOwner?.name) ownerSet.add(t.vehicleOwner.name); }
        for (const name of Array.from(ownerSet).sort()) {
          if (!addIfMatches({ id: name, name }, 'owner', 'Vehicle Owner')) break;
        }
      } else {
        for (const r of customers) { if (!addIfMatches(r, 'customer')) break; }
      }
    }
    else {
      for (const r of customers) { if (!addIfMatches(r, 'customer')) break; }
    }

    return matched;
  }, [emailType, searchQuery, recipientFilter, customers, serviceCenters, legalHandlers, invoices, isManager, accounts, vehicles, transactions]);

  // HIGH PERFORMANCE RELATED RECORDS CACHING - STOPS DELAY ON KEYSTROKE
  const relatedRecordsOptions = useMemo(() => {
    if (selectedRecipients.length !== 1) return [];
    const recipientId = selectedRecipients[0];

    switch (emailType) {
      case 'custom': {
        const activeRental = rentals.find((r: any) => r.customerId === recipientId && r.status === 'active');
        const activeVehicleId = activeRental?.vehicleId;
        const ownedVehicles = vehicles
          .filter(v => v.customerId === recipientId || (v as any).ownerId === recipientId)
          .map(v => v.id);

        return vehicles.map(v => {
          let label = v.registrationNumber || 'Unknown Reg';
          if (v.id === activeVehicleId) label += ' (Active Rental)';
          else if (ownedVehicles.includes(v.id)) label += ' (Owned/Assigned)';
          return { id: v.id, label };
        }).sort((a, b) => {
          if (a.id === activeVehicleId) return -1;
          if (b.id === activeVehicleId) return 1;
          if (a.label.includes('(Owned')) return -1;
          if (b.label.includes('(Owned')) return 1;
          return a.label.localeCompare(b.label);
        });
      }
      case 'rental': {
        return rentals
          .filter(r => r.customerId === recipientId)
          .map(r => {
            const v = vehicles.find(vx => vx.id === r.vehicleId);
            return { id: r.id, label: `${v?.registrationNumber || 'N/A'} (${safeFmt(r.startDate, 'dd/MM/yyyy')})` };
          });
      }
      case 'maintenance': {
        return maintenanceLogs
          .map(m => {
            const v = vehicles.find(vx => vx.id === m.vehicleId);
            const reg = v?.registrationNumber || 'Unknown Reg';
            return { id: m.id, label: `${reg} • ${m.type} • ${safeFmt(m.date, 'dd/MM/yyyy')}` };
          });
      }
      case 'invoice': {
        if (recipientId.startsWith('invoice:')) {
          const invId = recipientId.split(':')[1];
          const inv = invoices.find(i => i.id === invId);
          if (!inv) return [];
          const invNo = inv.invoiceNumber || `INV-${inv.id.slice(-8).toUpperCase()}`;
          return [{ id: inv.id, label: `${invNo} (${safeFmt(inv.date, 'dd/MM/yyyy')})` }];
        }
        return invoices
          .filter(inv => inv.customerId === recipientId)
          .map(inv => {
            const invNo = inv.invoiceNumber || `INV-${inv.id.slice(-8).toUpperCase()}`;
            return { id: inv.id, label: `${invNo} (${safeFmt(inv.date, 'dd/MM/yyyy')})` };
          });
      }
      case 'finance': {
          let relTransactions: any[] = [];
          if (recipientFilter === 'customer' || recipientFilter === 'all') {
              const customer = customers.find(c => c.id === recipientId);
              relTransactions = transactions.filter(t => 
                  t.customerId === recipientId || 
                  (customer && t.customerName === customer.name)
              );
          } else if (recipientFilter === 'account') {
              relTransactions = transactions.filter(t => (t.accountsTo?.includes(recipientId) || t.accountsFrom?.includes(recipientId)));
          } else if (recipientFilter === 'owner') {
              relTransactions = transactions.filter(t => t.vehicleOwner?.name === recipientId);
          }
          
          return relTransactions
             .sort((a,b) => {
                 const dA = safeToDate(a.date) || new Date();
                 const dB = safeToDate(b.date) || new Date();
                 return dB.getTime() - dA.getTime();
             })
             .slice(0, 50) 
             .map(t => {
                 const typeLabel = t.type === 'income' ? 'Income' : 'Expense';
                 const amt = t.amount.toFixed(2);
                 const date = safeFmt(t.date, 'dd/MM/yyyy');
                 return { id: t.id, label: `${typeLabel} £${amt} • ${date} • ${t.category}` };
             });
      }
      case 'claim': {
        return claims.filter(c => 
            c.customerId === recipientId || 
            c.clientId === recipientId || 
            c.client?.id === recipientId || 
            c.clientInfo?.customerId === recipientId || 
            c.fileHandlers?.legalHandler?.id === recipientId || 
            c.fileHandlers?.aieHandler === recipientId
          ).map(c => {
            const ref = c.claimId || c.id.slice(-8).toUpperCase();
            const reg = c.clientVehicle?.registration || c.vehicle?.registration || 'N/A';
            return { id: c.id, label: `${ref} • ${reg} • ${safeFmt(c.dateOfEvent)}` };
          });
      }
      default:
        return [];
    }
  }, [selectedRecipients, emailType, recipientFilter, rentals, vehicles, maintenanceLogs, invoices, transactions, claims, customers, accounts]);

  useEffect(() => {
    if (emailType !== 'claim' || !selectedRecordId) return;
    if (claimDocById[selectedRecordId]) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', selectedRecordId));
        if (snap.exists()) {
          setClaimDocById(prev => ({ ...prev, [selectedRecordId]: { id: snap.id, ...snap.data() } }));
        }
      } catch (e) { console.error(e); }
    })();
  }, [emailType, selectedRecordId, claimDocById]);

  const templateReady = useMemo(() => {
    if (!currentTemplate) return false;
    const needs: string[] = currentTemplate.requiredFields || [];
    if (selectedRecipients.length !== 1) return false;
    if (emailType === 'claim' && needs.includes('claim') && !selectedRecordId) return false;
    if (emailType === 'maintenance' && needs.includes('maintenance') && !selectedMaintenanceId) return false;
    if (emailType === 'rental' && needs.includes('rental') && !selectedRecordId) return false;
    if (emailType === 'finance' && needs.includes('transaction') && !selectedRecordId) return false;
    return true;
  }, [currentTemplate, emailType, selectedRecipients, selectedMaintenanceId, selectedRecordId]);

  const addTemplateAliases = (ctx: Record<string, string>) => {
    const alias: Record<string, string> = {};
    const reg = ctx['Vehicle Registration Number'] || ctx['Client Registration'] || ctx['TP Registration'] || ctx['Vehicle Reg'];
    if (reg) {
      alias['Insert Reg No.'] = reg;
      alias['Vehicle Reg'] = reg;
      alias['Registration Number'] = reg;
    }
    const dt = ctx['Date & Time'];
    if (dt) alias['Insert Date & Time'] = dt;

    const rn = ctx["Recipient's Name"] || ctx['Recipient Name'];
    if (rn) {
      alias['Recipient Name'] = rn;
      alias["Recipient's Name"] = rn;
      if (!ctx['Customer Name']) {
        alias['Customer Name'] = rn;
      }
    }

    const cn = ctx['Customer Name'] || ctx["Driver's Name"] || ctx['Client Name'];
    if (cn) {
      alias['Customer Name'] = cn;
      alias["Driver's Name"] = cn;
      alias['Driver Name'] = cn;
      alias['Client Name'] = cn;
    }

    if (ctx['Agreement Ref']) alias['Ref'] = ctx['Agreement Ref'];
    if (ctx['Ref']) alias['Agreement Ref'] = ctx['Ref'];
    if (ctx['Date']) alias['DD/MM/YYYY'] = ctx['Date'];
    if (ctx['New Balance']) ctx['Total Amount'] = ctx['New Balance'];
    if (ctx['Claim Reference']) {
      alias['Insert Claim Reference'] = ctx['Claim Reference'];
      alias['Claim Ref'] = ctx['Claim Reference'];
      alias['Claim Number'] = ctx['Claim Reference'];
    }
    if (ctx['Description']) {
      alias['Brief description of the incident'] = ctx['Description'];
    }
    if (ctx['Invoice Number']) {
      alias['Insert Invoice Number'] = ctx['Invoice Number'];
      alias['Invoice No.'] = ctx['Invoice Number'];
      alias['Invoice No'] = ctx['Invoice Number'];
    }
    if (ctx['Due Date']) alias['Insert Due Date'] = ctx['Due Date'];
    if (ctx['Amount']) alias['Insert Amount'] = ctx['Amount'];
    if (ctx['Invoice Date']) {
      alias['Insert Invoice Date'] = ctx['Invoice Date'];
      alias['DD/MM/YYYY'] = alias['DD/MM/YYYY'] || ctx['Invoice Date'];
    }
    if (ctx['Location']) alias['Insert Location'] = ctx['Location'];
    if (ctx['Date']) alias['Insert Date'] = ctx['Date'];
    if (ctx['Purchased Date']) alias['Purchase Date'] = ctx['Purchased Date'];
    if (ctx['Insurance Expiry']) alias['Insurance Expiry Date'] = ctx['Insurance Expiry'];
    if (ctx['Last Maintenance']) alias['Last Maintenance Date'] = ctx['Last Maintenance'];
    if (ctx['Next Maintenance']) alias['Next Maintenance Date'] = ctx['Next Maintenance'];
    if (ctx['Part(s) Required']) alias['Parts Required'] = ctx['Part(s) Required'];

    return { ...ctx, ...alias };
  };

  function applyWhatsAppTemplateFixups(templateId: string, tplType: EmailType, body: string) {
    let out = body;
    if (tplType === 'claim') {
      out = out.replace(/Claim Type:\s*\[Vehicle Damage\][\s\S]*?\[Other\]/i, 'Claim Type: [Claim Type]');
    }
    const isMaintenanceBooking =
      tplType === 'maintenance' &&
      /nsl_booking_request|vehicle_service_request|mot_failure_repair_request|maintenance_repair_request|mot_booking_request/i.test(templateId);

    if (isMaintenanceBooking) {
      out = out.replace(/(^|\n)\s*🔹?\s*Location:\s*.*$/im, '\n🔹 Location: [Location]');
      out = out.replace(/(^|\n)\s*🔹?\s*Additional Notes:\s*.*$/im, '\n🔹 Additional Notes: [Additional Notes]');
      out = out.replace(/Preferred Date\s*&\s*Time/gi, 'Preferred Date');
    }
    return out;
  }

  function normalizeWhatsAppSignature(body: string): string {
    let result = body;
    result = result.replace(/\n?🌐\s*www\.aieskyline\.co\.uk/gi, '');
    result = result.replace(/\n?🌐\s*www\.aieclaims\.co\.uk/gi, '');
    result = result.replace(/\n?www\.aieskyline\.co\.uk/gi, '');
    result = result.replace(/\n?www\.aieclaims\.co\.uk/gi, '');
    return result.trim();
  }

  const getRecipientPhoneEmailAndName = useCallback((rid: string): { phone?: string; email?: string; name: string } => {
    if (recipientMap.has(rid)) {
      return recipientMap.get(rid)!;
    }

    if (emailType === 'finance' && recipientFilter === 'owner') {
      const cust = customers.find(c => c.name === rid);
      if (cust) {
        const phone = (cust as any)?.whatsapp || (cust as any)?.phone || (cust as any)?.mobile;
        return { name: rid, phone, email: cust.email };
      }
      return { name: rid, phone: '', email: '' }; 
    }

    if (rid?.startsWith('invoice:')) {
      const invId = rid.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      const name = inv ? getInvoiceManualName(inv) : '';
      const phone = inv ? getInvoiceManualPhone(inv) : '';
      return { phone, email: '', name: name || 'Invoice Contact' };
    }

    return { name: 'Unknown' };
  }, [recipientMap, emailType, recipientFilter, customers, invoices]);

  // Isolate Template Auto-Fill Logic to Prevent Infinite Rendering Loops
  const selectionCacheKey = `${selectedTemplateId}-${selectedRecipients.join(',')}-${selectedRecordId}-${selectedVehicleId}-${selectedMaintenanceId}`;

  useEffect(() => {
    if (!currentTemplate || !selectedTemplateId || !templateReady) return;
    if (isUserEdited.current) return; 

    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    ctx['DD/MM/YYYY'] = format(new Date(), 'dd/MM/yyyy');
    ctx["Today's Date"] = format(new Date(), 'dd/MM/yyyy');
    ctx['the current date'] = format(new Date(), 'dd/MM/yyyy');
    ctx['current Date'] = format(new Date(), 'dd/MM/yyyy');

    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      if (sc) {
        ctx["Recipient's Name"] = sc.name;
        ctx['Recipient Name'] = sc.name;
      } else {
        const cust = customers.find(c => c.id === rid);
        if (cust) {
            ctx["Recipient's Name"] = cust.name;
            ctx['Recipient Name'] = cust.name;
            ctx['Driver Name'] = cust.name;
            ctx['Customer Name'] = cust.name;
        }
      }
    } else if (rid?.startsWith('invoice:')) {
      const invId = rid.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      const manualName = inv ? getInvoiceManualName(inv) : '';
      if (manualName) {
        ctx["Recipient's Name"] = manualName;
        ctx['Recipient Name'] = manualName;
        ctx['Customer Name'] = manualName;
      }
    } else if (emailType === 'finance') {
        if (recipientFilter === 'account') {
            const acc = accounts.find(a => a.id === rid);
            ctx["Recipient's Name"] = acc?.name || 'Account Holder';
            ctx['Driver Name'] = acc?.name || 'Account Holder';
            ctx['selected account name'] = acc?.name || 'Account Holder';
        } else if (recipientFilter === 'owner') {
             ctx["Recipient's Name"] = rid; 
             ctx['Driver Name'] = rid;
             ctx['Owner Name'] = rid;
             ctx['selected account name'] = rid;
        } else {
            const cust = customers.find(c => c.id === rid);
            if (cust) {
                ctx["Driver's Name"] = cust.name;
                ctx['Customer Name'] = cust.name;
                ctx['Driver Name'] = cust.name;
                ctx["Recipient's Name"] = cust.name;
                ctx['selected account name'] = cust.name;
            }
        }
    } else {
      const cust = customers.find(c => c.id === rid);
      if (cust) {
        ctx["Driver's Name"] = cust.name;
        ctx['Customer Name'] = cust.name;
        ctx["Recipient's Name"] = cust.name;
        ctx['Recipient Name'] = cust.name;
      }
    }

    if (emailType === 'claim') {
      const lh = legalHandlers.find(h => h.id === rid);
      if (lh) {
        ctx["Recipient's Name"] = lh.name;
        ctx['Recipient Name'] = lh.name;
        if (!ctx['Customer Name']) ctx['Customer Name'] = lh.name;
      }
    }

    if (selectedVehicleId) {
      const v = vehicles.find(vx => vx.id === selectedVehicleId);
      if (v) {
        ctx['Vehicle Registration Number'] = v.registrationNumber || '';
        ctx['Vehicle Reg'] = v.registrationNumber || '';
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;
        ctx['Mileage'] = String(v.mileage || 'N/A');
        ctx['Purchased Date'] = safeFmt(v.purchasedDate) || 'N/A';
        ctx['Insurance Expiry'] = safeFmt(v.insuranceExpiry) || 'N/A';
        ctx['MOT Expiry'] = safeFmt(v.motExpiry) || 'N/A';
        ctx['Tax Expiry'] = safeFmt(v.roadTaxExpiry) || 'N/A';
        ctx['Last Maintenance'] = safeFmt(v.lastMaintenance) || 'N/A';
        ctx['Next Maintenance'] = safeFmt(v.nextMaintenance) || 'N/A';
      }
    }

    if (emailType === 'finance') {
        let balance = 0;
        if (recipientFilter === 'customer' || recipientFilter === 'all') {
            const custTxns = transactions.filter(t => t.customerId === rid);
            const inc = custTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const exp = custTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            balance = inc - exp;
        } else if (recipientFilter === 'account') {
             const accTxns = transactions.filter(t => (t.accountsTo?.includes(rid) || t.accountsFrom?.includes(rid)));
             const inc = accTxns.filter(t => t.type === 'income' && t.accountsTo?.includes(rid)).reduce((s,t) => s + t.amount, 0);
             const exp = accTxns.filter(t => t.type === 'expense' && t.accountsFrom?.includes(rid)).reduce((s,t) => s + t.amount, 0);
             balance = inc - exp;
        } else if (recipientFilter === 'owner') {
             const ownTxns = transactions.filter(t => t.vehicleOwner?.name === rid);
             const inc = ownTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
             const exp = ownTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
             balance = inc - exp;
        }
        
        ctx['New Balance'] = balance.toFixed(2);
        ctx['Total Amount'] = balance.toFixed(2);
        ctx['Amount Owed'] = Math.abs(balance).toFixed(2);
        ctx['New Total Balance'] = balance.toFixed(2);
        ctx['Due Date'] = format(addDays(new Date(), 1), 'dd/MM/yyyy');
        ctx['Date'] = format(addDays(new Date(), 1), 'dd/MM/yyyy'); 

        if (selectedRecordId) {
            const txn = transactions.find(t => t.id === selectedRecordId);
            if (txn) {
                ctx['Amount Paid'] = txn.amount.toFixed(2);
                ctx['Amount'] = txn.amount.toFixed(2);
                ctx['Date Received'] = safeFmt(txn.date, 'dd/MM/yyyy');
                ctx['Date'] = safeFmt(txn.date, 'dd/MM/yyyy');
                ctx['Reason'] = txn.category;
                
                if (txn.vehicleId) {
                    const v = vehicles.find(vh => vh.id === txn.vehicleId);
                    if (v) ctx['Vehicle Reg'] = v.registrationNumber;
                } else if (txn.vehicleName) {
                     const match = txn.vehicleName.match(/\((.*?)\)/);
                     ctx['Vehicle Reg'] = match ? match[1] : txn.vehicleName;
                } else {
                    ctx['Vehicle Reg'] = 'No Vehicle Assigned';
                }

                if (txn.customerName) ctx['Driver Name'] = txn.customerName;
            }
        }
    }

    if (emailType === 'maintenance' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(x => x.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(vx => vx.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Vehicle Reg'] = v.registrationNumber;
          ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
          if (v.year) ctx['Year'] = `${v.year}`;
        }
        ctx['Service Type'] = (m as any).type || 'Vehicle Service';
        ctx['Date & Time'] = `${safeFmt(m.date, 'dd/MM/yyyy HH:mm')}`;
        ctx['Date'] = `${safeFmt(m.date, 'dd/MM/yyyy')}`;
        ctx['the maintenance date'] = `${safeFmt(m.date, 'dd/MM/yyyy')}`;
        ctx['Time'] = `${safeFmt(m.date, 'HH:mm')}`;
        ctx['Location'] = (m as any).location || '';
        ctx['Garage Name'] = (m as any).serviceProvider || (m as any).location || '';
        ctx['Additional Notes'] = (m as any).description || '';
        ctx['Maintenance Type'] = (m as any).type || '';

        ctx['Mileage'] = String((m as any).currentMileage || (m as any).mileage || 'N/A');
        ctx['NextMileage'] = String((m as any).nextServiceMileage || 'N/A');
        ctx['Insert Mileage'] = ctx['Mileage'];

        let driverName = (m as any).customerName || (m as any).driverName || v?.owner?.name;
        
        if (!driverName && v) {
          const activeRental = rentals.find((r: any) => r.vehicleId === v.id && r.status === 'active');
          if (activeRental && activeRental.customerId) {
            const matchedCust = customers.find(c => c.id === activeRental.customerId);
            if (matchedCust) driverName = matchedCust.name || (matchedCust as any).fullName;
          }
        }
        
        if (!driverName) {
          const possibleCustId = (m as any).customerId || v?.customerId || (v as any)?.ownerId;
          if (possibleCustId) {
            const matchedCust = customers.find(c => c.id === possibleCustId);
            if (matchedCust) driverName = matchedCust.name || (matchedCust as any).fullName;
          }
        }

        if (driverName) {
          ctx['Driver Name'] = driverName;
          ctx['Customer Name'] = driverName;
          ctx["Driver's Name"] = driverName;
        }

        const parts = ((m as any).parts || []).filter(Boolean);
        if (parts.length) {
          const partsList = parts
            .map((p: any) => `${p.name}${p.quantity && p.quantity !== 1 ? ` (x${p.quantity})` : ''}`)
            .join(', ');
          ctx['Part(s) Required'] = partsList;
          const multiQty = parts.some((p: any) => (p.quantity || 1) > 1);
          ctx['Quantity'] = multiQty ? 'See list above' : '1 each';
        }

        if (currentTemplate.id === 'invoiceRequest') {
          ctx['Repair Date'] = `${safeFmt(m.date, 'dd/MM/yyyy')}`;
        }
      }
    }

    if (emailType === 'rental' && selectedRecordId) {
      const r = rentals.find(x => x.id === selectedRecordId);
      if (r) {
        const v = vehicles.find(vx => vx.id === r.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber || '';
          ctx['Vehicle Reg'] = v.registrationNumber || '';
          ctx['Main Reg the rental main vehicle registration number'] = v.registrationNumber || '';
        }

        const start = safeToDate((r as any).startDate) || new Date();
        const end = safeToDate((r as any).endDate) || new Date();

        ctx['Start Date']  = `${safeFmt(start, 'dd/MM/yyyy HH:mm')}`;
        ctx['End Date']    = `${safeFmt(end, 'dd/MM/yyyy HH:mm')}`;
        ctx['Date']        = `${safeFmt(end, 'dd/MM/yyyy')}`; 
        
        ctx['Rental Type'] = (r as any).type || '';
        ctx['rental type (daily weekly or claim)'] = String((r as any).type || '').toUpperCase();

        const vehicleRate = r.type === 'daily' ? (v?.dailyRentalPrice ?? 0) : r.type === 'weekly' ? (v?.weeklyRentalPrice ?? 0) : (v?.claimRentalPrice ?? 0);
        const fallback = RENTAL_RATES[r.type as keyof typeof RENTAL_RATES] ?? 0;
        const effectiveRate = r.negotiatedRate ?? vehicleRate ?? fallback;
        ctx['vehicle rate (if daily weekly or claim)'] = effectiveRate.toFixed(2);

        const subs = r.hireSubstitutionDetails || [];
        const activeSub = subs.find((s: any) => !s.returnCondition) || subs[subs.length - 1];
        if (activeSub) {
           ctx['Sub Reg'] = activeSub.registration || '';
           ctx['Date the date from of the substitute vehicle start date'] = safeFmt(activeSub.givenAt);
           ctx['Time the time from of the substitute vehicle start time'] = safeFmt(activeSub.givenAt, 'HH:mm');
        }

        const totalWithAllVAT = calculateRentalCost(
          start, end, (r as any).type, v, (r as any).reason, (r as any).negotiatedRate ?? undefined,
          (r as any).storageCost || 0, (r as any).recoveryCost || 0, 
          (r as any).deliveryCharge || 0, (r as any).collectionCharge || 0,
          (r as any).insurancePerDay || 0, (r as any).insurancePerWeek || 0,
          (r as any).includeVAT, false, false,
          (r as any).insurancePerDayIncludeVAT, (r as any).insurancePerWeekIncludeVAT, (r as any).includeRecoveryCostVAT
        );

        const discountedTotal = totalWithAllVAT - ((r as any).discountAmount ?? 0);
        const now = new Date();
        
        const ongoingCharges = (r as any).status === 'active' && isAfter(now, end) ? calculateOverdueCost(r as any, now, v) : 0;
        const subCharges = ((r as any).hireSubstitutionDetails || []).reduce((acc: number, sub: any) => acc + (sub.returnCondition?.totalCharges || 0), 0);
        const returnCharges = ((r as any).returnCondition?.totalCharges ?? 0) + subCharges;

        const totalAmountDue = discountedTotal + ongoingCharges + returnCharges;
        const paid = (r as any).paidAmount || 0;
        const remaining = totalAmountDue - paid;

        let subtotalNum = totalAmountDue;
        let vatNum = 0;

        if ((r as any).includeVAT || (r as any).type === 'claim') {
          subtotalNum = totalAmountDue / 1.2;
          vatNum = totalAmountDue - subtotalNum;
        }

        const totalStr = totalAmountDue.toFixed(2);
        const subtotalStr = subtotalNum.toFixed(2);
        const vatStr = vatNum.toFixed(2);
        const paidStr = paid.toFixed(2);
        const remStr = Math.max(0, remaining).toFixed(2);

        ctx['Subtotal']            = subtotalStr;
        ctx['VAT']                 = vatStr;
        ctx['Total Amount']        = totalStr;
        ctx['Amount Paid']         = paidStr;
        ctx['Outstanding Balance'] = remStr;
        ctx['Outstanding Amount']  = remStr;
        ctx['owing Balance']       = remStr;
        ctx['owing balance']       = remStr;
        ctx['Balance']             = remStr;
        ctx['Balance (like the rental owing balance)'] = remStr;

        if (currentTemplate.id === 'rental_payment_received') {
          let latestPaymentAmount = paidStr;
          const payments = (r as any).payments || [];
          if (payments.length > 0) {
            const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            latestPaymentAmount = Number(sortedPayments[0].amount).toFixed(2);
          }
          ctx['Amount'] = latestPaymentAmount;
        }

        if (!ctx["Driver's Name"]) {
          const rc = customers.find(c => c.id === (r as any).customerId);
          if (rc) {
            ctx["Driver's Name"] = rc.name;
            ctx['Customer Name'] = rc.name;
          }
        }
      }
    }

    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        const invNo = inv.invoiceNumber || `INV-${inv.id.slice(-8).toUpperCase()}`;
        ctx['Invoice Number'] = invNo;
        ctx['Invoice Date'] = `${safeFmt((inv as any).date, 'dd/MM/yyyy')}`;
        
        const totalAmount = Number((inv as any).remainingAmount ?? (inv as any).total ?? 0).toFixed(2);
        ctx['Amount'] = totalAmount;
        ctx['Total Amount'] = totalAmount;
        ctx['Outstanding Balance'] = Number((inv as any).remainingAmount ?? 0).toFixed(2);
        ctx['Paid Balance'] = Number((inv as any).paidAmount ?? 0).toFixed(2);
        
        ctx['Due Date'] = `${safeFmt((inv as any).dueDate, 'dd/MM/yyyy')}`;
        ctx['Invoice No.'] = invNo;

        if (!ctx['Customer Name']) {
          const fromInv = getInvoiceManualName(inv);
          if (fromInv) ctx['Customer Name'] = String(fromInv);
        }
        if (!ctx['Customer Name'] && inv.customerId) {
          const rc = customers.find(c => c.id === inv.customerId);
          if (rc?.name) ctx['Customer Name'] = rc.name;
        }
      }
    }

    if (emailType === 'claim' && selectedRecordId) {
      const c: any = claimDocById[selectedRecordId] || claims.find(x => x.id === selectedRecordId);
      if (c) {
        const ref   = (c.claimId || (c.id || '').slice(-8).toUpperCase());
        const date  = c.dateOfEvent ?? c.incidentDetails?.date ?? null;
        const time  = c.incidentTime ?? c.incidentDetails?.time ?? '';
        const loc   = c.locationOfEvent ?? c.incidentDetails?.location ?? '';
        const descr = c.accidentDetails?.cause ?? c.incidentDetails?.description ?? c.statusDescription ?? c.notes ?? '';
        const clientName = c.clientInfo?.name || c.submitter?.fullName || c.driver?.fullName || 'N/A';
        const clientReg  = c.clientVehicle?.registration || c.vehicle?.registration || 'N/A';
        const tp = c.thirdParty || c.faultParty || c.thirdPartyDetails || {};
        const tpReg = tp.vehicleRegistration || tp.registration || tp.vehicleReg || '';

        ctx['Claim Reference'] = ref;
        ctx['Claim Number'] = ref;
        ctx['Client Name'] = clientName;
        ctx['Customer Name'] = ctx['Customer Name'] || clientName;
        ctx['Client Registration'] = clientReg;
        ctx['Vehicle Registration Number'] = clientReg;
        ctx['Vehicle Reg'] = clientReg;
        ctx['TP Registration'] = tpReg || 'N/A';
        if (date) ctx['Date'] = `${safeFmt(date, 'dd/MM/yyyy')}`;
        ctx['Time'] = time || 'N/A';
        ctx['Location'] = loc || 'N/A';
        ctx['Description'] = descr || 'N/A';
        ctx['Garage Name'] = (c as any).repairDetails?.garageName || (c as any).thirdPartyDetails?.repairer || 'Approved Repairer';

        const reasonCodes: string[] = Array.isArray(c.claimReason) ? c.claimReason : [];
        const codeMap: Record<string, string> = { 'VD': 'Vehicle Damage', 'H':  'Credit Hire', 'S':  'Storage', 'PI': 'PI' };
        let claimTypeLabel = reasonCodes.length > 0 ? reasonCodes.map(code => codeMap[code] || 'Other').join(' + ') : (String(c.claimType) || 'Other');
        ctx['Claim Type'] = claimTypeLabel;
      }
    }

    const regToFind = ctx['Vehicle Registration Number'] || ctx['Vehicle Reg'] || ctx['Client Registration'] || ctx['Main Reg the rental main vehicle registration number'];
    if (regToFind) {
      const v = vehicles.find(vx => (vx.registrationNumber || '').toLowerCase() === regToFind.toLowerCase());
      if (v) {
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;
        ctx['Mileage'] = String(v.mileage || 'N/A');
        ctx['Purchased Date'] = safeFmt(v.purchasedDate) || 'N/A';
        ctx['Insurance Expiry'] = safeFmt(v.insuranceExpiry) || 'N/A';
        ctx['MOT Expiry'] = safeFmt(v.motExpiry) || 'N/A';
        ctx['Tax Expiry'] = safeFmt(v.roadTaxExpiry) || 'N/A';
        ctx['Last Maintenance'] = safeFmt(v.lastMaintenance) || 'N/A';
        ctx['Next Maintenance'] = safeFmt(v.nextMaintenance) || 'N/A';
      }
    }
    
    const withAliases = addTemplateAliases(ctx);
    const subjectT = currentTemplate.subjectTemplate;
    const bodyT = applyWhatsAppTemplateFixups(currentTemplate.id, emailType, currentTemplate.bodyTemplate);

    setSubject(fillPlaceholders(subjectT, withAliases));
    setMessage(fillPlaceholders(bodyT, withAliases));
  }, [selectionCacheKey, currentTemplate, templateReady, emailType, claimDocById]);

  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (!selectedRecipients.length) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;

    try {
      const uploadedCustomDocs: { name: string; url: string }[] = [];
      if (customFiles.length > 0) {
        toast.loading('Uploading attachments...');
        for (const file of customFiles) {
          const fileRef = ref(storage, `whatsapp_attachments/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploadedCustomDocs.push({ name: file.name, url });
        }
        toast.dismiss();
      }

      const allAttachments = [...selectedSystemDocs, ...uploadedCustomDocs];

      let rawText = buildWhatsAppMessage({
        type: `AIE Skyline ${emailType.charAt(0).toUpperCase() + emailType.slice(1)}`, 
        subject: subject?.trim(),
        body: (message || '').trim(),
      });

      let text = normalizeWhatsAppSignature(rawText);

      if (allAttachments.length > 0) {
        text += '\n\n📎 *Attachments:*';
        allAttachments.forEach(att => {
          text += `\n📄 ${att.name}: ${att.url}`;
        });
      }

      for (const rid of selectedRecipients) {
        const { phone, name } = getRecipientPhoneEmailAndName(rid);
        if (!phone) { toast.error(`Missing/invalid phone for ${name || 'recipient'}`); continue; }
        try {
          sendWhatsAppMessage({ phone, message: text });
          sent++;
        } catch (e: any) {
          console.error(e);
          toast.error(`Couldn’t open WhatsApp for ${name || phone}`);
        }
      }

      if (sent) {
        toast.success(`Opened ${sent} WhatsApp ${sent !== 1 ? 'chats' : 'chat'}`);
        await logWhatsappHistory({
          sentBy: user?.uid || 'unknown',
          type: emailType,
          templateId: selectedTemplateId,
          recipients: selectedRecipients,
          subject,
          body: text,
          timestamp: new Date()
        });
        
        setCustomFiles([]);
        setSelectedSystemDocs([]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.dismiss();
      toast.error('Failed to prepare attachments or send message.');
    } finally {
      setLoading(false);
    }
  };

  const [historyTypeFilter, setHistoryTypeFilter] = useState<EmailType | 'all'>('all');
  const [historyTemplateFilter, setHistoryTemplateFilter] = useState<string>('');
  const [historyRecipientFilter, setHistoryRecipientFilter] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (historyTypeFilter !== 'all' && h.type !== historyTypeFilter) return false;
      if (historyTemplateFilter && h.templateId !== historyTemplateFilter) return false;
      if (historyRecipientFilter) {
        const names = h.recipients
          .map(rid => getRecipientPhoneEmailAndName(rid)?.name)
          .filter(Boolean)
          .join(', ');
        if (!names || !names.toLowerCase().includes(historyRecipientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [history, historyTypeFilter, historyTemplateFilter, historyRecipientFilter, getRecipientPhoneEmailAndName]);

  useEffect(() => {
    isUserEdited.current = false;
  }, [
    emailType,
    selectedTemplateId,
    selectedRecipients,
    selectedRecordId,
    selectedVehicleId,
    selectedMaintenanceId
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Messaging</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {availableTabs.map(t => (
          <button
            key={t}
            onClick={() => {
              setEmailType(t);
              setSelectedTemplateId('');
              setSelectedRecipients([]);
              setSelectedRecordId('');
              setSelectedVehicleId('');
              setSelectedMaintenanceId('');
              setSubject('');
              setMessage('');
              if (t === 'finance') setRecipientFilter('customer');
              else setRecipientFilter('all');
            }}
            className={`px-4 py-2 rounded ${emailType === t ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        <select
          className="border col-span-2 md:col-span-2 p-2 rounded focus:ring-2 focus:ring-green-400"
          value={selectedTemplateId}
          onChange={e => setSelectedTemplateId(e.target.value)}
        >
          <option value="">– Select Message… (manual) –</option>
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-2 border border-green-100">
        
        {(emailType === 'maintenance' || emailType === 'claim' || emailType === 'finance') && (
            <div className="flex gap-2 mb-2 flex-wrap">
                {emailType !== 'finance' && (
                <button
                    onClick={() => setRecipientFilter('all')}
                    className={`px-3 py-1 rounded text-sm ${recipientFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    All
                </button>
                )}
                
                {(emailType === 'maintenance' || emailType === 'claim' || emailType === 'finance') && (
                <button
                    onClick={() => setRecipientFilter('customer')}
                    className={`px-3 py-1 rounded text-sm ${recipientFilter === 'customer' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'}`}
                >
                    Customers
                </button>
                )}

                {emailType === 'finance' && (
                  <>
                    <button
                        onClick={() => setRecipientFilter('account')}
                        className={`px-3 py-1 rounded text-sm ${recipientFilter === 'account' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}
                    >
                        Accounts
                    </button>
                    <button
                        onClick={() => setRecipientFilter('owner')}
                        className={`px-3 py-1 rounded text-sm ${recipientFilter === 'owner' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                        Owners
                    </button>
                  </>
                )}

                {emailType === 'maintenance' && (
                    <button
                        onClick={() => setRecipientFilter('serviceCenter')}
                        className={`px-3 py-1 rounded text-sm ${recipientFilter === 'serviceCenter' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'}`}
                    >
                        Service Centers
                    </button>
                )}
                {emailType === 'claim' && (
                    <button
                        onClick={() => setRecipientFilter('legalHandler')}
                        className={`px-3 py-1 rounded text-sm ${recipientFilter === 'legalHandler' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
                    >
                        Legal Handlers
                    </button>
                )}
            </div>
        )}

        <div className="relative">
          <Search className="absolute left-2 top-2 text-green-400" />
          <input
            className="pl-8 pr-4 py-2 border rounded w-full focus:ring-2 focus:ring-green-400"
            placeholder="Search recipients by name or phone..."
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRecipients.map((r: any) => {
            const id = r.id;
            const name = r.name || r.fullName;
            const email = r.email;
            const phone = r.phone || r.mobile || r.whatsapp;
            const selected = selectedRecipients.includes(id);
            const isCustomer = r.type === 'customer';
            const isHandler  = r.type === 'legalHandler';
            const isServiceCenter = r.type === 'serviceCenter';
            const isManualInv = r.type === 'invoiceManual';
            const isAccount = r.type === 'account';
            const isOwner = r.type === 'owner';

            return (
              <div key={id} className={`p-3 rounded border ${selected ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {isCustomer && <User size={14} className="text-blue-500" />}
                      {isHandler  && <Briefcase size={14} className="text-purple-500" />}
                      {isServiceCenter && <Wrench size={14} className="text-orange-500" />}
                      {isAccount && <Wallet size={14} className="text-indigo-500" />}
                      {isOwner && <Briefcase size={14} className="text-emerald-500" />}
                      {name}
                    </div>
                    <div className="text-sm text-gray-600">{email || (isManualInv ? r._label : '')}</div>
                    <div className="text-sm text-gray-600">{phone}</div>
                  </div>
                  <button
                    onClick={() => {
                      const isCurrentlySelected = selectedRecipients.includes(id);
                      const newSelection = isCurrentlySelected ? [] : [id]; 

                      if (newSelection.length === 0) {
                        setSelectedRecordId('');
                        setSelectedMaintenanceId('');
                        setSelectedVehicleId('');
                      }

                      if (newSelection.length === 1 && emailType === 'custom') {
                        const activeRental = rentals.find((r: any) => r.customerId === id && r.status === 'active');
                        if (activeRental) {
                          setSelectedVehicleId(activeRental.vehicleId);
                        } else {
                          const assignedVehicle = vehicles.find(v => v.customerId === id || (v as any).ownerId === id);
                          if (assignedVehicle) {
                            setSelectedVehicleId(assignedVehicle.id);
                          }
                        }
                      }

                      setSelectedRecipients(newSelection);
                    }}
                    className="p-1 bg-green-100 rounded text-green-700"
                    title={selected ? "Deselect recipient" : "Select recipient"}
                  >
                    <MessageSquareText className="h-4 w-4" />
                  </button>
                </div>

                {selected && selectedRecipients.length === 1 && (
                  <div className="mt-3">
                    {emailType === 'custom' && (
                      <SearchableSelect
                        label="Select Vehicle"
                        options={relatedRecordsOptions}
                        value={selectedVehicleId}
                        onChange={setSelectedVehicleId}
                      />
                    )}
                    {emailType === 'rental' && (
                      <SearchableSelect
                        label="Select Rental"
                        options={relatedRecordsOptions}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'maintenance' && (
                      <SearchableSelect
                        label="Select Maintenance"
                        options={relatedRecordsOptions}
                        value={selectedMaintenanceId}
                        onChange={setSelectedMaintenanceId}
                      />
                    )}
                    {emailType === 'invoice' && (
                      <SearchableSelect
                        label="Select Invoice"
                        options={relatedRecordsOptions}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'claim' && (
                      <SearchableSelect
                        label="Select Claim"
                        options={relatedRecordsOptions}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'finance' && (
                      <SearchableSelect
                        label="Select Transaction"
                        options={relatedRecordsOptions}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow space-y-4 border border-green-100">
        <div>
          <label className="font-medium text-green-700">Subject</label>
          <input
            className="mt-1 w-full border rounded p-2 focus:ring-2 focus:ring-green-400"
            value={subject}
            onChange={e => {
              setSubject(e.target.value); 
              isUserEdited.current = true;
            }}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>
        <div>
          <label className="font-medium text-green-700">Message</label>
          <textarea
            className="mt-1 w-full border rounded p-2 h-[600px] focus:ring-2 focus:ring-green-400"
            value={message}
            onChange={e => {
              setMessage(e.target.value);
              isUserEdited.current = true;
            }}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4" /> Attachments
          </h3>

          {/* On-The-Fly Generate Document Buttons */}
          {selectedRecordId && (emailType === 'finance' || emailType === 'invoice') && (
            <div className="mb-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Generate Documents
              </span>
              <div className="flex flex-wrap gap-2">
                {emailType === 'finance' && (
                  <>
                    {!transactions.find(t => t.id === selectedRecordId)?.documentUrl && (
                      <button type="button" onClick={() => handleGenerateMissingDocument('finance')} disabled={isGeneratingDoc} className="px-3 py-1.5 rounded-full text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors">
                        {isGeneratingDoc ? 'Generating...' : '+ Generate Finance Document'}
                      </button>
                    )}
                    {!transactions.find(t => t.id === selectedRecordId)?.receiptUrl && (
                      <button type="button" onClick={() => handleGenerateMissingDocument('receipt')} disabled={isGeneratingDoc} className="px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                        {isGeneratingDoc ? 'Generating...' : '+ Generate Receipt'}
                      </button>
                    )}
                  </>
                )}
                {emailType === 'invoice' && !invoices.find(i => i.id === selectedRecordId)?.documentUrl && (
                  <button type="button" onClick={() => handleGenerateMissingDocument('invoice')} disabled={isGeneratingDoc} className="px-3 py-1.5 rounded-full text-sm font-medium border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors">
                    {isGeneratingDoc ? 'Generating...' : '+ Generate Invoice PDF'}
                  </button>
                )}
                {emailType === 'finance' && transactions.find(t => t.id === selectedRecordId)?.documentUrl && transactions.find(t => t.id === selectedRecordId)?.receiptUrl && (
                  <span className="text-xs text-gray-400 italic py-1.5">All standard documents generated.</span>
                )}
                {emailType === 'invoice' && invoices.find(i => i.id === selectedRecordId)?.documentUrl && (
                  <span className="text-xs text-gray-400 italic py-1.5">Invoice PDF already generated.</span>
                )}
              </div>
            </div>
          )}
          
          {availableSystemDocs.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                {emailType === 'rental' ? 'Rental Documents' : emailType === 'finance' ? 'Finance Documents' : emailType === 'invoice' ? 'Invoice Documents' : 'System Documents'}
              </span>
              <div className="flex flex-wrap gap-2">
                {availableSystemDocs.map((doc, idx) => {
                  const isSelected = selectedSystemDocs.some(d => d.url === doc.url);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleSystemDoc(doc)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-green-100 border-green-500 text-green-800' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {doc.name}
                      {isSelected && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Upload Files</span>
            <input 
              type="file" 
              multiple 
              onChange={(e) => {
                if (e.target.files) {
                  setCustomFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {customFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {customFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white border px-3 py-1.5 rounded">
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button onClick={() => setCustomFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleSend}
            disabled={loading || !can('whatsapp', 'send')}
          >
            {loading ? 'Opening…' : 'Open in WhatsApp'}
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded border text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </button>
        </div>
      </div>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="WhatsApp Preview" size="lg">
        {selectedRecipients.length !== 1 ? (
          <div className="text-sm text-gray-600">
            Select exactly <strong>one</strong> recipient to preview.
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const allAttachments = [...selectedSystemDocs, ...customFiles.map(f => ({ name: f.name, url: '[Link generated upon sending]' }))];
              
              let rawPreviewText = buildWhatsAppMessage({
                type: `AIE Skyline ${emailType.charAt(0).toUpperCase() + emailType.slice(1)}`,
                subject: subject?.trim(),
                body: (message || '').trim(),
              });
              let composedPreviewText = normalizeWhatsAppSignature(rawPreviewText);

              if (allAttachments.length > 0) {
                composedPreviewText += '\n\n📎 *Attachments:*';
                allAttachments.forEach(att => {
                  composedPreviewText += `\n📄 ${att.name}: ${att.url}`;
                });
              }

              return (
                <>
                  <div className="text-xs text-gray-500">
                    {composedPreviewText.length.toLocaleString()} chars · {composedPreviewText.split('\n').length} lines
                  </div>
                  <div className="inline-block rounded-2xl px-3 py-2 bg-gray-50 border text-[0.95rem] leading-6 whitespace-pre-wrap">
                    <div
                      className="[&>strong]:font-semibold [&>em]:italic [&>del]:line-through"
                      dangerouslySetInnerHTML={{ __html: waMdToHtml(composedPreviewText) }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button className="px-4 py-2 rounded border hover:bg-gray-50" onClick={() => setPreviewOpen(false)}>
                      Close
                    </button>
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                      onClick={() => { setPreviewOpen(false); handleSend(); }}
                      disabled={!can('whatsapp', 'send')}
                    >
                      Open in WhatsApp
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <div className="bg-white p-4 rounded shadow border border-green-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-green-700">WhatsApp History</h2>
          <div className="flex space-x-2">
            <select
              className="border p-1 rounded focus:ring-green-500 focus:border-green-500"
              value={historyTypeFilter}
              onChange={e => setHistoryTypeFilter(e.target.value as any)}
            >
              <option value="all">All Types</option>
              {availableTabs.map(t => (<option key={t} value={t}>{t}</option>))}
            </select>
            <select
              className="border p-1 rounded"
              value={historyTemplateFilter}
              onChange={e => setHistoryTemplateFilter(e.target.value)}
            >
              <option value="">All Templates</option>
              {Array.from(new Set(history.map(h => h.templateId))).map(id => (<option key={id} value={id}>{id}</option>))}
            </select>
            <input
              className="border p-1 rounded"
              placeholder="Recipient…"
              value={historyRecipientFilter}
              onChange={e => setHistoryRecipientFilter(e.target.value)}
            />
          </div>

          {can('whatsapp', 'clearHistory') && (
            <button
              onClick={async () => {
                if (!window.confirm('Delete ALL WhatsApp history entries forever?')) return;
                const batch = writeBatch(db);
                history.forEach(h => batch.delete(doc(db, 'whatsappHistory', h.id)));
                await batch.commit();
                toast.success('WhatsApp history cleared');
              }}
              className="flex items-center space-x-1 text-red-600 hover:underline"
            >
              <Trash2 size={16} /> <span>Clear History</span>
            </button>
          )}
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-2 text-sm font-medium text-gray-500">Date</th>
              <th className="border px-2 py-2 text-sm font-medium text-gray-500">Type</th>
              <th className="border px-2 py-2 text-sm font-medium text-gray-500">Template</th>
              <th className="border px-2 py-2 text-sm font-medium text-gray-500">Recipients</th>
              <th className="border px-2 py-2 text-sm font-medium text-gray-500">Subject Log</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map(h => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1 text-sm">{safeFmt(h.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                <td className="border px-2 py-1 text-sm capitalize">{h.type}</td>
                <td className="border px-2 py-1 text-sm">{h.templateId}</td>
                <td className="border px-2 py-1 text-sm font-medium">
                  {h.recipients.map(rid => getRecipientPhoneEmailAndName(rid)?.name).filter(Boolean).join(', ')}
                </td>
                <td className="border px-2 py-1 text-sm text-gray-600 truncate max-w-xs">{h.subject}</td>
              </tr>
            ))}
            {filteredHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="border px-2 py-4 text-center text-sm text-gray-500">No WhatsApp history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}