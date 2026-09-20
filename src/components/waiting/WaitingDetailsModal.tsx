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
    <div className="flex flex-wrap items-center gap-2.5">
      <a
        id="modal-action-call"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer"
        href={`tel:${entry.phone}`}
      >
        <Phone className="w-3.5 h-3.5" /> Call
      </a>
      <a
        id="modal-action-sms"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-600 hover:text-white transition shadow-sm cursor-pointer"
        href={`sms:${entry.phone}`}
      >
        <MessageCircle className="w-3.5 h-3.5" /> SMS
      </a>
      <a
        id="modal-action-whatsapp"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/25 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white transition shadow-sm cursor-pointer"
        target="_blank"
        rel="noreferrer"
        href={`https://wa.me/${entry.phone.replace(/[^0-9]/g, '')}`}
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      {entry.email && (
        <a
          id="modal-action-email"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white transition shadow-sm cursor-pointer"
          href={`mailto:${entry.email}`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </a>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Waiting Entry Details" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left side: Driver Info & Notes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Driver Details Card */}
          <div className="rounded-2xl border border-white/10 p-5 bg-[#16192B] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-black text-white">{entry.fullName}</h3>
              <select
                id="modal-entry-status"
                className="px-3 py-1.5 bg-[#0F111A] text-white border border-white/20 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                value={entry.status}
                onChange={(e) => onStatusChange?.(e.target.value as WaitingStatus)}
              >
                {['new', 'contacted', 'waiting', 'offered', 'booked', 'not_proceeding'].map((s) => (
                  <option key={s} value={s} className="bg-[#0F111A] text-white py-1">
                    {s.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a className="text-white font-mono font-bold hover:underline" href={`tel:${entry.phone}`}>
                  {entry.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-white font-medium truncate">{entry.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-white font-medium truncate">
                  {(entry.categoryIds || []).map((id) => categoriesById[id] || id).join(', ') || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Tags className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-white font-medium truncate">
                  {(entry.groupIds || []).map((id) => groupsById[id] || id).join(', ') || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-300">
                  Created: <strong className="text-white font-mono">{entry.createdAt ? format(entry.createdAt, 'dd/MM/yyyy HH:mm') : '—'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-slate-300">
                  Offer expiry: <strong className="text-amber-300 font-mono">{entry.offerExpiryAt ? format(entry.offerExpiryAt, 'dd/MM/yyyy HH:mm') : 'None'}</strong>
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs uppercase font-bold text-white tracking-wider mb-2">Reason / Notes</div>
              <div className="rounded-xl border border-white/10 p-3.5 bg-[#0F111A] text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-inner">
                {(entry.reason || 'No initial reason provided')}{entry.preferredNotes ? `\n\n${entry.preferredNotes}` : ''}
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs uppercase font-bold text-white tracking-wider mb-2">Quick Dispatch Actions</div>
              {contactBlock}
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-2xl border border-white/10 p-5 bg-[#16192B] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">Driver Notes ({notes.length})</h4>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div key={n.id} className="border border-white/10 rounded-xl p-3 bg-[#0F111A] shadow-inner space-y-1">
                  <div className="text-xs sm:text-sm text-white font-medium whitespace-pre-wrap leading-relaxed">{n.text}</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {n.createdAt ? format(n.createdAt, 'dd/MM/yyyy HH:mm') : ''}{n.createdBy ? ` · by ${n.createdBy}` : ''}
                  </div>
                </div>
              ))}
              {!notes.length && (
                <div className="text-xs text-slate-400 italic py-3 text-center">No notes recorded yet.</div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <textarea
                id="modal-add-note-input"
                className="flex-1 bg-[#0F111A] border border-white/20 text-white placeholder-slate-400 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[64px]"
                placeholder="Add a note regarding this driver..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button
                id="modal-add-note-btn"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md self-end sm:self-stretch"
                onClick={addNote}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>

        {/* Right side: Reminders */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 p-5 bg-[#16192B] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" /> Reminders ({reminders.length})
              </h4>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={`border rounded-xl p-3 bg-[#0F111A] shadow-inner transition ${
                    r.isDone ? 'border-white/5 opacity-70' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-xs sm:text-sm font-semibold text-white leading-snug ${r.isDone ? 'line-through text-slate-400' : ''}`}>
                      {r.message}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!r.isDone}
                          onChange={() => toggleReminder(r)}
                          className="h-4 w-4 rounded border-white/20 bg-[#16192B] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-white text-xs font-bold">Done</span>
                      </label>
                      <button
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                        onClick={() => deleteReminder(r)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-amber-300 font-mono font-medium">
                      Due: {r.dueAt ? format(r.dueAt, 'dd/MM/yyyy HH:mm') : '—'}
                    </span>
                    <span>{r.assignedTo ? `Assigned: ${r.assignedTo}` : 'Unassigned'}</span>
                  </div>
                </div>
              ))}
              {!reminders.length && (
                <div className="text-xs text-slate-400 italic py-3 text-center">No active reminders.</div>
              )}
            </div>

            <div className="pt-2 space-y-3">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Reminder Message
                </label>
                <input
                  id="modal-reminder-message"
                  type="text"
                  placeholder="e.g., Call back about Prius..."
                  value={remText}
                  onChange={(e) => setRemText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F111A] border border-white/20 text-white placeholder-slate-400 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Due Date & Time
                </label>
                <input
                  id="modal-reminder-due"
                  type="datetime-local"
                  value={remDue}
                  onChange={(e) => setRemDue(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F111A] border border-white/20 text-white rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner [color-scheme:dark]"
                />
              </div>
              <button
                id="modal-add-reminder-btn"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md"
                onClick={addReminder}
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default WaitingDetailsModal;
