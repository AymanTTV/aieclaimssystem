import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { 
  Calendar, 
  Wrench,
  AlertTriangle, 
  DollarSign, 
  Users, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building,
  Truck,
  UserPlus,
  FileText
} from 'lucide-react';
import { auth } from '../lib/firebase';
import logo from '../assets/logo.png';
import MobileMenu from './navigation/MobileMenu';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isIncidentDropdownOpen, setIsIncidentDropdownOpen] = useState(false);
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);

  const navigation = [
    { name: 'Vehicles', href: '/vehicles', icon: Truck, permission: 'vehicles' },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, permission: 'maintenance' },
    { name: 'Rentals', href: '/rentals', icon: Calendar, permission: 'rentals' },
    { name: 'Finance', href: '/finance', icon: DollarSign, permission: 'finance' },
    { name: 'Customers', href: '/customers', icon: UserPlus, permission: 'customers' },
  ].filter(item => !item.permission || can(item.permission as any, 'view'));

  const incidentItems = [
    { name: 'Accidents', href: '/accidents', icon: AlertTriangle, permission: 'accidents' },
    { name: 'Claims', href: '/claims', icon: FileText, permission: 'claims' },
  ].filter(item => !item.permission || can(item.permission as any, 'view'));

  const userItems = [
    { name: 'Users', href: '/users', icon: Users, permission: 'users' },
    { name: 'Company', href: '/company-managers', icon: Building, permission: 'users' },
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
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img src={logo} alt="AIE Skyline" className="h-10 w-auto" />
            </Link>

            {/* Main Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive 
                        ? 'text-primary bg-primary/5' 
                        : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-1.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Incidents Dropdown */}
              {incidentItems.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsIncidentDropdownOpen(!isIncidentDropdownOpen);
                      setIsUsersDropdownOpen(false);
                    }}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.includes('/accident') || location.pathname.includes('/claim')
                        ? 'text-primary bg-primary/5'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 mr-1.5" />
                    <span>Incidents</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>

                  {isIncidentDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      {incidentItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`flex items-center px-4 py-2 text-sm ${
                              isActive
                                ? 'text-primary bg-primary/5'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => setIsIncidentDropdownOpen(false)}
                          >
                            <Icon className="w-5 h-5 mr-2" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Users & Company Dropdown */}
              {userItems.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUsersDropdownOpen(!isUsersDropdownOpen);
                      setIsIncidentDropdownOpen(false);
                    }}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.includes('/users') || location.pathname.includes('/company')
                        ? 'text-primary bg-primary/5'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <Users className="w-5 h-5 mr-1.5" />
                    <span>Users & Company</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>

                  {isUsersDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      {userItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`flex items-center px-4 py-2 text-sm ${
                              isActive
                                ? 'text-primary bg-primary/5'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            onClick={() => setIsUsersDropdownOpen(false)}
                          >
                            <Icon className="w-5 h-5 mr-2" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                      <span className="text-lg font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden ml-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={[...navigation, ...incidentItems, ...userItems]}
        currentPath={location.pathname}
      />

      {/* Main Content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;