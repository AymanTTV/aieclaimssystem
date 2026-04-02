// src/pages/WaitingPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import WaitingDeleteModal from '../components/waiting/WaitingDeleteModal';

// Shared UI
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';
import SearchableSelect from '../components/ui/SearchableSelect';

// Waiting components
import WaitingTable from '../components/waiting/WaitingTable';
import WaitingEntryForm from '../components/waiting/WaitingEntryForm';
import WaitingDetailsModal from '../components/waiting/WaitingDetailsModal';
import ManageWaitingCategoriesModal from '../components/waiting/ManageWaitingCategoriesModal';
import ManageWaitingGroupsModal from '../components/waiting/ManageWaitingGroupsModal';

// Types
import {
  WaitingCategory,
  WaitingEntry,
  WaitingGroup,
  WaitingStatus,
  toDate,
} from '../types/waiting';

// Export helper
import { exportWaitingEntriesToExcel } from '../utils/waitingExport';

const STATUS_FLOW: WaitingStatus[] = [
  'new',
  'contacted',
  'waiting',
  'offered',
  'booked',
  'not_proceeding',
];

const COMPLETED_STATUSES: WaitingStatus[] = ['booked', 'not_proceeding'];

const WaitingPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();

  // ─────────────────── Data ───────────────────
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [categories, setCategories] = useState<WaitingCategory[]>([]);
  const [groups, setGroups] = useState<WaitingGroup[]>([]);
  const [deleting, setDeleting] = useState<WaitingEntry | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Page Access Guard
  if (!can('waiting', 'view')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  useEffect(() => {
    const unsubE = onSnapshot(
      query(collection(db, 'waiting_entries'), orderBy('createdAt', 'desc')),
      (snap) => {
        setEntries(
          snap.docs.map((d) => {
            const x: any = d.data();
            return {
              id: d.id,
              ...x,
              createdAt: toDate(x.createdAt),
              updatedAt: toDate(x.updatedAt),
              lastActivityAt: toDate(x.lastActivityAt),
              dateWanted: toDate(x.dateWanted),
              offerExpiryAt: toDate(x.offerExpiryAt),
            } as WaitingEntry;
          })
        );
      }
    );
    const unsubC = onSnapshot(
      query(collection(db, 'waiting_categories'), orderBy('name')),
      (snap) => setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
    const unsubG = onSnapshot(
      query(collection(db, 'waiting_groups'), orderBy('name')),
      (snap) => setGroups(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
    return () => {
      unsubE();
      unsubC();
      unsubG();
    };
  }, []);

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );
  const groupsById = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, g.name])),
    [groups]
  );

  // ─────────────────── Filters ───────────────────
  const [qText, setQText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WaitingStatus>('all');
  const [catFilter, setCatFilter] = useState<string | 'all'>('all');
  const [grpFilter, setGrpFilter] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!showCompleted && COMPLETED_STATUSES.includes(e.status)) {
        return false;
      }

      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (catFilter !== 'all' && !(e.categoryIds || []).includes(catFilter)) return false;
      if (grpFilter !== 'all' && !(e.groupIds || []).includes(grpFilter)) return false;
      if (qText.trim()) {
        const s = qText.toLowerCase();
        const hay = `${e.fullName} ${e.phone} ${e.email || ''} ${e.reason || ''} ${
          e.preferredNotes || ''
        }`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [entries, statusFilter, catFilter, grpFilter, qText, showCompleted]); 

  // ─────────────────── Summary ───────────────────
  const summary = useMemo(() => {
    const byStatus: Record<WaitingStatus, number> = {
      new: 0,
      contacted: 0,
      waiting: 0,
      offered: 0,
      booked: 0,
      not_proceeding: 0,
    };
    let expiring = 0;
    let waitingDaysSum = 0,
      waitingCount = 0;
    for (const e of entries) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      if (e.offerExpiryAt) {
        const ms = e.offerExpiryAt.getTime() - Date.now();
        if (ms > 0 && ms < 24 * 60 * 60 * 1000) expiring++;
      }
      if (e.status === 'waiting' && e.createdAt) {
        waitingCount++;
        waitingDaysSum += Math.max(0, (Date.now() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    return {
      total: entries.length,
      byStatus,
      expiring,
      avgWaiting: waitingCount ? Math.round(waitingDaysSum / waitingCount) : 0,
    };
  }, [entries]);

  // ─────────────────── Export (Excel) ───────────────────
  const exportExcel = () => {
    if (!filtered.length) {
      toast('No rows to export');
      return;
    }
    exportWaitingEntriesToExcel(filtered, categoriesById, groupsById, 'waiting-entries');
    toast.success('Exported to Excel');
  };

  // ─────────────────── Mutations ───────────────────
  const createEntry = async (partial: Partial<WaitingEntry>) => {
    await addDoc(collection(db, 'waiting_entries'), {
      ...partial,
      status: 'new',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      createdBy: user?.uid || 'system',
    });
    toast.success('Entry created');
  };

  const updateEntry = async (id: string, partial: Partial<WaitingEntry>) => {
    await updateDoc(doc(db, 'waiting_entries', id), {
      ...partial,
      updatedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
    });
    toast.success('Entry updated');
  };

  const onStatusChange = async (entry: WaitingEntry, status: WaitingStatus) => {
    await updateEntry(entry.id, { status });
  };

  // ─────────────────── Modals / States ───────────────────
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WaitingEntry | null>(null);
  const [viewing, setViewing] = useState<WaitingEntry | null>(null);
  const [showCats, setShowCats] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const openCreate = () => {
    setViewing(null);
    setEditing(null);
    setShowForm(true);
  };

  // ─────────────────── Quick Contact ───────────────────
  const quickContact = (e: WaitingEntry) => {
    const msg = encodeURIComponent(
      `Hi ${e.fullName}, this is AIE Skyline. We'll update you about vehicle availability.`
    );
    switch (e.contactPreference) {
      case 'call':
        window.location.href = `tel:${e.phone}`;
        break;
      case 'sms':
        window.location.href = `sms:${e.phone}?body=${msg}`;
        break;
      case 'whatsapp':
        window.open(`https://wa.me/${e.phone.replace('+', '')}?text=${msg}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:${e.email || ''}?subject=Waiting%20List&body=${msg}`;
        break;
    }
  };

  // ─────────────────── UI ───────────────────
  return (
    <div className="space-y-6 p-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Waiting List</h1>

        <div className="flex flex-wrap gap-2">
          {can('waiting', 'create') && (
            <button className="btn btn-primary" onClick={openCreate}>
              New Entry
            </button>
          )}
          {can('waiting', 'export') && (
            <button className="btn" onClick={exportExcel}>
              Export
            </button>
          )}
          {can('waiting', 'categories') && (
            <button className="btn" onClick={() => setShowCats(true)}>
              Manage Categories
            </button>
          )}
          {can('waiting', 'groups') && (
            <button className="btn" onClick={() => setShowGroups(true)}>
              Manage Groups
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white border rounded">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-semibold">{summary.total}</div>
        </div>
        <div className="p-4 bg-white border rounded">
          <div className="text-xs text-gray-500">Expiring Offers (24h)</div>
          <div className="text-2xl font-semibold">{summary.expiring}</div>
        </div>
        <div className="p-4 bg-white border rounded">
          <div className="text-xs text-gray-500">Avg days in Waiting</div>
          <div className="text-2xl font-semibold">{summary.avgWaiting}</div>
        </div>
        <div className="p-4 bg-white border rounded">
          <div className="text-xs text-gray-500">Booked</div>
          <div className="text-2xl font-semibold">{summary.byStatus.booked || 0}</div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="p-3 bg-white border rounded grid grid-cols-1 md:grid-cols-4 gap-3">
        <FormField
          label="Search"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Name, phone, reason…"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-start md:mt-6">
          <input
            id="show-completed"
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="show-completed" className="ml-2 block text-sm text-gray-900">
            Show completed
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <SearchableSelect
            options={[{ id: 'all', label: 'All' }, ...categories.map((c) => ({ id: c.id, label: c.name }))]}
            value={catFilter}
            onChange={(v: string) => setCatFilter((v as any) || 'all')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <SearchableSelect
            options={[{ id: 'all', label: 'All' }, ...groups.map((g) => ({ id: g.id, label: g.name }))]}
            value={grpFilter}
            onChange={(v: string) => setGrpFilter((v as any) || 'all')}
          />
        </div>
      </div>

      {/* TABLE */}
      <WaitingTable
        entries={filtered}
        categoriesById={categoriesById}
        onView={(e) => setViewing(e)}
        onEdit={(e) => {
          setViewing(null);
          setEditing(e);
          setShowForm(true);
        }}
        onQuickContact={(e) => quickContact(e)}
        onReminder={(e) => setViewing(e)}
        onStatusChange={(e, status) => onStatusChange(e, status)}
        onDelete={(e) => setDeleting(e)}
      />

      {/* CREATE / EDIT FORM */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Entry' : 'New Entry'}
        size="xl"
      >
        <WaitingEntryForm
          entry={editing || undefined}
          categories={categories}
          groups={groups}
          onSubmit={async (partial) => {
            if (editing) {
              await updateEntry(editing.id, partial);
            } else {
              await createEntry(partial);
            }
            setShowForm(false);
            setEditing(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* DETAILS */}
      <WaitingDetailsModal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        entry={viewing}
        categoriesById={categoriesById}
        groupsById={groupsById}
        onStatusChange={(status) => viewing && onStatusChange(viewing, status)}
      />

      {/* MANAGE CATEGORIES */}
      <ManageWaitingCategoriesModal open={showCats} onClose={() => setShowCats(false)} />

      {/* MANAGE GROUPS */}
      <ManageWaitingGroupsModal open={showGroups} onClose={() => setShowGroups(false)} />

      {/* DELETE MODAL */}
      <Modal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Waiting Entry"
        size="md"
      >
        {deleting && (
          <WaitingDeleteModal
            entryId={deleting.id}
            onClose={() => setDeleting(null)}
            onDeleted={() => {
              setViewing(null);
              setEditing(null);
              setShowForm(false);
            }}
          />
        )}
      </Modal>

    </div>
  );
};

export default WaitingPage;