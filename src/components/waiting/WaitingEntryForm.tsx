// src/components/waiting/WaitingEntryForm.tsx
import React, { useEffect, useState } from 'react';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { format } from 'date-fns';
import {
  ContactPreference,
  WaitingCategory,
  WaitingEntry,
  WaitingGroup,
} from '../../types/waiting';

const REASONS = ['New hire','Replacement cab','Short-term hire','Accident – credit hire','Other'];
const isE164 = (p: string) => /^\+?[1-9]\d{1,14}$/.test((p || '').trim());

type Props = {
  entry?: WaitingEntry | null;
  categories: WaitingCategory[];
  groups: WaitingGroup[];
  onSubmit: (partial: Partial<WaitingEntry>) => Promise<void> | void;
  onCancel: () => void;
  saving?: boolean;
};

const WaitingEntryForm: React.FC<Props> = ({
  entry,
  categories,
  groups,
  onSubmit,
  onCancel,
  saving,
}) => {
  const editing = !!entry?.id;

  const [form, setForm] = useState<Partial<WaitingEntry>>({
    fullName: '',
    phone: '',
    email: '',
    reason: '',
    dateWanted: null,
    waitingType: 'open',
    preferredNotes: '',
    contactPreference: 'call',
    consentGiven: false,
    consentNote: '',
    categoryIds: [],
    groupIds: [],
    offerExpiryAt: null,
  });

  useEffect(() => {
    if (entry) {
      setForm({
        fullName: entry.fullName,
        phone: entry.phone,
        email: entry.email || '',
        reason: entry.reason || '',
        dateWanted: entry.dateWanted || null,
        waitingType: entry.waitingType,
        preferredNotes: entry.preferredNotes || '',
        contactPreference: entry.contactPreference,
        consentGiven: !!entry.consentGiven,
        consentNote: entry.consentNote || '',
        categoryIds: entry.categoryIds || [],
        groupIds: entry.groupIds || [],
        offerExpiryAt: entry.offerExpiryAt || null,
      });
    } else {
      setForm({
        fullName: '',
        phone: '',
        email: '',
        reason: '',
        dateWanted: null,
        waitingType: 'open',
        preferredNotes: '',
        contactPreference: 'call',
        consentGiven: false,
        consentNote: '',
        categoryIds: [],
        groupIds: [],
        offerExpiryAt: null,
      });
    }
  }, [entry]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName?.trim()) return alert('Full Name is required');
    if (!form.phone || !isE164(form.phone)) return alert('Phone must be E.164 (+447...)');
    await onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Full Name"
          value={form.fullName || ''}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <FormField
          label="Phone (E.164)"
          value={form.phone || ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
          placeholder="+447..."
        />

        <FormField
          label="Email (optional)"
          type="email"
          value={form.email || ''}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <div className="flex gap-2 flex-wrap mb-1">
            {REASONS.map(r => (
              <button
                key={r}
                type="button"
                className="px-2 py-1 border rounded text-xs"
                onClick={() => setForm({ ...form, reason: r })}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm min-h-[72px]"
            value={form.reason || ''}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        <FormField
          label="Date Wanted (optional)"
          type="date"
          value={form.dateWanted ? format(form.dateWanted as Date, 'yyyy-MM-dd') : ''}
          onChange={(e) =>
            setForm({ ...form, dateWanted: e.target.value ? new Date(e.target.value) : null })
          }
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Waiting List Type</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={form.waitingType || 'open'}
            onChange={(e) => setForm({ ...form, waitingType: e.target.value as any })}
          >
            <option value="open">Open</option>
            <option value="specific_date">Specific Date</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <FormField
            label="Preferred Vehicle / Notes"
            value={form.preferredNotes || ''}
            onChange={(e) => setForm({ ...form, preferredNotes: e.target.value })}
            multiline
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Preference</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={form.contactPreference || 'call'}
            onChange={(e) =>
              setForm({ ...form, contactPreference: e.target.value as ContactPreference })
            }
          >
            <option value="call">Call</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </div>

        <FormField
          label="Offer Expiry (optional)"
          type="datetime-local"
          value={form.offerExpiryAt ? format(form.offerExpiryAt as Date, "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={(e) =>
            setForm({ ...form, offerExpiryAt: e.target.value ? new Date(e.target.value) : null })
          }
        />

        <div className="flex items-center gap-2">
          <input
            id="consent"
            type="checkbox"
            className="rounded border-gray-300 text-primary focus:ring-primary"
            checked={!!form.consentGiven}
            onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })}
          />
          <label htmlFor="consent" className="text-sm">Consent Notes?</label>
        </div>

        {form.consentGiven && (
          <div className="md:col-span-2">
            <FormField
              label="Consent Note"
              value={form.consentNote || ''}
              onChange={(e) => setForm({ ...form, consentNote: e.target.value })}
              multiline
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <SearchableSelect
            options={categories.map(c => ({ id: c.id, label: c.name }))}
            value={(form.categoryIds || [])[0] || ''}
            onChange={(id) => setForm({ ...form, categoryIds: id ? [id] : [] })}
            placeholder="Select a category"
            isClearable
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <SearchableSelect
            options={groups.map(g => ({ id: g.id, label: g.name }))}
            value={(form.groupIds || [])[0] || ''}
            onChange={(id) => setForm({ ...form, groupIds: id ? [id] : [] })}
            placeholder="Select a group"
            isClearable
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="px-4 py-2 text-sm bg-white border rounded-md" onClick={onCancel} disabled={!!saving}>Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm text-white bg-primary rounded-md disabled:opacity-50" disabled={!!saving}>
          {saving ? 'Saving…' : editing ? 'Update Entry' : 'Create Entry'}
        </button>
      </div>
    </form>
  );
};

export default WaitingEntryForm;
