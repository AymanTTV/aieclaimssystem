import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { lazyLoad } from './lazyLoad';

// Lazy load pages
const Login = lazyLoad('../pages/Login');
const AdminSetup = lazyLoad('../pages/AdminSetup');
const Dashboard = lazyLoad('../pages/Dashboard');
const Profile = lazyLoad('../pages/Profile');
const Vehicles = lazyLoad('../pages/Vehicles');
const Maintenance = lazyLoad('../pages/Maintenance');
const Rentals = lazyLoad('../pages/Rentals');
const Accidents = lazyLoad('../pages/Accidents');
const Claims = lazyLoad('../pages/Claims');
const Finance = lazyLoad('../pages/Finance');
const Users = lazyLoad('../pages/Users');
const Customers = lazyLoad('../pages/Customers');

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