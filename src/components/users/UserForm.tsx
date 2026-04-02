// src/components/users/UserForm.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { User } from '../../types';
import { getDefaultPermissions } from '../../types/roles';
import toast from 'react-hot-toast';
import { Building2, Mail, Phone, ShieldCheck, User as UserIcon, MapPin } from 'lucide-react';

interface UserFormProps {
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin' as User['role'],
    companyName: '',
    phoneNumber: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // ✅ Fetch permissions, but fallback to 'member' if 'company' is missing to prevent Firebase crashes
      const userPermissions = getDefaultPermissions(formData.role) || getDefaultPermissions('member');

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        companyName: formData.role === 'company' ? formData.companyName : null,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        permissions: userPermissions, // ✅ Safe variable used here
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('User created successfully');
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Base class for all inputs to ensure consistent, large sizing
  const inputBaseClass = "mt-1.5 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base px-4 py-2.5 bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Role Field */}
        <div className="md:col-span-2 bg-gray-50 p-5 rounded-lg border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> System Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
            className={inputBaseClass}
            required
          >
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="finance">Finance</option>
            <option value="claims">Claims</option>
            <option value="company">Company</option>
            <option value="member">Member</option>
          </select>
          <p className="text-sm text-gray-500 mt-2">Select the base permission level for this user.</p>
        </div>

        {/* Conditional Company Name */}
        {formData.role === 'company' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" /> Company Name
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className={inputBaseClass}
              placeholder="e.g. Acme Corporation"
              required
            />
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-500" /> Full Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputBaseClass}
            required
            placeholder="John Doe"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" /> Phone Number
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className={inputBaseClass}
            placeholder="+44 7000 000000"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" /> Email Address
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={inputBaseClass}
            required
            placeholder="user@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500" /> Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={inputBaseClass}
            required
            minLength={6}
            placeholder="Min 6 characters"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" /> Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
            className={inputBaseClass}
            placeholder="Full physical address..."
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;