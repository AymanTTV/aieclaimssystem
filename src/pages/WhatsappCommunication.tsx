// src/pages/WhatsappCommunication.tsx
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, MessageSquareText, Trash2 } from 'lucide-react';
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
import { sendWhatsapp } from '../utils/whatsappService';
import { useWhatsappHistory, logWhatsappHistory } from '../hooks/useWhatsappHistory';
import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';

export default function WhatsappCommunication() {
  const { user } = useAuth();

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

  // ── Data hooks
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();
  const { serviceCenters } = useServiceCenters();
  const { invoices } = useInvoices();
  const { claims } = useClaims(); // we still keep this around if it’s warm
  const { history } = useWhatsappHistory();
  const { can } = usePermissions();
  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);

  // On-demand claim options + docs cache (like Bulk Email fix)
  const [claimOptionsByRecipient, setClaimOptionsByRecipient] =
    useState<Record<string, { id: string; label: string }[]>>({});
  const [claimDocById, setClaimDocById] =
    useState<Record<string, any>>({});

  // Templates for selected type
  const templates = emailTemplates[emailType] || [];
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // Helpers
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

  // Make REF first token for fast searching
  const toClaimOption = (c: any): { id: string; label: string } => {
    const ref = (c.claimId?.toUpperCase?.() || (c.id || '').slice(-8).toUpperCase());
    const clientReg = c.clientVehicle?.registration || c.vehicle?.registration || '';
    const clientName = c.clientInfo?.name || c.submitter?.fullName || c.driver?.fullName || '';
    const date = safeFmt(c.dateOfEvent ?? c.incidentDetails?.date);
    return { id: c.id, label: [ref, clientReg, clientName, date].filter(Boolean).join(' • ') };
  };

  const claimHasHandler = (c: any, lh: LegalHandler, handlerId: string): boolean => {
    const fh = c?.fileHandlers ?? {};
    const obj: any[] = [];
    if (fh.legalHandler && typeof fh.legalHandler === 'object') obj.push(fh.legalHandler);
    if (c.legalHandler && typeof c.legalHandler === 'object')   obj.push(c.legalHandler);
    const str: string[] = [];
    if (typeof fh.legalHandler === 'string') str.push(fh.legalHandler);
    if (typeof c.legalHandler === 'string')  str.push(c.legalHandler);
    const ids = [fh.legalHandlerId, c.legalHandlerId].filter(Boolean);
    const emails = [fh.legalHandlerEmail, c.legalHandlerEmail].filter(Boolean);
    const names  = [fh.legalHandlerName,  c.legalHandlerName].filter(Boolean);
    if (ids.includes(handlerId)) return true;
    if (obj.some(o => o?.id === handlerId)) return true;
    if (!lh) return false;
    const e = lh.email?.toLowerCase?.(); const n = lh.name?.toLowerCase?.();
    if (e && (emails.some(x => x?.toLowerCase() === e) || obj.some(o => o?.email?.toLowerCase?.() === e) || str.some(s => s?.toLowerCase() === e))) return true;
    if (n && (names.some(x => x?.toLowerCase() === n)  || obj.some(o => o?.name?.toLowerCase?.() === n)  || str.some(s => s?.toLowerCase() === n)))  return true;
    return false;
  };

  // Load legal handlers on claim tab
  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers()
        .then(setLegalHandlers)
        .catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  // Recipients list
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (emailType === 'maintenance') {
      return serviceCenters.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase?.().includes(q)
      );
    }
    if (emailType === 'claim') {
      return legalHandlers.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q) ||
        (h.phone || '').toLowerCase().includes(q)
      );
    }
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || c.mobile || '').toLowerCase().includes(q)
    );
  }, [emailType, searchQuery, customers, serviceCenters, legalHandlers]);

  // FAST, PARALLEL & INCREMENTAL claim loading
  async function loadClaimsForLegalHandler(handlerId: string) {
    const lh = legalHandlers.find(h => h.id === handlerId);
    if (!lh) { setClaimOptionsByRecipient(p => ({ ...p, [handlerId]: [] })); return; }

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
    };
    const run = async (qry: any) => {
      const snap = await getDocs(qry);
      snap.forEach((d: any) => { results[d.id] = { id: d.id, ...d.data() }; });
      pushNow(); // incremental
    };

    try {
      await Promise.allSettled([
        query(claimsCol, where('fileHandlers.legalHandler.id', '==', handlerId)),
        query(claimsCol, where('legalHandler.id', '==', handlerId)),
      ].map(run));

      await Promise.allSettled([
        query(claimsCol, where('fileHandlers.legalHandler', '==', lh.email)),
        query(claimsCol, where('fileHandlers.legalHandler', '==', lh.name)),
        query(claimsCol, where('legalHandler', '==', lh.email)),
        query(claimsCol, where('legalHandler', '==', lh.name)),
      ].map(run));

      await Promise.allSettled([
        query(claimsCol, where('fileHandlers.legalHandlerId', '==', handlerId)),
        query(claimsCol, where('legalHandlerId', '==', handlerId)),
        query(claimsCol, where('fileHandlers.legalHandlerEmail', '==', lh.email)),
        query(claimsCol, where('legalHandlerEmail', '==', lh.email)),
        query(claimsCol, where('fileHandlers.legalHandlerName', '==', lh.name)),
        query(claimsCol, where('legalHandlerName', '==', lh.name)),
      ].map(run));

      if (!Object.keys(results).length) {
        const recent = await getDocs(query(claimsCol, orderBy('createdAt', 'desc'), fbLimit(120)));
        recent.forEach((d: any) => {
          const data = { id: d.id, ...d.data() };
          if (claimHasHandler(data, lh, handlerId)) results[d.id] = data;
        });
        pushNow();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load claims for the selected legal handler');
      setClaimOptionsByRecipient(prev => ({ ...prev, [handlerId]: [] }));
    }
  }

  useEffect(() => {
    if (emailType !== 'claim') return;
    const rid = selectedRecipients[0];
    if (!rid) return;
    if (claimOptionsByRecipient[rid]) return;
    loadClaimsForLegalHandler(rid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailType, selectedRecipients, legalHandlers]);

  // Related records provider
  function getRelatedRecords(recipientId: string) {
    switch (emailType) {
      case 'custom':
        return rentals
          .filter(r => r.customerId === recipientId && new Date() < r.endDate)
          .map(r => {
            const v = vehicles.find(v => v.id === r.vehicleId)!;
            return { id: v.id, label: v.registrationNumber };
          });
      case 'rental':
        return rentals
          .filter(r => r.customerId === recipientId)
          .map(r => {
            const v = vehicles.find(v => v.id === r.vehicleId);
            if (!v) return null;
            return { id: r.id, label: `${v.registrationNumber} (${format(r.startDate, 'dd/MM/yyyy')})` };
          })
          .filter(Boolean) as { id: string; label: string }[];
      case 'maintenance': {
        const centerName = serviceCenters.find(c => c.id === recipientId)?.name;
        return maintenanceLogs
          .filter(m => m.serviceProvider === centerName)
          .map(m => ({ id: m.id, label: `${m.type} @ ${format(m.date, 'dd/MM/yyyy')}` }));
      }
      case 'invoice':
        return invoices
          .filter(inv => inv.customerId === recipientId)
          .map(inv => ({ id: inv.id, label: `INV-${inv.id.slice(-8).toUpperCase()} (${format(inv.date, 'dd/MM/yyyy')})` }));
      case 'claim':
        return claimOptionsByRecipient[recipientId] || [];
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

  // Template gating
  const templateReady = useMemo(() => {
    if (!currentTemplate) return false;
    const needs: string[] = currentTemplate.requiredFields || [];
    if (selectedRecipients.length !== 1) return false;
    if (emailType === 'claim' && needs.includes('claim') && !selectedRecordId) return false;
    if (emailType === 'maintenance' && needs.includes('maintenance') && !selectedMaintenanceId) return false;
    if (emailType === 'rental' && needs.includes('rental') && !selectedRecordId) return false;
    if (emailType === 'custom') {
      if (needs.includes('vehicle') && !selectedVehicleId) return false;
      if (needs.includes('maintenance') && !selectedMaintenanceId) return false;
    }
    return true;
  }, [currentTemplate, emailType, selectedRecipients, selectedVehicleId, selectedMaintenanceId, selectedRecordId]);

  // Auto-fill (includes Third Party fields)
  useEffect(() => {
    if (!currentTemplate || !selectedTemplateId || !templateReady) return;

    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    const cust = customers.find(c => c.id === rid);
    if (cust) { ctx["Driver's Name"] = cust.name; ctx['Customer Name'] = cust.name; }
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      if (sc) ctx["Recipient's Name"] = sc.name;
    }
    if (emailType === 'claim') {
      const lh = legalHandlers.find(h => h.id === rid);
      if (lh) ctx["Recipient's Name"] = lh.name;
    }

    if (currentTemplate.id === 'mileageRequest') ctx['Date'] = format(new Date(), 'dd/MM/yyyy');

    if (selectedVehicleId) {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      if (v) {
        ctx['Vehicle Registration Number'] = v.registrationNumber;
        if (emailType === 'maintenance' || emailType === 'custom') {
          ctx['Make & Model'] = `${v.make} ${v.model}`;
          ctx['Year'] = `${v.year}`;
        }
      }
    }

    if (emailType === 'custom' && currentTemplate.id === 'serviceBooking' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(m => m.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(v => v.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Make & Model'] = `${v.make} ${v.model}`;
          ctx['Year'] = `${v.year}`;
        }
        ctx['Service Type'] = m.type;
        ctx['Date & Time'] = format(m.date, 'dd/MM/yyyy HH:mm');
        ctx['Location'] = m.location;
      }
    }

    if (emailType === 'maintenance' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(m => m.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(v => v.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Make & Model'] = `${v.make} ${v.model}`;
          ctx['Year'] = `${v.year}`;
        }
        if (currentTemplate.id === 'serviceBooking') {
          ctx['Service Type'] = m.type;
          ctx['Date & Time'] = format(m.date, 'dd/MM/yyyy HH:mm');
          ctx['Location'] = m.location;
          ctx['Additional Notes'] = m.description;
        }
        if (currentTemplate.id === 'invoiceRequest') {
          ctx['Repair Date'] = format(m.date, 'dd/MM/yyyy');
          ctx['Service Type'] = m.type;
        }
      }
    }

    if (emailType === 'rental' && selectedRecordId) {
      const r = rentals.find(r => r.id === selectedRecordId);
      if (r) {
        const v = vehicles.find(v => v.id === r.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Start Date'] = format(r.startDate, 'dd/MM/yyyy');
          ctx['End Date'] = format(r.endDate, 'dd/MM/yyyy');
        }
        ctx['Rental Type'] = r.type;
        ctx['Total Amount'] = `£${r.cost.toFixed(2)}`;
        ctx['Amount Paid'] = `£${r.paidAmount.toFixed(2)}`;
        ctx['Outstanding Balance'] = `£${r.remainingAmount.toFixed(2)}`;
      }
    }

    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        ctx['Invoice Number'] = `INV-${inv.id.slice(-8).toUpperCase()}`;
        ctx['Invoice Date'] = format(inv.date, 'dd/MM/yyyy');
        ctx['Amount'] = `£${inv.amount.toFixed(2)}`;
        ctx['Due Date'] = format(inv.dueDate, 'dd/MM/yyyy');
      }
    }

    if (emailType === 'claim' && selectedRecordId) {
      const c: any = claimDocById[selectedRecordId] || claims.find(x => x.id === selectedRecordId);
      if (c) {
        const ref   = (c.claimId || c.id?.slice?.(-8)?.toUpperCase?.() || 'N/A');
        const date  = c.dateOfEvent ?? c.incidentDetails?.date ?? null;
        const time  = c.incidentTime ?? c.incidentDetails?.time ?? '';
        const loc   = c.locationOfEvent ?? c.incidentDetails?.location ?? '';
        const descr = c.accidentDetails?.cause ?? c.incidentDetails?.description ?? '';

        const clientName =
          c.clientInfo?.name || c.submitter?.fullName || c.driver?.fullName || 'N/A';
        const clientReg =
          c.clientVehicle?.registration || c.vehicle?.registration || 'N/A';

        const tp = c.thirdParty || c.faultParty || c.thirdPartyDetails || {};
        const tpName   = tp.name || tp.fullName || tp.driverName || '';
        const tpPhone  = tp.phone || tp.mobile || tp.contactNo || '';
        const tpEmail  = tp.email || '';
        const tpAddr   = tp.address || tp.addressLine || tp.location || '';
        const tpReg    = tp.vehicleRegistration || tp.registration || tp.vehicleReg || '';
        const tpIns    = tp.insurer || tp.insurerName || '';
        const tpPolicy = tp.policy || tp.policyNo || tp.policyNumber || '';
        const tpClaim  = tp.claimNo || tp.claimNumber || '';

        ctx['Claim Reference']          = ref;
        ctx['Client Name']              = clientName;
        ctx['Client Registration']      = clientReg;

        ctx['TP Registration']          = tpReg || 'N/A';
        ctx['Third Party Name']         = tpName   || 'N/A';
        ctx['Third Party Phone']        = tpPhone  || 'N/A';
        ctx['Third Party Email']        = tpEmail  || 'N/A';
        ctx['Third Party Address']      = tpAddr   || 'N/A';
        ctx['Third Party Registration'] = tpReg    || 'N/A';
        ctx['Third Party Insurer']      = tpIns    || 'N/A';
        ctx['Third Party Policy No']    = tpPolicy || 'N/A';
        ctx['Third Party Claim No']     = tpClaim  || 'N/A';

        if (date) ctx['Date'] = safeFmt(date);
        ctx['Time'] = time || 'N/A';
        ctx['Location'] = loc || 'N/A';
        ctx['Description'] = descr || 'N/A';
      }
    }

    setSubject(fillPlaceholders(currentTemplate.subjectTemplate, ctx));
    setMessage(fillPlaceholders(currentTemplate.bodyTemplate, ctx));
  }, [
    currentTemplate, selectedTemplateId, templateReady, emailType,
    selectedRecipients, selectedVehicleId, selectedMaintenanceId, selectedRecordId,
    customers, vehicles, rentals, maintenanceLogs, invoices, claims, legalHandlers, claimDocById
  ]);

  // --- phone helpers
  const getRecipientPhoneAndName = (rid: string): { phone?: string; name: string } => {
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      return { phone: sc?.phone, name: sc?.name || '' };
    }
    if (emailType === 'claim') {
      const lh = legalHandlers.find(h => h.id === rid);
      return { phone: lh?.phone, name: lh?.name || '' };
    }
    const c = customers.find(x => x.id === rid);
    const phone = c?.whatsapp || c?.phone || c?.mobile || (c as any)?.tel;
    return { phone, name: c?.name || '' };
  };

  // E.164 helper (no "whatsapp:" prefix)
  const toE164 = (raw?: string) => {
    if (!raw) return '';
    // keep + and digits
    let p = raw.replace(/[^\d+]/g, '');
    if (!p.startsWith('+')) {
      // default to +44 if the string starts with 0 and no country code
      if (p.startsWith('0')) p = p.slice(1);
      p = '+44' + p; // change/remove this default if not UK-centric
    }
    return p;
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
        const names = h.recipients.map(rid => {
          if (h.type === 'maintenance') return serviceCenters.find(c => c.id === rid)?.name;
          if (h.type === 'claim')       return legalHandlers.find(l => l.id === rid)?.name;
          return customers.find(c => c.id === rid)?.name;
        }).filter(Boolean).join(', ').toLowerCase();
        if (!names.includes(historyRecipientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [history, historyTypeFilter, historyTemplateFilter, historyRecipientFilter, serviceCenters, legalHandlers, customers]);

  // SEND via WhatsApp (Cloud API expects E.164)
  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (!selectedRecipients.length) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;

    // WhatsApp formatting: bold subject + blank line + body
    const text = `*${subject.trim()}*\n\n${message.trim()}`;

    for (const rid of selectedRecipients) {
      const { phone, name } = getRecipientPhoneAndName(rid);
      const to = toE164(phone);
      if (!to) { toast.error(`Missing/invalid phone for ${name || 'recipient'}`); continue; }

      try {
        await sendWhatsapp({ to, body: text }); // "+4477..." (no "whatsapp:")
        sent++;
      } catch (e: any) {
        console.error(e);
        toast.error(`Failed to WhatsApp ${name || to} (not on WhatsApp or unreachable)`);
      }
    }

    if (sent) {
      toast.success(`Sent ${sent} WhatsApp message${sent !== 1 ? 's' : ''}`);
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

  // ── UI (green accents)
  return (
    <div className="space-y-6">
      {/* Type & Template */}
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
            className={`px-4 py-2 rounded ${
              emailType === t ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'
            }`}
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

      {/* Recipients + Record Pickers */}
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
          {filteredRecipients.map(r => {
            const id = (r as any).id;
            const name = (r as any).name || (r as any).fullName;
            const email = (r as any).email;
            const phone = (r as any).phone || (r as any).mobile || (r as any).whatsapp;
            const selected = selectedRecipients.includes(id);
            return (
              <div key={id} className={`p-3 rounded border ${selected ? 'border-green-600 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-600">{email}</div>
                    <div className="text-sm text-gray-600">{phone}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (emailType === 'claim') {
                        setSelectedRecipients(selected ? [] : [id]);
                        if (!selected) {
                          setSelectedRecordId('');
                          if (!claimOptionsByRecipient[id]) loadClaimsForLegalHandler(id);
                        }
                      } else {
                        setSelectedRecipients(selected ? [] : [id]);
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

      {/* Content */}
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
            className="mt-1 w-full border rounded p-2 h-96 focus:ring-2 focus:ring-green-400"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={currentTemplate && !templateReady ? 'Pick required record(s) to auto-fill…' : ''}
          />
        </div>
       <button
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed" // ✨ MODIFIED
          onClick={handleSend}
          disabled={loading || !can('whatsapp', 'send')} // ✨ MODIFIED
        >
          {loading ? 'Sending…' : 'Send on WhatsApp'}
        </button>
      </div>

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
              {(Object.keys(emailTemplates) as EmailType[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="border p-1 rounded"
              value={historyTemplateFilter}
              onChange={e => setHistoryTemplateFilter(e.target.value)}
            >
              <option value="">All Templates</option>
              {Array.from(new Set(history.map(h => h.templateId))).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
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
                <td className="border px-2 py-1">{format(h.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                <td className="border px-2 py-1">{h.type}</td>
                <td className="border px-2 py-1">{h.templateId}</td>
                <td className="border px-2 py-1">
                  {h.recipients.map(rid => {
                    if (h.type === 'maintenance') return serviceCenters.find(c => c.id === rid)?.name;
                    if (h.type === 'claim')       return legalHandlers.find(l => l.id === rid)?.name;
                    return customers.find(c => c.id === rid)?.name;
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
