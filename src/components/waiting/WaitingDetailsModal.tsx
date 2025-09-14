// src/components/waiting/WaitingDetailsModal.tsx
import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Bell, Clock, Folder, Mail, MessageCircle, Phone, Tags } from 'lucide-react';
import { format } from 'date-fns';
import {
  WaitingEntry,
  WaitingNote,
  WaitingReminder,
  WaitingStatus,
  toDate,
} from '../../types/waiting';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import FormField from '../ui/FormField';
import { useAuth } from '../../context/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  entry: WaitingEntry | null;
  categoriesById: Record<string, string>;
  groupsById: Record<string, string>;
  onStatusChange?: (status: WaitingStatus) => void;
};

const WaitingDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  entry,
  categoriesById,
  groupsById,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<WaitingNote[]>([]);
  const [reminders, setReminders] = useState<WaitingReminder[]>([]);
  const [noteText, setNoteText] = useState('');
  const [remText, setRemText] = useState('');
  const [remDue, setRemDue] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !entry?.id) return;
    const nRef = collection(db, 'waiting_entries', entry.id, 'notes');
    const rRef = collection(db, 'waiting_entries', entry.id, 'reminders');

    const unsubN = onSnapshot(query(nRef, orderBy('createdAt','desc')), snap => {
      setNotes(snap.docs.map(d => {
        const x: any = d.data();
        return { id: d.id, text: x.text, createdBy: x.createdBy || '', createdAt: toDate(x.createdAt) };
      }));
    });

    const unsubR = onSnapshot(query(rRef, orderBy('dueAt','asc')), snap => {
      setReminders(snap.docs.map(d => {
        const x: any = d.data();
        return {
          id: d.id,
          message: x.message,
          dueAt: toDate(x.dueAt),
          assignedTo: x.assignedTo || null,
          isDone: !!x.isDone,
          createdAt: toDate(x.createdAt),
          createdBy: x.createdBy || '',
        };
      }));
    });

    return () => { unsubN(); unsubR(); };
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry) return null;

  const addNote = async () => {
    if (!noteText.trim()) return;
    await addDoc(collection(db, 'waiting_entries', entry.id, 'notes'), {
      text: noteText.trim(),
      createdAt: serverTimestamp(),
      createdBy: user?.uid || '',
    });
    setNoteText('');
  };

  const addReminder = async () => {
    if (!remText.trim() || !remDue) return;
    await addDoc(collection(db, 'waiting_entries', entry.id, 'reminders'), {
      message: remText.trim(),
      dueAt: new Date(remDue),
      assignedTo: user?.uid || null,
      isDone: false,
      createdAt: serverTimestamp(),
      createdBy: user?.uid || '',
    });
    setRemText('');
    setRemDue('');
  };

  const toggleReminder = async (r: WaitingReminder) =>
    updateDoc(doc(db, 'waiting_entries', entry.id, 'reminders', r.id), { isDone: !r.isDone });

  const deleteReminder = async (r: WaitingReminder) =>
    deleteDoc(doc(db, 'waiting_entries', entry.id, 'reminders', r.id));

  const contactBlock = (
    <div className="flex flex-wrap gap-2">
      <a className="btn btn-xs" href={`tel:${entry.phone}`}><Phone size={14}/> Call</a>
      <a className="btn btn-xs" href={`sms:${entry.phone}`}><MessageCircle size={14}/> SMS</a>
      <a className="btn btn-xs" target="_blank" rel="noreferrer" href={`https://wa.me/${entry.phone.replace('+','')}`}><MessageCircle size={14}/> WhatsApp</a>
      <a className="btn btn-xs" href={`mailto:${entry.email || ''}`}><Mail size={14}/> Email</a>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Waiting Entry Details" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left side */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded border p-3 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold">{entry.fullName}</div>
              <select
                className="input h-8"
                value={entry.status}
                onChange={(e) => onStatusChange?.(e.target.value as WaitingStatus)}
              >
                {['new','contacted','waiting','offered','booked','not_proceeding'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ')}</option>
                ))}
              </select>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2"><Phone size={16}/> <a className="text-primary" href={`tel:${entry.phone}`}>{entry.phone}</a></div>
              <div className="flex items-center gap-2"><Mail size={16}/> {entry.email || '—'}</div>
              <div className="flex items-center gap-2"><Folder size={16}/> {(entry.categoryIds||[]).map(id => categoriesById[id] || id).join(', ') || '—'}</div>
              <div className="flex items-center gap-2"><Tags size={16}/> {(entry.groupIds||[]).map(id => groupsById[id] || id).join(', ') || '—'}</div>
              <div className="flex items-center gap-2"><Clock size={16}/> Created {entry.createdAt ? format(entry.createdAt,'PPpp') : '—'}</div>
              <div className="flex items-center gap-2"><Clock size={16}/> Offer expiry {entry.offerExpiryAt ? format(entry.offerExpiryAt,'PPpp') : '—'}</div>
            </div>

            <div className="mt-3">
              <div className="text-xs uppercase text-gray-500 mb-1">Reason / Notes</div>
              <div className="rounded border p-3 bg-gray-50 whitespace-pre-wrap">
                {(entry.reason || '—')}{entry.preferredNotes ? `\n\n${entry.preferredNotes}` : ''}
              </div>
            </div>

            <div className="mt-3">{contactBlock}</div>
          </div>

          {/* Notes */}
          <div className="rounded border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">Notes</h4>
            </div>
            <div className="space-y-3 max-h-56 overflow-auto">
              {notes.map(n => (
                <div key={n.id} className="border rounded p-2">
                  <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {n.createdAt ? format(n.createdAt,'PPpp') : ''} · by {n.createdBy || '—'}
                  </div>
                </div>
              ))}
              {!notes.length && <div className="text-sm text-gray-500">No notes yet.</div>}
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <textarea
                className="input min-h-[64px]"
                placeholder="Add a note…"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button className="btn btn-primary h-full" onClick={addNote}>Add Note</button>
            </div>
          </div>
        </div>

        {/* Right side: Reminders */}
        <div className="space-y-3">
          <div className="rounded border p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2"><Bell size={16}/> Reminders</h4>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {reminders.map(r => (
                <div key={r.id} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.message}</div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={!!r.isDone} onChange={() => toggleReminder(r)} />
                        Done
                      </label>
                      <button className="text-xs text-red-600" onClick={() => deleteReminder(r)}>Delete</button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Due {r.dueAt ? format(r.dueAt,'PPpp') : '—'} · {r.assignedTo ? `Assigned: ${r.assignedTo}` : 'Unassigned'}
                  </div>
                </div>
              ))}
              {!reminders.length && <div className="text-sm text-gray-500">No reminders yet.</div>}
            </div>

            <div className="mt-3 space-y-2">
              <FormField label="Reminder message" value={remText} onChange={(e) => setRemText(e.target.value)} />
              <FormField label="Due at" type="datetime-local" value={remDue} onChange={(e) => setRemDue(e.target.value)} />
              <div className="flex justify-end">
                <button className="btn btn-primary" onClick={addReminder}>Add Reminder</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WaitingDetailsModal;
