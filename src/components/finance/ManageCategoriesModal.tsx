// src/components/finance/ManageCategoriesModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X, Layers, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Category } from '../../types/category';
import { unifiedCategoryService, ESSENTIAL_CATEGORIES } from '../../services/unifiedCategory.service';

interface ManageCategoriesModalProps {
  onClose: () => void;
  onCategoriesChanged?: (categories: Category[]) => void;
}

const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ onClose, onCategoriesChanged }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBulkAdd, setIsBulkAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Track which category is currently being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Subscribe to real-time unified categories
  useEffect(() => {
    const unsub = unifiedCategoryService.subscribe((updatedCats) => {
      setCategories(updatedCats);
      if (onCategoriesChanged) {
        onCategoriesChanged(updatedCats);
      }
    });

    return () => unsub();
  }, [onCategoriesChanged]);

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
        const names = trimmed.split(',').map((n) => n.trim()).filter(Boolean);
        const uniqueNames = Array.from(new Set(names));

        const created = await unifiedCategoryService.createBulk(uniqueNames);
        if (created.length === 0) {
          toast.error('All provided categories already exist');
        } else {
          toast.success(`Added ${created.length} categories across all pages!`);
          setNewCategory('');
        }
      } else {
        if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
          toast.error('That category already exists');
          setLoading(false);
          return;
        }

        await unifiedCategoryService.create({ name: trimmed });
        setNewCategory('');
        toast.success(`Category "${trimmed}" created across Finance, Invoices & Maintenance!`);
      }
    } catch (err: any) {
      console.error('Error adding category:', err);
      toast.error(err.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (ESSENTIAL_CATEGORIES.includes(catName)) {
      toast.error(`Cannot delete essential system category: "${catName}"`);
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to delete category "${catName}"?\n\nThis will remove it from Finance, Invoices, and Maintenance.`
    );
    if (!confirm) return;

    setLoading(true);
    try {
      await unifiedCategoryService.delete(catId);
      setSelectedIds((prev) => {
        const s = new Set(prev);
        s.delete(catId);
        return s;
      });
      toast.success(`Deleted category "${catName}" across all pages`);
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

    const toDelete = categories.filter((c) => selectedIds.has(c.id));
    const hasEssential = toDelete.some((c) => ESSENTIAL_CATEGORIES.includes(c.name));

    if (hasEssential) {
      toast.error(
        `Cannot delete essential system categories (${ESSENTIAL_CATEGORIES.join(', ')}). Please unselect them.`
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} categories across all pages?`)) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => unifiedCategoryService.delete(id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} categories across all pages`);
      setEditingId(null);
    } catch (err) {
      toast.error('Failed to delete categories');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
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
      await unifiedCategoryService.update(editingId, { name: trimmed });
      toast.success(`Renamed category to "${trimmed}" across all pages`);
      setEditingId(null);
      setEditingName('');
    } catch (err) {
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  // Filter based on search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories
      .filter((cat) => cat.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aName === q && bName !== q) return -1;
        if (aName !== q && bName === q) return 1;

        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return aName.localeCompare(bName);
      });
  }, [categories, searchQuery]);

  return (
    <div className="space-y-5 text-slate-900">
      {/* HEADER & CONNECTION BADGES */}
      <div className="pb-3 border-b border-slate-200">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">Connected System Categories</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Live Synced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Changes made here are shared and updated simultaneously across the entire system.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connected Modules Indicator */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="text-slate-400 mr-1">Connected Pages:</span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            📊 Finance Page
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            🧾 Invoices Page
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            🔧 Maintenance Page
          </span>
        </div>
      </div>

      {/* INPUT FORM: SINGLE / BULK ADD */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {isBulkAdd ? 'Bulk Add Categories' : 'Add New Category'}
          </label>
          <button
            type="button"
            onClick={() => setIsBulkAdd(!isBulkAdd)}
            className="text-xs text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            {isBulkAdd ? 'Switch to Single Add' : 'Switch to Bulk Add (Comma-separated)'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder={
              isBulkAdd
                ? 'e.g. Brake Service, Windscreen Repair, Vehicle Hire...'
                : 'Type new category name...'
            }
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={loading || !newCategory.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            {loading ? 'Adding...' : isBulkAdd ? 'Bulk Add' : 'Add Category'}
          </button>
        </div>
        {isBulkAdd && (
          <p className="text-[11px] text-slate-500">
            Separate multiple categories with commas. Duplicates are automatically skipped.
          </p>
        )}
      </div>

      {/* SEARCH & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold px-1 flex items-center justify-between sm:justify-end gap-2">
          <span>{categories.length} total categories</span>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={loading}
              className="px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* CATEGORIES LIST */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchQuery ? `No categories matching "${searchQuery}"` : 'No categories found.'}
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isEditing = editingId === cat.id;
              const isEssential = ESSENTIAL_CATEGORIES.includes(cat.name);

              return (
                <div
                  key={cat.id}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="flex-1 px-2.5 py-1 text-xs border border-indigo-500 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={loading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                        title="Save changes"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={loading}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          disabled={isEssential}
                          checked={selectedIds.has(cat.id)}
                          onChange={() => handleToggleSelect(cat.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                        <span
                          className={`text-xs font-semibold truncate ${
                            isEssential ? 'text-indigo-900 flex items-center gap-1.5' : 'text-slate-800'
                          }`}
                        >
                          {cat.name}
                          {isEssential && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100"
                              title="Essential system category"
                            >
                              <ShieldCheck className="w-2.5 h-2.5" /> Essential
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat.id, cat.name)}
                          disabled={loading}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Rename category across system"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={loading || isEssential}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isEssential
                              ? 'text-slate-300 cursor-not-allowed opacity-40'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isEssential ? 'Cannot delete essential category' : 'Delete category across system'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ManageCategoriesModal;
