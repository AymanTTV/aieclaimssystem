import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { lazyLoad } from './lazyLoad';

// Lazy load components
const AiePettyCash = lazyLoad('AiePettyCash');
const VATRecord = lazyLoad('VATRecord');
const DriverPay = lazyLoad('DriverPay');
const Login = lazyLoad('Login');
const AdminSetup = lazyLoad('AdminSetup');
const Dashboard = lazyLoad('Dashboard');
const Profile = lazyLoad('Profile');
const Vehicles = lazyLoad('Vehicles');
const Maintenance = lazyLoad('Maintenance');
const Rentals = lazyLoad('Rentals');
const Accidents = lazyLoad('Accidents');
const Claims = lazyLoad('Claims');
const PersonalInjury = lazyLoad('PersonalInjury');
const Finance = lazyLoad('Finance');
const Invoices = lazyLoad('Invoices');
const PettyCash = lazyLoad('PettyCash');
const Users = lazyLoad('Users');
const Customers = lazyLoad('Customers');
const CompanyManagers = lazyLoad('CompanyManagers');
const VDFinance = lazyLoad('VDFinance'); // Add this line

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin-setup" element={<AdminSetup />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/skyline-caps/driver-pay" element={
        <ProtectedRoute requiredPermission={{ module: 'driverPay', action: 'view' }}>
          <Layout>
            <DriverPay />
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
      
      <Route path="/claims" element={
        <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
          <Layout>
            <Claims />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/claims/personal-injury" element={
        <ProtectedRoute requiredPermission={{ module: 'claims', action: 'view' }}>
          <Layout>
            <PersonalInjury />
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
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;