// src/routes/AppRoutes.tsx

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { lazyLoad } from './lazyLoad';
import ForgotPassword from '../pages/members/ForgotPassword';
import ResetPassword from '../pages/members/ResetPassword';
import { ROUTES } from '.';
// Spinner for Suspense boundaries
const spinner = (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

/* ─────────────────────────────
   Public (admin/staff)
────────────────────────────── */
const Login      = lazyLoad('Login');
const AdminSetup = lazyLoad('AdminSetup');

/* ─────────────────────────────
   Members (public)
────────────────────────────── */
const MemberLogin    = lazy(() => import('../pages/members/Login'));
const MemberRegister = lazy(() => import('../pages/members/Register'));

/* ─────────────────────────────
   Members (protected)
────────────────────────────── */
const MembersLayout   = lazy(() => import('../pages/members/MembersLayout'));
const MemberDashboard = lazy(() => import('../pages/members/MemberDashboard'));
const MemberFinance   = lazy(() => import('../pages/members/MemberFinance'));
const MemberInvoices  = lazy(() => import('../pages/members/MemberInvoices'));
const MemberRentals   = lazy(() => import('../pages/members/MemberRentals'));
// reuse the admin Profile component for member profile:
const MemberProfile   = lazyLoad('Profile');
const Waiting = lazyLoad('WaitingPage');
const WhatsappCommunication = lazyLoad('WhatsappCommunication');
/* ─────────────────────────────
   Admin/Main (protected)
────────────────────────────── */
const Dashboard            = lazyLoad('Dashboard');
const Profile              = lazyLoad('Profile');
const ProductsPage         = lazyLoad('ProductsPage');
const Vehicles             = lazyLoad('Vehicles');
const Maintenance          = lazyLoad('Maintenance');
const Rentals              = lazyLoad('Rentals');
const Accidents            = lazyLoad('Accidents');
const Users                = lazyLoad('Users');
const Customers            = lazyLoad('Customers');
const CompanyManagers      = lazyLoad('CompanyManagers');
const Chat                 = lazyLoad('Chat');
const BulkEmail            = lazyLoad('BulkEmail');
const Share                = lazyLoad('Share');
const Claims               = lazyLoad('Claims');
const VDFinance            = lazyLoad('VDFinance');
const VDInvoice            = lazyLoad('VDInvoice');
const PersonalInjury       = lazyLoad('PersonalInjury');
const Finance              = lazyLoad('Finance');
const Invoices             = lazyLoad('Invoices');
const PettyCash            = lazyLoad('PettyCash');
const VATRecord            = lazyLoad('VATRecord');
const IncomeExpense        = lazyLoad('IncomeExpense');
const DriverPay            = lazyLoad('DriverPay');
const AiePettyCash         = lazyLoad('AiePettyCash');
const SkylineIncomeExpense = lazyLoad('SkylineIncomeExpense');

export default function AppRoutes() {
  return (
    <Routes>
      {/* ────────────── Public ────────────── */}
      <Route path="/login"       element={<Login />} />
      <Route path="/admin-setup" element={<AdminSetup />} />

      {/* Member password flows */}
      <Route path="/members/forgot-password" element={<ForgotPassword />} />
      <Route path="/members/reset-password"  element={<ResetPassword />} />

      {/* Member portal public */}
      <Route
        path="/members/login"
        element={
          <Suspense fallback={spinner}>
            <MemberLogin />
          </Suspense>
        }
      />
      <Route
        path="/members/register"
        element={
          <Suspense fallback={spinner}>
            <MemberRegister />
          </Suspense>
        }
      />

     <Route
  path="/waiting"
  element={
    <ProtectedRoute requiredPermission={{ module: 'waiting', action: 'view' }}>
      <Layout>
        <Waiting />
      </Layout>
    </ProtectedRoute>
  }
/>


      {/* ─────────── Member portal (protected) ─────────── */}
      <Route
        path="/members/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={spinner}>
                <MembersLayout />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      >
        {/* Default → Dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Dashboard */}
        <Route
          path="dashboard"
          element={
            <Suspense fallback={spinner}>
              <MemberDashboard />
            </Suspense>
          }
        />

        {/* Transactions/Finance (both paths supported) */}
        <Route
          path="transactions"
          element={
            <Suspense fallback={spinner}>
              <MemberFinance />
            </Suspense>
          }
        />
        <Route
          path="finance"
          element={
            <Suspense fallback={spinner}>
              <MemberFinance />
            </Suspense>
          }
        />

        {/* Invoices */}
        <Route
          path="invoices"
          element={
            <Suspense fallback={spinner}>
              <MemberInvoices />
            </Suspense>
          }
        />

        {/* Rentals */}
        <Route
          path="rentals"
          element={
            <Suspense fallback={spinner}>
              <MemberRentals />
            </Suspense>
          }
        />

        {/* Profile (reuses admin Profile component) */}
        <Route
          path="profile"
          element={
            <Suspense fallback={spinner}>
              <MemberProfile />
            </Suspense>
          }
        />

        {/* Catch-all for wrong /members/* paths */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ─────────── Admin / Main (protected) ─────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/bulk-email"
        element={
          <ProtectedRoute requiredPermission={{ module: 'bulkEmail', action: 'view' }}> // ✨ MODIFIED
            <Layout>
              <BulkEmail />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path={ROUTES.WHATSAPP}  // '/whatsapp-communication'
        element={
          <ProtectedRoute requiredPermission={{ module: 'whatsapp', action: 'view' }}>
            <Layout>
              <WhatsappCommunication />
            </Layout>
          </ProtectedRoute>
        }
      />


      <Route
        path="/products"
        element={
          <ProtectedRoute requiredPermission={{ module: 'products', action: 'view' }}>
            <Layout>
              <ProductsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/skyline-caps/driver-pay"
        element={
          <ProtectedRoute requiredPermission={{ module: 'driverPay', action: 'view' }}>
            <Layout>
              <DriverPay />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/income-expense"
        element={
          <ProtectedRoute requiredPermission={{ module: 'incomeExpense', action: 'view' }}>
            <Layout>
              <IncomeExpense />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/skyline-caps/income-expense"
        element={
          <ProtectedRoute requiredPermission={{ module: 'skylineIncomeExpense', action: 'view' }}>
            <Layout>
              <SkylineIncomeExpense />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance/vat-records"
        element={
          <ProtectedRoute requiredPermission={{ module: 'vatRecord', action: 'view' }}>
            <Layout>
              <VATRecord />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/skyline-caps/aie-petty-cash"
        element={
          <ProtectedRoute requiredPermission={{ module: 'aiePettyCash', action: 'view' }}>
            <Layout>
              <AiePettyCash />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedRoute requiredPermission={{ module: 'vehicles', action: 'view' }}>
            <Layout>
              <Vehicles />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/maintenance"
        element={
          <ProtectedRoute requiredPermission={{ module: 'maintenance', action: 'view' }}>
            <Layout>
              <Maintenance />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rentals"
        element={
          <ProtectedRoute requiredPermission={{ module: 'rentals', action: 'view' }}>
            <Layout>
              <Rentals />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/accidents"
        element={
          <ProtectedRoute requiredPermission={{ module: 'accidents', action: 'view' }}>
            <Layout>
              <Accidents />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/share"
        element={
          <ProtectedRoute requiredPermission={{ module: 'share', action: 'view' }}>
            <Layout>
              <Share />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/claims"
        element={
          <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
            <Layout>
              <Claims />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Claims sub-pages must use their OWN modules, not 'claims' */}
      <Route
        path="/claims/vd-finance"
        element={
          <ProtectedRoute requiredPermission={{ module: 'vdFinance', action: 'view' }}>
            <Layout>
              <VDFinance />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/claims/vd-invoice"
        element={
          <ProtectedRoute requiredPermission={{ module: 'vdInvoice', action: 'view' }}>
            <Layout>
              <VDInvoice />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance"
        element={
          <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
            <Layout>
              <Finance />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Use the correct module for the finance sub-pages */}
      <Route
        path="/finance/invoices"
        element={
          <ProtectedRoute requiredPermission={{ module: 'invoices', action: 'view' }}>
            <Layout>
              <Invoices />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance/petty-cash"
        element={
          <ProtectedRoute requiredPermission={{ module: 'pettyCash', action: 'view' }}>
            <Layout>
              <PettyCash />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredPermission={{ module: 'customers', action: 'view' }}>
            <Layout>
              <Customers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company-managers"
        element={
          <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
            <Layout>
              <CompanyManagers />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
