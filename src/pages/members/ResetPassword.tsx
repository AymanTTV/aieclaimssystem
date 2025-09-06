import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import toast from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const params = new URLSearchParams(search);
  const oobCode = params.get('oobCode') || '';
  const mode = params.get('mode') || ''; // usually "resetPassword"

  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [codeValid, setCodeValid] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setChecking(false);
        setCodeValid(false);
        return;
      }
      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setCodeValid(true);
      } catch (err: any) {
        setCodeValid(false);
        toast.error(
          err?.message || 'Invalid or expired reset link. Please request a new one.'
        );
      } finally {
        setChecking(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeValid) return;

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success('Password updated. You can now log in.');
      navigate('/members/login');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set new password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-gray-600">Checking your reset link…</div>
      </div>
    );
  }

  if (!codeValid) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 p-6 shadow-sm bg-white text-center">
          <h1 className="text-xl font-semibold mb-2">Reset link invalid</h1>
          <p className="text-sm text-gray-600 mb-6">
            The link is invalid or expired. Please request a new reset email.
          </p>
          <Link to="/members/forgot-password" className="text-blue-600 hover:underline">
            Send a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-2">Set a new password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Account: <span className="font-medium">{email}</span>
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-black text-white py-2 font-medium disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update password'}
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

export default ResetPassword;
