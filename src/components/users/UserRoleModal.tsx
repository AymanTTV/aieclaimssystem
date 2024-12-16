import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { DEFAULT_PERMISSIONS, type RolePermissions } from '../../types/roles';
import toast from 'react-hot-toast';

interface UserRoleModalProps {
  user: User;
  onClose: () => void;
}

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(user.role);
  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(
    DEFAULT_PERMISSIONS[user.role]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateDoc(doc(db, 'users', user.id), {
        role,
        permissions: customPermissions,
        updatedAt: new Date()
      });

      toast.success('User permissions updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating user permissions:', error);
      toast.error('Failed to update user permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: User['role']) => {
    setRole(newRole);
    setCustomPermissions(DEFAULT_PERMISSIONS[newRole]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as User['role'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
        {Object.entries(customPermissions).map(([module, permissions]) => (
          <div key={module} className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 capitalize mb-2">{module}</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(permissions).map(([action, enabled]) => (
                <label key={action} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      setCustomPermissions({
                        ...customPermissions,
                        [module]: {
                          ...customPermissions[module],
                          [action]: e.target.checked
                        }
                      });
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {action}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Updating...' : 'Update Permissions'}
        </button>
      </div>
    </form>
  );
};

export default UserRoleModal;