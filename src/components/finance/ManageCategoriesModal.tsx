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
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';

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
        // Sort alphabetically by name
        cats.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(cats);
      } catch (err) {
        console.error('Error fetching invoice categories:', err);
        toast.error('Failed to load categories');
      }
    };

    fetchCategories();
  }, [categoriesRef]);

  // Add a new category
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    // Prevent duplicates (case‐insensitive)
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That category already exists');
      return;
    }

    setLoading(true);
    try {
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
    } catch (err) {
      console.error('Error adding category:', err);
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  // Delete a category by its ID
  const handleDeleteCategory = async (catId: string, catName: string) => {
    const confirm = window.confirm(`Are you sure you want to delete "${catName}"?`);
    if (!confirm) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'invoiceCategories', catId));
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      toast.success(`Deleted category "${catName}"`);
      // If we were editing this item, cancel edit
      if (editingId === catId) {
        setEditingId(null);
        setEditingName('');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  // Start editing: populate editingName and set editingId
  const handleStartEdit = (catId: string, currentName: string) => {
    setEditingId(catId);
    setEditingName(currentName);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save edited name to Firestore
  const handleSaveEdit = async () => {
    if (!editingId) return;

    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    // Prevent duplicates of other categories (case-insensitive)
    if (
      categories.some(
        (c) =>
          c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      toast.error('Another category with that name already exists');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'invoiceCategories', editingId), {
        name: trimmed,
      });
      // Update local state
      setCategories((prev) => {
        const updated = prev.map((c) =>
          c.id === editingId ? { ...c, name: trimmed } : c
        );
        updated.sort((a, b) => a.name.localeCompare(b.name));
        return updated;
      });
      toast.success(`Renamed category to "${trimmed}"`);
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="text-lg font-semibold">Manage Invoice Categories</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Add New Category */}
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="New category name"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 form-input"
          disabled={loading}
        />
        <button
          onClick={handleAddCategory}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Existing Categories List */}
      <div className="max-h-60 overflow-auto border rounded-md bg-white">
        {categories.length === 0 ? (
          <p className="p-4 text-gray-500">No categories yet.</p>
        ) : (
          <ul>
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;
              return (
                <li
                  key={cat.id}
                  className="px-4 py-2 flex items-center justify-between hover:bg-gray-50"
                >
                  {/* If this item is in edit mode, show input + save/cancel */}
                  {isEditing ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 form-input"
                        disabled={loading}
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={loading}
                        title="Save"
                        className="text-green-600 hover:text-green-800"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={loading}
                        title="Cancel"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* Otherwise show name + edit/delete buttons */
                    <>
                      <span>{cat.name}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEdit(cat.id, cat.name)}
                          disabled={loading}
                          title="Edit category"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={loading}
                          title="Delete category"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
  );
};

export default ManageCategoriesModal;
