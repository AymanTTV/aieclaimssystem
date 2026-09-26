// src/pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Lock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import ForgotPassword from '../components/auth/ForgotPassword';
import aieLogo from '../assets/logo.png';

const Login: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (!userDoc.exists()) {
        toast.error('User profile not found');
        await auth.signOut();
        return;
      }

      const { role } = userDoc.data() as any;

      if (role === 'member') {
        await auth.signOut();
        toast.error('Please sign in via the Member Portal.');
        return navigate('/members/login', { replace: true });
      }

      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <ForgotPassword onBack={() => setShowForgotPassword(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200/80">
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <img
                src={aieLogo}
                alt="AIE Skyline Logo"
                className="h-16 w-auto object-contain hover:scale-105 transition-transform duration-200"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AIE FLEET Management System
            </h2>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Sign in to your account to continue
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all shadow-xs"
                    placeholder="admin@aieskyline.co.uk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3.5 py-2.5 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all shadow-xs"
                    placeholder="•••••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-primary hover:text-primary-700 transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white ${
                  loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-600 active:scale-[0.99] cursor-pointer shadow-md hover:shadow-lg'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all`}
              >
                {loading ? <Loader className="animate-spin h-5 w-5" /> : 'Sign in'}
              </button>
            </div>
          </form>

          {/* Go to Members Portal button */}
          <div className="pt-2 text-center">
            <Link to="/members/login">
              <button className="w-full py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer text-sm shadow-xs">
                Go to Members Portal
              </button>
            </Link>
          </div>

          {/* Privacy Policy Link */}
          <div className="pt-2 text-center text-xs">
            <a 
              href="https://www.aieskyline.co.uk/privacy" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-500 hover:text-primary transition-colors font-medium"
            >
              Read our Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Welcome Banner with og-image.jpg */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden bg-[#16192B]">
        {/* Background image from /public/og-image.jpg */}
        <div
          className="absolute inset-0 bg-contain bg-no-repeat bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url('/og-image.jpg')` }}
        />

        {/* Gradient overlays to guarantee pristine contrast, readability, and modern dark styling */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#16192B]/90 via-[#212049]/70 to-[#16192B]/85" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />

        {/* Welcome message pinned at the top */}
        <div className="absolute inset-x-0 top-0 pt-16 px-10 xl:px-16 z-10">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sky-200 text-xs font-semibold uppercase tracking-widest shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Fleet Operations & Intelligence
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
              Welcome Back!
            </h1>
            <p className="text-base xl:text-lg text-slate-100/90 font-normal leading-relaxed drop-shadow-sm max-w-lg mx-auto">
              Sign in to manage your fleet, track maintenance, and handle rentals all in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;