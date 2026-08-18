// src/components/finance/ManageCategoriesModal.tsx

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X, Layers } from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
}

interface ManageCategoriesModalProps {
  onClose: () => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ onClose }) => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBulkAdd, setIsBulkAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Track which category is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Reference to the Firestore collection
  const categoriesRef = collection(db, 'invoiceCategories');

  // Fetch all categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(categoriesRef);
        const cats: CategoryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as { name: string };
          cats.push({ id: docSnap.id, name: data.name });
        });
        cats.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(cats);
      } catch (err) {
        console.error('Error fetching invoice categories:', err);
        toast.error('Failed to load categories');
      }
    };

    fetchCategories();
  }, [categoriesRef]);

  // Add category/categories
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      if (isBulkAdd) {
        const names = trimmed.split(',').map(n => n.trim()).filter(Boolean);
        const uniqueNames = Array.from(new Set(names)); 
        
        const toAdd = uniqueNames.filter(n => !categories.some(c => c.name.toLowerCase() === n.toLowerCase()));
        const skipped = uniqueNames.length - toAdd.length;

        if (toAdd.length === 0) {
            toast.error('All provided categories already exist');
            setLoading(false);
            return;
        }

        const batch = writeBatch(db);
        const newItems: CategoryItem[] = [];

        toAdd.forEach(name => {
            const newRef = doc(collection(db, 'invoiceCategories'));
            batch.set(newRef, { name, createdAt: serverTimestamp() });
            newItems.push({ id: newRef.id, name });
        });

        await batch.commit();

        setCategories(prev => {
            const updated = [...prev, ...newItems];
            updated.sort((a, b) => a.name.localeCompare(b.name));
            return updated;
        });
        
        setNewCategory('');
        toast.success(`Added ${toAdd.length} categories`);
        if (skipped > 0) toast.error(`Skipped ${skipped} existing categories`);

      } else {
        if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
          toast.error('That category already exists');
          setLoading(false);
          return;
        }
        const docRef = await addDoc(categoriesRef, {
          name: trimmed,
          createdAt: serverTimestamp(),
        });
        const newItem: CategoryItem = { id: docRef.id, name: trimmed };
        setCategories((prev) => {
          const updated = [...prev, newItem];
          updated.sort((a, b) => a.name.localeCompare(b.name));
          return updated;
        });
        setNewCategory('');
        toast.success(`Added category "${trimmed}"`);
      }
    } catch (err) {
      console.error('Error adding category:', err);
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    const confirm = window.confirm(`Are you sure you want to delete "${catName}"?`);
    if (!confirm) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'invoiceCategories', catId));
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setSelectedIds(prev => { const s = new Set(prev); s.delete(catId); return s; });
      toast.success(`Deleted category "${catName}"`);
      if (editingId === catId) {
        setEditingId(null);
        setEditingName('');
      }
    } catch (err) {
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} categories?`)) return;

    setLoading(true);
    try {
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            batch.delete(doc(db, 'invoiceCategories', id));
        });
        await batch.commit();

        setCategories(prev => prev.filter(c => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} categories`);
        setEditingId(null);
    } catch (err) {
        toast.error('Failed to delete categories');
    } finally {
        setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
      setSelectedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleStartEdit = (catId: string, currentName: string) => {
    setEditingId(catId);
    setEditingName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (categories.some((c) => c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Another category with that name already exists');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'invoiceCategories', editingId), { name: trimmed });
      setCategories((prev) => {
        const updated = prev.map((c) => c.id === editingId ? { ...c, name: trimmed } : c);
        updated.sort((a, b) => a.name.localeCompare(b.name));
        return updated;
      });
      toast.success(`Renamed category to "${trimmed}"`);
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  // Get the current search term (if bulk, grabs the last typed word after the comma)
  const currentSearchTerm = (isBulkAdd ? newCategory.split(',').pop()?.trim() : newCategory.trim()) || '';

  // Filter and prioritize sort based on exact / startsWith matches
  const filteredCategories = categories
    .filter((cat) => cat.name.toLowerCase().includes(currentSearchTerm.toLowerCase()))
    .sort((a, b) => {
      if (!currentSearchTerm) return 0; // Maintain alphabetical state if blank

      const query = currentSearchTerm.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      if (aName === query && bName !== query) return -1;
      if (aName !== query && bName === query) return 1;

      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return aName.localeCompare(bName);
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold">Manage Invoice Categories</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">✕</button>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">{isBulkAdd ? 'Bulk Create Categories' : 'Create Category'}</label>
            <button type="button" onClick={() => setIsBulkAdd(!isBulkAdd)} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center">
                <Layers className="h-3 w-3 mr-1" />
                {isBulkAdd ? 'Switch to Single Add' : 'Switch to Bulk Add'}
            </button>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder={isBulkAdd ? "cat1, cat2, cat3..." : "Type category name..."}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 form-input"
            disabled={loading}
          />
          <button
            onClick={handleAddCategory}
            disabled={loading || !newCategory.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
        {isBulkAdd && <p className="text-xs text-gray-500">Separate multiple categories using a comma (,)</p>}
      </div>

      <div className="pt-2 border-t border-gray-100">
        {selectedIds.size > 0 && (
            <div className="bg-red-50 p-2 mb-3 rounded-md flex justify-between items-center border border-red-100">
                <span className="text-sm text-red-800 font-medium">{selectedIds.size} selected</span>
                <button onClick={handleBulkDelete} disabled={loading} className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50">
                    Delete Selected
                </button>
            </div>
        )}

        <div className="max-h-60 overflow-auto border rounded-md bg-white">
          {filteredCategories.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm text-center">
                {currentSearchTerm ? 'No matching categories found. Ready to add!' : 'No categories yet.'}
            </p>
          ) : (
            <ul>
              {filteredCategories.map((cat) => {
                const isEditing = editingId === cat.id;
                return (
                  <li key={cat.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50 border-b last:border-0">
                    {isEditing ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 form-input text-sm p-1"
                          disabled={loading}
                        />
                        <button onClick={handleSaveEdit} disabled={loading} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                        <button onClick={handleCancelEdit} disabled={loading} className="text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                            <input type="checkbox" checked={selectedIds.has(cat.id)} onChange={() => handleToggleSelect(cat.id)} className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                            <span className={`text-sm ${currentSearchTerm && cat.name.toLowerCase() === currentSearchTerm.toLowerCase() ? 'font-bold text-indigo-700' : 'text-gray-800'}`}>{cat.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleStartEdit(cat.id, cat.name)} disabled={loading} title="Edit category" className="text-blue-600 hover:text-blue-800"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={loading} title="Delete category" className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;