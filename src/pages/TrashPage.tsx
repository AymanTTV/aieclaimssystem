// src/pages/TrashPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { restoreFromTrash, permanentlyDelete, TrashItem } from '../utils/trashService';
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
  UserX
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


  const confirmRestore = async () => {
    if (!itemToRestore) return;
    try {
      toast.loading('Restoring...', { id: 'restore' });
      await restoreFromTrash(itemToRestore.id);
      toast.success(`${itemToRestore.displayName} restored successfully`, { id: 'restore' });
      setItemToRestore(null); 
    } catch (e) {
      toast.error('Failed to restore item', { id: 'restore' });
    }
  };

  const confirmHardDelete = async () => {
    if (!itemToDelete) return;
    try {
      toast.loading('Deleting...', { id: 'delete' });
      await permanentlyDelete(itemToDelete.id);
      toast.success('Item permanently deleted', { id: 'delete' });
      setItemToDelete(null); 
    } catch (e) {
      toast.error('Failed to delete item', { id: 'delete' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Recycle Bin
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Deleted items are kept here safely until you permanently remove them.</p>
        </div>
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
                      <div className="text-sm font-bold text-slate-900">{item.displayName}</div>
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
                      {/* ✅ Wrapped with Restore Permission */}
                      {can('trash', 'restore') && (
                        <button 
                          onClick={() => setItemToRestore(item)} 
                          className="text-emerald-700 hover:text-emerald-900 mr-4 inline-flex items-center font-semibold transition-colors"
                          title="Restore Item"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" /> Restore
                        </button>
                      )}
                      {/* ✅ Wrapped with Delete Permanently Permission */}
                      {can('trash', 'deletePermanently') && (
                        <button 
                          onClick={() => setItemToDelete(item)} 
                          className="text-rose-700 hover:text-rose-900 inline-flex items-center font-semibold transition-colors"
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
              onClick={confirmRestore}
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
              onClick={confirmHardDelete}
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