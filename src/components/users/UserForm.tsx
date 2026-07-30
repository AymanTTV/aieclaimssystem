// src/components/users/UserForm.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { User } from '../../types';
import { getDefaultPermissions } from '../../types/roles';
import toast from 'react-hot-toast';
import { Building2, Mail, Phone, ShieldCheck, User as UserIcon, MapPin, Key, UserPlus } from 'lucide-react';

interface UserFormProps {
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'admin' as User['role'], companyName: '', phoneNumber: '', address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userPermissions = getDefaultPermissions(formData.role) || getDefaultPermissions('member');

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: formData.email, name: formData.name, role: formData.role,
        companyName: formData.role === 'company' ? formData.companyName : null,
        phoneNumber: formData.phoneNumber, address: formData.address,
        permissions: userPermissions, createdAt: new Date(), updatedAt: new Date(),
      });

      toast.success('User created successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400";
  const labelClass = "text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      
      {/* 1. Account Security */}
      <div>
         <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-gray-400"/> Login Credentials</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} required placeholder="user@example.com" />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={inputClass} required minLength={6} placeholder="Min 6 characters" />
            </div>
         </div>
      </div>

      {/* 2. Role Configuration */}
      <div>
         <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-gray-400"/> Role Allocation</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 md:col-span-2">
              <label className={labelClass}>System Access Level</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })} className={inputClass} required>
                <option value="manager">Manager (Full Access)</option>
                <option value="admin">Admin (Operational Access)</option>
                <option value="finance">Finance (Billing & Reports)</option>
                <option value="claims">Claims (Accident handling)</option>
                <option value="company">Company (B2B Partner)</option>
                <option value="member">Member (Customer Portal)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2 italic">Role dictates the default dashboard view and module permissions.</p>
            </div>

            {formData.role === 'company' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Company Legal Name</label>
                <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className={inputClass} placeholder="e.g. Acme Corporation" required />
              </div>
            )}
         </div>
      </div>

      {/* 3. Personal Info */}
      <div>
         <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2"><UserIcon className="w-5 h-5 text-gray-400"/> Profile Information</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} required placeholder="John Doe" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} className={inputClass} placeholder="+44 7000 000000" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Full Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} className={inputClass} placeholder="Physical mailing address..." />
            </div>
         </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
        <button type="submit" disabled={loading} className="px-8 py-2.5 text-sm font-black text-white bg-primary rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2">
          {loading ? 'Processing...' : <><UserPlus className="w-4 h-4"/> Create Profile</>}
        </button>
      </div>
    </form>
  );
};

export default UserForm;