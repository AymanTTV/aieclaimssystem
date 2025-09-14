// src/components/waiting/ManageWaitingCategoriesModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, orderBy, query
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Item = { id: string; name: string };

const ManageWaitingCategoriesModal: React.FC<Props> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    try {
      // newest first (matches VAT manager)
      const q = query(collection(db, 'waiting_categories'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Item[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Item, 'id'>) }));
      setItems(list);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    if (!open) return;
    // reset ephemerals every open
    setSearchTerm('');
    setShowAll(false);
    setEditingId(null);
    setEditingName('');
    setNewName('');
    load();
  }, [open]);

  const addOne = async () => {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'waiting_categories'), {
        name,
        createdAt: serverTimestamp(),
        createdBy: user?.uid || ''
      });
      setNewName('');
      await load();
      toast.success(`Added “${name}”`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (it: Item) => {
    setEditingId(it.id);
    setEditingName(it.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'waiting_categories', editingId), { name });
      setEditingId(null);
      setEditingName('');
      await load();
      toast.success('Updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const removeOne = async (it: Item) => {
    if (!confirm(`Delete category “${it.name}”?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'waiting_categories', it.id));
      await load();
      toast.success('Deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [items, searchTerm]
  );
  const displayed = useMemo(
    () => (showAll ? filtered : filtered.slice(0, 5)),
    [filtered, showAll]
  );

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Manage Waiting Categories" size="lg">
      <div className="space-y-4">
        {/* Add bar */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOne()}
            className="flex-1 form-input"
          />
          <button
            onClick={addOne}
            disabled={loading}
            className="px-3 py-2 bg-primary text-white rounded-md disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search categories…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full form-input"
          />
        </div>

        {/* List */}
        <div className="divide-y border rounded-md max-h-[50vh] overflow-y-auto">
          {displayed.map((it) => (
            <div key={it.id} className="flex items-center justify-between p-2">
              {editingId === it.id ? (
                <input
                  className="flex-1 form-input mr-2"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
              ) : (
                <span className="flex-1">{it.name}</span>
              )}
              <div className="flex items-center gap-2">
                {editingId === it.id ? (
                  <button
                    onClick={saveEdit}
                    className="p-2 rounded hover:bg-green-50 text-green-700"
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(it)}
                    className="p-2 rounded hover:bg-blue-50 text-blue-700"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => removeOne(it)}
                  className="p-2 rounded hover:bg-red-50 text-red-700"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              {searchTerm ? 'No matching categories found.' : 'No categories yet.'}
            </div>
          )}
        </div>

        {/* Show all toggle */}
        {filtered.length > 5 && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showAll ? 'Show Less' : `Show All (${filtered.length})`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ManageWaitingCategoriesModal;
