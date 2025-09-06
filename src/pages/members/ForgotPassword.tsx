import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email.');
      return;
    }
    setSending(true);
    try {
      // Link will open inside your app on /members/reset-password
      const actionCodeSettings = {
        url: `${window.location.origin}/members/reset-password`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, trimmed, actionCodeSettings);
      toast.success('Reset link sent. Check your inbox and spam folder.');
    } catch (err: any) {
      // common Firebase Auth codes: auth/user-not-found, auth/invalid-email, etc.
      toast.error(err?.message || 'Failed to send reset email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-2">Forgot password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter your account email and we’ll send you a password reset link.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-md bg-black text-white py-2 font-medium disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/members/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
