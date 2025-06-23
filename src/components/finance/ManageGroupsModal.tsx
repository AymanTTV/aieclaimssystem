// src/components/finance/ManageGroupsModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import financeGroupService, { FinanceGroup } from '../../services/financeGroup.service';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface ManageGroupsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageGroupsModal({ open, onClose }: ManageGroupsModalProps) {
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Load groups when modal opens
  useEffect(() => {
    if (!open) return;
    financeGroupService.getAll().then(setGroups);
  }, [open]);

  const refresh = async () => {
    const all = await financeGroupService.getAll();
    setGroups(all);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await financeGroupService.create(newName.trim());
    setNewName('');
    await refresh();
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    await financeGroupService.update(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this group?')) return;
    await financeGroupService.delete(id);
    await refresh();
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Manage Groups" size="md">
      <div className="space-y-4">
        {/* Create new */}
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="New group name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleCreate}
            className="inline-flex items-center bg-green-500 hover:bg-green-600 text-white px-4 rounded"
          >
            <Plus size={16} className="mr-1" /> Add
          </button>
        </div>

        {/* Existing list */}
        <ul className="divide-y">
          {groups.map(g => (
            <li key={g.id} className="flex items-center justify-between py-2">
              {editingId === g.id ? (
                <div className="flex-1 flex space-x-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={() => handleUpdate(g.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 rounded"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditingName(''); }}
                    className="bg-gray-300 hover:bg-gray-400 text-black px-3 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span>{g.name}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { setEditingId(g.id); setEditingName(g.name); }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
