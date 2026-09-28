import React from 'react';
import { User } from '../../types';

interface RoleSelectorProps {
  currentRole: User['role'];
  onChange: (role: User['role']) => void;
  disabled?: boolean;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onChange, disabled = false }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Role</label>
      <select
        value={currentRole}
        onChange={(e) => onChange(e.target.value as User['role'])}
        disabled={disabled}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:bg-gray-100"
      >
        <option value="superadmin">Super Admin</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
        <option value="supervisor">Supervisor</option>
        <option value="accountant">Accountant</option>
        <option value="finance">Finance</option>
        <option value="claims">Claims</option>
        <option value="staff">Staff</option>
        <option value="company">Company</option>
        <option value="member">Member</option>
      </select>
    </div>
  );
};

export default RoleSelector;