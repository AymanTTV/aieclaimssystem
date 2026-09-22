// src/components/finance/ManageFinanceDepartmentsModal.tsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import Modal from '../ui/Modal';

interface ManageFinanceDepartmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageFinanceDepartmentsModal: React.FC<ManageFinanceDepartmentsModalProps> = ({ isOpen, onClose }) => {
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchDepartments = async () => {
      const snap = await getDocs(collection(db, 'financeDepartments'));
      const fetched = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setDepartments(fetched.sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetchDepartments();
  }, [isOpen]);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepartment.trim();
    if (!trimmed) return toast.error('Name cannot be empty');
    if (departments.some(d => d.name.toLowerCase() === trimmed.toLowerCase())) return toast.error('Department already exists');

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'financeDepartments'), { name: trimmed, createdAt: serverTimestamp() });
      setDepartments(prev => [...prev, { id: docRef.id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDepartment('');
      toast.success('Department added');
    } catch (err) {
      toast.error('Failed to add department');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete department "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'financeDepartments', id));
      setDepartments(prev => prev.filter(d => d.id !== id));
      toast.success('Department deleted');
    } catch (err) {
      toast.error('Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'financeDepartments', editingId), { name: editingName.trim() });
      setDepartments(prev => prev.map(d => d.id === editingId ? { ...d, name: editingName.trim() } : d));
      setEditingId(null);
      toast.success('Department updated');
    } catch (err) {
      toast.error('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Departments" size="md">
      <div className="space-y-5">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Add New Department</label>
          <form onSubmit={handleAddDepartment} className="flex gap-2">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="e.g. Sales, Fleet, Maintenance..."
              className="flex-1 bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] placeholder-slate-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newDepartment.trim()}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Existing Departments ({departments.length})</h4>
          <div className="max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white">
            {departments.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No departments created yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {departments.map((dept) => (
                  <li key={dept.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    {editingId === dept.id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 text-sm bg-white border-[1.5px] border-[#CBD5E1] text-[#0F172A] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-slate-900 tracking-wide">{dept.name}</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dept.id, dept.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageFinanceDepartmentsModal;