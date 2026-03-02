// src/pages/members/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const MemberRegister: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [name, setName]                   = useState('');
  const [address, setAddress]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [customerExists, setCustomerExists] = useState<boolean | null>(null);

  // Check customers collection on blur
  const handleEmailBlur = async () => {
    if (!email) return;
    setCustomerExists(null);
    try {
      const q = query(
        collection(db, 'customers'),
        where('email', '==', email.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setCustomerExists(false);
        setName('');
        setAddress('');
        toast.error(
          'No customer record found. Please ask an admin to add your email first.'
        );
      } else {
        const cust = snap.docs[0].data() as any;
        setName(cust.name || '');
        setAddress(cust.address || '');
        setCustomerExists(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error checking customer data');
      setCustomerExists(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerExists) {
      toast.error('Please enter a valid customer email first');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        address,
        email: email.trim().toLowerCase(),
        role: 'member',
        createdAt: serverTimestamp()
      });
      const snap = await getDocs(
    query(collection(db, 'customers'), where('email', '==', email.trim().toLowerCase()), limit(1))
  );
  if (!snap.empty) {
    const cDoc = snap.docs[0];
    await setDoc(
      doc(db, 'customers', cDoc.id),
      { memberUid: cred.user.uid, email: email.trim().toLowerCase() },
      { merge: true }
    );
  }
      toast.success('Account created!');
      navigate('/members/transactions');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error(
          'This email is already registered. If you are an admin, please use the Admin Portal link below.'
        );
      } else {
        toast.error(err.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Member Registration
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and get access to your fleet records.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Email */}
            <div className="pt-2">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Email address"
              />
            </div>

            {/* Name */}
            <div className="pt-4">
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                disabled={loading || !customerExists}
                value={name}
                onChange={e => setName(e.target.value)}
                className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Full Name"
              />
            </div>

            {/* Address */}
            <div className="pt-4">
              <label htmlFor="address" className="sr-only">
                Address
              </label>
              <input
                id="address"
                type="text"
                required
                disabled={loading || !customerExists}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Address"
              />
            </div>

            {/* Password */}
            <div className="pt-4">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading || customerExists === false}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Password"
                />
                <div
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading || customerExists === false}
              className={`w-full py-2 px-4 text-white rounded-lg ${
                loading ? 'bg-primary/70' : 'bg-primary hover:bg-primary-dark'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="flex justify-between text-sm">
          <Link
            to="/members/login"
            className="font-medium text-primary hover:underline"
          >
            Back to Login
          </Link>
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Admin Portal
          </Link>
        </div>

        {/* Privacy Policy Link */}
        <div className="mt-6 text-center text-sm">
          <a 
            href="https://www.aieskyline.co.uk/privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-gray-500 hover:text-primary transition-colors"
          >
            Read our Privacy Policy
          </a>
        </div>
        
      </div>
    </div>
  );
};

export default MemberRegister;
