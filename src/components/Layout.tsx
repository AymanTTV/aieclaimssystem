// src/components/Layout.tsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  Calendar,
  Wrench,
  AlertTriangle,
  DollarSign,
  Users,
  User,          // ← for member profile link
  LogOut,
  Menu,
  ChevronDown,
  Building,
  FileText,
  Calculator,
  Mail,
  Share2,
  MessageSquare,
  Box,
  Home,
  Car,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import logo from '../assets/logo.png';
import MobileMenu from './navigation/MobileMenu';
import { ROUTES, ROUTE_METADATA, ROUTE_PERMISSIONS } from '../routes';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  Timestamp,
} from 'firebase/firestore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: { module: string; action: string };
  submenu?: Array<{
    name: string;
    href: string;
    permission?: { module: string; action: string };
    icon?: React.ElementType;
  }>;
}

// Map metadata icon names to components
const IconMap: Record<string, React.ElementType> = {
  Home, Car, Box, Wrench, Calendar, AlertTriangle,
  FileText, DollarSign, Users, Building,
  Calculator, Mail, Share2, MessageSquare,
};

const getNavItem = (
  route: string,
  customName?: string,
  customIcon?: React.ElementType,
  customPermission?: { module: string; action: string }
): NavItem | null => {
  const metadata = ROUTE_METADATA[route as keyof typeof ROUTE_METADATA];
  const permission = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
  if (!metadata && !customName && !customIcon) return null;
  const iconName = metadata?.icon as string | undefined;
  const IconComponent = customIcon || (iconName && IconMap[iconName]) || MessageSquare;
  return {
    name: customName || metadata!.title,
    href: route,
    icon: IconComponent,
    permission: customPermission || permission,
  };
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Timestamp | null>(null);

  // detect members area
  const isMemberArea = location.pathname.startsWith('/members');

  // listen for lastReadTimestamp
  useEffect(() => {
    if (!user?.id) return setLastReadTimestamp(null);
    const ref = doc(db, 'users', user.id);
    const unsub = onSnapshot(ref, snap => {
      setLastReadTimestamp((snap.data() as any)?.lastReadTimestamp || null);
    });
    return () => unsub();
  }, [user?.id]);

  // listen for unread chat
  useEffect(() => {
    if (!user?.id) return setUnreadChatCount(0);
    let q = query(collection(db, 'messages'), orderBy('timestamp','desc'));
    if (lastReadTimestamp) {
      q = query(
        collection(db, 'messages'),
        where('timestamp','>', lastReadTimestamp),
        orderBy('timestamp','desc')
      );
    }
    const unsub = onSnapshot(q, snap => {
      const count = snap.docs.filter(d => {
        const m = d.data() as any;
        const ts = m.timestamp?.toDate() || new Date();
        const own = m.sender.id === user.id;
        const older = lastReadTimestamp ? ts <= lastReadTimestamp.toDate() : false;
        return !own && !older;
      }).length;
      setUnreadChatCount(count);
    });
    return () => unsub();
  }, [user?.id, lastReadTimestamp]);

  // clear when viewing chat
  useEffect(() => {
    if (location.pathname === ROUTES.CHAT) setUnreadChatCount(0);
  }, [location.pathname]);

  // build nav
  const rawNavigation: NavItem[] = isMemberArea
    ? [
        { name:'Transactions', href:'/members/transactions', icon:FileText },
        { name:'Profile',      href:'/members/profile',      icon:User     },
      ]
    : [
        getNavItem(ROUTES.VEHICLES),
        getNavItem(ROUTES.MAINTENANCE),
        getNavItem(ROUTES.PRODUCTS),
        getNavItem(ROUTES.RENTALS),
        getNavItem(ROUTES.ACCIDENTS),
        {
          name: ROUTE_METADATA[ROUTES.CLAIMS].title!,
          href: ROUTES.CLAIMS,
          icon: IconMap[ROUTE_METADATA[ROUTES.CLAIMS].icon as string] || FileText,
          permission: ROUTE_PERMISSIONS[ROUTES.CLAIMS],
          submenu: [
            getNavItem(ROUTES.CLAIMS)!,
            getNavItem(ROUTES.VD_FINANCE)!,
            { name:'VD Invoice', href:ROUTES.VD_INVOICE, permission:ROUTE_PERMISSIONS[ROUTES.CLAIMS] },
            { name:'Share', href:ROUTES.SHARE, permission:{module:'share',action:'view'} },
          ],
        },
        {
          name:'Skyline Cabs', href:ROUTES.DRIVER_PAY, icon:Building,
          permission:{module:'driverPay',action:'view'},
          submenu:[
            { name:'Driver Pay', href:ROUTES.DRIVER_PAY, permission:{module:'driverPay',action:'view'} },
            { name:'Petty Cash', href:ROUTES.SKYLINE_PETTY_CASH, permission:{module:'driverPay',action:'view'} },
            { name:'Income & Expense', href:ROUTES.SKYLINE_INCOME_EXPENSE, permission:{module:'driverPay',action:'view'} },
          ]
        },
        {
          name:ROUTE_METADATA[ROUTES.FINANCE].title!, href:ROUTES.FINANCE,
          icon: IconMap[ROUTE_METADATA[ROUTES.FINANCE].icon as string] || DollarSign,
          permission:ROUTE_PERMISSIONS[ROUTES.FINANCE],
          submenu:[
            getNavItem(ROUTES.FINANCE)!,
            getNavItem(ROUTES.PETTY_CASH)!,
            getNavItem(ROUTES.INVOICES)!,
            { name:'VAT Records', href:ROUTES.VAT_RECORD, permission:{module:'vatRecord',action:'view'}, icon:Calculator },
            getNavItem(ROUTES.INCOME_EXPENSE)!,
          ]
        },
        getNavItem(ROUTES.CUSTOMERS)!,
        {
          name:'Company', href:ROUTES.USERS,
          icon: IconMap[ROUTE_METADATA[ROUTES.USERS].icon as string] || Users,
          permission:ROUTE_PERMISSIONS[ROUTES.USERS],
          submenu:[
            { name:'Bulk Email', href:ROUTES.BULK_EMAIL, permission:ROUTE_PERMISSIONS[ROUTES.USERS], icon:Mail },
            getNavItem(ROUTES.USERS)!,
            { name:'Company Managers', href:ROUTES.COMPANY_MANAGERS, permission:ROUTE_PERMISSIONS[ROUTES.USERS] },
          ]
        },
        getNavItem(ROUTES.CHAT)!,
      ].filter(Boolean) as NavItem[];

  const navigation = rawNavigation.filter(item => {
    const ok = !item.permission || can(item.permission.module, item.permission.action);
    if (item.submenu) {
      item.submenu = item.submenu.filter(sub => !sub.permission || can(sub.permission.module, sub.permission.action));
      return ok || item.submenu.length > 0;
    }
    return ok;
  });

  const handleLogout = async () => {
    await auth.signOut();
    navigate(isMemberArea ? '/members/login' : ROUTES.LOGIN);
  };

  const isActiveRoute = (href: string) => {
    const p = location.pathname;
    return href === p
      || (href !== '/' && p.startsWith(href) && (p.length === href.length || p[href.length] === '/'))
      || (href === '/' && p === '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to={isMemberArea ? '/members/transactions' : ROUTES.DASHBOARD} className="flex-shrink-0">
              <img src={logo} alt="AIE Skyline" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map(item => {
                const Icon = item.icon;
                const active = isActiveRoute(item.href)
                  || !!item.submenu?.some(sub => isActiveRoute(sub.href));

                if (item.submenu) {
                  return (
                    <div key={item.name} className="relative">
                      <button
                        onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          active ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-1.5" />
                        <span>{item.name}</span>
                        <ChevronDown className={`w-4 h-4 ml-1 ${openSubmenu === item.name ? 'rotate-180' : ''}`} />
                      </button>
                      {openSubmenu === item.name && (
                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                          {item.submenu!.map(sub => (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              className={`block px-4 py-2 text-sm ${
                                isActiveRoute(sub.href) ? 'text-primary bg-primary/5' : 'text-gray-700 hover:bg-gray-50'
                              } flex items-center`}
                              onClick={() => setOpenSubmenu(null)}
                            >
                              {sub.icon && <sub.icon className="w-4 h-4 mr-2" />}
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      active ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-1.5" />
                    <span>{item.name}</span>
                    {item.href === ROUTES.CHAT && unreadChatCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-red-100 bg-red-600 rounded-full">
                        {unreadChatCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center">
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to={isMemberArea ? '/members/profile' : ROUTES.PROFILE}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile toggle */}
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

      {/* Mobile menu (hide for members) */}
      {!isMemberArea && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navigation={navigation}
          currentPath={location.pathname}
          unreadChatCount={unreadChatCount}
        />
      )}

      {/* Main content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
