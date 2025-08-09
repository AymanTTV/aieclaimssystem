// src/pages/BulkEmail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, Mail, Trash2 } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  doc
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
import { fetchLegalHandlers } from '../utils/legalHandlers';

import {
  emailTemplates,
  EmailType
} from '../constants/emailTemplates';
import { fillPlaceholders } from '../utils/templateUtils';
import { sendEmail } from '../utils/emailService';
import { useEmailHistory, logEmailHistory } from '../hooks/useEmailHistory';

import SearchableSelect from '../components/ui/SearchableSelect';
import { LegalHandler } from '../types/legalHandler';

export default function BulkEmail() {
  const { user } = useAuth();

  // ─── STATE ──────────────────────────────────────────────────────
  const [emailType, setEmailType]                   = useState<EmailType>('custom');
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
  const { customers }            = useCustomers();
  const { vehicles }             = useVehicles();
  const { rentals }              = useRentals();
  const { logs: maintenanceLogs} = useMaintenanceLogs();
  const { serviceCenters }       = useServiceCenters();
  const { invoices }             = useInvoices();
  const { claims }               = useClaims();
  const { history }              = useEmailHistory();

  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);

  // Pull templates for this type
  const templates       = emailTemplates[emailType] || [];
  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  // ─── LOAD LEGAL HANDLERS ────────────────────────────────────────
  useEffect(() => {
    if (emailType === 'claim') {
      fetchLegalHandlers()
        .then(setLegalHandlers)
        .catch(() => toast.error('Failed to load legal handlers'));
    }
  }, [emailType]);

  // ─── RECIPIENT FILTER ───────────────────────────────────────────
  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (emailType === 'maintenance') {
      return serviceCenters.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    if (emailType === 'claim') {
      return legalHandlers.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q)
      );
    }
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [emailType, searchQuery, customers, serviceCenters, legalHandlers]);

  // ─── RELATED RECORDS ────────────────────────────────────────────
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
            return {
              id: r.id,
              label: `${v.registrationNumber} (${format(r.startDate,'dd/MM/yyyy')})`
            };
          })
          .filter((x): x is {id:string;label:string} => !!x);

      case 'maintenance':
        const centerName = serviceCenters.find(c => c.id === recipientId)?.name;
        return maintenanceLogs
          .filter(m => m.serviceProvider === centerName)
          .map(m => ({
            id: m.id,
            label: `${m.type} @ ${format(m.date,'dd/MM/yyyy')}`
          }));

      case 'invoice':
        return invoices
          .filter(inv => inv.customerId === recipientId)
          .map(inv => ({
            id: inv.id,
            label: `INV-${inv.id.slice(-8).toUpperCase()} (${format(inv.date,'dd/MM/yyyy')})`
          }));

      case 'claim':
        return claims
          .filter(c => c.fileHandlers.legalHandler?.id === recipientId)
          .map(c => ({
            id: c.id,
            label: `${c.claimId.toUpperCase()} – ${format(c.dateOfEvent,'dd/MM/yyyy')}`
          }));

      default:
        return [];
    }
  }

  // ─── AUTO-FILL PLACEHOLDERS ────────────────────────────────────
  useEffect(() => {
    if (!currentTemplate || !selectedTemplateId || selectedRecipients.length !== 1) return;
    const rid = selectedRecipients[0];
    const ctx: Record<string, string> = {};

    // common name fields
    const cust = customers.find(c => c.id === rid);
    if (cust) {
      ctx["Driver's Name"] = cust.name;
      ctx['Customer Name']  = cust.name;
    }
    if (emailType === 'maintenance') {
      const sc = serviceCenters.find(c => c.id === rid);
      if (sc) ctx["Recipient's Name"] = sc.name;
    }
    if (emailType === 'claim') {
      const lh = legalHandlers.find(h => h.id === rid);
      if (lh) ctx["Recipient's Name"] = lh.name;
    }

    // mileageRequest
    if (currentTemplate.id === 'mileageRequest') {
      ctx['Date'] = format(new Date(), 'dd/MM/yyyy');
    }

    // vehicle placeholders
    if (selectedVehicleId) {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      if (v) {
        ctx['Vehicle Registration Number'] = v.registrationNumber;
        if (emailType === 'maintenance' || emailType === 'custom') {
          ctx['Make & Model'] = `${v.make} ${v.model}`;
          ctx['Year']         = `${v.year}`;
        }
      }
    }

    // custom “serviceBooking”
    if (
      emailType === 'custom' &&
      currentTemplate.id === 'serviceBooking' &&
      selectedMaintenanceId
    ) {
      const m = maintenanceLogs.find(m => m.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(v => v.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Make & Model']                = `${v.make} ${v.model}`;
          ctx['Year']                        = `${v.year}`;
        }
        ctx['Service Type'] = m.type;
        ctx['Date & Time']  = format(m.date,'dd/MM/yyyy HH:mm');
        ctx['Location']     = m.location;
      }
    }

    // maintenance templates
    if (emailType === 'maintenance' && selectedMaintenanceId) {
      const m = maintenanceLogs.find(m => m.id === selectedMaintenanceId);
      if (m) {
        const v = vehicles.find(v => v.id === m.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Make & Model']                = `${v.make} ${v.model}`;
          ctx['Year']                        = `${v.year}`;
        }
        if (currentTemplate.id === 'serviceBooking') {
          ctx['Service Type'] = m.type;
          ctx['Date & Time']  = format(m.date,'dd/MM/yyyy HH:mm');
          ctx['Location']     = m.location;
          ctx['Additional Notes'] = m.description;
        }
        if (currentTemplate.id === 'invoiceRequest') {
          ctx['Repair Date']  = format(m.date,'dd/MM/yyyy');
          ctx['Service Type'] = m.type;
        }
      }
    }

    // rental
    if (emailType === 'rental' && selectedRecordId) {
      const r = rentals.find(r => r.id === selectedRecordId);
      if (r) {
        const v = vehicles.find(v => v.id === r.vehicleId);
        if (v) {
          ctx['Vehicle Registration Number'] = v.registrationNumber;
          ctx['Start Date']   = format(r.startDate,'dd/MM/yyyy');
          ctx['End Date']     = format(r.endDate,  'dd/MM/yyyy');
        }
        ctx['Rental Type']  = r.type;
        ctx['Total Amount'] = `£${r.cost.toFixed(2)}`;
        ctx['Amount Paid']  = `£${r.paidAmount.toFixed(2)}`;
        ctx['Outstanding Balance'] = `£${r.remainingAmount.toFixed(2)}`;
      }
    }

    // invoice
    if (emailType === 'invoice' && selectedRecordId) {
      const inv = invoices.find(i => i.id === selectedRecordId);
      if (inv) {
        ctx['Invoice Number'] = `INV-${inv.id.slice(-8).toUpperCase()}`;
        ctx['Invoice Date']   = format(inv.date,'dd/MM/yyyy');
        ctx['Amount']         = `£${inv.amount.toFixed(2)}`;
        ctx['Due Date']       = format(inv.dueDate,'dd/MM/yyyy');
      }
    }

    // claim
    if (emailType === 'claim' && selectedRecordId) {
      const c = claims.find(c => c.id === selectedRecordId);
      if (c) {
        const clientName = c.driver.fullName || c.submitter.fullName;
        ctx['Client Name']              = clientName;
        ctx['Client Registration']      = c.submitter.companyRegistration || '';
        ctx['Third Party Registration'] = c.faultParty.vehicleRegistration || '';
        ctx['Date']                     = format(c.dateOfEvent,'dd/MM/yyyy');
        ctx['Time']                     = c.incidentTime;
        ctx['Location']                 = c.locationOfEvent;
        ctx['Description']              = c.accidentDetails.cause;
      }
    }

    setSubject(fillPlaceholders(currentTemplate.subjectTemplate, ctx));
    setMessage(fillPlaceholders(currentTemplate.bodyTemplate, ctx));
  }, [
    emailType,
    selectedTemplateId,
    selectedRecipients,
    selectedVehicleId,
    selectedMaintenanceId,
    selectedRecordId,
    currentTemplate,
    customers,
    vehicles,
    rentals,
    maintenanceLogs,
    invoices,
    claims,
    legalHandlers
  ]);

  // ─── HISTORY FILTERS & CLEAR ───────────────────────────────────
  const [historyTypeFilter, setHistoryTypeFilter]           = useState<EmailType|'all'>('all');
  const [historyTemplateFilter, setHistoryTemplateFilter]   = useState<string>('');
  const [historyRecipientFilter, setHistoryRecipientFilter] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (historyTypeFilter!=='all' && h.type!==historyTypeFilter) return false;
      if (historyTemplateFilter && h.templateId!==historyTemplateFilter) return false;
      if (historyRecipientFilter) {
        const names = h.recipients.map(rid => {
          if (h.type==='maintenance') return serviceCenters.find(c=>c.id===rid)?.name;
          if (h.type==='claim')       return legalHandlers.find(l=>l.id===rid)?.name;
          return customers.find(c=>c.id===rid)?.name;
        }).filter(Boolean).join(', ').toLowerCase();
        if (!names.includes(historyRecipientFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    history,
    historyTypeFilter,
    historyTemplateFilter,
    historyRecipientFilter,
    serviceCenters,
    legalHandlers,
    customers
  ]);

  const handleClearHistory = async () => {
    if (!window.confirm('Delete ALL history entries forever?')) return;
    const batch = writeBatch(db);
    history.forEach(h => batch.delete(doc(db,'emailHistory',h.id)));
    await batch.commit();
    toast.success('Email history cleared');
  };

  // ─── SEND EMAILS ──────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject || !message) return toast.error('Subject & message required');
    if (!selectedRecipients.length) return toast.error('Pick at least one recipient');

    setLoading(true);
    let sent = 0;
    for (let rid of selectedRecipients) {
      let to_email='', to_name='';
      if (emailType==='maintenance') {
        const sc = serviceCenters.find(c=>c.id===rid)!;
        to_email=sc.email; to_name=sc.name;
      } else if (emailType==='claim') {
        const lh = legalHandlers.find(h=>h.id===rid)!;
        to_email=lh.email; to_name=lh.name;
      } else {
        const c = customers.find(c=>c.id===rid)!;
        to_email=c.email; to_name=c.name;
      }
      try {
        await sendEmail({ to_email, to_name, subject, message });
        sent++;
      } catch {
        toast.error(`Failed to send to ${to_name}`);
      }
    }
    toast.success(`Sent ${sent} email${sent!==1?'s':''}`);
    await logEmailHistory({
      sentBy: user?.uid || 'unknown',
      type: emailType,
      templateId: selectedTemplateId,
      recipients: selectedRecipients,
      subject,
      timestamp: new Date()
    });
    setLoading(false);
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Email Type & Template */}
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
              emailType === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
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
          {templates.map(tpl => (
            <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
          ))}
        </select>
      </div>

      {/* Recipients + Record Pickers */}
      <div className="bg-white p-4 rounded shadow space-y-2">
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
          {filteredRecipients.map(r => {
            const id       = r.id;
            const name     = (r as any).name || (r as any).fullName;
            const email    = (r as any).email;
            const selected = selectedRecipients.includes(id);
            return (
              <div key={id} className={`p-3 rounded border ${
                selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}>
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-600">{email}</div>
                  </div>
                  <button
                    onClick={()=>setSelectedRecipients(selected?[]:[id])}
                    className="p-1 bg-gray-100 rounded"
                  >
                    <Mail className="h-4 w-4"/>
                  </button>
                </div>

                {emailType==='custom' && currentTemplate?.requiredFields.includes('vehicle') && selected && (
                  <SearchableSelect
                    label="Select Vehicle"
                    options={getRelatedRecords(id)}
                    value={selectedVehicleId}
                    onChange={setSelectedVehicleId}
                  />
                )}
                {emailType==='custom' && currentTemplate?.requiredFields.includes('maintenance') && selected && (
                  <SearchableSelect
                    label="Select Maintenance"
                    options={getRelatedRecords(id)}
                    value={selectedMaintenanceId}
                    onChange={setSelectedMaintenanceId}
                  />
                )}
                {emailType==='rental' && selected && (
                  <SearchableSelect
                    label="Select Rental"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {emailType==='maintenance' && selected && (
                  <SearchableSelect
                    label="Select Maintenance"
                    options={getRelatedRecords(id)}
                    value={selectedMaintenanceId}
                    onChange={setSelectedMaintenanceId}
                  />
                )}
                {emailType==='invoice' && selected && (
                  <SearchableSelect
                    label="Select Invoice"
                    options={getRelatedRecords(id)}
                    value={selectedRecordId}
                    onChange={setSelectedRecordId}
                  />
                )}
                {emailType==='claim' && selected && (
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

      {/* Content Preview & Edit */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div>
          <label className="font-medium">Subject</label>
          <input
            className="mt-1 w-full border rounded p-2"
            value={subject}
            onChange={e=>setSubject(e.target.value)}
          />
        </div>
        <div>
          <label className="font-medium">Message</label>
          <textarea
            className="mt-1 w-full border rounded p-2 h-32"
            value={message}
            onChange={e=>setMessage(e.target.value)}
          />
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>

      {/* History Section */}
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
              {(Object.keys(emailTemplates) as EmailType[]).map(t=>(
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="border p-1 rounded"
              value={historyTemplateFilter}
              onChange={e=>setHistoryTemplateFilter(e.target.value)}
            >
              <option value="">All Templates</option>
              {Array.from(new Set(history.map(h=>h.templateId))).map(id=>(
                <option key={id} value={id}>{id}</option>
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
              onClick={handleClearHistory}
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
            {filteredHistory.map(h=>(
              <tr key={h.id}>
                <td className="border px-2 py-1">{format(h.timestamp,'dd/MM/yyyy HH:mm')}</td>
                <td className="border px-2 py-1">{h.type}</td>
                <td className="border px-2 py-1">{h.templateId}</td>
                <td className="border px-2 py-1">
                  {h.recipients.map(rid=>{
                    if(h.type==='maintenance') return serviceCenters.find(c=>c.id===rid)?.name;
                    if(h.type==='claim')       return legalHandlers.find(l=>l.id===rid)?.name;
                    return customers.find(c=>c.id===rid)?.name;
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
