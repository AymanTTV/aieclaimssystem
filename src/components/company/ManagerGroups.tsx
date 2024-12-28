import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ManagerGroup {
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

interface GroupFormData {
  name: string;
  permissions: string[];
}

const DEFAULT_PERMISSIONS = {
  admin: {
    name: 'Admin',
    permissions: ['Full system access', 'User management', 'Financial controls', 'System settings']
  },
  manager: {
    name: 'Manager',
    permissions: ['Vehicle management', 'Maintenance scheduling', 'Rental management', 'Staff management']
  },
  finance: {
    name: 'Finance',
    permissions: ['Financial reports', 'Payment processing', 'Invoice management', 'Financial analytics']
  }
};

const ManagerGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ManagerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ManagerGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    permissions: []
  });

  useEffect(() => {
    const q = query(collection(db, 'managerGroups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupData: ManagerGroup[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        groupData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ManagerGroup);
      });
      setGroups(groupData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching manager groups:', error);
      toast.error('Failed to load manager groups');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const groupData = {
        name: formData.name.trim(),
        permissions: formData.permissions,
        updatedAt: new Date(),
        updatedBy: user.id
      };

      if (editingGroup) {
        await updateDoc(doc(db, 'managerGroups', editingGroup.id), groupData);
        toast.success('Group updated successfully');
      } else {
        await addDoc(collection(db, 'managerGroups'), {
          ...groupData,
          createdAt: new Date(),
          createdBy: user.id
        });
        toast.success('Group created successfully');
      }

      setShowForm(false);
      setEditingGroup(null);
      setFormData({ name: '', permissions: [] });
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Failed to save group');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await deleteDoc(doc(db, 'managerGroups', groupId));
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Role Groups</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(DEFAULT_PERMISSIONS).map(([role, details]) => (
                <tr key={role}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {details.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {details.permissions.map((permission, index) => (
                        <Badge key={index} variant="primary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerGroups;