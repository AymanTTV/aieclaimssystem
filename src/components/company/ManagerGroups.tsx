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

const DEFAULT_PERMISSIONS = [
  'Orders by locations',
  'Order',
  'Payments',
  'Vehicle',
  'Contacts',
  'Order Maintenance',
  'Daily plan',
  'Timeline',
  'Invoice and agreement',
  'Settings',
  'Other permissions'
];

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

    if (formData.permissions.length === 0) {
      toast.error('Please select at least one permission');
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
          <h2 className="text-lg font-medium text-gray-900">Manager Groups</h2>
          <button
            onClick={() => {
              setEditingGroup(null);
              setFormData({ name: '', permissions: [] });
              setShowForm(true);
            }}
            className="inline-flex items-center px-3 py-1.5 border border-primary text-sm font-medium rounded text-primary hover:bg-primary hover:text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add group
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 border rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  {DEFAULT_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission)}
                        onChange={(e) => {
                          const newPermissions = e.target.checked
                            ? [...formData.permissions, permission]
                            : formData.permissions.filter(p => p !== permission);
                          setFormData({ ...formData, permissions: newPermissions });
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
                >
                  {editingGroup ? 'Update' : 'Create'} Group
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups.map((group) => (
                <tr key={group.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {group.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {group.permissions.map((permission, index) => (
                        <Badge key={index} variant="primary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingGroup(group);
                          setFormData({
                            name: group.name,
                            permissions: group.permissions
                          });
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No manager groups found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerGroups;