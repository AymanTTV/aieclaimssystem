// src/pages/waiting/components/WaitingEntriesTab.tsx
import React, { useMemo, useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useWaitingCategories, useWaitingEntries, useWaitingGroups } from '../../hooks/useWaiting';
import { WaitingEntry, WaitingStatus } from '../../types/waiting';
import { exportWaitingEntriesToCSV } from '../../utils/waitingExport';
import { logWaitingActivity } from '../../utils/waitingActivity';
import toast from 'react-hot-toast';

import WaitingTable from '../../components/waiting/WaitingTable';
import WaitingDetailsModal from '../../components/waiting/WaitingDetailsModal';
import WaitingEntryForm from '../../components/waiting/WaitingEntryForm';
import Modal from '../../components/ui/Modal';

const WaitingEntriesTab: React.FC = () => {
  const { user } = useAuth();
  const { categories } = useWaitingCategories();
  const { groups } = useWaitingGroups();
  const { entries } = useWaitingEntries();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WaitingEntry | null>(null);
  const [viewing, setViewing] = useState<WaitingEntry | null>(null);
  const [reminding, setReminding] = useState<WaitingEntry | null>(null);

  const categoriesById = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);
  const groupsById = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);

  const handleCreate = async (data: Partial<WaitingEntry>) => {
    const payload: Omit<WaitingEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      fullName: data.fullName!,
      phone: data.phone!,
      email: data.email || '',
      reason: data.reason || '',
      dateWanted: data.dateWanted || null,
      waitingType: (data.waitingType as any) || 'open',
      preferredNotes: data.preferredNotes || '',
      contactPreference: (data.contactPreference as any) || 'call',
      consentGiven: !!data.consentGiven,
      consentNote: data.consentNote || '',
      status: 'new',
      categoryIds: data.categoryIds || [],
      groupIds: data.groupIds || [],
      assignedTo: user?.uid || (null as any),
      offerExpiryAt: data.offerExpiryAt || null,
      lastActivityAt: new Date(),
      createdBy: user?.uid || '',
    };
    const ref = await addDoc(collection(db, 'waiting_entries'), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    await logWaitingActivity(ref.id, user?.uid || '', 'create', 'Waiting entry created');
    toast.success('Entry created');
    setCreating(false);
  };

  const handleEdit = async (data: Partial<WaitingEntry>) => {
    if (!editing) return;
    await updateDoc(doc(db, 'waiting_entries', editing.id), {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email ?? '',
      reason: data.reason ?? '',
      dateWanted: data.dateWanted ?? null,
      waitingType: data.waitingType ?? 'open',
      preferredNotes: data.preferredNotes ?? '',
      contactPreference: data.contactPreference ?? 'call',
      consentGiven: !!data.consentGiven,
      consentNote: data.consentNote ?? '',
      categoryIds: data.categoryIds ?? [],
      groupIds: data.groupIds ?? [],
      offerExpiryAt: data.offerExpiryAt ?? null,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    await logWaitingActivity(editing.id, user?.uid || '', 'update', 'Waiting entry updated');
    toast.success('Entry updated');
    setEditing(null);
  };

  const onStatusChange = async (entry: WaitingEntry, status: WaitingStatus) => {
    await updateDoc(doc(db, 'waiting_entries', entry.id), { status, updatedAt: serverTimestamp(), lastActivityAt: serverTimestamp() });
    await logWaitingActivity(entry.id, user?.uid || '', 'status_change', `Status → ${status}`);
  };

  const quickContact = (e: WaitingEntry) => {
    const msg = encodeURIComponent(`Hi ${e.fullName}, this is AIE Skyline. We'll update you about vehicle availability.`);
    switch (e.contactPreference) {
      case 'call': window.location.href = `tel:${e.phone}`; break;
      case 'sms': window.location.href = `sms:${e.phone}?body=${msg}`; break;
      case 'whatsapp': window.open(`https://wa.me/${e.phone.replace('+','')}?text=${msg}`, '_blank'); break;
      case 'email': window.location.href = `mailto:${e.email || ''}?subject=Waiting%20List&body=${msg}`; break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>New Entry</button>
        <button className="btn" onClick={() => exportWaitingEntriesToCSV(entries as any, categoriesById, groupsById)}>
          Export CSV
        </button>
      </div>

      {/* DataTable */}
      <WaitingTable
        entries={entries}
        categoriesById={categoriesById}
        groupsById={groupsById}
        onView={(e) => setViewing(e)}
        onEdit={(e) => setEditing(e)}
        onQuickContact={quickContact}
        onReminder={(e) => setReminding(e)}
        onStatusChange={onStatusChange}
      />

      {/* Create */}
      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New Waiting Entry" size="xl">
        <WaitingEntryForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      </Modal>

      {/* Edit */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Waiting Entry" size="xl">
        {editing && <WaitingEntryForm entry={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />}
      </Modal>

      {/* Details */}
      <WaitingDetailsModal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        entry={viewing}
        categoriesById={categoriesById}
        groupsById={groupsById}
      />

      {/* Reminder (placeholder) */}
      <Modal isOpen={!!reminding} onClose={() => setReminding(null)} title="Add Reminder">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Open the record details to manage reminders and notes.</p>
          <div className="flex justify-end">
            <button className="btn" onClick={() => setReminding(null)}>Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WaitingEntriesTab;
