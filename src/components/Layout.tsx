import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { 
  Car, 
  Calendar, 
  Wrench,
  AlertTriangle, 
  DollarSign, 
  Users, 
  LogOut,
  Menu,
  X,
  FileText,
  Truck,
  UserPlus,
  Building
} from 'lucide-react';
import { auth } from '../lib/firebase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Car },
    { name: 'Vehicles', href: '/vehicles', icon: Truck, permission: 'vehicles' },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, permission: 'maintenance' },
    { name: 'Rentals', href: '/rentals', icon: Calendar, permission: 'rentals' },
    { name: 'Accidents', href: '/accidents', icon: AlertTriangle, permission: 'accidents' },
    { name: 'Claims', href: '/claims', icon: FileText, permission: 'claims' },
    { name: 'Finance', href: '/finance', icon: DollarSign, permission: 'finance' },
    { name: 'Customers', href: '/customers', icon: UserPlus, permission: 'customers' },
    { name: 'Users', href: '/users', icon: Users, permission: 'users' },
    { name: 'Company & Managers', href: '/company-managers', icon: Building, permission: 'users' },
  ].filter(item => !item.permission || can(item.permission as any, 'view'));

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-200 ease-in-out
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-primary text-white">
            <Car className="w-8 h-8 mr-2" />
            <span className="text-xl font-bold">AIE SKYLINE</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-4 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}
                  `}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <Link 
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout();
                }}
                className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;