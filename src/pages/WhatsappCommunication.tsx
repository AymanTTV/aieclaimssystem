// src/pages/WhatsappCommunication.tsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, MessageSquareText, Trash2, User, Briefcase } from 'lucide-react';
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
import Modal from '../components/ui/Modal';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useServiceCenters } from '../hooks/useServiceCenters';
import { useInvoices } from '../hooks/useInvoices';
import { useClaims } from '../hooks/useClaims';
import { usePermissions } from '../hooks/usePermissions';

import { fetchLegalHandlers } from '../utils/legalHandlers';
import { emailTemplates, EmailType } from '../constants/emailTemplates';
import { fillPlaceholders } from '../utils/templateUtils';

import { sendWhatsAppMessage, buildWhatsAppMessage } from '../utils/whatsapp';

import { useWhatsappHistory, logWhatsappHistory } from '../hooks/useWhatsappHistory';
import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';

// ---------------- DEBUG TOGGLE ----------------
const DEBUG = true;
// ---------------- DEBUG HELPERS ----------------
const dlog = (...args: any[]) => DEBUG && console.log(...args);
const dgroup = (label: string) => DEBUG && console.group(label);
const dgroupEnd = () => DEBUG && console.groupEnd();

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

// Normalizers/matchers
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
  // allow suffix match to tolerate country codes (e.g. 447… vs 07…)
  return flat.some(p => p.endsWith(cp) || cp.endsWith(p));
}

// Pretty-print a claim’s key fields so we can see what we’re comparing
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
      ...(splitMulti(claim?.contact?.emails || [])),
      ...(splitMulti(claim?.contactDetails?.emails || [])),
    ].filter(Boolean),
    phones: [
      claim?.clientInfo?.phone,
      claim?.submitter?.contactNumber,
      claim?.driver?.contactNumber,
      ...(splitMulti(claim?.contact?.phones || [])),
      ...(splitMulti(claim?.contactDetails?.phones || [])),
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
    (customer as any)?.whatsapp ||
    (customer as any)?.phone ||
    (customer as any)?.mobile ||
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

  // 1) Direct links
  const idHit =
    claim?.customerId === custId ||
    claim?.clientId === custId ||
    claim?.client?.id === custId ||
    claim?.clientInfo?.customerId === custId ||
    claim?.clientVehicle?.ownerId === custId;
  dlog('  id link?', idHit);
  if (idHit) { dgroupEnd(); return true; }

  // 2) Email-based
  const emailHit = anyEmailMatch(
    custEmail,
    claim?.clientInfo?.email,
    claim?.submitter?.email,
    claim?.driver?.email,
    claim?.contact?.emails,
    claim?.contactDetails?.emails
  );
  if (emailHit) { dgroupEnd(); return true; }

  // 3) Phone-based (suffix tolerant)
  const phoneHit = anyPhoneMatch(
    custPhone,
    claim?.clientInfo?.phone,
    claim?.submitter?.contactNumber,
    claim?.driver?.contactNumber,
    claim?.contact?.phones,
    claim?.contactDetails?.phones
  );
  if (phoneHit) { dgroupEnd(); return true; }

  // 4) Name-based (fallback)
  const nameHit =
    nameLooseEqual(custName, claim?.clientInfo?.name) ||
    nameLooseEqual(custName, claim?.submitter?.fullName) ||
    nameLooseEqual(custName, claim?.driver?.fullName);

  dlog('  name loose?', nameHit);
  dgroupEnd();
  return !!nameHit;
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

// Normalizes phone numbers to digits only for reliable comparison
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

export default function WhatsappCommunication() {
  const { user } = useAuth();
  const { can, isManager }  = usePermissions();

  // ── State
  const [emailType, setEmailType] = useState<EmailType>('custom');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string>('');

  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Data hooks
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { serviceCenters } = useServiceCenters();
  const { invoices } = useInvoices();
  const { claims } = useClaims();
  const { history } = useWhatsappHistory();

  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);

  // On-demand claim options + docs cache
  const [claimOptionsByRecipient, setClaimOptionsByRecipient] =
    useState<Record<string, { id: string; label: string }[]>>({});
  const [claimDocById, setClaimDocById] =
    useState<Record<string, any>>({});

  // Templates for selected type
  const templates = emailTemplates[emailType] || [];
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // Load legal handlers on Claim tab
  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers()
        .then(setLegalHandlers)
        .catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  // ── ON-DEMAND CLAIM LOADING (LEGAL HANDLER) ─────────────────────
  async function loadClaimsForLegalHandler(handlerId: string) {
    dgroup('[LOAD CLAIMS] legal handler');
    dlog('handlerId:', handlerId);
    const lh = legalHandlers.find(h => h.id === handlerId);
    if (!lh) { setClaimOptionsByRecipient(p => ({ ...p, [handlerId]: [] })); dgroupEnd(); return; }

    const claimsCol = collection(db, 'claims');
    const results: Record<string, any> = {};
    const pushNow = () => {
      const arr = Object.values(results);
      setClaimOptionsByRecipient(prev => ({ ...prev, [handlerId]: arr.map(toClaimOption) }));
      setClaimDocById(prev => {
        const next = { ...prev };
        arr.forEach((c: any) => { next[c.id] = c; });
        return next;
      });
      dlog('pushed options:', arr.length);
    };
    const run = async (qry: any, label: string) => {
      const snap = await getDocs(qry);
      dlog('query ok:', label, 'docs:', snap.size);
      snap.forEach((d: any) => { results[d.id] = { id: d.id, ...d.data() }; });
      pushNow(); // incremental
    };

    try {
      await Promise.allSettled([
        { q: query(claimsCol, where('fileHandlers.legalHandler.id', '==', handlerId)), label: 'fh.obj.id' },
        { q: query(claimsCol, where('legalHandler.id', '==', handlerId)), label: 'root.obj.id' },
      ].map(({ q, label }) => run(q, label)));

      await Promise.allSettled([
        { q: query(claimsCol, where('fileHandlers.legalHandler', '==', lh.email)), label: 'fh.str.email' },
        { q: query(claimsCol, where('fileHandlers.legalHandler', '==', lh.name)),  label: 'fh.str.name' },
        { q: query(claimsCol, where('legalHandler', '==', lh.email)),              label: 'root.str.email' },
        { q: query(claimsCol, where('legalHandler', '==', lh.name)),               label: 'root.str.name' },
      ].map(({ q, label }) => run(q, label)));

      await Promise.allSettled([
        { q: query(claimsCol, where('fileHandlers.legalHandlerId', '==', handlerId)),     label: 'fh.id' },
        { q: query(claimsCol, where('legalHandlerId', '==', handlerId)),                  label: 'root.id' },
        { q: query(claimsCol, where('fileHandlers.legalHandlerEmail', '==', lh.email)),   label: 'fh.email' },
        { q: query(claimsCol, where('legalHandlerEmail', '==', lh.email)),                label: 'root.email' },
        { q: query(claimsCol, where('fileHandlers.legalHandlerName', '==', lh.name)),     label: 'fh.name' },
        { q: query(claimsCol, where('legalHandlerName', '==', lh.name)),                  label: 'root.name' },
      ].map(({ q, label }) => run(q, label)));

      // NEW resilient fallback
      if (!Object.keys(results).length) {
        dlog('fallback: resilient scan');
        const tryOrders = [
          query(claimsCol, orderBy('updatedAt', 'desc'), fbLimit(200)),
          query(claimsCol, orderBy('submittedAt', 'desc'), fbLimit(200)),
          query(claimsCol, orderBy('__name__', 'desc'), fbLimit(200)),
        ];
        let pulled = 0;
        for (const [idx, qy] of tryOrders.entries()) {
          const tag = ['updatedAt', 'submittedAt', '__name__'][idx];
          const snap = await getDocs(qy);
          dlog(`fallback: scan by ${tag}, docs:`, snap.size);
          snap.forEach((d: any) => {
            const data = { id: d.id, ...d.data() };
            const fh = data?.fileHandlers ?? {};
            if (
              fh?.legalHandler?.id === handlerId ||
              data?.legalHandler?.id === handlerId ||
              fh?.legalHandlerId === handlerId ||
              data?.legalHandlerId === handlerId ||
              (fh?.legalHandlerEmail && fh.legalHandlerEmail === lh.email) ||
              (data?.legalHandlerEmail && data.legalHandlerEmail === lh.email) ||
              (fh?.legalHandlerName && fh.legalHandlerName === lh.name) ||
              (data?.legalHandlerName && data.legalHandlerName === lh.name)
            ) { results[d.id] = data; pulled++; }
          });
          if (pulled) break;
        }
        pushNow();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load claims for the selected legal handler');
      setClaimOptionsByRecipient(prev => ({ ...prev, [handlerId]: [] }));
    }
    dgroupEnd();
  }

  // ── ON-DEMAND CLAIM LOADING (CUSTOMER) ──────────────────────────
  async function loadClaimsForCustomer(customerId: string) {
    dgroup('[LOAD CLAIMS] customer');
    dlog('customerId:', customerId);

    const cust = customers.find(c => c.id === customerId);
    if (!cust) {
      dlog('no customer found');
      setClaimOptionsByRecipient(prev => ({ ...prev, [customerId]: [] }));
      dgroupEnd();
      return;
    }

    // collect likely phones from customer (keep raw for 'in' queries)
    const phoneCandidates = [
      (cust as any)?.whatsapp,
      (cust as any)?.phone,
      (cust as any)?.mobile,
      (cust as any)?.tel,
    ].filter(Boolean) as string[];

    const nameCandidate = (cust as any)?.name || '';

    const claimsCol = collection(db, 'claims');
    const results: Record<string, any> = {};

    const pushNow = () => {
      const arr = Object.values(results);
      // robust local match on everything we have
      const matched = arr.filter(c => claimMatchesCustomer(c, cust));
      const opts = matched.map(toClaimOption);
      setClaimOptionsByRecipient(prev => ({ ...prev, [customerId]: opts }));
      setClaimDocById(prev => {
        const next = { ...prev };
        arr.forEach((c: any) => { next[c.id] = c; });
        return next;
      });
      dlog('pushed options (matched/loaded):', opts.length, '/', arr.length);
    };

    const run = async (qry: any, label: string) => {
      const snap = await getDocs(qry);
      dlog('query ok:', label, 'docs:', snap.size);
      snap.forEach((d: any) => { results[d.id] = { id: d.id, ...d.data() }; });
      pushNow(); // incremental updates
    };

    try {
      // 1) Direct id variants (keep for other schemas)
      const idQueries = [
        query(claimsCol, where('customerId', '==', customerId)),
        query(claimsCol, where('clientId', '==', customerId)),
        query(claimsCol, where('client.id', '==', customerId)),
        query(claimsCol, where('clientInfo.customerId', '==', customerId)),
        query(claimsCol, where('clientVehicle.ownerId', '==', customerId)),
      ];
      await Promise.allSettled(idQueries.map(qy => run(qy, 'id-variant')));

      // 2) Phone & name variants that match your schema
      const phoneQueries: any[] = [];
      if (phoneCandidates.length) {
        // Firestore 'in' supports up to 10 values
        const top = phoneCandidates.slice(0, 10);
        phoneQueries.push(query(claimsCol, where('clientInfo.phone', 'in', top)));
        phoneQueries.push(query(claimsCol, where('submitter.contactNumber', 'in', top)));
        phoneQueries.push(query(claimsCol, where('driver.contactNumber', 'in', top)));
      }
      const nameQueries: any[] = [];
      if (nameCandidate) {
        nameQueries.push(query(claimsCol, where('clientInfo.name', '==', nameCandidate)));
        nameQueries.push(query(claimsCol, where('submitter.fullName', '==', nameCandidate)));
        nameQueries.push(query(claimsCol, where('driver.fullName', '==', nameCandidate)));
      }
      await Promise.allSettled([
        ...phoneQueries.map(qy => run(qy, 'phone variant')),
        ...nameQueries.map(qy => run(qy, 'name variant')),
      ]);

      // 3) Resilient fallback — always returns *something*
      const tryOrders = [
        query(claimsCol, orderBy('updatedAt', 'desc'), fbLimit(200)),
        query(claimsCol, orderBy('submittedAt', 'desc'), fbLimit(200)),
        query(claimsCol, orderBy('__name__', 'desc'), fbLimit(200)),
      ];
      const hadAny = (claimOptionsByRecipient[customerId]?.length || 0) > 0;
      if (!hadAny) {
        for (const [idx, qy] of tryOrders.entries()) {
          const tag = ['updatedAt', 'submittedAt', '__name__'][idx];
          const snap = await getDocs(qy);
          dlog(`fallback: scan by ${tag}, docs:`, snap.size);
          if (snap.size) {
            snap.forEach((d: any) => { results[d.id] = { id: d.id, ...d.data() }; });
            pushNow();
            break;
          }
        }
        pushNow();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed loading claims for this customer');
      setClaimOptionsByRecipient(prev => ({ ...prev, [customerId]: [] }));
    }

    dgroupEnd();
  }

  // recipients (null-safe)
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // For non-managers, recipients are only shown after a search is initiated.
    if (!isManager && !q) {
      return [];
    }

    // Maintenance recipients are service centers
    if (emailType === 'maintenance') {
      return serviceCenters
        .filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        )
        .map(r => ({ ...r, type: 'serviceCenter' as const }));
    }

    // Claim tab can target customers or legal handlers
    if (emailType === 'claim') {
      const matchedCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        ((c as any).phone || (c as any).mobile || '').toLowerCase().includes(q)
      );
      const matchedHandlers = legalHandlers.filter(h =>
        h.name.toLowerCase().includes(q) ||
        (h.email || '').toLowerCase().includes(q) ||
        (h.phone || '').toLowerCase().includes(q)
      );
      return [
        ...matchedCustomers.map(c => ({ ...c, type: 'customer' as const })),
        ...matchedHandlers.map(h => ({ ...h, type: 'legalHandler' as const })),
      ];
    }

    // NEW: When type = invoice, also expose ad-hoc invoice contacts (manual name/phone)
    const manualInvoiceRecipients = emailType === 'invoice'
      ? invoices
          .map(inv => {
            const hasSavedCustomer = !!inv.customerId;
            const manualName = getInvoiceManualName(inv);
            const manualPhone = getInvoiceManualPhone(inv);
            if (hasSavedCustomer || !manualName || !manualPhone) return null;
            const id = `invoice:${inv.id}`; // synthetic recipient id
            const label = [
              `INV-${String(inv.id || '').slice(-8).toUpperCase()}`,
              manualName,
              manualPhone
            ].filter(Boolean).join(' • ');
            return {
              id,
              name: manualName,
              email: '',
              phone: manualPhone,
              type: 'invoiceManual' as const,
              _label: label,
            };
          })
          .filter(Boolean as any)
      : [];

    const matchedCustomers = customers
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        ((c as any).phone || (c as any).mobile || '').toLowerCase().includes(q)
      )
      .map(r => ({ ...r, type: 'customer' as const }));

    const matchedManuals = (manualInvoiceRecipients as any[]).filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.phone || '').toLowerCase().includes(q) ||
      (r._label || '').toLowerCase().includes(q)
    );

    return [...matchedCustomers, ...matchedManuals];
  }, [emailType, searchQuery, customers, serviceCenters, legalHandlers, invoices, isManager]);

  useEffect(() => {
    if (emailType !== 'claim') return;
    const rid = selectedRecipients[0];
    if (!rid) return;

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

  // Claim option label builder
  const toClaimOption = (c: any): { id: string; label: string } => {
    const ref = (c.claimId?.toUpperCase?.() || (c.id || '').slice(-8).toUpperCase());
    const clientReg = c.clientVehicle?.registration || c.vehicle?.registration || '';
    const clientName = c.clientInfo?.name || c.submitter?.fullName || c.driver?.fullName || '';
    const date = safeFmt(c.dateOfEvent ?? c.incidentDetails?.date);
    return { id: c.id, label: [ref, clientReg, clientName, date].filter(Boolean).join(' • ') };
  };

  // Related records provider (all labels use safeFmt now)
  function getRelatedRecords(recipientId: string) {
    switch (emailType) {
      case 'custom': {
        // For custom messages that need vehicle selection
        return vehicles.map(v => ({ id: v.id, label: v.registrationNumber }));
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
        return maintenanceLogs.map(m => {
          const v = vehicles.find(vx => vx.id === m.vehicleId);
          const reg = v?.registrationNumber || 'Unknown Reg';
          return { id: m.id, label: `${reg} • ${m.type} • ${safeFmt(m.date, 'dd/MM/yyyy')}` };
        });
      }

      case 'invoice': {
        // If synthetic manual invoice recipient selected, only show that invoice
        if (recipientId.startsWith('invoice:')) {
          const invId = recipientId.split(':')[1];
          const inv = invoices.find(i => i.id === invId);
          if (!inv) return [];
          return [{ id: inv.id, label: `INV-${inv.id.slice(-8).toUpperCase()} (${safeFmt(inv.date, 'dd/MM/yyyy')})` }];
        }
        // Normal path: invoices by saved customer
        return invoices
          .filter(inv => inv.customerId === recipientId)
          .map(inv => ({ id: inv.id, label: `INV-${inv.id.slice(-8).toUpperCase()} (${safeFmt(inv.date, 'dd/MM/yyyy')})` }));
      }

      case 'claim': {
        dgroup('[RELATED RECORDS] claim branch');
        dlog('recipientId:', recipientId);

        const isCustomer = customers.some(c => c.id === recipientId);
        dlog('isCustomer?', isCustomer);

        if (isCustomer) {
          const opts = claimOptionsByRecipient[recipientId] || [];
          dlog('customer path: options count:', opts.length);
          if (!opts.length) dlog('→ (tip) ensure Firestore rules permit reading claim fields.');
          dgroupEnd();
          return opts; // customer sees *their* claims only (matched earlier)
        }

        const bucket = claimOptionsByRecipient[recipientId] || [];
        dlog('legal handler path: options count:', bucket.length);
        dgroupEnd();
        return bucket; // handler sees all handler-linked claims
      }

      default:
        return [];
    }
  }

  // If a claim is selected but not cached, fetch it for auto-fill
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

  // Template gating (aligned with BulkEmail)
  const templateReady = useMemo(() => {
    if (!currentTemplate) return false;
    const needs: string[] = currentTemplate.requiredFields || [];
    if (selectedRecipients.length !== 1) return false;
    if (emailType === 'claim' && needs.includes('claim') && !selectedRecordId) return false;
    if (emailType === 'maintenance' && needs.includes('maintenance') && !selectedMaintenanceId) return false;
    if (emailType === 'rental' && needs.includes('rental') && !selectedRecordId) return false;
    return true;
  }, [currentTemplate, emailType, selectedRecipients, selectedVehicleId, selectedMaintenanceId, selectedRecordId]);

  // Helper to add aliases
  const addTemplateAliases = (ctx: Record<string, string>) => {
    const alias: Record<string, string> = {};

    // Vehicle Reg aliases
    const reg = ctx['Vehicle Registration Number'] || ctx['Client Registration'] || ctx['TP Registration'];
    if (reg) {
      alias['Insert Reg No.'] = reg;
      alias['Vehicle Reg'] = reg;
      alias['Registration Number'] = reg;
    }

    // Date & Time aliases
    const dt = ctx['Date & Time'];
    if (dt) alias['Insert Date & Time'] = dt;

    // Recipient names
    const rn = ctx["Recipient's Name"] || ctx['Recipient Name'];
    if (rn) {
      alias['Recipient Name'] = rn;
      alias["Recipient's Name"] = rn;
      // NEW: fallback Customer Name to recipient if missing
      if (!ctx['Customer Name']) {
        alias['Customer Name'] = rn;
      }
    }

    // Customer/Driver
    const cn = ctx['Customer Name'] || ctx["Driver's Name"] || ctx['Client Name'];
    if (cn) {
      alias['Customer Name'] = cn;
      alias["Driver's Name"] = cn;
      alias['Driver Name'] = cn;
    }

    // Agreement Ref aliases
    if (ctx['Agreement Ref']) alias['Ref'] = ctx['Agreement Ref'];
    if (ctx['Ref']) alias['Agreement Ref'] = ctx['Ref'];

    // Date aliases for generic DD/MM/YYYY placeholders
    if (ctx['Date']) alias['DD/MM/YYYY'] = ctx['Date'];

    // Claim reference aliases
    if (ctx['Claim Reference']) {
      alias['Insert Claim Reference'] = ctx['Claim Reference'];
      alias['Claim Ref'] = ctx['Claim Reference'];
    }

    // Description alias (claims)
    if (ctx['Description']) {
      alias['Brief description of the incident'] = ctx['Description'];
    }

    // Invoice fields
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

    // Generic location/date
    if (ctx['Location']) alias['Insert Location'] = ctx['Location'];
    if (ctx['Date']) alias['Insert Date'] = ctx['Date'];

    // Parts helpers for the parts template
    if (ctx['Part(s) Required']) alias['Parts Required'] = ctx['Part(s) Required'];

    return { ...ctx, ...alias };
  };

  // WhatsApp-only template fixups
  function applyWhatsAppTemplateFixups(
    templateId: string,
    tplType: EmailType,
    body: string
  ) {
    let out = body;

    if (tplType === 'claim') {
      out = out.replace(
        /Claim Type:\s*\[Vehicle Damage\][\s\S]*?\[Other\]/i,
        'Claim Type: [Claim Type]'
      );
    }

    const isMaintenanceBooking =
      tplType === 'maintenance' &&
      /nsl_booking_request|vehicle_service_request|mot_failure_repair_request|maintenance_repair_request|mot_booking_request/i.test(
        templateId
      );

    if (isMaintenanceBooking) {
      out = out.replace(
        /(^|\n)\s*🔹?\s*Location:\s*.*$/im,
        '\n🔹 Location: [Location]'
      );
      out = out.replace(
        /(^|\n)\s*🔹?\s*Additional Notes:\s*.*$/im,
        '\n🔹 Additional Notes: [Additional Notes]'
      );
      out = out.replace(/Preferred Date\s*&\s*Time/gi, 'Preferred Date');
    }

    return out;
  }

  function normalizeWhatsAppSignature(body: string): string {
    const sigRegex =
      /(?:(?:Kind|Best) regards,?\s*|AIE (?:Skyline Limited|Claims Ltd))[\s\S]*?(?:www\.aieskyline\.co\.uk|www\.aieclaims\.co\.uk|AIE Skyline Admin Team|Admin Team\s*– AIE Skyline Limited|Claims Team\s*AIE Claims Ltd|admin@aieskyline\.co\.uk|claims@aieskyline\.co\.uk)/gi;

    const matches = [...body.matchAll(sigRegex)];
    if (!matches.length) return body;

    const preferred =
      matches.map(m => m[0]).find(block => /^Best regards/i.test(block)) ??
      matches[matches.length - 1][0];

    let stripped = body.replace(sigRegex, '').trim();
    const result = `${stripped}\n\n${preferred}`.replace(/\n{3,}/g, '\n\n');
    return result.trim();
  }

  // Auto-fill
  useEffect(() => {
    if (!currentTemplate || !selectedTemplateId || !templateReady) return;

    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    // Today (fallback date)
    ctx['DD/MM/YYYY'] = format(new Date(), 'dd/MM/yyyy');

    // Base recipient
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      if (sc) {
        ctx["Recipient's Name"] = sc.name;
        ctx['Recipient Name'] = sc.name;
      }
    } else if (rid?.startsWith('invoice:')) {
      // Synthetic manual-invoice recipient
      const invId = rid.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      const manualName = inv ? getInvoiceManualName(inv) : '';
      if (manualName) {
        ctx["Recipient's Name"] = manualName;
        ctx['Recipient Name'] = manualName;
        ctx['Customer Name'] = manualName; // ensure "Dear [Customer Name]" fills
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
        if (!ctx['Customer Name']) ctx['Customer Name'] = lh.name; // fallback for templates using Customer Name
      }
    }

    if (selectedVehicleId) {
      const v = vehicles.find(vx => vx.id === selectedVehicleId);
      if (v) {
        ctx['Vehicle Registration Number'] = v.registrationNumber;
        ctx['Vehicle Reg'] = v.registrationNumber;
        ctx['Make & Model'] = [v.make, v.model].filter(Boolean).join(' ');
        if (v.year) ctx['Year'] = `${v.year}`;
      }
    }

    /* ---------- MAINTENANCE ---------- */
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
        ctx['Location'] = (m as any).location || '';
        ctx['Additional Notes'] = (m as any).description || '';

        if ((m as any)?.mileage != null) ctx['Insert Mileage'] = String((m as any).mileage);

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

    /* ---------- RENTAL ---------- */
    if (emailType === 'rental' && selectedRecordId) {
      const r = rentals.find(x => x.id === selectedRecordId);
      if (r) {
        const v = vehicles.find(vx => vx.id === r.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Vehicle Reg'] = v.registrationNumber;
        }

        ctx['Start Date']  = `${safeFmt((r as any).startDate, 'dd/MM/yyyy HH:mm')}`;
        ctx['End Date']    = `${safeFmt((r as any).endDate, 'dd/MM/yyyy HH:mm')}`;
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

        if (!ctx["Driver's Name"]) {
          const rc = customers.find(c => c.id === (r as any).customerId);
          if (rc) {
            ctx["Driver's Name"] = rc.name;
            ctx['Customer Name'] = rc.name;
          }
        }
      }
    }

    /* ---------- INVOICE ---------- */
    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        const invNo = `INV-${inv.id.slice(-8).toUpperCase()}`;
        ctx['Invoice Number'] = invNo;
        ctx['Invoice Date'] = `${safeFmt((inv as any).date, 'dd/MM/yyyy')}`;
        ctx['Amount'] = Number((inv as any).amount ?? 0).toFixed(2);
        ctx['Due Date'] = `${safeFmt((inv as any).dueDate, 'dd/MM/yyyy')}`;
        ctx['Invoice No.'] = invNo;

        // NEW: set Customer Name from invoice manual fields if not set yet
        if (!ctx['Customer Name']) {
          const fromInv = getInvoiceManualName(inv);
          if (fromInv) ctx['Customer Name'] = String(fromInv);
        }
        // If invoice links to a saved customer, set name from that too
        if (!ctx['Customer Name'] && inv.customerId) {
          const rc = customers.find(c => c.id === inv.customerId);
          if (rc?.name) ctx['Customer Name'] = rc.name;
        }
      }
    }

    /* ---------- CLAIM ---------- */
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

        const reasonCodes: string[] = Array.isArray(c.claimReason) ? c.claimReason : [];
        const codeMap: Record<string, string> = { 'VD': 'Vehicle Damage', 'H':  'Credit Hire', 'S':  'Storage', 'PI': 'PI' };
        let claimTypeLabel = reasonCodes.length > 0 ? reasonCodes.map(code => codeMap[code] || 'Other').join(' + ') : (String(c.claimType) || 'Other');
        ctx['Claim Type'] = claimTypeLabel;
      }
    }

    const withAliases = addTemplateAliases(ctx);
    const subjectT = currentTemplate.subjectTemplate;
    const bodyT = applyWhatsAppTemplateFixups(currentTemplate.id, emailType, currentTemplate.bodyTemplate);

    setSubject(fillPlaceholders(subjectT, withAliases));
    setMessage(fillPlaceholders(bodyT, withAliases));
  }, [
    currentTemplate, selectedTemplateId, templateReady, emailType,
    selectedRecipients, selectedVehicleId, selectedMaintenanceId, selectedRecordId,
    customers, vehicles, rentals, maintenanceLogs, invoices, claims, legalHandlers, claimDocById
  ]);

  // Returns phone/email/name for a recipient id (including synthetic invoice ids)
  const getRecipientPhoneEmailAndName = (rid: string): { phone?: string; email?: string; name: string } => {
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      return { phone: sc?.phone, email: sc?.email, name: sc?.name || '' };
    }

    // Synthetic ad-hoc invoice contact
    if (rid?.startsWith('invoice:')) {
      const invId = rid.split(':')[1];
      const inv = invoices.find(i => i.id === invId);
      const name = inv ? getInvoiceManualName(inv) : '';
      const phone = inv ? getInvoiceManualPhone(inv) : '';
      return { phone, email: '', name: name || 'Invoice Contact' };
    }

    const customer = customers.find(x => x.id === rid);
    if (customer) {
      const phone = (customer as any)?.whatsapp || (customer as any)?.phone || (customer as any)?.mobile || (customer as any)?.tel;
      return { phone, email: customer?.email, name: customer?.name || '' };
    }

    const handler = legalHandlers.find(h => h.id === rid);
    if (handler) {
      return { phone: handler?.phone, email: handler?.email, name: handler?.name || '' };
    }

    return { name: 'Unknown' };
  };

  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (!selectedRecipients.length) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;

    const rawText = buildWhatsAppMessage({
      type: emailType.charAt(0).toUpperCase() + emailType.slice(1),
      subject: subject?.trim(),
      body: (message || '').trim(),
    });

    const text = normalizeWhatsAppSignature(rawText);

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
    }
    setLoading(false);
  };

  // History filters
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
  }, [history, historyTypeFilter, historyTemplateFilter, historyRecipientFilter, serviceCenters, legalHandlers, customers]);

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

      {/* Recipients */}
      <div className="bg-white p-4 rounded shadow space-y-2 border border-green-100">
        <div className="relative">
          <Search className="absolute left-2 top-2 text-green-400" />
          <input
            className="pl-8 pr-4 py-2 border rounded w-full focus:ring-2 focus:ring-green-400"
            placeholder="Search recipients…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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
            const isManualInv = r.type === 'invoiceManual';

            return (
              <div key={id} className={`p-3 rounded border ${selected ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {isCustomer && <User size={14} className="text-blue-500" />}
                      {isHandler  && <Briefcase size={14} className="text-purple-500" />}
                      {name}
                    </div>
                    <div className="text-sm text-gray-600">{email || (isManualInv ? r._label : '')}</div>
                    <div className="text-sm text-gray-600">{phone}</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRecipients(selected ? [] : [id]);
                      if (!selected) {
                        setSelectedRecordId('');
                        setSelectedMaintenanceId('');
                        setSelectedVehicleId('');
                      }
                    }}
                    className="p-1 bg-green-100 rounded text-green-700"
                    title="Select recipient"
                  >
                    <MessageSquareText className="h-4 w-4" />
                  </button>
                </div>

                {emailType === 'custom' && currentTemplate?.requiredFields?.includes('vehicle') && selected && (
                  <SearchableSelect
                    label="Select Vehicle"
                    options={getRelatedRecords(id)}
                    value={selectedVehicleId}
                    onChange={setSelectedVehicleId}
                  />
                )}
                {emailType === 'custom' && currentTemplate?.requiredFields?.includes('maintenance') && selected && (
                  <SearchableSelect
                    label="Select Maintenance"
                    options={getRelatedRecords(id)}
                    value={selectedMaintenanceId}
                    onChange={setSelectedMaintenanceId}
                  />
                )}
                {emailType === 'rental' && selected && (
                  <SearchableSelect
                    label="Select Rental"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {emailType === 'maintenance' && selected && (
                  <SearchableSelect
                    label="Select Maintenance"
                    options={getRelatedRecords(id)}
                    value={selectedMaintenanceId}
                    onChange={setSelectedMaintenanceId}
                  />
                )}
                {emailType === 'invoice' && selected && (
                  <SearchableSelect
                    label="Select Invoice"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {emailType === 'claim' && selected && (
                  <SearchableSelect
                    label="Select Claim"
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

      {/* Composer + Preview */}
      <div className="bg-white p-4 rounded shadow space-y-4 border border-green-100">
        <div>
          <label className="font-medium text-green-700">Subject</label>
          <input
            className="mt-1 w-full border rounded p-2 focus:ring-2 focus:ring-green-400"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>
        <div>
          <label className="font-medium text-green-700">Message</label>
          <textarea
            className="mt-1 w-full border rounded p-2 h-[600px] focus:ring-2 focus:ring-green-400"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
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

      {/* Preview Modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="WhatsApp Preview" size="lg">
        {selectedRecipients.length !== 1 ? (
          <div className="text-sm text-gray-600">
            Select exactly <strong>one</strong> recipient to preview.
          </div>
        ) : (
          <div className="space-y-3">
            {(() => {
              const rawPreviewText = buildWhatsAppMessage({
                type: emailType.charAt(0).toUpperCase() + emailType.slice(1),
                subject: subject?.trim(),
                body: (message || '').trim(),
              });
              const composedPreviewText = normalizeWhatsAppSignature(rawPreviewText);
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

      {/* History */}
      <div className="bg-white p-4 rounded shadow border border-green-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-medium text-green-700">WhatsApp History</h2>
          <div className="flex space-x-2">
            <select
              className="border p-1 rounded"
              value={historyTypeFilter}
              onChange={e => setHistoryTypeFilter(e.target.value as any)}
            >
              <option value="all">All Types</option>
              {(Object.keys(emailTemplates) as EmailType[]).map(t => (<option key={t} value={t}>{t}</option>))}
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

          {user?.role === 'manager' && (
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
                  {h.recipients.map(rid => {
                    const rec = getRecipientPhoneEmailAndName(rid);
                    return rec?.name;
                  }).filter(Boolean).join(', ')}
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