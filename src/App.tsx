import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminSetup from './pages/AdminSetup';
import Dashboard from './pages/Dashboard';
import Maintenance from './pages/Maintenance';
import Rentals from './pages/Rentals';
import Accidents from './pages/Accidents';
import Claims from './pages/Claims';
import Finance from './pages/Finance';
import Users from './pages/Users';

const PrivateRoute: React.FC<{ 
  element: React.ReactElement;
  requiredRole?: 'admin' | 'manager' | 'driver';
}> = ({ element, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
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
          <Route
            path="/profile"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Profile />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/maintenance"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Maintenance />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/rentals"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Rentals />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/accidents"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Accidents />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/claims"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Claims />
                  </Layout>
                }
              />
            }
          />
          <Route
            path="/finance"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Finance />
                  </Layout>
                }
                requiredRole="manager"
              />
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute
                element={
                  <Layout>
                    <Users />
                  </Layout>
                }
                requiredRole="admin"
              />
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;