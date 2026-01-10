// src/pages/BulkEmail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { Search, Mail, Trash2, User, Briefcase, Wrench, Wallet } from 'lucide-react'; 
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  doc,
  orderBy,
  limit as fbLimit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useServiceCenters } from '../hooks/useServiceCenters';
import { useInvoices } from '../hooks/useInvoices';
import { useClaims } from '../hooks/useClaims';
import { useFinances } from '../hooks/useFinances'; // Added for Finance
import { fetchLegalHandlers } from '../utils/legalHandlers';

import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { fillPlaceholders } from '../utils/templateUtils';
import { sendEmail } from '../utils/emailService';
import { useEmailHistory, logEmailHistory } from '../hooks/useEmailHistory';

import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';
import { Account } from '../types';

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

// ────────────────────────────────────────────────────────────────────────────
// Date safety (prevents "Invalid time value" crashes)
// ────────────────────────────────────────────────────────────────────────────
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

  // 1) Direct ID links (cover schema variations)
  const idHit =
    claim?.customerId === custId ||
    claim?.clientId === custId ||
    claim?.client?.id === custId ||
    claim?.clientInfo?.customerId === custId ||
    claim?.clientVehicle?.ownerId === custId;
  dlog('  id link?', idHit);
  if (idHit) { dgroupEnd(); return true; }

  // 2) Email-based across common places
  const emailHit = anyEmailMatch(
    custEmail,
    claim?.clientInfo?.email,
    claim?.submitter?.email,
    claim?.driver?.email,
    claim?.contact?.emails,
    claim?.contactDetails?.emails
  );
  if (emailHit) { dgroupEnd(); return true; }

  // 3) Phone-based with suffix tolerance (mobile vs phone etc.)
  const phoneHit = anyPhoneMatch(
    custPhone,
    claim?.clientInfo?.phone,
    claim?.submitter?.contactNumber,
    claim?.driver?.contactNumber,
    claim?.contact?.phones,
    claim?.contactDetails?.phones
  );
  if (phoneHit) { dgroupEnd(); return true; }

  // 4) Names as last resort (loose compare)
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

// Normalizes phone numbers to digits only for reliable comparison (used elsewhere too)
const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Helpers to pull manual invoice contact safely
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

export default function BulkEmail() {
  const { user } = useAuth();
  const { can, isManager } = usePermissions();

  // ─── STATE ──────────────────────────────────────────────────────
  const [emailType, setEmailType]                   = useState<EmailType>('custom');
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

  // ─── DATA HOOKS ─────────────────────────────────────────────────
  const { customers }             = useCustomers();
  const { vehicles }              = useVehicles();
  const { rentals }               = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { serviceCenters }        = useServiceCenters();
  const { invoices }              = useInvoices();
  const { claims }                = useClaims();
  const { history }               = useEmailHistory();
  const { transactions }          = useFinances(); // Added for Finance

  // Fetch accounts manually
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
  const [claimOptionsByRecipient, setClaimOptionsByRecipient] =
    useState<Record<string, { id: string; label: string }[]>>({});
  const [claimDocById, setClaimDocById] = useState<Record<string, any>>({});

  const templates       = emailTemplates[emailType] || [];
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // ─── LEGAL HANDLERS LOADING (Claim tab) ─────────────────────────
  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers()
        .then(setLegalHandlers)
        .catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  // ─── ON-DEMAND CLAIM LOADING ────────────────────────────────────
  async function loadClaimsForLegalHandler(handlerId: string) {
    // Simplified fetch for this view:
    const q = query(collection(db, 'claims'), where('legalHandler.id', '==', handlerId), fbLimit(50));
    const snap = await getDocs(q);
    const opts = snap.docs.map(d => toClaimOption({ id: d.id, ...d.data() }));
    setClaimOptionsByRecipient(prev => ({ ...prev, [handlerId]: opts }));
    setClaimDocById(prev => {
        const next = { ...prev };
        snap.docs.forEach(d => { next[d.id] = { id: d.id, ...d.data() }; });
        return next;
    });
  }

  async function loadClaimsForCustomer(customerId: string) {
    // Simplified fetch for this view:
    const q = query(collection(db, 'claims'), where('customerId', '==', customerId), fbLimit(50));
    const snap = await getDocs(q);
    const opts = snap.docs.map(d => toClaimOption({ id: d.id, ...d.data() }));
    setClaimOptionsByRecipient(prev => ({ ...prev, [customerId]: opts }));
    setClaimDocById(prev => {
        const next = { ...prev };
        snap.docs.forEach(d => { next[d.id] = { id: d.id, ...d.data() }; });
        return next;
    });
  }

  // ─── RECIPIENTS FILTER (null-safe) ──────────────────────────────
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // For non-managers, recipients are only shown after a search is initiated.
    if (!isManager && !q) {
      return [];
    }

    let allRecipients: any[] = [];

    // Maintenance recipients can be service centers OR customers
    if (emailType === 'maintenance') {
      const sc = serviceCenters.map(r => ({ ...r, type: 'serviceCenter' as const }));
      const cust = customers.map(r => ({ ...r, type: 'customer' as const }));
      
      if (recipientFilter === 'serviceCenter') allRecipients = sc;
      else if (recipientFilter === 'customer') allRecipients = cust;
      else allRecipients = [...sc, ...cust];
    }
    // Claim tab can target customers or legal handlers
    else if (emailType === 'claim') {
      const cust = customers.map(r => ({ ...r, type: 'customer' as const }));
      const hand = legalHandlers.map(r => ({ ...r, type: 'legalHandler' as const }));

      if (recipientFilter === 'customer') allRecipients = cust;
      else if (recipientFilter === 'legalHandler') allRecipients = hand;
      else allRecipients = [...cust, ...hand];
    }
    // Invoice type includes ad-hoc invoice contacts
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
    // Finance Type
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
            // Default to customers for finance
            allRecipients = customers.map(r => ({ ...r, type: 'customer' as const }));
        }
    }
    // Default (Rental, Custom) = Customers only
    else {
        allRecipients = customers.map(r => ({ ...r, type: 'customer' as const }));
    }

    // Apply Search Filter
    return allRecipients.filter(r => {
        const name = (r.name || r.fullName || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const phone = ((r as any).phone || (r as any).mobile || (r as any).whatsapp || '').toLowerCase();
        const label = (r._label || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || label.includes(q);
    });

  }, [emailType, searchQuery, recipientFilter, customers, serviceCenters, legalHandlers, invoices, isManager, accounts, vehicles, transactions]);

  // ─── TRIGGER ON-DEMAND LOADS WHEN NEEDED ────────────────────────
  useEffect(() => {
    if (emailType !== 'claim') return;
    if (selectedRecipients.length !== 1) return;
    const rid = selectedRecipients[0];

    const isHandler = legalHandlers.some(h => h.id === rid);
    if (isHandler) {
      if (!claimOptionsByRecipient[rid]) loadClaimsForLegalHandler(rid);
      return;
    }

    const isCustomer = customers.some(c => c.id === rid);
    if (isCustomer) {
      if (!claimOptionsByRecipient[rid]) loadClaimsForCustomer(rid);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailType, selectedRecipients, legalHandlers, customers]);

  // ─── RELATED RECORDS PICKER ─────────────────────────────────────
  function getRelatedRecords(recipientId: string) {
    switch (emailType) {
      case 'custom':
        return vehicles.map(v => ({ id: v.id, label: v.registrationNumber }));

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
        return invoices
          .filter(inv => inv.customerId === recipientId)
          .map(inv => ({ id: inv.id, label: `INV-${inv.id.slice(-8).toUpperCase()} (${safeFmt((inv as any).date, 'dd/MM/yyyy')})` }));

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
        const isCustomer = customers.some(c => c.id === recipientId);
        if (isCustomer) {
          return claimOptionsByRecipient[recipientId] || [];
        }
        return claimOptionsByRecipient[recipientId] || [];
      }

      default:
        return [];
    }
  }

  // If a claim is selected but not cached, fetch it (for templating)
  useEffect(() => {
    if (emailType !== 'claim' || !selectedRecordId || claimDocById[selectedRecordId]) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'claims', selectedRecordId));
        if (snap.exists()) setClaimDocById(prev => ({ ...prev, [selectedRecordId]: { id: snap.id, ...snap.data() } }));
      } catch (e) { console.error(e); }
    })();
  }, [emailType, selectedRecordId, claimDocById]);

  // ─── TEMPLATE GATING ────────────────────────────────────────────
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

  // ─── Aliases for template placeholders ──────────────────────────
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
    if (ctx['Claim Reference']) { alias['Insert Claim Reference'] = ctx['Claim Reference']; alias['Claim Ref'] = ctx['Claim Reference']; }
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
    
    // Finance Aliases
    if (ctx['New Balance']) ctx['Total Amount'] = ctx['New Balance'];

    return { ...ctx, ...alias };
  };

  const normalizeClaimBody = (body: string) =>
    body.replace(/Claim Type:\s*\[Vehicle Damage\][\s\S]*?\[Other\]/i, 'Claim Type: [Claim Type]');

  // ─── AUTO-FILL SUBJECT & MESSAGE ────────────────────────────────
  useEffect(() => {
    // Auto-fill only for a single selected recipient to provide a preview
    if (!currentTemplate || !selectedTemplateId || !templateReady || selectedRecipients.length !== 1) return;

    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    // Always have a safe default date placeholder
    ctx['DD/MM/YYYY'] = safeFmt(new Date(), 'dd/MM/yyyy');
    ctx["Today's Date"] = safeFmt(new Date(), 'dd/MM/yyyy');

    // Base recipient (customer / service center / legal handler / account / owner)
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
    
    // FINANCE RECIPIENT & BALANCE FILL
    if (emailType === 'finance') {
        if (recipientFilter === 'account') {
            const acc = accounts.find(a => a.id === rid);
            ctx["Recipient's Name"] = acc?.name || 'Account Holder';
            ctx['Driver Name'] = acc?.name || 'Account Holder';
        } else if (recipientFilter === 'owner') {
             ctx["Recipient's Name"] = rid; 
             ctx['Driver Name'] = rid;
             ctx['Owner Name'] = rid;
        } else {
             if (cust) {
                ctx['Customer Name'] = cust.name;
                ctx['Driver Name'] = cust.name;
             }
        }

        // Calculate Balance
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

        // Fill Transaction Details
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

    // Vehicle (when explicitly chosen by "custom" templates)
    if (selectedVehicleId) {
      const v = vehicles.find(vx => vx.id === selectedVehicleId);
      if (v) {
        ctx['Vehicle Registration Number'] = v.registrationNumber || '';
        ctx['Vehicle Reg'] = v.registrationNumber || '';
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;
      }
    }

    // MAINTENANCE
    if (emailType === 'maintenance' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(x => x.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(vx => vx.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber || '';
          ctx['Vehicle Reg'] = v.registrationNumber || '';
          ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
          if (v.year) ctx['Year'] = `${v.year}`;
        }
        ctx['Service Type']    = (m as any).type || 'Vehicle Service';
        ctx['Date & Time']     = safeFmt((m as any).date, 'dd/MM/yyyy HH:mm');
        ctx['Date']            = safeFmt((m as any).date, 'dd/MM/yyyy');
        ctx['Time']            = safeFmt((m as any).date, 'HH:mm');
        ctx['Location']        = (m as any).location || '';
        ctx['Additional Notes']= (m as any).description || '';

        if ((m as any)?.mileage != null) ctx['Insert Mileage'] = String((m as any).mileage);

        const parts = ((m as any).parts || []).filter(Boolean);
        if (parts.length) {
          ctx['Part(s) Required'] = parts
            .map((p: any) => `${p.name}${p.quantity && p.quantity !== 1 ? ` (x${p.quantity})` : ''}`)
            .join(', ');
          ctx['Quantity'] = parts.some((p: any) => (p.quantity || 1) > 1) ? 'See list above' : '1 each';
        }
      }
    }

    // RENTAL
    if (emailType === 'rental' && selectedRecordId) {
      const r = rentals.find(x => x.id === selectedRecordId);
      if (r) {
        const v = vehicles.find(vx => vx.id === r.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber || '';
          ctx['Vehicle Reg'] = v.registrationNumber || '';
        }
        ctx['Start Date']  = safeFmt((r as any).startDate, 'dd/MM/yyyy HH:mm');
        ctx['End Date']    = safeFmt((r as any).endDate, 'dd/MM/yyyy HH:mm');
        ctx['Rental Type'] = (r as any).type || '';

        const total = Number((r as any).cost ?? 0).toFixed(2);
        const paid  = Number((r as any).paidAmount ?? 0).toFixed(2);
        const rem   = Number((r as any).remainingAmount ?? 0).toFixed(2);

        ctx['Total Amount']        = total;
        ctx['Amount Paid']         = paid;
        ctx['Outstanding Balance'] = rem;
        ctx['Outstanding Amount']  = rem;

        if (currentTemplate.id === 'rental_payment_received') {
          ctx['Amount'] = paid;
        }
      }
    }

    // INVOICE
    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        const invNo = `INV-${(inv.id || '').slice(-8).toUpperCase()}`;
        ctx['Invoice Number'] = invNo;
        ctx['Invoice Date']   = safeFmt((inv as any).date, 'dd/MM/yyyy');
        ctx['Amount']         = Number((inv as any).amount ?? 0).toFixed(2);
        ctx['Due Date']       = safeFmt((inv as any).dueDate, 'dd/MM/yyyy');
        ctx['Invoice No.']    = invNo;
      }
    }

    // CLAIM
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
        ctx['Client Name']                = clientName;
        ctx['Customer Name']              = clientName;
        ctx['Client Registration']        = clientReg;
        ctx['Vehicle Registration Number']= clientReg;
        ctx['Vehicle Reg']                = clientReg;
        ctx['TP Registration']            = tpReg || 'N/A';
        if (date) ctx['Date']             = safeFmt(date, 'dd/MM/yyyy');
        ctx['Time']                       = time || 'N/A';
        ctx['Location']                   = loc || 'N/A';
        ctx['Description']                = descr || 'N/A';

        const reasonCodes: string[] = Array.isArray(c.claimReason) ? c.claimReason : [];
        const codeMap: Record<string, string> = { VD: 'Vehicle Damage', H: 'Credit Hire', S: 'Storage', PI: 'PI' };
        ctx['Claim Type'] = reasonCodes.length
          ? reasonCodes.map(code => codeMap[code] || 'Other').join(' + ')
          : (String(c.claimType) || 'Other');
      }
    }

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

  // ─── SEND ───────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (selectedRecipients.length === 0) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;

    const masterSubject = subject;
    const masterMessage = message;

    for (const rid of selectedRecipients) {
      let to_email = '';
      let to_name = '';

      if (emailType === 'finance') {
          if (recipientFilter === 'account') {
              // Accounts usually don't have direct email, maybe admin? skipping for now or assume Account has email field
              // Just logging/toasting for now if no email
              const acc = accounts.find(a => a.id === rid);
              to_name = acc?.name || 'Account';
              // Accounts in your type definition don't have email, so this might fail if you try to email an account directly without logic
              // For now, let's assume if it's an account, we might not be able to email unless we use a fallback or the user manually enters it.
              // BUT: The prompt asked for this feature in Bulk Email. 
              // If account has no email, maybe we skip or use a default?
              // Let's check customers as fallback or alert.
          } else if (recipientFilter === 'owner') {
              // Try to find customer with same name
              const cust = customers.find(c => c.name === rid);
              if (cust) { to_email = cust.email || ''; to_name = cust.name; }
              else { to_name = rid; }
          } else {
              const cust = customers.find(c => c.id === rid);
              to_email = cust?.email || '';
              to_name = cust?.name || '';
          }
      } else {
          // Standard logic
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

      // Create a context with all possible name aliases for the current recipient
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
        await sendEmail({ to_email, to_name, subject: finalSubject, message: finalMessage });
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
    }
    setLoading(false);
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
        {(Object.keys(emailTemplates) as EmailType[]).map(t => (
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
                      setSelectedRecipients(newSelection);
                    }}
                    className="p-1 bg-gray-100 rounded"
                    title={selected ? "Deselect recipient" : "Select recipient"}
                  >
                    <Mail className="h-4 w-4"/>
                  </button>
                </div>

                {selected && selectedRecipients.length === 1 && emailType === 'custom' && currentTemplate?.requiredFields?.includes('vehicle') && (
                  <SearchableSelect
                    label="Select Vehicle"
                    options={getRelatedRecords(id)}
                    value={selectedVehicleId}
                    onChange={setSelectedVehicleId}
                  />
                )}
                {selected && selectedRecipients.length === 1 && emailType === 'rental' && (
                  <SearchableSelect
                    label="Select Rental"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {selected && selectedRecipients.length === 1 && emailType === 'maintenance' && (
                  <SearchableSelect
                    label="Select Maintenance"
                    options={getRelatedRecords(id)}
                    value={selectedMaintenanceId}
                    onChange={setSelectedMaintenanceId}
                  />
                )}
                {selected && selectedRecipients.length === 1 && emailType === 'invoice' && (
                  <SearchableSelect
                    label="Select Invoice"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {selected && selectedRecipients.length === 1 && emailType === 'claim' && (
                  <SearchableSelect
                    label="Select Claim"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {selected && selectedRecipients.length === 1 && emailType === 'finance' && (
                  <SearchableSelect
                    label="Select Transaction"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
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
            onChange={e=>setSubject(e.target.value)}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>
        <div>
          <label className="font-medium">Message</label>
        </div>
        <textarea
          className="mt-1 w-full border rounded p-2 h-[600px]"
          value={message}
          onChange={e=>setMessage(e.target.value)}
          placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
        />

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
              {(Object.keys(emailTemplates) as EmailType[]).map(t => (
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

          {user?.role==='manager' && (
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