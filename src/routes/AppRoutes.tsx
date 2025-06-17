// src/routes/AppRoutes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { lazyLoad } from './lazyLoad';

// --- Lazy load ALL page components using the HOC for consistency ---

// Public pages
const Login = lazyLoad('Login');
const AdminSetup = lazyLoad('AdminSetup');

// Main protected pages
const Dashboard = lazyLoad('Dashboard');
const Profile = lazyLoad('Profile');
const ProductsPage = lazyLoad('ProductsPage'); // FIX: Now uses lazyLoad
const Vehicles = lazyLoad('Vehicles');
const Maintenance = lazyLoad('Maintenance');
const Rentals = lazyLoad('Rentals');
const Accidents = lazyLoad('Accidents');
const Users = lazyLoad('Users');
const Customers = lazyLoad('Customers');
const CompanyManagers = lazyLoad('CompanyManagers');
const Chat = lazyLoad('Chat');
const BulkEmail = lazyLoad('BulkEmail');
const Share = lazyLoad('Share');

// Claims pages
const Claims = lazyLoad('Claims');
const VDFinance = lazyLoad('VDFinance');
const VDInvoice = lazyLoad('VDInvoice');
const PersonalInjury = lazyLoad('PersonalInjury');

// Finance pages
const Finance = lazyLoad('Finance');
const Invoices = lazyLoad('Invoices');
const PettyCash = lazyLoad('PettyCash');
const VATRecord = lazyLoad('VATRecord');
const IncomeExpense = lazyLoad('IncomeExpense'); // FIX: Now uses lazyLoad

// Skyline Cabs pages
const DriverPay = lazyLoad('DriverPay');
const AiePettyCash = lazyLoad('AiePettyCash');
const SkylineIncomeExpense = lazyLoad('SkylineIncomeExpense'); // FIX: Now uses lazyLoad


const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin-setup" element={<AdminSetup />} />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/chat" element={
        <ProtectedRoute>
          <Layout>
            <Chat />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/bulk-email" element={
        <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
          <Layout>
            <BulkEmail />
          </Layout>
        </ProtectedRoute>
      } />

      <Route
        path="/products"
        element={
          <ProtectedRoute requiredPermission={{ module:'products', action:'view' }}>
            <Layout>
              <ProductsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/skyline-caps/driver-pay" element={
        <ProtectedRoute requiredPermission={{ module: 'driverPay', action: 'view' }}>
          <Layout>
            <DriverPay />
          </Layout>
        </ProtectedRoute>
      } />

      {/* This is the general Finance Income & Expense */}
      <Route path="/income-expense" element={
        <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
          <Layout>
            <IncomeExpense />
          </Layout>
        </ProtectedRoute>
      } />

      {/* This is the Skyline-specific Income & Expense */}
      <Route path="/skyline-caps/income-expense" element={
        <ProtectedRoute requiredPermission={{ module: 'driverPay', action: 'view' }}>
          <Layout>
            <SkylineIncomeExpense />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/finance/vat-records" element={
        <ProtectedRoute requiredPermission={{ module: 'vatRecord', action: 'view' }}>
          <Layout>
            <VATRecord />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/skyline-caps/aie-petty-cash" element={
        <ProtectedRoute requiredPermission={{ module: 'driverPay', action: 'view' }}>
          <Layout>
            <AiePettyCash />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Layout>
            <Profile />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/vehicles" element={
        <ProtectedRoute requiredPermission={{ module: 'vehicles', action: 'view' }}>
          <Layout>
            <Vehicles />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/maintenance" element={
        <ProtectedRoute requiredPermission={{ module: 'maintenance', action: 'view' }}>
          <Layout>
            <Maintenance />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/rentals" element={
        <ProtectedRoute requiredPermission={{ module: 'rentals', action: 'view' }}>
          <Layout>
            <Rentals />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/accidents" element={
        <ProtectedRoute requiredPermission={{ module: 'accidents', action: 'view' }}>
          <Layout>
            <Accidents />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/share" element={
        <ProtectedRoute requiredPermission={{ module: 'share', action: 'view' }}>
          <Layout>
            <Share />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/claims" element={
        <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
          <Layout>
            <Claims />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/claims/vd-finance" element={
        <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
          <Layout>
            <VDFinance />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/claims/vd-invoice" element={
        <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
          <Layout>
            <VDInvoice />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/finance" element={
        <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
          <Layout>
            <Finance />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/finance/invoices" element={
        <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
          <Layout>
            <Invoices />
          </Layout>
        </ProtectedRoute>
      } />

      {/* This is the general Finance Petty Cash */}
      <Route path="/finance/petty-cash" element={
        <ProtectedRoute requiredPermission={{ module: 'finance', action: 'view' }}>
          <Layout>
            <PettyCash />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/users" element={
        <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
          <Layout>
            <Users />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/customers" element={
        <ProtectedRoute requiredPermission={{ module: 'customers', action: 'view' }}>
          <Layout>
            <Customers />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/company-managers" element={
        <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
          <Layout>
            <CompanyManagers />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Catch-all route to redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
