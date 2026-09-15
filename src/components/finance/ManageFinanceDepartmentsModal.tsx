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
      <form onSubmit={handleAddDepartment} className="flex space-x-2 mb-6">
        <input
          type="text"
          value={newDepartment}
          onChange={(e) => setNewDepartment(e.target.value)}
          placeholder="New department name..."
          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newDepartment.trim()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50">
          Add
        </button>
      </form>

      <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
        {departments.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No departments found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {departments.map((dept) => (
              <li key={dept.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                {editingId === dept.id ? (
                  <div className="flex-1 flex space-x-2">
                    <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 text-sm border-gray-300 rounded-md py-1" />
                    <button type="button" onClick={handleSaveEdit} className="text-green-600 hover:text-green-800"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-900">{dept.name}</span>
                    <div className="flex space-x-2">
                      <button type="button" onClick={() => { setEditingId(dept.id); setEditingName(dept.name); }} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(dept.id, dept.name)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
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

export default ManageFinanceDepartmentsModal;