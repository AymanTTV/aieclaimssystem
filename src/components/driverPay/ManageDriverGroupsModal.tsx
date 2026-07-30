import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Group = { id: string; name: string };

const ManageDriverGroupsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    try {
      const q = query(collection(db, 'driverGroups'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Group[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
      setGroups(list);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load groups');
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
      setSearchTerm('');
      setShowAll(false);
    }
  }, [isOpen]);

  const addGroup = async () => {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'driverGroups'), { name, createdAt: serverTimestamp() });
      setNewName('');
      await load();
      toast.success(`Added "${name}"`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'driverGroups', editingId), { name });
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

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete group "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'driverGroups', id));
      await load();
      toast.success('Deleted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = useMemo(() =>
    groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [groups, searchTerm]
  );

  const displayedGroups = useMemo(() =>
    showAll ? filteredGroups : filteredGroups.slice(0, 5),
    [filteredGroups, showAll]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Manage Driver Groups</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New group name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 form-input"
          />
          <button
            onClick={addGroup}
            disabled={loading}
            className="px-3 py-2 bg-primary text-white rounded-md disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full form-input"
          />
        </div>

        <div className="divide-y border rounded-md max-h-[50vh] overflow-y-auto">
          {displayedGroups.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-2">
              {editingId === g.id ? (
                <input
                  className="flex-1 form-input mr-2"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
              ) : (
                <span className="flex-1">{g.name}</span>
              )}
              <div className="flex items-center gap-2">
                {editingId === g.id ? (
                  <button onClick={saveEdit} className="p-2 rounded hover:bg-green-50 text-green-700">
                    <Check className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => startEdit(g.id, g.name)} className="p-2 rounded hover:bg-blue-50 text-blue-700">
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => remove(g.id, g.name)} className="p-2 rounded hover:bg-red-50 text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {displayedGroups.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              {searchTerm ? 'No matching groups found.' : 'No groups yet.'}
            </div>
          )}
        </div>
        
        {filteredGroups.length > 5 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showAll ? 'Show Less' : `Show All (${filteredGroups.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDriverGroupsModal;