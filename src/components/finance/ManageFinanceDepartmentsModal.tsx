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
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Departments" size="md" theme="navy">
      <div className="space-y-5">
        <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 shadow-inner">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Add New Department</label>
          <form onSubmit={handleAddDepartment} className="flex gap-2">
            <input
              type="text"
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="e.g. Sales, Fleet, Maintenance..."
              className="flex-1 bg-[#16192B] border border-[#2B314E] text-white placeholder-slate-400 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !newDepartment.trim()}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        <div className="bg-[#0F111A] border border-[#2B314E] rounded-2xl p-4 shadow-inner">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Existing Departments ({departments.length})</h4>
          <div className="max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-[#2B314E] bg-[#121524]">
            {departments.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">No departments created yet.</p>
            ) : (
              <ul className="divide-y divide-[#2B314E]">
                {departments.map((dept) => (
                  <li key={dept.id} className="p-3.5 flex justify-between items-center hover:bg-[#1C2038] transition-colors">
                    {editingId === dept.id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 text-sm bg-[#16192B] border border-[#2B314E] text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40 transition-colors"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-[#2B314E] transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-white tracking-wide">{dept.name}</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }}
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-950/40 hover:text-blue-300 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dept.id, dept.name)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
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