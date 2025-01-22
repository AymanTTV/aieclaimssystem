import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminSetup from './pages/AdminSetup';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Maintenance from './pages/Maintenance';
import Rentals from './pages/Rentals';
import Accidents from './pages/Accidents';
import Claims from './pages/Claims';
import Finance from './pages/Finance';
import Invoices from './pages/Invoices'; // Add this import
import Users from './pages/Users';
import Customers from './pages/Customers';
import { CompanyManagers } from './pages/CompanyManagers';
import { usePermissions } from './hooks/usePermissions';

interface PrivateRouteProps { 
  element: React.ReactElement;
  permission?: keyof RolePermissions;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element, permission }) => {
  const { user, loading } = useAuth();
  const { can } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (permission && !can(permission as any, 'view')) {
    return <Navigate to="/" />;
  }

  return element;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
          
          <Route path="/profile" element={
            <PrivateRoute
              element={
                <Layout>
                  <Profile />
                </Layout>
              }
            />
          } />
          
          <Route path="/" element={
            <PrivateRoute
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
          } />
          
          <Route path="/vehicles" element={
            <PrivateRoute
              element={
                <Layout>
                  <Vehicles />
                </Layout>
              }
              permission="vehicles"
            />
          } />
          
          <Route path="/maintenance" element={
            <PrivateRoute
              element={
                <Layout>
                  <Maintenance />
                </Layout>
              }
              permission="maintenance"
            />
          } />
          
          <Route path="/rentals" element={
            <PrivateRoute
              element={
                <Layout>
                  <Rentals />
                </Layout>
              }
              permission="rentals"
            />
          } />
          
          <Route path="/accidents" element={
            <PrivateRoute
              element={
                <Layout>
                  <Accidents />
                </Layout>
              }
              permission="accidents"
            />
          } />
          
          <Route path="/claims" element={
            <PrivateRoute
              element={
                <Layout>
                  <Claims />
                </Layout>
              }
              permission="claims"
            />
          } />
          
          <Route path="/finance" element={
            <PrivateRoute
              element={
                <Layout>
                  <Finance />
                </Layout>
              }
              permission="finance"
            />
          } />

          {/* Add the new Invoices route */}
          <Route path="/finance/invoices" element={
  <PrivateRoute
    element={
      <Layout>
        <Invoices />
      </Layout>
    }
    permission="finance"
  />
} />

          
          <Route path="/users" element={
            <PrivateRoute
              element={
                <Layout>
                  <Users />
                </Layout>
              }
              permission="users"
            />
          } />
          
          <Route path="/customers" element={
            <PrivateRoute
              element={
                <Layout>
                  <Customers />
                </Layout>
              }
              permission="customers"
            />
          } />

          <Route path="/company-managers" element={
            <PrivateRoute
              element={
                <Layout>
                  <CompanyManagers />
                </Layout>
              }
              permission="users"
            />
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
