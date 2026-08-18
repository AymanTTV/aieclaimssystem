// src/components/Share/ManageShareholdersModal.tsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface Shareholder {
  id: string;
  name: string;
  defaultPercentage: number;
}

interface Props {
  onClose: () => void;
}

export default function ManageShareholdersModal({ onClose }: Props) {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [newName, setNewName] = useState('');
  const [newPercentage, setNewPercentage] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingPercentage, setEditingPercentage] = useState<number | ''>('');

  const ref = collection(db, 'shareholders');

  useEffect(() => {
    const fetchShareholders = async () => {
      try {
        const snapshot = await getDocs(ref);
        const list: Shareholder[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({ id: docSnap.id, name: data.name, defaultPercentage: data.defaultPercentage || 0 });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setShareholders(list);
      } catch (err) {
        toast.error('Failed to load shareholders');
      }
    };
    fetchShareholders();
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    const pct = Number(newPercentage);
    if (!trimmed) return toast.error('Name cannot be empty');
    if (pct < 0 || pct > 100) return toast.error('Percentage must be between 0 and 100');
    if (shareholders.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('Shareholder already exists');
    }

    setLoading(true);
    try {
      const docRef = await addDoc(ref, {
        name: trimmed,
        defaultPercentage: pct,
        createdAt: serverTimestamp(),
      });
      setShareholders(prev => [...prev, { id: docRef.id, name: trimmed, defaultPercentage: pct }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setNewPercentage('');
      toast.success('Shareholder added');
    } catch (err) {
      toast.error('Failed to add shareholder');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete shareholder "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'shareholders', id));
      setShareholders(prev => prev.filter(s => s.id !== id));
      toast.success('Shareholder deleted');
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    const pct = Number(editingPercentage);
    if (!trimmed) return toast.error('Name cannot be empty');
    if (pct < 0 || pct > 100) return toast.error('Percentage must be between 0 and 100');
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'shareholders', editingId), { name: trimmed, defaultPercentage: pct });
      setShareholders(prev => prev.map(s => s.id === editingId ? { ...s, name: trimmed, defaultPercentage: pct } : s));
      setEditingId(null);
      toast.success('Shareholder updated');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Manage Shareholders</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5"/></button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-[2] px-3 py-2 border rounded-md focus:ring-primary focus:border-primary text-sm"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Default %"
          value={newPercentage}
          onChange={(e) => setNewPercentage(e.target.value ? Number(e.target.value) : '')}
          className="flex-1 px-3 py-2 border rounded-md focus:ring-primary focus:border-primary text-sm"
          min="0" max="100"
          disabled={loading}
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white">
        {shareholders.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm text-center">No shareholders found. Add one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shareholders.map((sh) => (
              <li key={sh.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                {editingId === sh.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input className="flex-[2] px-2 py-1 text-sm border rounded focus:ring-primary" value={editingName} onChange={e => setEditingName(e.target.value)} />
                    <input type="number" className="flex-1 px-2 py-1 text-sm border rounded focus:ring-primary" value={editingPercentage} onChange={e => setEditingPercentage(e.target.value ? Number(e.target.value) : '')} />
                    <button onClick={handleSaveEdit} className="text-green-600 p-1 hover:bg-green-100 rounded"><Check className="h-4 w-4"/></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 p-1 hover:bg-gray-200 rounded"><X className="h-4 w-4"/></button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800">{sh.name}</span>
                      <span className="text-xs text-gray-500">Default: {sh.defaultPercentage}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => { setEditingId(sh.id); setEditingName(sh.name); setEditingPercentage(sh.defaultPercentage); }} className="text-blue-600 p-1.5 hover:bg-blue-100 rounded"><Edit2 className="h-4 w-4"/></button>
                      <button onClick={() => handleDelete(sh.id, sh.name)} className="text-red-600 p-1.5 hover:bg-red-100 rounded"><Trash2 className="h-4 w-4"/></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}