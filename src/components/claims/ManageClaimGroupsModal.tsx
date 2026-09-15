import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X, Layers } from 'lucide-react';
import Modal from '../ui/Modal';

interface ManageClaimGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageClaimGroupsModal: React.FC<ManageClaimGroupsModalProps> = ({ isOpen, onClose }) => {
  const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
  const [newGroup, setNewGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchGroups = async () => {
      const snap = await getDocs(collection(db, 'claimGroups'));
      const fetched = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setGroups(fetched.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchGroups();
  }, [isOpen]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroup.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    if (groups.some(g => g.name.toLowerCase() === trimmed.toLowerCase())) return toast.error('Group already exists');

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'claimGroups'), { name: trimmed, createdAt: serverTimestamp() });
      setGroups(prev => [...prev, { id: docRef.id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGroup('');
      toast.success('Group added');
    } catch (err) {
      toast.error('Failed to add group');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete group "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'claimGroups', id));
      setGroups(prev => prev.filter(g => g.id !== id));
      toast.success('Group deleted');
    } catch (err) {
      toast.error('Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'claimGroups', editingId), { name: editingName.trim() });
      setGroups(prev => prev.map(g => g.id === editingId ? { ...g, name: editingName.trim() } : g));
      setEditingId(null);
      toast.success('Group updated');
    } catch (err) {
      toast.error('Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Claim Groups" size="md">
      <form onSubmit={handleAddGroup} className="flex space-x-2 mb-6">
        <input
          type="text"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          placeholder="New group name..."
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newGroup.trim()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50">
          Add
        </button>
      </form>

      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
        {groups.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No groups found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {groups.map((group) => (
              <li key={group.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                {editingId === group.id ? (
                  <div className="flex-1 flex space-x-2">
                    <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 text-sm border-gray-300 rounded-md py-1" />
                    <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-900">{group.name}</span>
                    <div className="flex space-x-2">
                      <button onClick={() => { setEditingId(group.id); setEditingName(group.name); }} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(group.id, group.name)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default ManageClaimGroupsModal;