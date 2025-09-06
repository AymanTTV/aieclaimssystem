// src/components/vdFinance/ManageVDFinanceCategoriesModal.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; }
type Item = { id: string; name: string };

const ManageVDFinanceCategoriesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const q = query(collection(db, 'vdFinanceCategories'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) })));
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const addItem = async () => {
    const name = newName.trim(); if (!name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'vdFinanceCategories'), { name, createdAt: serverTimestamp() });
      setNewName(''); await load(); toast.success(`Added "${name}"`);
    } catch { toast.error('Failed to add'); } finally { setLoading(false); }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim(); if (!name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vdFinanceCategories', editingId), { name });
      setEditingId(null); setEditingName(''); await load(); toast.success('Updated');
    } catch { toast.error('Failed to update'); } finally { setLoading(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'vdFinanceCategories', id));
      await load(); toast.success('Deleted');
    } catch { toast.error('Failed to delete'); } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Manage VD Finance Categories</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input className="flex-1 form-input" placeholder="New category" value={newName} onChange={e => setNewName(e.target.value)} />
          <button onClick={addItem} disabled={loading} className="px-3 py-2 bg-primary text-white rounded-md disabled:opacity-50">Add</button>
        </div>

        <div className="divide-y border rounded-md">
          {items.map(it => (
            <div key={it.id} className="flex items-center justify-between p-2">
              {editingId === it.id ? (
                <input className="flex-1 form-input mr-2" value={editingName} onChange={e => setEditingName(e.target.value)} />
              ) : (<span className="flex-1">{it.name}</span>)}
              <div className="flex items-center gap-2">
                {editingId === it.id ? (
                  <button onClick={saveEdit} className="p-2 rounded hover:bg-green-50 text-green-700"><Check className="h-4 w-4" /></button>
                ) : (
                  <button onClick={() => { setEditingId(it.id); setEditingName(it.name); }} className="p-2 rounded hover:bg-blue-50 text-blue-700"><Edit2 className="h-4 w-4" /></button>
                )}
                <button onClick={() => remove(it.id, it.name)} className="p-2 rounded hover:bg-red-50 text-red-700"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="p-3 text-sm text-gray-500">No categories yet.</div>}
        </div>
      </div>
    </div>
  );
};

export default ManageVDFinanceCategoriesModal;
