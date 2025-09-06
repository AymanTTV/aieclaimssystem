import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { usePettyCashCategories } from '../../hooks/usePettyCashCategories';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  moduleKey?: 'pettyCash' | 'aiePettyCash';
}

const ManagePettyCashCategoriesModal: React.FC<Props> = ({ isOpen, onClose, moduleKey = 'pettyCash' }) => {
  const { categories, add, rename, remove } = usePettyCashCategories(moduleKey);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="form-input w-full"
            placeholder="New category name"
          />
          <button
            onClick={async () => { if (!newName.trim()) return; await add(newName.trim()); setNewName(''); }}
            className="px-3 py-2 rounded-md bg-primary text-white text-sm"
          >
            Add
          </button>
        </div>

        <ul className="divide-y rounded-md border">
          {categories.map(c => (
            <li key={c.id} className="flex items-center justify-between p-2">
              {editingId === c.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="form-input w-full"
                  />
                  <button
                    onClick={async () => { await rename(c.id, editingName || c.name); setEditingId(null); }}
                    className="px-2 py-1 bg-green-600 text-white rounded-md text-xs"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-200 rounded-md text-xs">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{c.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingId(c.id); setEditingName(c.name); }}
                      className="px-2 py-1 text-blue-600 text-xs"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="px-2 py-1 text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && <li className="p-3 text-sm text-gray-500">No categories yet.</li>}
        </ul>
      </div>
    </Modal>
  );
};

export default ManagePettyCashCategoriesModal;
