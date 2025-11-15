// src/components/Layout.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  Calendar,
  Wrench,
  AlertTriangle,
  DollarSign,
  Users,
  User as UserIcon,
  LogOut,
  Menu,
  ChevronDown,
  Building,
  FileText,
  Calculator,
  Mail,
  Share2,
  CheckCircle2,
  MessageSquare,
  Box,
  Home,
  Car,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
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
    showBadge?: boolean;
  }>;
}

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

  // NEW: tiny close delay to prevent flicker
  const closeTimerRef = useRef<number | null>(null);
  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpenSubmenu(null), 150);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const isMemberArea = location.pathname.startsWith('/members');

  const logoUrl = useMemo(
    () => new URL('../assets/logo.png', import.meta.url).href,
    []
  );

  const ROUTE_ICON = useMemo<Partial<Record<string, React.ElementType>>>(() => ({
    [ROUTES.DASHBOARD]: Home,
    [ROUTES.VEHICLES]: Car,
    [ROUTES.MAINTENANCE]: Wrench,
    [ROUTES.PRODUCTS]: Box,
    [ROUTES.RENTALS]: Calendar,
    [ROUTES.ACCIDENTS]: AlertTriangle,
    [ROUTES.FINANCE]: DollarSign,
    [ROUTES.PETTY_CASH]: DollarSign,
    [ROUTES.INVOICES]: FileText,
    [ROUTES.VAT_RECORD]: Calculator,
    [ROUTES.INCOME_EXPENSE]: DollarSign,
    [ROUTES.CLAIMS]: FileText,
    [ROUTES.VD_FINANCE]: DollarSign,
    [ROUTES.VD_INVOICE]: FileText,
    [ROUTES.SHARE]: Share2,
    [ROUTES.DRIVER_PAY]: Building,
    [ROUTES.SKYLINE_PETTY_CASH]: DollarSign,
    [ROUTES.SKYLINE_INCOME_EXPENSE]: DollarSign,
    [ROUTES.CUSTOMERS]: Users,
    [ROUTES.USERS]: Users,
    [ROUTES.TODO]: CheckCircle2,
    [ROUTES.BULK_EMAIL]: Mail,
    [ROUTES.WHATSAPP]: MessageSquare,
    [ROUTES.COMPANY_MANAGERS]: Users,
    [ROUTES.WAITING]: Clock,
    // [ROUTES.CHAT]: MessageSquare,
    '/members/dashboard': Home,
    '/members/transactions': FileText,
    '/members/invoices': FileText,
    '/members/rentals': Calendar,
    '/members/profile': UserIcon,
    [ROUTES.PROFILE]: UserIcon,
  }), []);

  const ROUTE_LABEL = useMemo<Partial<Record<string, string>>>(() => ({
    [ROUTES.DASHBOARD]: 'Dashboard',
    [ROUTES.FINANCE]: 'Finance',
    [ROUTES.INVOICES]: 'Invoices',
    [ROUTES.CUSTOMERS]: 'Members',
    [ROUTES.USERS]: 'Users',
    // [ROUTES.CHAT]: 'Chat',
    [ROUTES.PROFILE]: 'Profile',
    [ROUTES.WAITING]: 'Waiting List',
    [ROUTES.TODO]: 'To-Do',
    [ROUTES.PRODUCTS]: 'Products',
    '/members/dashboard': 'Dashboard',
    '/members/transactions': 'Transactions',
    '/members/invoices': 'Invoices',
    '/members/rentals': 'Rentals',
    '/members/profile': 'Profile',
  }), []);

  const resolveLabel = (route: string): string =>
    ROUTE_LABEL[route] ||
    ROUTE_METADATA[route as keyof typeof ROUTE_METADATA]?.title ||
    route.split('/').pop()?.replace(/[-_]/g, ' ') ||
    'Page';

  const resolveIcon = (route: string): React.ElementType =>
    ROUTE_ICON[route] || FileText;

  const resolvePerm = (
    route: string
  ): { module: string; action: string } | undefined =>
    ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];

  useEffect(() => {
    if (!user?.id) return setLastReadTimestamp(null);
    const ref = doc(db, 'users', user.id);
    const unsub = onSnapshot(ref, snap => {
      setLastReadTimestamp((snap.data() as any)?.lastReadTimestamp || null);
    });
    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return setUnreadChatCount(0);
    let q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    if (lastReadTimestamp) {
      q = query(
        collection(db, 'messages'),
        where('timestamp', '>', lastReadTimestamp),
        orderBy('timestamp', 'desc')
      );
    }
    const unsub = onSnapshot(q, snap => {
      const count = snap.docs.filter(d => {
        const m = d.data() as any;
        const ts = m.timestamp?.toDate() || new Date();
        const own = m.sender?.id === user.id;
        const older = lastReadTimestamp ? ts <= lastReadTimestamp.toDate() : false;
        return !own && !older;
      }).length;
      setUnreadChatCount(count);
    });
    return () => unsub();
  }, [user?.id, lastReadTimestamp]);

  useEffect(() => {
    if (location.pathname === ROUTES.CHAT) setUnreadChatCount(0);
  }, [location.pathname]);

  const isActiveRoute = (href: string) => {
    const p = location.pathname;
    return (
      href === p ||
      (href !== '/' && p.startsWith(href) && (p.length === href.length || p[href.length] === '/')) ||
      (href === '/' && p === '/')
    );
  };

  const rawNavigation: NavItem[] = useMemo(() => {
    if (isMemberArea) {
      return [
        { name: resolveLabel('/members/dashboard'), href: '/members/dashboard', icon: resolveIcon('/members/dashboard') },
        { name: resolveLabel('/members/transactions'), href: '/members/transactions', icon: resolveIcon('/members/transactions') },
        { name: resolveLabel('/members/invoices'), href: '/members/invoices', icon: resolveIcon('/members/invoices') },
        { name: resolveLabel('/members/rentals'), href: '/members/rentals', icon: resolveIcon('/members/rentals') },
        { name: resolveLabel('/members/profile'), href: '/members/profile', icon: resolveIcon('/members/profile') },
      ];
    }

    return [
      { name: resolveLabel(ROUTES.DASHBOARD), href: ROUTES.DASHBOARD, icon: resolveIcon(ROUTES.DASHBOARD), permission: resolvePerm(ROUTES.DASHBOARD) },
      { name: resolveLabel(ROUTES.VEHICLES), href: ROUTES.VEHICLES, icon: resolveIcon(ROUTES.VEHICLES), permission: resolvePerm(ROUTES.VEHICLES) },
      { name: resolveLabel(ROUTES.MAINTENANCE), href: ROUTES.MAINTENANCE, icon: resolveIcon(ROUTES.MAINTENANCE), permission: resolvePerm(ROUTES.MAINTENANCE) },
      { name: resolveLabel(ROUTES.RENTALS), href: ROUTES.RENTALS, icon: resolveIcon(ROUTES.RENTALS), permission: resolvePerm(ROUTES.RENTALS) },

      {
        name: resolveLabel(ROUTES.CLAIMS),
        href: ROUTES.CLAIMS,
        icon: resolveIcon(ROUTES.CLAIMS),
        permission: resolvePerm(ROUTES.CLAIMS),
        submenu: [
          { name: resolveLabel(ROUTES.CLAIMS), href: ROUTES.CLAIMS, icon: resolveIcon(ROUTES.CLAIMS), permission: resolvePerm(ROUTES.CLAIMS) },
          { name: resolveLabel(ROUTES.VD_FINANCE), href: ROUTES.VD_FINANCE, icon: resolveIcon(ROUTES.VD_FINANCE), permission: resolvePerm(ROUTES.VD_FINANCE) },
          { name: resolveLabel(ROUTES.VD_INVOICE) || 'VD Invoice', href: ROUTES.VD_INVOICE, icon: resolveIcon(ROUTES.VD_INVOICE), permission: resolvePerm(ROUTES.VD_INVOICE) },
          { name: resolveLabel(ROUTES.SHARE), href: ROUTES.SHARE, icon: resolveIcon(ROUTES.SHARE), permission: resolvePerm(ROUTES.SHARE) ?? { module: 'share', action: 'view' } },
          { name: resolveLabel(ROUTES.ACCIDENTS), href: ROUTES.ACCIDENTS, icon: resolveIcon(ROUTES.ACCIDENTS), permission: resolvePerm(ROUTES.ACCIDENTS) },
        ],
      },

      {
        name: 'Skyline Cabs',
        href: ROUTES.DRIVER_PAY,
        icon: resolveIcon(ROUTES.DRIVER_PAY),
        permission: resolvePerm(ROUTES.DRIVER_PAY) ?? { module: 'driverPay', action: 'view' },
        submenu: [
          { name: resolveLabel(ROUTES.DRIVER_PAY), href: ROUTES.DRIVER_PAY, icon: resolveIcon(ROUTES.DRIVER_PAY), permission: resolvePerm(ROUTES.DRIVER_PAY) ?? { module: 'driverPay', action: 'view' } },
          { name: 'Skyline Petty Cash', href: ROUTES.SKYLINE_PETTY_CASH, icon: resolveIcon(ROUTES.SKYLINE_PETTY_CASH), permission: resolvePerm(ROUTES.SKYLINE_PETTY_CASH) ?? { module: 'aiePettyCash', action: 'view' } },
          { name: 'Income & Expense', href: ROUTES.SKYLINE_INCOME_EXPENSE, icon: resolveIcon(ROUTES.SKYLINE_INCOME_EXPENSE), permission: resolvePerm(ROUTES.SKYLINE_INCOME_EXPENSE) ?? { module: 'skylineIncomeExpense', action: 'view' } },
        ],
      },

      {
        name: resolveLabel(ROUTES.FINANCE),
        href: ROUTES.FINANCE,
        icon: resolveIcon(ROUTES.FINANCE),
        permission: resolvePerm(ROUTES.FINANCE),
        submenu: [
          { name: resolveLabel(ROUTES.FINANCE), href: ROUTES.FINANCE, icon: resolveIcon(ROUTES.FINANCE), permission: resolvePerm(ROUTES.FINANCE) },
          { name: resolveLabel(ROUTES.PETTY_CASH), href: ROUTES.PETTY_CASH, icon: resolveIcon(ROUTES.PETTY_CASH), permission: resolvePerm(ROUTES.PETTY_CASH) },
          { name: resolveLabel(ROUTES.INVOICES), href: ROUTES.INVOICES, icon: resolveIcon(ROUTES.INVOICES), permission: resolvePerm(ROUTES.INVOICES) },
          { name: 'VAT Records', href: ROUTES.VAT_RECORD, icon: resolveIcon(ROUTES.VAT_RECORD), permission: resolvePerm(ROUTES.VAT_RECORD) ?? { module: 'vatRecord', action: 'view' } },
          { name: resolveLabel(ROUTES.INCOME_EXPENSE), href: ROUTES.INCOME_EXPENSE, icon: resolveIcon(ROUTES.INCOME_EXPENSE), permission: resolvePerm(ROUTES.INCOME_EXPENSE) },
        ],
      },

      {
        name: 'Company',
        href: ROUTES.USERS,
        icon: resolveIcon(ROUTES.USERS),
        permission: resolvePerm(ROUTES.USERS),
        submenu: [
          { name: 'Users', href: ROUTES.USERS, icon: resolveIcon(ROUTES.USERS), permission: resolvePerm(ROUTES.USERS) },
          { name: 'Company Managers', href: ROUTES.COMPANY_MANAGERS, icon: resolveIcon(ROUTES.COMPANY_MANAGERS), permission: resolvePerm(ROUTES.USERS) },
        ],
      },

      {
  name: 'More',
  href: '#',
  icon: MoreHorizontal,
  submenu: [
    // existing items...
    { name: resolveLabel(ROUTES.PRODUCTS), href: ROUTES.PRODUCTS, icon: resolveIcon(ROUTES.PRODUCTS), permission: resolvePerm(ROUTES.PRODUCTS) },
    { name: resolveLabel(ROUTES.WHATSAPP), href: ROUTES.WHATSAPP, icon: resolveIcon(ROUTES.WHATSAPP), permission: resolvePerm(ROUTES.WHATSAPP) ?? { module: 'whatsapp', action: 'view' } },
    { name: 'Bulk Email', href: ROUTES.BULK_EMAIL, icon: resolveIcon(ROUTES.BULK_EMAIL), permission: resolvePerm(ROUTES.BULK_EMAIL) },

    { name: resolveLabel(ROUTES.WAITING), href: ROUTES.WAITING, icon: resolveIcon(ROUTES.WAITING), permission: resolvePerm(ROUTES.WAITING) ?? { module: 'waiting', action: 'view' } },

    { name: resolveLabel(ROUTES.TODO), href: ROUTES.TODO, icon: resolveIcon(ROUTES.TODO), permission: resolvePerm(ROUTES.TODO) ?? { module: 'todo', action: 'view' } }, // ← add this
  ],
},


      { name: resolveLabel(ROUTES.CUSTOMERS), href: ROUTES.CUSTOMERS, icon: resolveIcon(ROUTES.CUSTOMERS), permission: resolvePerm(ROUTES.CUSTOMERS) },
    ];
  }, [isMemberArea]);

  const navigation = useMemo(() => {
    const filtered = rawNavigation.map(item => {
      const ok = !item.permission || can(item.permission.module, item.permission.action);
      const clone: NavItem = { ...item, submenu: item.submenu ? [...item.submenu] : undefined };
      if (clone.submenu) {
        clone.submenu = clone.submenu.filter(sub => !sub.permission || can(sub.permission.module, sub.permission.action));
        if (!ok && (clone.submenu?.length ?? 0) === 0) return null as unknown as NavItem;
      } else if (!ok) {
        return null as unknown as NavItem;
      }
      return clone;
    }).filter(Boolean) as NavItem[];
    return filtered;
  }, [rawNavigation, can]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate(isMemberArea ? '/members/login' : ROUTES.LOGIN);
  };

  const bottomNavItems = useMemo(() => {
    if (isMemberArea) {
      return [
        { name: resolveLabel('/members/transactions'), href: '/members/transactions', icon: resolveIcon('/members/transactions') },
        { name: resolveLabel('/members/invoices'), href: '/members/invoices', icon: resolveIcon('/members/invoices') },
        { name: resolveLabel('/members/rentals'), href: '/members/rentals', icon: resolveIcon('/members/rentals') },
        { name: resolveLabel('/members/profile'), href: '/members/profile', icon: resolveIcon('/members/profile') },
      ] as NavItem[];
    }

    const order = [ROUTES.DASHBOARD, ROUTES.RENTALS, ROUTES.MAINTENANCE, ROUTES.FINANCE, ROUTES.PROFILE];
    const byHref = new Map(navigation.map(n => [n.href, n]));
    const items: NavItem[] = [];

    for (const href of order) {
      const found = byHref.get(href);
      if (found) items.push(found);
      else if (href === ROUTES.PROFILE) {
        items.push({ name: resolveLabel(ROUTES.PROFILE), href: ROUTES.PROFILE, icon: resolveIcon(ROUTES.PROFILE) });
      }
    }
    return items.slice(0, 5);
  }, [navigation, isMemberArea]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="bg-white shadow-md sticky top-0 z-30">
       
<div className="px-1 sm:px-2 lg:px-3 2xl:px-4">

          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={isMemberArea ? '/members/dashboard' : ROUTES.DASHBOARD} className="flex-shrink-0">
              <img src={logoUrl} alt="AIE Skyline" className="h-10 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map(item => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href) || !!item.submenu?.some(sub => isActiveRoute(sub.href));

                if (item.submenu) {
                  return (
                    <div
                      key={item.name}
                      className="relative"
                      onMouseEnter={() => { cancelClose(); setOpenSubmenu(item.name); }}
                      onMouseLeave={scheduleClose}
                    >
                      <button
                        onClick={() => setOpenSubmenu(prev => (prev === item.name ? null : item.name))}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-1.5 transition-transform group-hover:scale-110" />
                        <span>{item.name}</span>
                        <ChevronDown
                          className={`w-4 h-4 ml-1 transition-transform duration-200 ${openSubmenu === item.name ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {/* Submenu Panel */}
                      <div
                        className={`absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50
                                   origin-top transform transition duration-150 ease-out
                                   ${openSubmenu === item.name ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        {item.submenu!.map(sub => {
                          const SubIcon = sub.icon;
                          const subActive = isActiveRoute(sub.href);
                          const showBadge = sub.showBadge && unreadChatCount > 0;

                          return (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              className={`group/item relative mx-1 rounded-md px-3 py-2 text-sm flex items-center
                                          transition-colors ${
                                            subActive ? 'text-primary bg-primary/5' : 'text-gray-700 hover:bg-gray-50'
                                          }`}
                              onClick={() => setOpenSubmenu(null)}
                            >
                              {SubIcon && <SubIcon className="w-4 h-4 mr-2 transition-transform group-hover/item:translate-x-0.5" />}
                              <span>{sub.name}</span>
                              {showBadge && (
                                <span className="ml-auto inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full">
                                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-1.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center">
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md transition-colors"
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user?.name || 'User'} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                    <Link
                      to={isMemberArea ? '/members/profile' : ROUTES.PROFILE}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await auth.signOut();
                        navigate(isMemberArea ? '/members/login' : ROUTES.LOGIN);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {!isMemberArea && (
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {!isMemberArea && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          navigation={navigation}
          currentPath={location.pathname}
          unreadChatCount={unreadChatCount}
        />
      )}

      
<main className="pt-2 md:pt-3 pb-20">
  <div className="w-full mx-auto px-1 sm:px-2 lg:px-3 2xl:px-4">
    {children}
  </div>
</main>



      {bottomNavItems.length > 0 && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t lg:hidden">
          <div className={`grid ${bottomNavItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {bottomNavItems.map(item => {
              const Icon = item.icon;
              const active = isActiveRoute(item.href) || !!item.submenu?.some(sub => isActiveRoute(sub.href));
              return (
                <Link key={item.href} to={item.href} className="flex flex-col items-center justify-center py-2 text-xs">
                  <div className="relative">
                    <Icon className={`h-5 w-5 ${active ? 'text-primary' : 'text-gray-500'}`} />
                  </div>
                  <span className={`${active ? 'text-primary' : 'text-gray-600'}`}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
