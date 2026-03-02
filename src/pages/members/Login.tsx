// src/pages/members/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const mapError = (code: string) => {
  switch (code) {
    case 'auth/invalid-email': return 'The email address is not valid.';
    case 'auth/user-disabled': return 'This user account has been disabled.';
    case 'auth/user-not-found': return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    default: return 'Could not sign you in. Please try again.';
  }
};

const MemberLogin: React.FC = () => {
  const { user: authUser } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          const { role } = userDoc.data() as any;
          if (role === 'member') {
            navigate('/members/transactions', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          await auth.signOut();
        }
      } catch {
        await auth.signOut();
      }
    })();
  }, [authUser, navigate]);

  if (authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center text-gray-600">Redirecting…</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (userDoc.exists()) {
        const { role } = userDoc.data() as any;
        if (role === 'member') {
          navigate('/members/transactions');
        } else {
          toast('Redirecting to admin portal…');
          navigate('/');
        }
      } else {
        toast.error('No user profile found.');
        await auth.signOut();
      }
    } catch (err: any) {
      const msg = mapError(err?.code || '');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Member Portal Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access your member dashboard.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="pt-2">
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div className="pt-4">
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                loading ? 'bg-primary/70' : 'bg-primary hover:bg-primary-dark'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="flex justify-between text-sm">
          <Link to="/members/register" className="font-medium text-primary hover:underline">
            New here? Register
          </Link>
          <Link to="/login" className="font-medium text-primary hover:underline">
            Admin Portal
          </Link>
        </div>

        <p className="mt-3 text-sm text-right">
          <Link to="/members/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </p>

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

export default MemberLogin;