// src/components/users/UserRoleModal.tsx

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import {
  DEFAULT_PERMISSIONS,
  type RolePermissions,
  type PermissionAction,
} from '../../types/roles';
import { usePermissions } from '../../hooks/usePermissions';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface UserRoleModalProps {
  user: User;
  onClose: () => void;
}

const UserRoleModal: React.FC<UserRoleModalProps> = ({ user, onClose }) => {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'manager';

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<User['role']>(user.role);
  const [customPermissions, setCustomPermissions] = useState<RolePermissions>(
    user.permissions || DEFAULT_PERMISSIONS[user.role]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) {
      toast.error('Only managers can modify user permissions');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role,
        permissions: customPermissions,
        updatedAt: new Date(),
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

  const getModuleDisplayName = (module: string): string => {
    switch (module) {
      case 'personalInjury':
        return 'Personal Injury';
      case 'invoices':
        return 'Invoices';
      case 'company':
        return 'Company & Managers';
      case 'pettyCash':
        return 'Petty Cash';
      case 'vdInvoice':
        return 'VD Invoice';
      default:
        return module.charAt(0).toUpperCase() + module.slice(1);
    }
  };

  const handleToggle = (
    module: keyof RolePermissions,
    action: PermissionAction
  ) => {
    if (!isManager) return;
    setCustomPermissions((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action],
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Role Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select
          value={role}
          onChange={(e) => {
            const newRole = e.target.value as User['role'];
            setRole(newRole);
            setCustomPermissions(DEFAULT_PERMISSIONS[newRole]);
          }}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm
            focus:border-primary focus:ring-primary sm:text-sm
            ${!isManager ? 'bg-gray-100' : ''}`}
          disabled={!isManager}
        >
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="finance">Finance</option>
          <option value="claims">Claims</option>
        </select>
      </div>

      {/* Custom Permissions Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Custom Permissions
        </h3>

        {Object.entries(customPermissions).map(([module, permissions]) => (
          <div key={module} className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 capitalize mb-2">
              {getModuleDisplayName(module)}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(permissions).map(([action, enabled]) => {
                let label = '';
                switch (action) {
                  case 'cards':
                    label = 'View summary cards';
                    break;
                  case 'recordPayment':
                    label = 'Record Payment';
                    break;
                  case 'daily':
                    label = 'View Daily Rentals';
                    break;
                  case 'weekly':
                    label = 'View Weekly Rentals';
                    break;
                  case 'claim':
                    label = 'View Claim Rentals';
                    break;
                  default:
                    label = action.charAt(0).toUpperCase() + action.slice(1);
                }

                // Exclude rental type permissions from modules other than 'rentals'
                if (module !== 'rentals' && (action === 'daily' || action === 'weekly' || action === 'claim')) {
                    return null;
                }

                return (
                  <label key={action} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() =>
                        handleToggle(
                          module as keyof RolePermissions,
                          action as PermissionAction
                        )
                      }
                      className={`rounded border-gray-300 text-primary focus:ring-primary
                        ${!isManager ? 'cursor-not-allowed opacity-60' : ''}`}
                      disabled={!isManager}
                    />
                    <span
                      className={`ml-2 text-sm text-gray-700 capitalize ${
                        !isManager ? 'opacity-60' : ''
                      }`}
                    >
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white
            border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isManager}
          className={`px-4 py-2 text-sm font-medium text-white bg-primary
            border border-transparent rounded-md ${
              isManager ? 'hover:bg-primary-600' : 'opacity-60 cursor-not-allowed'
            }`}
        >
          {loading ? 'Updating...' : 'Update Permissions'}
        </button>
      </div>
    </form>
  );
};

export default UserRoleModal;
