import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';

// Lazy load pages
const Login = React.lazy(() => import('../pages/Login'));
const AdminSetup = React.lazy(() => import('../pages/AdminSetup'));
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Profile = React.lazy(() => import('../pages/Profile'));
const Vehicles = React.lazy(() => import('../pages/Vehicles'));
const Maintenance = React.lazy(() => import('../pages/Maintenance'));
const Rentals = React.lazy(() => import('../pages/Rentals'));
const Accidents = React.lazy(() => import('../pages/Accidents'));
const Claims = React.lazy(() => import('../pages/Claims'));
const Share = React.lazy(() => import('../pages/Share'));
const Finance = React.lazy(() => import('../pages/Finance'));
const Users = React.lazy(() => import('../pages/Users'));
const Customers = React.lazy(() => import('../pages/Customers'));

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

<Route path="/share" element={
        <ProtectedRoute requiredPermission={{ module: 'share', action: 'view' }}>
          <Layout>
            <Claims />
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
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;