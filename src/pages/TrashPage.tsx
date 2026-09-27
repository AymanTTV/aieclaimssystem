// src/pages/TrashPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { restoreFromTrash, permanentlyDelete, emptyTrash, TrashItem } from '../utils/trashService';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions'; // ✅ Added permissions hook
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Filter, 
  Search, 
  Database, 
  Archive,
  Info,
  UserX,
  Eye,
  Copy,
  Check,
  Code,
  FileText,
  Calendar,
  Layers
} from 'lucide-react';
import { ROUTES } from '../routes';
import Modal from '../components/ui/Modal'; 

export default function TrashPage() {
  const { user } = useAuth();
  const { can } = usePermissions(); // ✅ Initialized permissions
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);
  
  const [selectedCollection, setSelectedCollection] = useState<string>(''); 
  const [searchQuery, setSearchQuery] = useState('');

  const [itemToRestore, setItemToRestore] = useState<TrashItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  
  // ✅ New state: View Deleted Info Modal & Empty Bin Modal
  const [itemToView, setItemToView] = useState<TrashItem | null>(null);
  const [infoViewTab, setInfoViewTab] = useState<'formatted' | 'json'>('formatted');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');

  const [showEmptyBinModal, setShowEmptyBinModal] = useState(false);
  const [emptyScope, setEmptyScope] = useState<'all' | 'filtered'>('all');
  const [isPurging, setIsPurging] = useState(false);

  // ✅ Updated to use dynamic role permissions instead of hardcoded roles
  if (!can('trash', 'view')) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // Fetch Users for Name Mapping
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const map: Record<string, string> = {};
        snap.forEach(doc => {
          const data = doc.data();
          map[doc.id] = data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown User';
        });
        setUsersMap(map);
      } catch (error) {
        console.error("Failed to fetch users map:", error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch Trash Items
  useEffect(() => {
    const q = query(collection(db, 'trash'), orderBy('deletedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          deletedAt: data.deletedAt?.toDate() || new Date(),
        } as TrashItem;
      });
      setTrashItems(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const availableCollections = useMemo(() => {
    const collections = new Set(trashItems.map(item => item.originalCollection));
    return Array.from(collections);
  }, [trashItems]);

  const stats = useMemo(() => {
    const total = trashItems.length;
    const collectionsCount = availableCollections.length;
    
    let mostDeleted = 'None';
    if (total > 0) {
      const counts: Record<string, number> = {};
      let maxCount = 0;
      trashItems.forEach(item => {
        counts[item.originalCollection] = (counts[item.originalCollection] || 0) + 1;
        if (counts[item.originalCollection] > maxCount) {
          maxCount = counts[item.originalCollection];
          mostDeleted = item.originalCollection;
        }
      });
    }

    return { total, collectionsCount, mostDeleted };
  }, [trashItems, availableCollections]);

  const filteredItems = useMemo(() => {
    if (!selectedCollection) return []; 

    let items = trashItems;
    if (selectedCollection !== 'all') {
      items = items.filter(i => i.originalCollection === selectedCollection);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.displayName.toLowerCase().includes(q));
    }
    return items;
  }, [trashItems, selectedCollection, searchQuery]);

  const confirmRestore = async (customItem?: TrashItem) => {
    const target = customItem || itemToRestore;
    if (!target) return;
    try {
      toast.loading('Restoring...', { id: 'restore' });
      await restoreFromTrash(target.id);
      toast.success(`${target.displayName} restored successfully`, { id: 'restore' });
      setItemToRestore(null); 
      if (itemToView?.id === target.id) {
        setItemToView(null);
      }
    } catch (e) {
      toast.error('Failed to restore item', { id: 'restore' });
    }
  };

  const confirmHardDelete = async (customItem?: TrashItem) => {
    const target = customItem || itemToDelete;
    if (!target) return;
    try {
      toast.loading('Deleting...', { id: 'delete' });
      await permanentlyDelete(target.id);
      toast.success('Item permanently deleted', { id: 'delete' });
      setItemToDelete(null); 
      if (itemToView?.id === target.id) {
        setItemToView(null);
      }
    } catch (e) {
      toast.error('Failed to delete item', { id: 'delete' });
    }
  };

  // ✅ One-click Empty Bin Handler
  const handleEmptyBin = async () => {
    if (isPurging) return;
    try {
      setIsPurging(true);
      toast.loading('Emptying recycle bin...', { id: 'empty-bin' });

      let targetIds: string[] | undefined = undefined;
      let count = stats.total;

      if (emptyScope === 'filtered' && selectedCollection && selectedCollection !== 'all') {
        targetIds = filteredItems.map(i => i.id);
        count = targetIds.length;
      }

      await emptyTrash(targetIds);

      toast.success(`Recycle bin emptied successfully (${count} item${count === 1 ? '' : 's'} permanently removed).`, { id: 'empty-bin' });
      setShowEmptyBinModal(false);
      if (itemToView) setItemToView(null);
    } catch (err: any) {
      console.error('Failed to empty recycle bin:', err);
      toast.error(err?.message || 'Failed to empty recycle bin', { id: 'empty-bin' });
    } finally {
      setIsPurging(false);
    }
  };

  const copyToClipboard = (text: string, type: 'json' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'json') {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
    toast.success(`${type === 'json' ? 'Payload JSON' : 'Record ID'} copied to clipboard`);
  };

  // Helper to format values cleanly
  const renderFormattedValue = (key: string, val: any): React.ReactNode => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-400 italic text-xs">Empty / None</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          val ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
        }`}>
          {val ? 'Yes' : 'No'}
        </span>
      );
    }
    if (typeof val === 'number') {
      const isPrice = /price|cost|amount|total|fee|balance|subtotal|vat/i.test(key);
      return (
        <span className="font-mono font-semibold text-slate-900">
          {isPrice ? `£${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : val.toLocaleString()}
        </span>
      );
    }
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return <span className="font-medium text-slate-800">{d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>;
        }
      }
      if (val.startsWith('http://') || val.startsWith('https://')) {
        return (
          <a href={val} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline truncate max-w-sm inline-block">
            {val}
          </a>
        );
      }
      return <span className="font-medium text-slate-800 break-words whitespace-pre-wrap">{val}</span>;
    }
    if (val instanceof Date || (typeof val?.toDate === 'function')) {
      const d = typeof val?.toDate === 'function' ? val.toDate() : val;
      return <span className="font-medium text-slate-800">{d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-slate-400 italic text-xs">Empty list</span>;
      if (val.every(item => typeof item === 'string' || typeof item === 'number')) {
        return (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {val.map((item, idx) => (
              <span key={idx} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 text-xs rounded border border-slate-200 font-mono">
                {String(item)}
              </span>
            ))}
          </div>
        );
      }
      return (
        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {val.length} item{val.length === 1 ? '' : 's'} (see JSON tab)
        </span>
      );
    }
    if (typeof val === 'object') {
      return (
        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {Object.keys(val).length} key{Object.keys(val).length === 1 ? '' : 's'} (see JSON tab)
        </span>
      );
    }
    return String(val);
  };

  // Filtered fields in View modal
  const itemFields = useMemo(() => {
    if (!itemToView?.data || typeof itemToView.data !== 'object') return [];
    const entries = Object.entries(itemToView.data);
    if (!fieldSearch.trim()) return entries;
    const q = fieldSearch.toLowerCase();
    return entries.filter(([k, v]) => 
      k.toLowerCase().includes(q) || 
      String(v).toLowerCase().includes(q)
    );
  }, [itemToView, fieldSearch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Page Header with Empty Bin Button --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Recycle Bin
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">
            Deleted items are kept here safely until restored or permanently removed.
          </p>
        </div>

        {/* ✅ One-Click Empty Bin Button */}
        {can('trash', 'deletePermanently') && stats.total > 0 && (
          <button
            onClick={() => {
              setEmptyScope(selectedCollection && selectedCollection !== 'all' ? 'filtered' : 'all');
              setShowEmptyBinModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Permanently empty recycle bin items"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <span>Empty Recycle Bin</span>
            <span className="ml-1 px-2 py-0.5 text-xs font-mono font-bold bg-red-200 text-red-800 rounded-full">
              {stats.total}
            </span>
          </button>
        )}
      </div>

      {/* --- Summary Cards (Wrapped with permission) --- */}
      {can('trash', 'cards') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FEF2F2] p-5 rounded-2xl shadow-xs border border-[#FECACA] flex items-center gap-4 text-[#0F172A]">
            <div className="p-3 bg-white border border-[#FECACA] text-[#DC2626] rounded-xl shadow-xs">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-[#DC2626] font-bold uppercase tracking-wider">Total Deleted Items</p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-[#B91C1C] tracking-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-[#F0F9FF] p-5 rounded-2xl shadow-xs border border-[#BAE6FD] flex items-center gap-4 text-[#0F172A]">
            <div className="p-3 bg-white border border-[#BAE6FD] text-[#0284C7] rounded-xl shadow-xs">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-[#0284C7] font-bold uppercase tracking-wider">Affected Modules</p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-[#0369A1] tracking-tight">{stats.collectionsCount}</p>
            </div>
          </div>

          <div className="bg-[#FAF5FF] p-5 rounded-2xl shadow-xs border border-[#E9D5FF] flex items-center gap-4 text-[#0F172A]">
            <div className="p-3 bg-white border border-[#E9D5FF] text-[#7E22CE] rounded-xl shadow-xs">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-[#7E22CE] font-bold uppercase tracking-wider">Most Deleted Module</p>
              <p className="text-lg font-black text-[#6B21A8] capitalize truncate tracking-tight">
                {stats.mostDeleted.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- Filters --- */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#E2E8F0]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#94A3B8]" />
            </div>
            <input
              type="text"
              placeholder="Search deleted items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!selectedCollection}
              className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-400 shadow-xs transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-[#94A3B8]" />
            </div>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm capitalize font-medium shadow-xs transition-all cursor-pointer"
            >
              <option value="" disabled>Select a Module to view records...</option>
              <option value="all">View All Modules</option>
              {availableCollections.map(col => (
                <option key={col} value={col}>
                  {col.replace(/([A-Z])/g, ' $1').trim()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- Table --- */}
      <div className="rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#F8FAFC] text-[#0F172A] border-b border-[#CBD5E1]">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-[#0F172A] uppercase tracking-wider select-none whitespace-nowrap">Record Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-[#0F172A] uppercase tracking-wider select-none whitespace-nowrap">Module</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-[#0F172A] uppercase tracking-wider select-none whitespace-nowrap">Deleted By</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-[#0F172A] uppercase tracking-wider select-none whitespace-nowrap">Deleted At</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-[#0F172A] uppercase tracking-wider select-none whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>

              {!selectedCollection && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Database className="h-12 w-12 text-slate-400 mb-4" />
                      <p className="text-lg font-bold text-slate-800">Select a Collection</p>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                        Please select a specific module from the dropdown above to view and manage its deleted records.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {selectedCollection && filteredItems.map((item, idx) => {
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
                return (
                  <tr key={item.id} className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {/* ✅ Clickable Record Name to view deleted info */}
                      <button
                        onClick={() => {
                          setItemToView(item);
                          setInfoViewTab('formatted');
                          setFieldSearch('');
                        }}
                        className="text-left font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5 group-hover:underline cursor-pointer"
                        title="Click to view full deleted information"
                      >
                        <span>{item.displayName}</span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white text-blue-700 border border-blue-200 capitalize">
                        {item.originalCollection.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center mr-2">
                          <UserX className="h-3 w-3 text-slate-600" />
                        </div>
                        <div className="text-sm font-medium text-slate-800">
                          {item.deletedBy === 'system' 
                            ? 'System' 
                            : (usersMap[item.deletedBy] || 'Unknown User')}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {item.deletedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      {/* ✅ View Deleted Info Button */}
                      <button
                        onClick={() => {
                          setItemToView(item);
                          setInfoViewTab('formatted');
                          setFieldSearch('');
                        }}
                        className="text-blue-700 hover:text-blue-900 mr-4 inline-flex items-center font-semibold transition-colors cursor-pointer"
                        title="View Deleted Information"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View Info
                      </button>

                      {/* ✅ Wrapped with Restore Permission */}
                      {can('trash', 'restore') && (
                        <button 
                          onClick={() => setItemToRestore(item)} 
                          className="text-emerald-700 hover:text-emerald-900 mr-4 inline-flex items-center font-semibold transition-colors cursor-pointer"
                          title="Restore Item"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" /> Restore
                        </button>
                      )}

                      {/* ✅ Wrapped with Delete Permanently Permission */}
                      {can('trash', 'deletePermanently') && (
                        <button 
                          onClick={() => setItemToDelete(item)} 
                          className="text-rose-700 hover:text-rose-900 inline-flex items-center font-semibold transition-colors cursor-pointer"
                          title="Permanently Delete"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {selectedCollection && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Trash2 className="h-10 w-10 text-slate-400 mb-3" />
                      <p className="text-base font-bold text-slate-800">Trash is empty</p>
                      <p className="text-sm text-slate-500 mt-1">No items match your current search/filter.</p>
                    </div>
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Clean Light Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#CBD5E1] px-5 py-3.5 flex items-center justify-between text-xs text-[#64748B]">
          <div>
            Showing <span className="font-bold text-[#0F172A]">{selectedCollection ? filteredItems.length : 0}</span> deleted record{(selectedCollection ? filteredItems.length : 0) === 1 ? '' : 's'}
          </div>
          <div className="text-[#64748B] font-medium">
            Recycle Bin
          </div>
        </div>
      </div>

      {/* --- ✅ VIEW DELETED INFO MODAL --- */}
      <Modal
        isOpen={!!itemToView}
        onClose={() => setItemToView(null)}
        title="Deleted Record Information"
        size="2xl"
      >
        {itemToView && (
          <div className="space-y-5">
            {/* Header Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                      {itemToView.originalCollection.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-xs font-mono text-slate-500">ID: {itemToView.id}</span>
                    <button
                      onClick={() => copyToClipboard(itemToView.id, 'id')}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                      title="Copy Record ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1.5">{itemToView.displayName}</h3>
                </div>

                <div className="text-xs text-slate-600 space-y-1 sm:text-right bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-lg border sm:border-0 border-slate-200">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deleted By: <strong>{itemToView.deletedBy === 'system' ? 'System' : (usersMap[itemToView.deletedBy] || 'Unknown User')}</strong></span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deleted: <strong>{itemToView.deletedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Switcher Tabs & Quick Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setInfoViewTab('formatted')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    infoViewTab === 'formatted'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Formatted Breakdown ({itemFields.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInfoViewTab('json')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                    infoViewTab === 'json'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 text-purple-600" />
                  Raw JSON Payload
                </button>
              </div>

              {infoViewTab === 'formatted' ? (
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fields or values..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              ) : (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(itemToView.data, null, 2), 'json')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>Copy Raw JSON</span>
                </button>
              )}
            </div>

            {/* Tab 1: Formatted Fields View */}
            {infoViewTab === 'formatted' && (
              <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                {itemFields.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    {fieldSearch ? 'No fields match your search filter.' : 'No data fields available for this record.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {itemFields.map(([key, value], idx) => {
                      const isEven = idx % 2 === 1;
                      return (
                        <div
                          key={key}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 ${
                            isEven ? 'bg-slate-50/60' : 'bg-white'
                          } hover:bg-blue-50/40 transition-colors`}
                        >
                          <div className="sm:w-1/3 text-xs font-bold text-slate-700 capitalize tracking-tight flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span>{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}</span>
                          </div>
                          <div className="sm:w-2/3 text-xs text-slate-900 text-left sm:text-right">
                            {renderFormattedValue(key, value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Raw JSON Payload */}
            {infoViewTab === 'json' && (
              <div className="relative">
                <pre className="max-h-[50vh] overflow-auto p-4 text-xs font-mono bg-slate-950 text-slate-100 rounded-xl border border-slate-800 leading-relaxed select-all">
                  {JSON.stringify(itemToView.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Original Collection: <strong className="font-semibold text-slate-700">{itemToView.originalCollection}</strong>
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setItemToView(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>

                {can('trash', 'restore') && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemToRestore(itemToView);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restore Record
                  </button>
                )}

                {can('trash', 'deletePermanently') && (
                  <button
                    type="button"
                    onClick={() => {
                      setItemToDelete(itemToView);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Delete Permanently
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* --- ✅ ONE-CLICK EMPTY RECYCLE BIN MODAL --- */}
      <Modal
        isOpen={showEmptyBinModal}
        onClose={() => !isPurging && setShowEmptyBinModal(false)}
        title="Empty Recycle Bin"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
            <h3 className="text-lg font-bold text-gray-900">Confirm Permanent Bin Purge</h3>
          </div>

          <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-red-900">
              Warning: This action is permanent and completely irreversible!
            </p>
            <p className="text-xs text-red-800 leading-relaxed">
              All items in the selected scope will be purged from the database and cannot be recovered or restored under any circumstances.
            </p>
          </div>

          {/* Scope Selector if filtered */}
          {selectedCollection && selectedCollection !== 'all' && (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Choose Purge Scope:
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="emptyScope"
                    value="all"
                    checked={emptyScope === 'all'}
                    onChange={() => setEmptyScope('all')}
                    disabled={isPurging}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>
                    Empty <strong>Entire Recycle Bin</strong> ({stats.total} total items across all modules)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="emptyScope"
                    value="filtered"
                    checked={emptyScope === 'filtered'}
                    onChange={() => setEmptyScope('filtered')}
                    disabled={isPurging}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>
                    Empty Only <strong>{selectedCollection.replace(/([A-Z])/g, ' $1').trim()}</strong> ({filteredItems.length} items shown)
                  </span>
                </label>
              </div>
            </div>
          )}

          {(!selectedCollection || selectedCollection === 'all') && (
            <p className="text-sm text-slate-600">
              You are about to permanently delete all <strong className="text-slate-900 font-bold">{stats.total}</strong> record{stats.total === 1 ? '' : 's'} from the recycle bin.
            </p>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-3 border-t border-slate-200">
            <button
              onClick={() => setShowEmptyBinModal(false)}
              disabled={isPurging}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEmptyBin}
              disabled={isPurging}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isPurging ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Purging Bin...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>
                    Empty {emptyScope === 'filtered' && selectedCollection && selectedCollection !== 'all' ? `${filteredItems.length} Items` : `All (${stats.total})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- RESTORE MODAL --- */}
      <Modal
        isOpen={!!itemToRestore}
        onClose={() => setItemToRestore(null)}
        title="Confirm Restore"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-green-600">
            <Info className="h-5 w-5" />
            <h3 className="text-lg font-medium text-gray-900">Restore Record</h3>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to restore <strong className="text-gray-900">{itemToRestore?.displayName}</strong>? 
            It will be moved out of the trash and back into the active system.
          </p>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setItemToRestore(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmRestore()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
            >
              Confirm Restore
            </button>
          </div>
        </div>
      </Modal>

      {/* --- PERMANENT DELETE MODAL --- */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Confirm Permanent Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-lg font-medium text-gray-900">Permanent Warning</h3>
          </div>
          
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-800">
              Are you sure you want to permanently delete <strong className="font-bold">{itemToDelete?.displayName}</strong>? 
              This action <strong>cannot be undone</strong> and the data will be lost forever.
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setItemToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmHardDelete()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
