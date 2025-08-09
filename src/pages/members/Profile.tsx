// src/pages/members/Profile.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName]       = useState(user?.name   || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: name });
      await updateDoc(doc(db, 'users', user.id), { name, address });
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name</label>
        <input
          type="text"
          value={name}
          disabled={saving}
          onChange={e => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          type="text"
          value={address}
          disabled={saving}
          onChange={e => setAddress(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className={`py-2 px-4 rounded-md text-white ${
          saving ? 'bg-primary/70' : 'bg-primary hover:bg-primary-dark'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}
