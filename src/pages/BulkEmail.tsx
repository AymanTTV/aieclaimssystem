// src/pages/BulkEmail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { Search, Mail, Trash2, User, Briefcase, Wrench, Wallet, Paperclip, X } from 'lucide-react'; 
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  doc,
  orderBy,
  updateDoc,
  limit as fbLimit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useServiceCenters } from '../hooks/useServiceCenters';
import { useInvoices } from '../hooks/useInvoices';
import { useClaims } from '../hooks/useClaims';
import { useFinances } from '../hooks/useFinances'; 
import { fetchLegalHandlers } from '../utils/legalHandlers';

import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { fillPlaceholders } from '../utils/templateUtils';
import { sendEmail } from '../utils/emailService';
import { useEmailHistory, logEmailHistory } from '../hooks/useEmailHistory';

import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';
import { Account } from '../types';
import { calculateRentalCost, calculateOverdueCost, RENTAL_RATES } from '../utils/rentalCalculations';
import { isAfter } from 'date-fns';
import { Permission } from '../types/roles';

// PDF Document Generation Imports
import { generateAndUploadDocument, getCompanyDetails } from '../utils/documentGenerator';
import { FinanceDocument, InvoiceDocument, MaintenanceDocument } from '../components/pdf/documents';
import ReceiptDocument from '../components/pdf/documents/ReceiptDocument';
import MaintenanceInvoice from '../components/pdf/MaintenanceInvoice';

// ---------------- DEBUG TOGGLE ----------------
const DEBUG = true;
// ---------------- DEBUG HELPERS ----------------
const dlog = (...args: any[]) => DEBUG && console.log(...args);
const dgroup = (label: string) => DEBUG && console.group(label);
const dgroupEnd = () => DEBUG && console.groupEnd();

// ────────────────────────────────────────────────────────────────────────────
// Normalizers / Matching helpers
// ────────────────────────────────────────────────────────────────────────────
const norm = (s?: string) => (s || '').toLowerCase().trim();
const normEmail = (s?: string) => norm(s);
const normPhone = (s?: string) => (s || '').replace(/\D/g, '');
const splitMulti = (v?: any): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') return v.split(/[,\s;]+/).filter(Boolean);
  return [];
};

function anyPhoneMatch(customerPhone?: string, ...candidates: any[]) {
  const cp = normPhone(customerPhone);
  if (!cp) return false;
  const flat = candidates.flatMap(splitMulti).map(normPhone).filter(Boolean);
  const ok = flat.some(p => p.endsWith(cp) || cp.endsWith(p));
  DEBUG && dlog('[phoneMatch]', { customerPhone, cp, flat, ok });
  return ok;
}

function anyEmailMatch(customerEmail?: string, ...candidates: any[]) {
  const ce = normEmail(customerEmail);
  if (!ce) return false;
  const flat = candidates.flatMap(splitMulti).map(normEmail);
  const ok = flat.includes(ce);
  DEBUG && dlog('[emailMatch]', { customerEmail, ce, flat, ok });
  return ok;
}

function nameLooseEqual(a?: string, b?: string) {
  const A = norm(a), B = norm(b);
  const ok = !!A && !!B && (A === B || A.includes(B) || B.includes(A));
  DEBUG && dlog('[nameMatch]', { a, b, A, B, ok });
  return ok;
}

// Date safety (prevents "Invalid time value" crashes)
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

// ────────────────────────────────────────────────────────────────────────────
// Claims helpers
// ────────────────────────────────────────────────────────────────────────────
function logClaimSummary(tag: string, claim: any) {
  if (!DEBUG) return;
  const summary = {
    id: claim?.id,
    customerId: claim?.customerId,
    clientId: claim?.clientId,
    'client.id': claim?.client?.id,
    'clientInfo.customerId': claim?.clientInfo?.customerId,
    emails: [
      claim?.clientInfo?.email,
      claim?.submitter?.email,
      claim?.driver?.email,
      ...(splitMulti(claim?.contact?.emails)),
      ...(splitMulti(claim?.contactDetails?.emails)),
    ].filter(Boolean),
    phones: [
      claim?.clientInfo?.phone,
      claim?.submitter?.contactNumber,
      claim?.driver?.contactNumber,
      ...(splitMulti(claim?.contact?.phones)),
      ...(splitMulti(claim?.contactDetails?.phones)),
    ].filter(Boolean),
    names: [
      claim?.clientInfo?.name,
      claim?.submitter?.fullName,
      claim?.driver?.fullName,
    ].filter(Boolean),
  };
  dlog(tag, summary);
}

function claimMatchesCustomer(claim: any, customer: any): boolean {
  dgroup(`[CLAIM MATCH] claim:${claim?.id} ⇄ customer:${customer?.id}`);
  logClaimSummary('  claim fields:', claim);

  const custPhone =
    (customer as any)?.mobile ||
    (customer as any)?.phone ||
    (customer as any)?.whatsapp ||
    (customer as any)?.tel;

  const custEmail = (customer as any)?.email;
  const custName  = (customer as any)?.name;
  const custId    = customer?.id;

  dlog('  customer fields:', {
    id: custId,
    name: custName,
    email: custEmail,
    phone: custPhone,
    normPhone: normPhone(custPhone),
    normEmail: normEmail(custEmail),
  });

  const idHit =
    claim?.customerId === custId ||
    claim?.clientId === custId ||
    claim?.client?.id === custId ||
    claim?.clientInfo?.customerId === custId ||
    claim?.clientVehicle?.ownerId === custId;
  dlog('  id link?', idHit);
  if (idHit) { dgroupEnd(); return true; }

  const emailHit = anyEmailMatch(
    custEmail,
    claim?.clientInfo?.email,
    claim?.submitter?.email,
    claim?.driver?.email,
    claim?.contact?.emails,
    claim?.contactDetails?.emails
  );
  if (emailHit) { dgroupEnd(); return true; }

  const phoneHit = anyPhoneMatch(
    custPhone,
    claim?.clientInfo?.phone,
    claim?.submitter?.contactNumber,
    claim?.driver?.contactNumber,
    claim?.contact?.phones,
    claim?.contactDetails?.phones
  );
  if (phoneHit) { dgroupEnd(); return true; }

  const nameHit =
    nameLooseEqual(custName, claim?.clientInfo?.name) ||
    nameLooseEqual(custName, claim?.submitter?.fullName) ||
    nameLooseEqual(custName, claim?.driver?.fullName);

  dlog('  name loose?', nameHit);
  dgroupEnd();
  return !!nameHit;
}

const toClaimOption = (c: any): { id: string; label: string } => {
  const ref = (c.claimId?.toUpperCase?.() || (c.id || '').slice(-8).toUpperCase());
  const clientReg = c.clientVehicle?.registration || c.vehicle?.registration || '';
  const clientName = c.clientInfo?.name || c.submitter?.fullName || c.driver?.fullName || '';
  const date = safeFmt(c.dateOfEvent ?? c.incidentDetails?.date);
  return { id: c.id, label: [ref, clientReg, clientName, date].filter(Boolean).join(' • ') };
};

const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
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

// Display name helper for attachments
const getCleanAttachmentName = (filename: string) => {
  const lower = filename.toLowerCase();
  if (lower.includes('agreement')) return 'Rental Agreement';
  if (lower.includes('invoice')) return 'Invoice';
  if (lower.includes('permit')) return 'Parking Permit';
  if (lower.includes('receipt')) return 'Receipt';
  if (lower.includes('finance')) return 'Finance Document';
  if (lower.includes('work_order') || lower.includes('work-order')) return 'Work Order';
  return filename.replace(/^[0-9]+_/, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
};

type RecipientFilterType = 'all' | 'customer' | 'serviceCenter' | 'legalHandler' | 'invoiceManual' | 'account' | 'owner';

// Mappings for target permissions
const TARGET_PERMISSIONS: Record<string, keyof Permission> = {
  custom: 'targetCustom',
  rental: 'targetRental',
  maintenance: 'targetMaintenance',
  invoice: 'targetInvoice',
  finance: 'targetFinance',
  claim: 'targetClaim',
};

export default function BulkEmail() {
  const { user } = useAuth();
  const { can, isManager } = usePermissions();

  // ─── PERMISSION CHECK ───────────────────────────────────────────
  if (!can('bulkEmail', 'view')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // ─── DETERMINE AVAILABLE TABS ───────────────────────────────────
  const availableTabs = useMemo(() => {
    return (Object.keys(emailTemplates) as EmailType[]).filter(type => {
       const permKey = TARGET_PERMISSIONS[type];
       return permKey ? can('bulkEmail', permKey) : false;
    });
  }, [can]);

  // ─── STATE ──────────────────────────────────────────────────────
  const [emailType, setEmailType]                   = useState<EmailType>(availableTabs[0] || 'custom');
  const [recipientFilter, setRecipientFilter]       = useState<RecipientFilterType>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [searchQuery, setSearchQuery]               = useState<string>('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [selectedVehicleId, setSelectedVehicleId]         = useState<string>('');
  const [selectedRecordId, setSelectedRecordId]           = useState<string>('');
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string>('');

  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const isUserEdited = React.useRef<boolean>(false);

  // ─── Attachments State ──────────────────────────────────────────
  const [selectedSystemDocs, setSelectedSystemDocs] = useState<{name: string, url: string}[]>([]);
  const [customFiles, setCustomFiles] = useState<File[]>([]);

  // Database Templates state
  const [dbTemplates, setDbTemplates] = useState<Record<string, any[]>>({});

  // Fetch live templates from Firestore
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
        console.error('Failed to load live templates, falling back to defaults', e);
      }
    };
    fetchLiveTemplates();
  }, []);

  // ─── DATA HOOKS ─────────────────────────────────────────────────
  const { customers }             = useCustomers();
  const { vehicles }              = useVehicles();
  const { rentals }               = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { serviceCenters }        = useServiceCenters();
  const { invoices }              = useInvoices();
  const { claims }                = useClaims();
  const { history }               = useEmailHistory();
  const { transactions }          = useFinances(); 

  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name'));
    getDocs(q).then(snap => {
        const accs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Account));
        setAccounts(accs);
    }).catch(console.error);
  }, []);

  // ─── LEGAL HANDLERS & CLAIMS CACHE ──────────────────────────────
  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);
  const [claimDocById, setClaimDocById] = useState<Record<string, any>>({});

  // Uses live database templates if available, otherwise falls back to the static file
  const templates = dbTemplates[emailType]?.length > 0 
    ? dbTemplates[emailType] 
    : (emailTemplates[emailType] || []);
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // Clear attachments when context changes
  useEffect(() => {
    setSelectedSystemDocs([]);
    setCustomFiles([]);
  }, [selectedRecordId, emailType]);

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
    } else if (emailType === 'maintenance') {
      const m = maintenanceLogs.find(x => x.id === selectedRecordId);
      if (m) {
        if ((m as any).documentUrl) docs.push({ name: 'Work_Order.pdf', url: (m as any).documentUrl });
        if ((m as any).invoiceUrl) docs.push({ name: 'Maintenance_Invoice.pdf', url: (m as any).invoiceUrl });
      }
    }

    return docs;
  }, [emailType, selectedRecordId, rentals, transactions, invoices, maintenanceLogs]);

  const toggleSystemDoc = (doc: {name: string, url: string}) => {
    setSelectedSystemDocs(prev => 
      prev.some(d => d.url === doc.url) 
        ? prev.filter(d => d.url !== doc.url)
        : [...prev, doc]
    );
  };

  const handleGenerateMissingDocument = async (docType: 'finance' | 'receipt' | 'invoice' | 'maintenance' | 'maintenance_invoice') => {
    if (!selectedRecordId) return;
    setIsGeneratingDoc(true);
    const toastId = toast.loading(`Generating ${docType.replace('_', ' ')} document...`);
    
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

      } else if (docType === 'maintenance') {
        const m = maintenanceLogs.find(x => x.id === selectedRecordId);
        if (!m) throw new Error('Maintenance log not found');
        const vehicle = vehicles.find(v => v.id === m.vehicleId);
        
        const url = await generateAndUploadDocument(
          MaintenanceDocument,
          { ...m, vehicle, parts: m.parts || [] }, 
          'maintenance',
          m.id,
          'maintenanceLogs',
          companyDetails,
          'documentUrl'
        );
        await updateDoc(doc(db, 'maintenanceLogs', m.id), { documentUrl: url });
        toast.success('Work Order generated!', { id: toastId });

      } else if (docType === 'maintenance_invoice') {
        const m = maintenanceLogs.find(x => x.id === selectedRecordId);
        if (!m) throw new Error('Maintenance log not found');
        const vehicle = vehicles.find(v => v.id === m.vehicleId);
        
        const url = await generateAndUploadDocument(
          MaintenanceInvoice,
          { ...m, vehicle, parts: m.parts || [] }, 
          'maintenance',
          m.id,
          'maintenanceLogs',
          companyDetails,
          'invoiceUrl'
        );
        await updateDoc(doc(db, 'maintenanceLogs', m.id), { invoiceUrl: url });
        toast.success('Maintenance Invoice generated!', { id: toastId });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Generation failed: ${e.message}`, { id: toastId });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers()
        .then(setLegalHandlers)
        .catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (!isManager && !q) {
      return [];
    }

    let allRecipients: any[] = [];

    if (emailType === 'maintenance') {
      const sc = serviceCenters.map(r => ({ ...r, type: 'serviceCenter' as const }));
      const cust = customers.map(r => ({ ...r, type: 'customer' as const }));
      
      if (recipientFilter === 'serviceCenter') allRecipients = sc;
      else if (recipientFilter === 'customer') allRecipients = cust;
      else allRecipients = [...sc, ...cust];
    }
    else if (emailType === 'claim') {
      const cust = customers.map(r => ({ ...r, type: 'customer' as const }));
      const hand = legalHandlers.map(r => ({ ...r, type: 'legalHandler' as const }));

      if (recipientFilter === 'customer') allRecipients = cust;
      else if (recipientFilter === 'legalHandler') allRecipients = hand;
      else allRecipients = [...cust, ...hand];
    }
    else if (emailType === 'invoice') {
        const cust = customers.map(r => ({ ...r, type: 'customer' as const }));
        const manual = invoices.map(inv => {
            const hasSavedCustomer = !!inv.customerId;
            const manualName = getInvoiceManualName(inv);
            const manualPhone = getInvoiceManualPhone(inv);
            if (hasSavedCustomer || !manualName || !manualPhone) return null;
            const id = `invoice:${inv.id}`; 
            const label = [`INV-${String(inv.id || '').slice(-8).toUpperCase()}`, manualName, manualPhone].filter(Boolean).join(' • ');
            return { id, name: manualName, email: '', phone: manualPhone, type: 'invoiceManual' as const, _label: label };
        }).filter(Boolean as any);

        allRecipients = [...cust, ...manual];
    }
    else if (emailType === 'finance') {
        if (recipientFilter === 'account') {
            allRecipients = accounts.map(a => ({ ...a, type: 'account' as const, _label: 'Account' }));
        } else if (recipientFilter === 'owner') {
            const ownerSet = new Set<string>();
            vehicles.forEach(v => { if (v.owner?.name) ownerSet.add(v.owner.name); });
            transactions.forEach(t => { if (t.vehicleOwner?.name) ownerSet.add(t.vehicleOwner.name); });
            allRecipients = Array.from(ownerSet).sort().map(name => ({
                 id: name, name: name, type: 'owner' as const, _label: 'Vehicle Owner' 
            }));
        } else {
            allRecipients = customers.map(r => ({ ...r, type: 'customer' as const }));
        }
    }
    else {
        allRecipients = customers.map(r => ({ ...r, type: 'customer' as const }));
    }

    return allRecipients.filter(r => {
        const name = (r.name || r.fullName || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const phone = ((r as any).phone || (r as any).mobile || (r as any).whatsapp || '').toLowerCase();
        const label = (r._label || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || label.includes(q);
    });

  }, [emailType, searchQuery, recipientFilter, customers, serviceCenters, legalHandlers, invoices, isManager, accounts, vehicles, transactions]);

  function getRelatedRecords(recipientId: string) {
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
          // Sort active rentals and owned vehicles to the top of the dropdown
          if (a.id === activeVehicleId) return -1;
          if (b.id === activeVehicleId) return 1;
          if (a.label.includes('(Owned')) return -1;
          if (b.label.includes('(Owned')) return 1;
          return a.label.localeCompare(b.label);
        });
      }

      case 'rental':
        return rentals
          .filter(r => r.customerId === recipientId)
          .map(r => {
            const v = vehicles.find(vx => vx.id === r.vehicleId);
            return { id: r.id, label: `${v?.registrationNumber || 'N/A'} (${safeFmt((r as any).startDate, 'dd/MM/yyyy')})` };
          });

      case 'maintenance':
        return maintenanceLogs.map(m => {
          const v = vehicles.find(vx => vx.id === m.vehicleId);
          return { id: m.id, label: `${v?.registrationNumber || 'N/A'} • ${m.type} • ${safeFmt((m as any).date, 'dd/MM/yyyy')}` };
        });

      case 'invoice':
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

      case 'finance': {
          let relTransactions = [];
          if (recipientFilter === 'customer') {
              relTransactions = transactions.filter(t => t.customerId === recipientId);
          } else if (recipientFilter === 'account') {
              relTransactions = transactions.filter(t => (t.accountsTo?.includes(recipientId) || t.accountsFrom?.includes(recipientId)));
          } else if (recipientFilter === 'owner') {
              relTransactions = transactions.filter(t => t.vehicleOwner?.name === recipientId);
          }
          
          return relTransactions
             .sort((a,b) => (b.date > a.date ? 1 : -1))
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
  }

  useEffect(() => {
    if (emailType !== 'claim' || !selectedRecordId || claimDocById[selectedRecordId]) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', selectedRecordId));
        if (snap.exists()) setClaimDocById(prev => ({ ...prev, [selectedRecordId]: { id: snap.id, ...snap.data() } }));
      } catch (e) { console.error(e); }
    })();
  }, [emailType, selectedRecordId, claimDocById]);

  const templateReady = useMemo(() => {
    if (!currentTemplate) return false;
    const needs = currentTemplate.requiredFields || [];

    if (needs.length > 0) {
      if (selectedRecipients.length !== 1) return false;
      if (needs.includes('claim') && !selectedRecordId) return false;
      if (needs.includes('maintenance') && !selectedMaintenanceId) return false;
      if (needs.includes('rental') && !selectedRecordId) return false;
      if (needs.includes('invoice') && !selectedRecordId) return false;
      if (needs.includes('vehicle') && !selectedVehicleId) return false;
      if (needs.includes('transaction') && !selectedRecordId) return false;
      return true;
    } else {
      return selectedRecipients.length > 0;
    }
  }, [currentTemplate, selectedRecipients, selectedRecordId, selectedMaintenanceId, selectedVehicleId]);

  const addTemplateAliases = (ctx: Record<string, string>) => {
    const alias: Record<string, string> = {};
    const reg = ctx['Vehicle Registration Number'] || ctx['Client Registration'] || ctx['TP Registration'] || ctx['Vehicle Reg'];
    if (reg) {
      alias['Insert Reg No.'] = reg;
      alias['Vehicle Reg'] = reg;
      alias['Registration Number'] = reg;
    }
    const recipientName = ctx["Recipient's Name"] || ctx['Recipient Name'];
    if (recipientName) { alias["Recipient's Name"] = recipientName; alias['Recipient Name'] = recipientName; }
    const customerName = ctx['Customer Name'] || ctx["Driver's Name"] || ctx['Client Name'];
    if (customerName) {
      alias['Customer Name'] = customerName;
      alias["Driver's Name"] = customerName;
      alias['Driver Name']   = customerName;
      alias['Client Name'] = customerName;
    }
    if (ctx['Date']) alias['DD/MM/YYYY'] = ctx['Date'];
    if (ctx['Date & Time']) alias['Insert Date & Time'] = ctx['Date & Time'];
    if (ctx['Location']) alias['Insert Location'] = ctx['Location'];
    if (ctx['Description']) alias['Brief description of the incident'] = ctx['Description'];
    if (ctx['Claim Reference']) { alias['Insert Claim Reference'] = ctx['Claim Reference']; alias['Claim Ref'] = ctx['Claim Reference']; alias['Claim Number'] = ctx['Claim Reference'];}
    if (ctx['Invoice Number']) {
      alias['Insert Invoice Number'] = ctx['Invoice Number'];
      alias['Invoice No.'] = ctx['Invoice Number'];
      alias['Invoice No']  = ctx['Invoice Number'];
    }
    if (ctx['Invoice Date']) {
      alias['Insert Invoice Date'] = ctx['Invoice Date'];
      alias['DD/MM/YYYY'] = alias['DD/MM/YYYY'] || ctx['Invoice Date'];
    }
    if (ctx['Due Date']) alias['Insert Due Date'] = ctx['Due Date'];
    if (ctx['Part(s) Required']) alias['Parts Required'] = ctx['Part(s) Required'];
    
    if (ctx['New Balance']) ctx['Total Amount'] = ctx['New Balance'];

    // Vehicle Date & Maintenance Aliases
    if (ctx['Purchased Date']) alias['Purchase Date'] = ctx['Purchased Date'];
    if (ctx['Insurance Expiry']) alias['Insurance Expiry Date'] = ctx['Insurance Expiry'];
    if (ctx['Last Maintenance']) alias['Last Maintenance Date'] = ctx['Last Maintenance'];
    if (ctx['Next Maintenance']) alias['Next Maintenance Date'] = ctx['Next Maintenance'];

    return { ...ctx, ...alias };
  };

  const normalizeClaimBody = (body: string) =>
    body.replace(/Claim Type:\s*\[Vehicle Damage\][\s\S]*?\[Other\]/i, 'Claim Type: [Claim Type]');

  useEffect(() => {
    isUserEdited.current = false;
  }, [emailType, selectedTemplateId, selectedRecipients, selectedRecordId, selectedVehicleId, selectedMaintenanceId]);

  useEffect(() => {
    if (!currentTemplate || !selectedTemplateId || !templateReady || selectedRecipients.length !== 1) return;
    if (isUserEdited.current) return;

    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    ctx['DD/MM/YYYY'] = safeFmt(new Date(), 'dd/MM/yyyy');
    ctx["Today's Date"] = safeFmt(new Date(), 'dd/MM/yyyy');
    ctx['the current date'] = safeFmt(new Date(), 'dd/MM/yyyy');
    ctx['current Date'] = safeFmt(new Date(), 'dd/MM/yyyy');

    const cust = customers.find(c => c.id === rid);
    if (cust) {
      ctx["Driver's Name"] = cust.name || '';
      ctx['Customer Name'] = cust.name || '';
      ctx["Recipient's Name"] = cust.name || '';
      ctx['Recipient Name'] = cust.name || '';
      ctx['Recipient Email'] = cust.email || '';
    }
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      if (sc) {
        ctx["Recipient's Name"] = sc.name || '';
        ctx['Recipient Name'] = sc.name || '';
      } else if (cust) {
        ctx["Recipient's Name"] = cust.name || '';
        ctx['Recipient Name'] = cust.name || '';
        ctx['Driver Name'] = cust.name || '';
        ctx['Customer Name'] = cust.name || '';
      }
    }
    if (emailType === 'claim') {
      const lh = legalHandlers.find(h => h.id === rid);
      if (lh) {
        ctx["Recipient's Name"] = lh.name || '';
        ctx['Recipient Name'] = lh.name || '';
      } else if (cust) {
        ctx['Customer Name'] = cust.name || '';
        ctx["Recipient's Name"] = cust.name || '';
      }
    }
    
    if (emailType === 'finance') {
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
             if (cust) {
                ctx['Customer Name'] = cust.name;
                ctx['Driver Name'] = cust.name;
                ctx['selected account name'] = cust.name;
             }
        }

        let balance = 0;
        if (recipientFilter === 'customer') {
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
        ctx['Due Date'] = safeFmt(addDays(new Date(), 1), 'dd/MM/yyyy');

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

   if (selectedVehicleId) {
      const v = vehicles.find(vx => vx.id === selectedVehicleId);
      if (v) {
        // Standard Vehicle Details
        ctx['Vehicle Registration Number'] = v.registrationNumber || '';
        ctx['Vehicle Reg'] = v.registrationNumber || '';
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;

        // Extended Vehicle Values & Dates (Strictly typed to Vehicle interface)
        ctx['Mileage'] = String(v.mileage || 'N/A');
        ctx['Purchased Date'] = safeFmt(v.purchasedDate) || 'N/A';
        ctx['Insurance Expiry'] = safeFmt(v.insuranceExpiry) || 'N/A';
        ctx['MOT Expiry'] = safeFmt(v.motExpiry) || 'N/A';
        ctx['Tax Expiry'] = safeFmt(v.roadTaxExpiry) || 'N/A';
        
        // Maintenance Tracking
        ctx['Last Maintenance'] = safeFmt(v.lastMaintenance) || 'N/A';
        ctx['Next Maintenance'] = safeFmt(v.nextMaintenance) || 'N/A';
      }
    }

    if (emailType === 'maintenance' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(x => x.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(vx => vx.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v?.registrationNumber || '';
          ctx['Vehicle Reg'] = v?.registrationNumber || '';
          ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
          if (v.year) ctx['Year'] = `${v.year}`;
        }
        ctx['Service Type']    = (m as any).type || 'Vehicle Service';
        ctx['Date & Time']     = safeFmt((m as any).date, 'dd/MM/yyyy HH:mm');
        ctx['Date']            = safeFmt((m as any).date, 'dd/MM/yyyy');
        ctx['the maintenance date'] = safeFmt((m as any).date, 'dd/MM/yyyy');
        ctx['Time']            = safeFmt((m as any).date, 'HH:mm');
        ctx['Location']        = (m as any).location || '';
        ctx['Garage Name']     = (m as any).serviceProvider || (m as any).location || '';
        ctx['Additional Notes']= (m as any).description || '';
        ctx['Maintenance Type']= (m as any).type || '';

        ctx['Mileage'] = String((m as any).currentMileage || (m as any).mileage || 'N/A');
        ctx['NextMileage'] = String((m as any).nextServiceMileage || 'N/A');
        ctx['Insert Mileage'] = ctx['Mileage'];

        // --- NEW DRIVER LOOKUP FOR SERVICE CENTER MESSAGES ---
        let driverName = (m as any).customerName || (m as any).driverName || v?.owner?.name;
        
        // Try finding the active rental for this vehicle
        if (!driverName && v) {
          const activeRental = rentals.find((r: any) => r.vehicleId === v.id && r.status === 'active');
          if (activeRental && activeRental.customerId) {
            const matchedCust = customers.find(c => c.id === activeRental.customerId);
            if (matchedCust) driverName = matchedCust.name || (matchedCust as any).fullName;
          }
        }
        
        // Try fallback IDs on the maintenance log or vehicle
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
        // -----------------------------------------------------

        const parts = ((m as any).parts || []).filter(Boolean);
        if (parts.length) {
          ctx['Part(s) Required'] = parts
            .map((p: any) => `${p.name}${p.quantity && p.quantity !== 1 ? ` (x${p.quantity})` : ''}`)
            .join(', ');
          ctx['Quantity'] = parts.some((p: any) => (p.quantity || 1) > 1) ? 'See list above' : '1 each';
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
        ctx['Start Date']  = safeFmt((r as any).startDate, 'dd/MM/yyyy HH:mm');
        ctx['End Date']    = safeFmt((r as any).endDate, 'dd/MM/yyyy HH:mm');
        ctx['Date']        = safeFmt((r as any).endDate, 'dd/MM/yyyy');
        ctx['Rental Type'] = (r as any).type || '';
        ctx['rental type (daily weekly or claim)'] = String((r as any).type || '').toUpperCase();

        const vehicleRate = r.type === 'daily' ? (v?.dailyRentalPrice ?? 0) : r.type === 'weekly' ? (v?.weeklyRentalPrice ?? 0) : (v?.claimRentalPrice ?? 0);
        const fallback = RENTAL_RATES[r.type as keyof typeof RENTAL_RATES] ?? 0;
        const effectiveRate = (r as any).negotiatedRate ?? vehicleRate ?? fallback;
        ctx['vehicle rate (if daily weekly or claim)'] = effectiveRate.toFixed(2);

        const subs = r.hireSubstitutionDetails || [];
        const activeSub = subs.find((s: any) => !s.returnCondition) || subs[subs.length - 1];
        if (activeSub) {
           ctx['Sub Reg'] = activeSub.registration || '';
           ctx['Date the date from of the substitute vehicle start date'] = safeFmt(activeSub.givenAt);
           ctx['Time the time from of the substitute vehicle start time'] = safeFmt(activeSub.givenAt, 'HH:mm');
        }

        const start = safeToDate((r as any).startDate) || new Date();
        const end = safeToDate((r as any).endDate) || new Date();

        const totalNum = calculateRentalCost(
          start, end, (r as any).type, v, (r as any).reason, (r as any).negotiatedRate ?? undefined,
          (r as any).storageCost || 0, (r as any).recoveryCost || 0, 
          (r as any).deliveryCharge || 0, (r as any).collectionCharge || 0,
          (r as any).insurancePerDay || 0, (r as any).insurancePerWeek || 0,
          (r as any).includeVAT, false, false,
          (r as any).insurancePerDayIncludeVAT, (r as any).insurancePerWeekIncludeVAT, (r as any).includeRecoveryCostVAT
        );

        const discountedTotal = totalNum - ((r as any).discountAmount ?? 0);
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

        const total = totalAmountDue.toFixed(2);
        const subtotal = subtotalNum.toFixed(2);
        const vat = vatNum.toFixed(2);
        const rem   = Math.max(0, remaining).toFixed(2);

        ctx['Subtotal']            = subtotal;
        ctx['VAT']                 = vat;
        ctx['Total Amount']        = total;
        ctx['Amount Paid']         = paid.toFixed(2);
        ctx['Outstanding Balance'] = rem;
        ctx['Outstanding Amount']  = rem;
        ctx['owing Balance']       = rem;
        ctx['owing balance']       = rem;
        ctx['Balance']             = rem;
        ctx['Balance (like the rental owing balance)'] = rem;

        if (currentTemplate.id === 'rental_payment_received') {
          let latestPaymentAmount = paid.toFixed(2);
          const payments = (r as any).payments || [];
          if (payments.length > 0) {
            const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            latestPaymentAmount = Number(sortedPayments[0].amount).toFixed(2);
          }
          ctx['Amount'] = latestPaymentAmount;
        }
      }
    }

    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        const invNo = inv.invoiceNumber || `INV-${(inv.id || '').slice(-8).toUpperCase()}`;
        ctx['Invoice Number'] = invNo;
        ctx['Invoice Date']   = safeFmt((inv as any).date, 'dd/MM/yyyy');
        ctx['Amount']         = Number((inv as any).remainingAmount ?? (inv as any).total ?? 0).toFixed(2);
        ctx['Paid Balance'] = Number((inv as any).paidAmount ?? 0).toFixed(2);
        ctx['Due Date']       = safeFmt((inv as any).dueDate, 'dd/MM/yyyy');
        ctx['Invoice No.']    = invNo;
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
        const tp         = c.thirdParty || c.faultParty || c.thirdPartyDetails || {};
        const tpReg      = tp.vehicleRegistration || tp.registration || tp.vehicleReg || '';

        ctx['Claim Reference']            = ref;
        ctx['Claim Number']               = ref;
        ctx['Client Name']                = clientName;
        ctx['Customer Name']              = ctx['Customer Name'] || clientName;
        ctx['Client Registration']        = clientReg;
        ctx['Vehicle Registration Number']= clientReg;
        ctx['Vehicle Reg']                = clientReg;
        ctx['TP Registration']            = tpReg || 'N/A';
        if (date) ctx['Date']             = safeFmt(date, 'dd/MM/yyyy');
        ctx['Time']                       = time || 'N/A';
        ctx['Location']                   = loc || 'N/A';
        ctx['Description']                = descr || 'N/A';
        ctx['Garage Name']                = (c as any).repairDetails?.garageName || (c as any).thirdPartyDetails?.repairer || 'Approved Repairer';

        const reasonCodes: string[] = Array.isArray(c.claimReason) ? c.claimReason : [];
        const codeMap: Record<string, string> = { VD: 'Vehicle Damage', H: 'Credit Hire', S: 'Storage', PI: 'PI' };
        ctx['Claim Type'] = reasonCodes.length
          ? reasonCodes.map(code => codeMap[code] || 'Other').join(' + ')
          : (String(c.claimType) || 'Other');
      }
    }
    // --- GLOBAL VEHICLE DATA INJECTION ---
    // If ANY of the previous logic found a vehicle registration, automatically append all extended vehicle dates and details!
    const regToFind = ctx['Vehicle Registration Number'] || ctx['Vehicle Reg'] || ctx['Client Registration'] || ctx['Main Reg the rental main vehicle registration number'];
    
    if (regToFind) {
      // Find the vehicle in the database by matching the registration number
      const v = vehicles.find(vx => (vx.registrationNumber || '').toLowerCase() === regToFind.toLowerCase());
      
      if (v) {
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;
        
        // Extended Dates & Mandatory Fields
        ctx['Mileage'] = String(v.mileage || 'N/A');
        ctx['Purchased Date'] = safeFmt(v.purchasedDate) || 'N/A';
        ctx['Insurance Expiry'] = safeFmt(v.insuranceExpiry) || 'N/A';
        ctx['MOT Expiry'] = safeFmt(v.motExpiry) || 'N/A';
        ctx['Tax Expiry'] = safeFmt(v.roadTaxExpiry) || 'N/A';
        ctx['Last Maintenance'] = safeFmt(v.lastMaintenance) || 'N/A';
        ctx['Next Maintenance'] = safeFmt(v.nextMaintenance) || 'N/A';
      }
    }
    // -------------------------------------
    
    const withAliases = addTemplateAliases(ctx);
    const subjT = currentTemplate.subjectTemplate;
    const bodyT = emailType === 'claim'
      ? normalizeClaimBody(currentTemplate.bodyTemplate)
      : currentTemplate.bodyTemplate;

    setSubject(fillPlaceholders(subjT, withAliases));
    setMessage(fillPlaceholders(bodyT, withAliases));
  }, [
    currentTemplate, selectedTemplateId, templateReady, emailType, selectedRecipients, selectedVehicleId,
    selectedMaintenanceId, selectedRecordId, customers, vehicles, rentals, maintenanceLogs, invoices,
    claims, legalHandlers, claimDocById, transactions, accounts, recipientFilter
  ]);

  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (selectedRecipients.length === 0) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;

    try {
      // 1. Upload custom files to storage first to get URLs
      const uploadedCustomDocs: { filename: string; url: string }[] = [];
      if (customFiles.length > 0) {
        toast.loading('Uploading attachments...');
        for (const file of customFiles) {
          const fileRef = ref(storage, `email_attachments/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploadedCustomDocs.push({ filename: file.name, url });
        }
        toast.dismiss();
      }

      // 2. Format System Docs into the attachment structure your email service expects
      const formattedSystemDocs = selectedSystemDocs.map(doc => ({
        filename: doc.name,
        url: doc.url
      }));

      const allAttachments = [...formattedSystemDocs, ...uploadedCustomDocs];

      const masterSubject = subject;
      let masterMessage = message;

      // Inject beautifully spaced links into the email body as well
      if (allAttachments.length > 0) {
         let attText = '\n\n📎 ATTACHMENTS:\n\n' + allAttachments.map(a => 
            `📄 ${getCleanAttachmentName(a.filename)}\nClick here to view/download:\n${a.url}`
         ).join('\n\n') + '\n\n';

         const sigMarkers = ['Kind regards,', 'Best regards,', 'AIE Skyline Limited', 'AIE Claims Team'];
         let sigIndex = -1;
         for (const marker of sigMarkers) {
           const idx = masterMessage.lastIndexOf(marker);
           if (idx !== -1) {
             sigIndex = idx;
             break;
           }
         }

         if (sigIndex !== -1) {
            masterMessage = masterMessage.substring(0, sigIndex) + attText + masterMessage.substring(sigIndex);
         } else {
            masterMessage += attText;
         }
      }

      for (const rid of selectedRecipients) {
        let to_email = '';
        let to_name = '';

        if (emailType === 'finance') {
            if (recipientFilter === 'account') {
                const acc = accounts.find(a => a.id === rid);
                to_name = acc?.name || 'Account';
            } else if (recipientFilter === 'owner') {
                const cust = customers.find(c => c.name === rid);
                if (cust) { to_email = cust.email || ''; to_name = cust.name; }
                else { to_name = rid; }
            } else {
                const cust = customers.find(c => c.id === rid);
                to_email = cust?.email || '';
                to_name = cust?.name || '';
            }
        } else if (emailType === 'maintenance' && recipientFilter === 'serviceCenter') {
            const sc = serviceCenters.find(c => c.id === rid);
            to_email = sc?.email || '';
            to_name = sc?.name || '';
        } else {
            const cust = customers.find(c => c.id === rid);
            const sc = serviceCenters.find(c => c.id === rid);
            const lh = legalHandlers.find(h => h.id === rid);
            to_email = cust?.email || sc?.email || lh?.email || '';
            to_name = cust?.name || sc?.name || lh?.name || '';
        }

        if (!to_email) {
          toast.error(`Missing email for ${to_name || rid}`);
          continue;
        }

        const context = {
          "Recipient's Name": to_name,
          "Recipient Name": to_name,
          "Customer Name": to_name,
          "Driver's Name": to_name,
          "Driver Name": to_name,
          "Client Name": to_name,
        };

        const finalSubject = fillPlaceholders(masterSubject, addTemplateAliases(context));
        const finalMessage = fillPlaceholders(masterMessage, addTemplateAliases(context));

        try {
          await sendEmail({ 
            to_email, 
            to_name, 
            subject: finalSubject, 
            message: finalMessage,
            attachments: allAttachments.length > 0 ? allAttachments : undefined 
          });
          sent++;
        } catch {
          toast.error(`Failed to send to ${to_name}`);
        }
      }

      if (sent > 0) {
          toast.success(`Sent ${sent} email${sent !== 1 ? 's' : ''}`);
          await logEmailHistory({
            sentBy: user?.uid || 'unknown',
            type: emailType,
            templateId: selectedTemplateId,
            recipients: selectedRecipients,
            subject,
            timestamp: new Date()
          });

          // Reset attachments
          setCustomFiles([]);
          setSelectedSystemDocs([]);
      }
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('Failed to process attachments or send emails.');
    } finally {
      setLoading(false);
    }
  };

  // ─── HISTORY FILTERS ────────────────────────────────────────────
  const [historyTypeFilter, setHistoryTypeFilter] = useState<EmailType|'all'>('all');
  const [historyRecipientFilter, setHistoryRecipientFilter] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (historyTypeFilter!=='all' && h.type!==historyTypeFilter) return false;
      if (historyRecipientFilter) {
        const names = h.recipients
          .map(rid =>
            customers.find(c=>c.id===rid)?.name ||
            serviceCenters.find(c=>c.id===rid)?.name ||
            legalHandlers.find(l=>l.id===rid)?.name
          )
          .filter(Boolean)
          .join(', ')
          .toLowerCase();
        if (!names.includes(historyRecipientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [history, historyTypeFilter, historyRecipientFilter, serviceCenters, legalHandlers, customers]);

  // ─── UI ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Type + Template */}
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
            className={`px-4 py-2 rounded ${emailType === t ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}

        <select
          className="border col-span-2 md:col-span-2 p-2"
          value={selectedTemplateId}
          onChange={e => setSelectedTemplateId(e.target.value)}
        >
          <option value="">– Select Message… (manual) –</option>
          {templates.map(tpl => (<option key={tpl.id} value={tpl.id}>{tpl.name}</option>))}
        </select>
      </div>

      {/* Recipients */}
      <div className="bg-white p-4 rounded shadow space-y-2">
        
        {/* Recipient Filter UI */}
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
                    className={`px-3 py-1 rounded text-sm ${recipientFilter === 'customer' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}
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
          <Search className="absolute left-2 top-2 text-gray-400"/>
          <input
            className="pl-8 pr-4 py-2 border rounded w-full"
            placeholder="Search recipients…"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRecipients.map((r: any) => {
            const id = r.id;
            const name = r.name || r.fullName;
            const email = r.email;
            const selected = selectedRecipients.includes(id);
            const isCustomer = r.type === 'customer';
            const isHandler  = r.type === 'legalHandler';
            const isServiceCenter = r.type === 'serviceCenter';
            const isManualInv = r.type === 'invoiceManual';
            const isAccount = r.type === 'account';
            const isOwner = r.type === 'owner';

            return (
              <div key={id} className={`p-3 rounded border ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
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
                  </div>
                  <button
                    onClick={() => {
                      const isCurrentlySelected = selectedRecipients.includes(id);
                      const newSelection = isCurrentlySelected
                        ? selectedRecipients.filter(rid => rid !== id)
                        : [...selectedRecipients, id];

                      // If selection changes from 1 to not-1, reset related records
                      if (selectedRecipients.length === 1 && newSelection.length !== 1) {
                        setSelectedRecordId('');
                        setSelectedMaintenanceId('');
                        setSelectedVehicleId('');
                      }

                      // --- NEW: AUTO-SELECT DRIVEN VEHICLE FOR CUSTOM MESSAGES ---
                      if (newSelection.length === 1 && emailType === 'custom') {
                        const activeRental = rentals.find((r: any) => r.customerId === id && r.status === 'active');
                        if (activeRental) {
                          setSelectedVehicleId(activeRental.vehicleId);
                        } else {
                          // Fallback: check if they own or are directly assigned to a vehicle
                          const assignedVehicle = vehicles.find(v => v.customerId === id || (v as any).ownerId === id);
                          if (assignedVehicle) {
                            setSelectedVehicleId(assignedVehicle.id);
                          }
                        }
                      }
                      // -----------------------------------------------------------

                      setSelectedRecipients(newSelection);
                    }}
                    className="p-1 bg-gray-100 rounded"
                    title={selected ? "Deselect recipient" : "Select recipient"}
                  >
                    <Mail className="h-4 w-4"/>
                  </button>
                </div>

                {selected && selectedRecipients.length === 1 && (
                  <div className="mt-3">
                    {emailType === 'custom' && (
                      <SearchableSelect
                        label="Select Vehicle"
                        options={getRelatedRecords(id)}
                        value={selectedVehicleId}
                        onChange={setSelectedVehicleId}
                      />
                    )}
                    {emailType === 'rental' && (
                      <SearchableSelect
                        label="Select Rental"
                        options={getRelatedRecords(id)}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'maintenance' && (
                      <SearchableSelect
                        label="Select Maintenance"
                        options={getRelatedRecords(id)}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'invoice' && (
                      <SearchableSelect
                        label="Select Invoice"
                        options={getRelatedRecords(id)}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'claim' && (
                      <SearchableSelect
                        label="Select Claim"
                        options={getRelatedRecords(id)}
                        value={selectedRecordId}
                        onChange={setSelectedRecordId}
                      />
                    )}
                    {emailType === 'finance' && (
                      <SearchableSelect
                        label="Select Transaction"
                        options={getRelatedRecords(id)}
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

      {/* Composer */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div>
          <label className="font-medium">Subject</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={subject}
            onChange={e => {
              setSubject(e.target.value);
              isUserEdited.current = true;
            }}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>
        <div>
          <label className="font-medium">Message</label>
        </div>
        <textarea
          className="mt-1 w-full border rounded p-2 h-[600px]"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            isUserEdited.current = true;
          }}
          placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
        />

        {/* --- ATTACHMENTS SECTION --- */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 my-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4" /> Attachments
          </h3>

          {/* On-The-Fly Generate Document Buttons */}
          {selectedRecordId && (emailType === 'finance' || emailType === 'invoice' || emailType === 'maintenance') && (
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
                {emailType === 'maintenance' && (
                  <>
                    {!maintenanceLogs.find(m => m.id === selectedRecordId)?.documentUrl && (
                      <button type="button" onClick={() => handleGenerateMissingDocument('maintenance')} disabled={isGeneratingDoc} className="px-3 py-1.5 rounded-full text-sm font-medium border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors">
                        {isGeneratingDoc ? 'Generating...' : '+ Generate Work Order'}
                      </button>
                    )}
                    {!maintenanceLogs.find(m => m.id === selectedRecordId)?.invoiceUrl && (
                      <button type="button" onClick={() => handleGenerateMissingDocument('maintenance_invoice')} disabled={isGeneratingDoc} className="px-3 py-1.5 rounded-full text-sm font-medium border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                        {isGeneratingDoc ? 'Generating...' : '+ Generate Maintenance Invoice'}
                      </button>
                    )}
                  </>
                )}

                {emailType === 'finance' && transactions.find(t => t.id === selectedRecordId)?.documentUrl && transactions.find(t => t.id === selectedRecordId)?.receiptUrl && (
                  <span className="text-xs text-gray-400 italic py-1.5">All standard documents generated.</span>
                )}
                {emailType === 'invoice' && invoices.find(i => i.id === selectedRecordId)?.documentUrl && (
                  <span className="text-xs text-gray-400 italic py-1.5">Invoice PDF already generated.</span>
                )}
                {emailType === 'maintenance' && maintenanceLogs.find(m => m.id === selectedRecordId)?.documentUrl && maintenanceLogs.find(m => m.id === selectedRecordId)?.invoiceUrl && (
                  <span className="text-xs text-gray-400 italic py-1.5">All standard documents generated.</span>
                )}
              </div>
            </div>
          )}
          
          {/* System Pre-generated Docs */}
          {availableSystemDocs.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                {emailType === 'rental' ? 'Rental Documents' : emailType === 'finance' ? 'Finance Documents' : emailType === 'invoice' ? 'Invoice Documents' : emailType === 'maintenance' ? 'Maintenance Documents' : 'System Documents'}
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
                          ? 'bg-blue-100 border-blue-500 text-blue-800' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {getCleanAttachmentName(doc.name)}
                      {isSelected && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Upload */}
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
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {customFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {customFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white border px-3 py-1.5 rounded">
                    <span className="truncate max-w-[80%]">{getCleanAttachmentName(file.name)}</span>
                    <button onClick={() => setCustomFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* --- END ATTACHMENTS SECTION --- */}

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={loading || !can('bulkEmail', 'send')}
        >
          {loading ? 'Sending…' : `Send Email (${selectedRecipients.length})`}
        </button>
      </div>

      {/* History */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium">Email History</h2>
          <div className="flex space-x-2">
            <select
              className="border p-1 rounded"
              value={historyTypeFilter}
              onChange={e=>setHistoryTypeFilter(e.target.value as any)}
            >
              <option value="all">All Types</option>
              {availableTabs.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              className="border p-1 rounded"
              placeholder="Recipient…"
              value={historyRecipientFilter}
              onChange={e=>setHistoryRecipientFilter(e.target.value)}
            />
          </div>

          {can('bulkEmail', 'clearHistory') && (
            <button
              onClick={async () => {
                if (!window.confirm('Delete ALL history?')) return;
                const batch = writeBatch(db);
                history.forEach(h => batch.delete(doc(db,'emailHistory',h.id)));
                await batch.commit();
                toast.success('History cleared');
              }}
              className="flex items-center space-x-1 text-red-600 hover:underline"
            >
              <Trash2 size={16}/> <span>Clear History</span>
            </button>
          )}
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Template</th>
              <th className="border px-2 py-1">Recipients</th>
              <th className="border px-2 py-1">Subject</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map(h => (
              <tr key={h.id}>
                <td className="border px-2 py-1">{safeFmt(h.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                <td className="border px-2 py-1">{h.type}</td>
                <td className="border px-2 py-1">{h.templateId}</td>
                <td className="border px-2 py-1">
                  {h.recipients
                    .map(rid =>
                      customers.find(c=>c.id===rid)?.name ||
                      serviceCenters.find(c=>c.id===rid)?.name ||
                      legalHandlers.find(l=>l.id===rid)?.name
                    )
                    .filter(Boolean)
                    .join(', ')
                  }
                </td>
                <td className="border px-2 py-1">{h.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}