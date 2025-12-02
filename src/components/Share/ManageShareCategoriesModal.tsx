// src/components/share/ManageShareCategoriesModal.tsx

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

interface CategoryItem {
  id: string;
  name: string;
}

interface Props {
  onClose: () => void;
}

export default function ManageShareCategoriesModal({ onClose }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const categoriesRef = collection(db, 'shareCategories');

  // Fetch
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(categoriesRef);
        const cats: CategoryItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          cats.push({ id: docSnap.id, name: data.name });
        });
        cats.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(cats);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load categories');
      }
    };
    fetchCategories();
  }, []);

  // Add
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error('Category already exists');
    }

    setLoading(true);
    try {
      const docRef = await addDoc(categoriesRef, {
        name: trimmed,
        createdAt: serverTimestamp(),
      });
      setCategories(prev => [...prev, { id: docRef.id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory('');
      toast.success('Category added');
    } catch (err) {
      toast.error('Failed to add');
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'shareCategories', id));
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  // Edit
  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'shareCategories', editingId), { name: trimmed });
      setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name: trimmed } : c));
      setEditingId(null);
      toast.success('Category renamed');
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold">Manage Share Categories</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="New category..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md focus:ring-primary focus:border-primary"
          disabled={loading}
        />
        <button
          onClick={handleAddCategory}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
        {categories.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">No categories found.</p>
        ) : (
          <ul>
            {categories.map((cat) => (
              <li key={cat.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 border-b last:border-b-0">
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      className="flex-1 px-2 py-1 border rounded"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                    />
                    <button onClick={handleSaveEdit} className="text-green-600"><Check className="h-4 w-4"/></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500"><X className="h-4 w-4"/></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-700">{cat.name}</span>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }} className="text-blue-600"><Edit2 className="h-4 w-4"/></button>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-600"><Trash2 className="h-4 w-4"/></button>
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