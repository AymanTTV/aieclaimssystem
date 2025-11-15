// src/pages/Todo.tsx
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
  Timestamp,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  CalendarDays,
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  PauseCircle,
  Settings,
  Download,
  Users,
  ArrowUpDown,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { User } from '../types';

// ────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────
type TodoStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';
type TodoPriority = 'low' | 'medium' | 'high';

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  category?: string;
  group?: string;
  dueDate?: Timestamp | null;
  assignedTo?: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Category { id: string; name: string; }
interface Group { id: string; name: string; }

const STATUS_META: Record<TodoStatus, { label: string; icon: React.ComponentType<any>; color: string; selectColor: string }> = {
  not_started: { label: 'Not Started', icon: Circle, color: 'bg-gray-100 text-gray-700', selectColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'bg-blue-100 text-blue-700', selectColor: 'bg-blue-100' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', selectColor: 'bg-emerald-100' },
  on_hold: { label: 'On Hold', icon: PauseCircle, color: 'bg-amber-100 text-amber-700', selectColor: 'bg-amber-100' },
};

const PRIORITY_META: Record<TodoPriority, { label: string; dot: string; color: string; sortOrder: number }> = {
  low: { label: 'Low', dot: 'bg-gray-400', color: 'text-gray-600', sortOrder: 1 },
  medium: { label: 'Medium', dot: 'bg-blue-500', color: 'text-blue-600', sortOrder: 2 },
  high: { label: 'High', dot: 'bg-orange-500', color: 'text-orange-600', sortOrder: 3 },
};

// ────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────
function formatFullTS(ts?: Timestamp | null) {
  if (!ts) return { date: '—', time: '—' };
  try {
    const d = ts.toDate();
    const date = d.toLocaleDateString('en-GB'); // dd/mm/yyyy
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date, time };
  } catch {
    return { date: '—', time: '—' };
  }
}

function isOverdue(d?: Timestamp | null, status?: TodoStatus) {
  if (!d || status === 'completed') return false;
  try {
    const dueDate = d.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────────────────────
const TodoPage: React.FC = () => {
  const { user } = useAuth();
  const { can, isManager } = usePermissions();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TodoStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Todo; direction: 'asc' | 'desc' } | null>({ key: 'dueDate', direction: 'asc' });

  // New states for date filter and completed tasks visibility
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [showCompleted, setShowCompleted] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [viewing, setViewing] = useState<Todo | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [managingGroups, setManagingGroups] = useState(false);

  useEffect(() => { if (user?.id) setSelectedUserId(user.id); }, [user?.id]);

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)))).catch(() => toast.error("Could not load users."));
    const unsubCategories = onSnapshot(query(collection(db, 'todo_categories'), orderBy('name')), snap => setCategories(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }))));
    const unsubGroups = onSnapshot(query(collection(db, 'todo_groups'), orderBy('name')), snap => setGroups(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }))));
    return () => { unsubCategories(); unsubGroups(); };
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'todos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => { setTodos(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))); setLoading(false); }, () => { toast.error('Failed to load tasks'); setLoading(false); });
    return () => unsub();
  }, []);

  // If user selects "Completed" from status dropdown, automatically enable "Show Completed"
  useEffect(() => {
    if (statusFilter === 'completed' && !showCompleted) {
      setShowCompleted(true);
    }
  }, [statusFilter, showCompleted]);
  
  const filteredTodos = useMemo(() => {
    let list = [...todos];

    // Hide completed tasks by default unless the toggle is on
    if (!showCompleted) {
      list = list.filter(t => t.status !== 'completed');
    }

    const targetId = isManager ? selectedUserId : user?.id;
    if (targetId && targetId !== 'all') list = list.filter(t => (t.assignedTo ?? t.createdBy) === targetId);

    // Apply date range filter on 'dueDate'
    if (dateRange.start) {
      list = list.filter(t => t.dueDate && t.dueDate.toDate() >= dateRange.start!);
    }
    if (dateRange.end) {
      const endOfDay = new Date(dateRange.end);
      endOfDay.setHours(23, 59, 59, 999); // Include the whole end day
      list = list.filter(t => t.dueDate && t.dueDate.toDate() <= endOfDay);
    }

    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter(t => t.category === categoryFilter);
    if (groupFilter !== 'all') list = list.filter(t => t.group === groupFilter);
    if (onlyOverdue) list = list.filter(t => isOverdue(t.dueDate, t.status));
    
    const term = search.trim().toLowerCase();
    if (term) list = list.filter(t => `${t.title} ${t.description || ''} ${t.category || ''} ${t.group || ''}`.toLowerCase().includes(term));
    
    return list;
  }, [todos, isManager, selectedUserId, user?.id, statusFilter, categoryFilter, groupFilter, search, onlyOverdue, showCompleted, dateRange]);

  const sortedAndFilteredTodos = useMemo(() => {
    let sortableItems = [...filteredTodos];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        let comparison = 0;
        if (sortConfig.key === 'priority') {
          comparison = PRIORITY_META[aValue as TodoPriority].sortOrder - PRIORITY_META[bValue as TodoPriority].sortOrder;
        } else if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
          comparison = aValue.toMillis() - bValue.toMillis();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [filteredTodos, sortConfig]);

  const summary = useMemo(() => ({
    total: filteredTodos.length,
    notStarted: filteredTodos.filter(t => t.status === 'not_started').length,
    inProgress: filteredTodos.filter(t => t.status === 'in_progress').length,
    overdue: filteredTodos.filter(t => isOverdue(t.dueDate, t.status)).length,
  }), [filteredTodos]);

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    if (!can('todo', 'update')) return toast.error('Permission denied.');
    try {
        await updateDoc(doc(db, 'todos', id), { status, updatedAt: serverTimestamp() });
        toast.success(`Task status updated to "${STATUS_META[status].label}"`);
    } catch (error) { toast.error('Failed to update status'); }
  };

  const requestSort = (key: keyof Todo) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const crudActions = {
    create: async (payload: Partial<Todo>) => {
      if (!user?.id || !can('todo', 'create')) return toast.error('Permission denied.');
      if (!payload.title?.trim()) return toast.error('Title is required.');
      await addDoc(collection(db, 'todos'), { ...payload, createdBy: user.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast.success('Task created'); setCreating(false);
    },
    update: async (id: string, payload: Partial<Todo>) => {
      if (!can('todo', 'update')) return toast.error('Permission denied.');
      await updateDoc(doc(db, 'todos', id), { ...payload, updatedAt: serverTimestamp() });
      toast.success('Task updated'); setEditing(null);
    },
    delete: async (id: string) => {
      if (!can('todo', 'delete')) return toast.error('Permission denied.');
      await deleteDoc(doc(db, 'todos', id));
      toast.success('Task deleted'); setDeleting(null);
    },
  };

  const exportCSV = () => {
    if (!can('todo', 'export')) return toast.error('Permission denied.');
    if (!sortedAndFilteredTodos.length) return toast.warn('No tasks to export.');
    const headers = ['Task Title', 'Category', 'Group', 'Deadline Date', 'Deadline Time', 'Priority', 'Assigned To', 'Status', 'Notes'];
    const rows = sortedAndFilteredTodos.map(t => {
      const deadline = formatFullTS(t.dueDate);
      const assignedUser = allUsers.find(u => u.id === t.assignedTo)?.name || 'N/A';
      return [ t.title, t.category || '', t.group || '', deadline.date, deadline.time, t.priority, assignedUser, t.status, t.description?.replace(/"/g, '""').replace(/\n/g, ' ') || '' ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "todo-export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-semibold">To-Do List</h1><p className="text-gray-500">Plan, track, and manage team tasks efficiently.</p></div>
        <div className="flex flex-wrap gap-2">
           {can('todo', 'create') && <button className="btn" onClick={() => setManagingCategories(true)}><Settings className="w-4 h-4 mr-2" /> Manage Categories</button>}
           {can('todo', 'create') && <button className="btn" onClick={() => setManagingGroups(true)}><Users className="w-4 h-4 mr-2" /> Manage Groups</button>}
           {can('todo', 'export') && <button className="btn" onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export to CSV</button>}
           {can('todo', 'create') && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> New Task</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard title="Total Tasks" value={summary.total} />
          <SummaryCard title="Not Started" value={summary.notStarted} />
          <SummaryCard title="In Progress" value={summary.inProgress} />
          <SummaryCard title="Overdue" value={summary.overdue} isWarning={summary.overdue > 0} />
      </div>

      <div className="p-3 bg-white border rounded space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="w-full pl-9 pr-3 py-2 rounded-md border" />
          </div>
          <button onClick={() => setShowFilters(s => !s)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-white">
            <Filter className="w-4 h-4" /> Filters {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t pt-4 mt-4">
            {isManager && ( <div> <label className="block text-sm font-medium mb-1">View Tasks For</label> <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-white"> <option value={user?.id || ''}>My Tasks</option> <option value="all">All Users</option> {allUsers.filter(u => u.id !== user?.id).map(u => (<option key={u.id} value={u.id}>{u.name}</option>))} </select> </div> )}
            <div> <label className="block text-sm font-medium mb-1">Status</label> <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full rounded-md border px-3 py-2 bg-white"> <option value="all">All Statuses</option> {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)} </select> </div>
            <div> <label className="block text-sm font-medium mb-1">Category</label> <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-white"> <option value="all">All Categories</option> {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)} </select> </div>
            <div> <label className="block text-sm font-medium mb-1">Group</label> <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-white"> <option value="all">All Groups</option> {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)} </select> </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Date</label>
              <input type="date" onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))} className="w-full rounded-md border px-3 py-2 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To Date</label>
              <input type="date" onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))} className="w-full rounded-md border px-3 py-2 bg-white" />
            </div>
            <div className="flex items-end"> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={onlyOverdue} onChange={e => setOnlyOverdue(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /> <span className="text-sm font-medium">Show overdue only</span> </label> </div>
            <div className="flex items-end"> <label className="flex items-center space-x-2 cursor-pointer"> <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /> <span className="text-sm font-medium">Show completed</span> </label> </div>
          </div>
        )}
      </div>

      <div className="rounded border overflow-x-auto bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
            <tr>
              <th scope="col" className="px-4 py-3"><SortableHeader columnKey="title" label="Task Title" sortConfig={sortConfig} requestSort={requestSort} /></th>
              <th scope="col" className="px-4 py-3">Category / Group</th>
              <th scope="col" className="px-4 py-3"><SortableHeader columnKey="dueDate" label="Deadline" sortConfig={sortConfig} requestSort={requestSort} /></th>
              <th scope="col" className="px-4 py-3"><SortableHeader columnKey="priority" label="Priority" sortConfig={sortConfig} requestSort={requestSort} /></th>
              <th scope="col" className="px-4 py-3">Assigned To</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Notes</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? ( <tr><td colSpan={8} className="text-center p-8 text-neutral-500">Loading tasks…</td></tr> ) 
            : sortedAndFilteredTodos.length === 0 ? ( <tr><td colSpan={8} className="text-center p-8"><div className="text-neutral-500">No tasks found.</div></td></tr> ) 
            : ( sortedAndFilteredTodos.map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3"><div>{t.category || 'N/A'}</div><div className="text-xs text-gray-500">{t.group || 'N/A'}</div></td>
                    <td className={clsx("px-4 py-3", isOverdue(t.dueDate, t.status) && 'text-red-600 font-bold')}>
                      <div>{formatFullTS(t.dueDate).date}</div><div className="text-xs text-gray-500">{formatFullTS(t.dueDate).time}</div>
                    </td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3">{allUsers.find(u => u.id === t.assignedTo)?.name || 'N/A'}</td>
                    <td className="px-4 py-3"><StatusSelector currentStatus={t.status} onStatusChange={(newStatus) => handleStatusChange(t.id, newStatus)} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{t.description || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {can('todo', 'view') && <button onClick={() => setViewing(t)} className="p-2 rounded-md hover:bg-gray-100" title="View"><Eye className="w-4 h-4" /></button>}
                        {can('todo', 'update') && <button onClick={() => setEditing(t)} className="p-2 rounded-md hover:bg-gray-100" title="Edit"><Pencil className="w-4 h-4" /></button>}
                        {can('todo', 'delete') && <button onClick={() => setDeleting(t)} className="p-2 rounded-md hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="New Task" size="xl"><TodoForm onCancel={() => setCreating(false)} onSubmit={crudActions.create} allUsers={allUsers} categories={categories} groups={groups} defaultAssignedTo={user?.id} /></Modal>
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Task" size="xl">{editing && <TodoForm initial={editing} onCancel={() => setEditing(null)} onSubmit={(v) => crudActions.update(editing.id, v)} allUsers={allUsers} categories={categories} groups={groups} />}</Modal>
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Task?" size="md">{deleting && <div className="space-y-4"><p>Are you sure you want to delete <span className="font-semibold">“{deleting.title}”</span>?</p><div className="flex items-center justify-end gap-2"><button className="btn" onClick={() => setDeleting(null)}>Cancel</button><button className="btn-danger" onClick={() => crudActions.delete(deleting.id)}>Delete</button></div></div>}</Modal>
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Task Details" size="xl">{viewing && <TodoDetailsModal todo={viewing} allUsers={allUsers} onClose={() => setViewing(null)} />}</Modal>
      <Modal isOpen={managingCategories} onClose={() => setManagingCategories(false)} title="Manage Categories" size="md"><DataManager collectionName="todo_categories" items={categories} onClose={() => setManagingCategories(false)}/></Modal>
      <Modal isOpen={managingGroups} onClose={() => setManagingGroups(false)} title="Manage Groups" size="md"><DataManager collectionName="todo_groups" items={groups} onClose={() => setManagingGroups(false)}/></Modal>
    </div>
  );
};
export default TodoPage;

// ────────────────────────────────────────────────────────────
// In-file Child Components
// ────────────────────────────────────────────────────────────
const StatusSelector = ({ currentStatus, onStatusChange }: { currentStatus: TodoStatus, onStatusChange: (newStatus: TodoStatus) => void }) => (<select value={currentStatus} onChange={(e) => onStatusChange(e.target.value as TodoStatus)} onClick={(e) => e.stopPropagation()} className={clsx("w-full rounded border-none text-xs font-medium py-1 pl-2 pr-7", STATUS_META[currentStatus].selectColor, 'focus:ring-1 focus:ring-blue-500' )}>{Object.entries(STATUS_META).map(([key, meta]) => ( <option key={key} value={key}>{meta.label}</option> ))}</select>);
const SortableHeader = ({ columnKey, label, sortConfig, requestSort }: { columnKey: keyof Todo; label: string; sortConfig: any; requestSort: (key: any) => void; }) => { const isSorting = sortConfig?.key === columnKey; return (<button className="flex items-center gap-2" onClick={() => requestSort(columnKey)}>{label}{isSorting ? ( sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" /> ) : ( <ArrowUpDown className="w-4 h-4 text-gray-400" /> )}</button>);};
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (<div><label className="block text-sm font-medium text-gray-700">{label}</label><div className="mt-1">{children}</div></div>);
function TodoForm({ initial, onSubmit, onCancel, allUsers, categories, groups, defaultAssignedTo }: { initial?: Partial<Todo>; onSubmit: (v: Partial<Todo>) => void; onCancel: () => void; allUsers: User[]; categories: Category[]; groups: Group[]; defaultAssignedTo?: string | null }) { const [formState, setFormState] = useState({ title: initial?.title || '', description: initial?.description || '', status: (initial?.status || 'not_started') as TodoStatus, priority: (initial?.priority || 'medium') as TodoPriority, category: initial?.category || '', group: initial?.group || '', assignedTo: initial?.assignedTo || defaultAssignedTo || '', dueDate: initial?.dueDate ? new Date(initial.dueDate.toDate().getTime() - (initial.dueDate.toDate().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '', }); const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; setFormState(prev => ({ ...prev, [name]: value })); }; const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ ...formState, dueDate: formState.dueDate ? Timestamp.fromDate(new Date(formState.dueDate)) : null, }); }; const inputClass = "block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2"; return ( <form onSubmit={handleSubmit} className="space-y-6 p-1"> <FormField label="Task Title"><input name="title" className={inputClass} placeholder="e.g., Renew fleet insurance" value={formState.title} onChange={handleChange} required /></FormField> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <FormField label="Assigned To"><select name="assignedTo" className={inputClass} value={formState.assignedTo} onChange={handleChange}><option value="">Unassigned</option>{allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField> <FormField label="Deadline"><input name="dueDate" type="datetime-local" className={inputClass} value={formState.dueDate} onChange={handleChange} /></FormField> <FormField label="Status"><select name="status" className={inputClass} value={formState.status} onChange={handleChange}>{Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></FormField> <FormField label="Priority"><select name="priority" className={inputClass} value={formState.priority} onChange={handleChange}>{Object.entries(PRIORITY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></FormField> <FormField label="Category"><select name="category" className={inputClass} value={formState.category} onChange={handleChange}><option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></FormField> <FormField label="Group"><select name="group" className={inputClass} value={formState.group} onChange={handleChange}><option value="">Select Group</option>{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></FormField> </div> <FormField label="Notes / Description"><textarea name="description" rows={4} className={inputClass} placeholder="Add extra details..." value={formState.description} onChange={handleChange} /></FormField> <div className="flex items-center justify-end gap-3 pt-4 border-t"><button type="button" className="btn" onClick={onCancel}>Cancel</button><button type="submit" className="btn btn-primary">{initial ? 'Save Changes' : 'Create Task'}</button></div> </form> );}
function TodoDetailsModal({ todo, allUsers, onClose }: { todo: Todo; allUsers: User[]; onClose: () => void }) { const assignedUser = allUsers.find(u => u.id === todo.assignedTo)?.name || 'Unassigned'; const deadline = formatFullTS(todo.dueDate); return ( <div className="space-y-6"> <div className="pb-4 border-b"><h3 className="text-xl font-bold leading-6 text-gray-900">{todo.title}</h3></div> <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4 text-sm"> <div><div className="font-medium text-gray-500">Status</div><StatusBadge status={todo.status} /></div> <div><div className="font-medium text-gray-500">Priority</div><PriorityBadge priority={todo.priority} /></div> <div className={clsx(isOverdue(todo.dueDate, todo.status) && 'text-red-600')}> <div className="font-medium text-gray-500">Deadline</div><div className="font-semibold">{deadline.date} at {deadline.time}</div> </div> <div><div className="font-medium text-gray-500">Category</div><div className="font-semibold">{todo.category || '—'}</div></div> <div><div className="font-medium text-gray-500">Group</div><div className="font-semibold">{todo.group || '—'}</div></div> <div><div className="font-medium text-gray-500">Assigned To</div><div className="font-semibold">{assignedUser}</div></div> </div> <div className="pt-4 border-t"> <h4 className="text-sm font-medium text-gray-500">Notes / Comments</h4> <p className="mt-1 p-3 bg-gray-50 rounded border whitespace-pre-wrap min-h-[100px] text-sm text-gray-800">{todo.description || 'No notes provided.'}</p> </div> <div className="flex justify-end pt-2"><button className="btn" onClick={onClose}>Close</button></div> </div> );}
function DataManager({ collectionName, items, onClose }: { collectionName: string; items: {id: string, name: string}[], onClose: () => void }) { const [name, setName] = useState(''); const [editing, setEditing] = useState<{id: string, name: string} | null>(null); const handleAdd = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; await addDoc(collection(db, collectionName), { name: name.trim() }); setName(''); }; const handleUpdate = async (e: React.FormEvent) => { e.preventDefault(); if (!editing || !editing.name.trim()) return; await updateDoc(doc(db, collectionName, editing.id), { name: editing.name.trim() }); setEditing(null); }; const handleDelete = async (id: string) => { if (window.confirm('Are you sure you want to delete this item? This cannot be undone.')) { await deleteDoc(doc(db, collectionName, id)); } }; return ( <div className="space-y-4"> <form onSubmit={editing ? handleUpdate : handleAdd} className="flex items-center gap-2"> <input className="input flex-grow" placeholder={editing ? 'Edit item name' : 'New item name'} value={editing ? editing.name : name} onChange={(e) => editing ? setEditing({...editing, name: e.target.value}) : setName(e.target.value)} /> <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Add'}</button> {editing && <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>} </form> <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2"> {items.map(item => ( <div key={item.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50"> <span>{item.name}</span> <div className="flex items-center gap-2"> <button onClick={() => setEditing(item)}><Pencil className="w-4 h-4 text-gray-500 hover:text-black"/></button> <button onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600"/></button> </div> </div> ))} </div> <div className="flex justify-end pt-2"><button className="btn" onClick={onClose}>Done</button></div> </div> );}
function StatusBadge({ status }: { status: TodoStatus }) { const Meta = STATUS_META[status]; return <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', Meta.color)}><Meta.icon className="w-3 h-3" />{Meta.label}</span>;}
function PriorityBadge({ priority }: { priority: TodoPriority }) { const Meta = PRIORITY_META[priority]; return <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', Meta.color)}><span className={clsx('w-2 h-2 rounded-full', Meta.dot)} />{Meta.label}</span>;}
const SummaryCard = ({ title, value, isWarning = false }: { title: string; value: number | string, isWarning?: boolean }) => (<div className="bg-white rounded-lg shadow-sm p-4"><p className="text-sm font-medium text-gray-500">{title}</p><p className={clsx("text-2xl font-semibold text-gray-900", isWarning && 'text-red-600')}>{value}</p></div>);