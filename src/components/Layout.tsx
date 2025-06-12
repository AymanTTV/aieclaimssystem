import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext path
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
  FileText,
  Calculator,
  Mail,
  Share2,
  MessageSquare,
  Box,
  Home, // Import Home icon
  Car, // Import Car icon
  // Import ALL other icons used in ROUTE_METADATA here
  // Example:
  // Activity, // If used for Personal Injury
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
  Timestamp // Import Timestamp
} from 'firebase/firestore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType; // This will now hold the actual component
  permission?: { module: string; action: string };
  submenu?: { name: string; href: string; permission?: { module: string; action: string } }[];
}

// Mapping of icon names (strings from ROUTE_METADATA) to imported components
const IconMap: { [key: string]: React.ElementType } = {
    Home: Home,
    Car: Car,
    Box: Box,
    Wrench: Wrench,
    Calendar: Calendar,
    AlertTriangle: AlertTriangle,
    FileText: FileText,
    DollarSign: DollarSign,
    Users: Users,
    UserPlus: UserPlus,
    MessageSquare: MessageSquare,
    Building: Building, // Added Building for Skyline Cabs if needed via getNavItem
    Calculator: Calculator, // Added Calculator for VAT Records
    Mail: Mail, // Added Mail for Bulk Email
    Share2: Share2, // Added Share2 for Share
    // Add ALL other icons used in ROUTE_METADATA here
    // Example:
    // Activity: Activity,
};


const getNavItem = (route: string, customName?: string, customIcon?: React.ElementType, customPermission?: { module: string; action: string }): NavItem | null => {
    const metadata = ROUTE_METADATA[route as keyof typeof ROUTE_METADATA];
    const permission = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];

    // Ensure metadata exists before trying to access its properties
    if (!metadata && !customName && !customIcon) {
        console.warn(`Missing ROUTE_METADATA for route: ${route}. This item will not be added to navigation.`);
        return null;
    }

    // Get the icon component: prefer customIcon, then map from metadata string, fallback to MessageSquare
    const iconNameFromMetadata = metadata?.icon as string | undefined;
    const mappedIconComponent = iconNameFromMetadata ? IconMap[iconNameFromMetadata] : undefined;

    const iconComponent = customIcon || mappedIconComponent || MessageSquare;


    return {
        name: customName || metadata?.title || 'Unknown',
        href: route,
        icon: iconComponent, // Assign the correct icon component
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
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Timestamp | null>(null); // State for last read timestamp

  // Effect 1: Listen for user document changes to get lastReadTimestamp
  useEffect(() => {
    if (!user?.id) {
      setLastReadTimestamp(null); // Reset if user logs out
      return;
    }

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Store the Firestore Timestamp directly
        setLastReadTimestamp(userData?.lastReadTimestamp || null);
      } else {
        setLastReadTimestamp(null); // User document doesn't exist
      }
    }, (error) => {
        console.error("Error fetching user document for lastReadTimestamp:", error);
        setLastReadTimestamp(null); // Handle error case
    });

    return () => unsubscribeUser(); // Unsubscribe when component unmounts or user changes
  }, [user?.id]); // Re-run this effect only when user ID changes

  // Effect 2: Listen for new messages based on lastReadTimestamp
  useEffect(() => {
    // Only set up message listener if user is logged in and lastReadTimestamp is available (or null if no messages read yet)
    if (!user?.id) {
        setUnreadChatCount(0); // Reset count if user logs out
        return;
    }

    const messagesCollectionRef = collection(db, 'messages');
    let messagesQuery = query(messagesCollectionRef, orderBy('timestamp', 'desc'));

    if (lastReadTimestamp) {
        // Query for messages where timestamp is strictly greater than the last read timestamp
        // Firestore requires ordering by the field in the range filter
        messagesQuery = query(messagesCollectionRef,
                              where('timestamp', '>', lastReadTimestamp),
                              orderBy('timestamp', 'desc'));
    } else {
        // If no lastReadTimestamp, query for all messages (or a recent limit if performance is an issue)
        // For simplicity, we'll query all and filter client-side if lastReadTimestamp is null.
        // A better approach for performance might be to query the last N messages here.
         messagesQuery = query(messagesCollectionRef, orderBy('timestamp', 'desc')); // Still order by timestamp
    }


    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
       // Filter out messages sent by the current user, as they are considered read
       // Also filter out messages older than lastReadTimestamp if lastReadTimestamp was null initially
       const unreadMessages = snapshot.docs.filter(doc => {
           const messageData = doc.data();
           const messageTimestamp = messageData.timestamp?.toDate() || new Date();
           const isSentByCurrentUser = messageData.sender.id === user.id;
           const isOlderThanLastRead = lastReadTimestamp ? messageTimestamp <= lastReadTimestamp.toDate() : false; // Check against lastReadTimestamp if it exists

           return !isSentByCurrentUser && !isOlderThanLastRead;
       });

       setUnreadChatCount(unreadMessages.length);
    }, (error) => {
        console.error("Error fetching unread messages:", error);
        setUnreadChatCount(0); // Handle error case
    });

    return () => unsubscribeMessages(); // Unsubscribe when component unmounts or user/lastReadTimestamp changes

  }, [user?.id, lastReadTimestamp]); // Re-run this effect when user ID or lastReadTimestamp changes


  // Reset unread count when navigating to the chat page
  useEffect(() => {
    if (location.pathname === ROUTES.CHAT) {
      setUnreadChatCount(0);
      // The actual marking of messages as read (updating lastReadTimestamp)
      // will be handled in the ChatWindow component when it mounts.
    }
  }, [location.pathname]);


  const rawNavigation: (NavItem | null)[] = [
    getNavItem(ROUTES.VEHICLES),
    getNavItem(ROUTES.MAINTENANCE),
    getNavItem(ROUTES.PRODUCTS),
    getNavItem(ROUTES.RENTALS),
    getNavItem(ROUTES.ACCIDENTS),
    {
      name: ROUTE_METADATA[ROUTES.CLAIMS as keyof typeof ROUTE_METADATA]?.title || 'Claims',
      icon: IconMap[ROUTE_METADATA[ROUTES.CLAIMS as keyof typeof ROUTE_METADATA]?.icon as string] || FileText, // Use IconMap here
      permission: ROUTE_PERMISSIONS[ROUTES.CLAIMS as keyof typeof ROUTE_PERMISSIONS],
      submenu: [
        getNavItem(ROUTES.CLAIMS) as { name: string; href: string; permission?: { module: string; action: string } },
        getNavItem(ROUTES.VD_FINANCE) as { name: string; href: string; permission?: { module: string; action: string } },
        { name: 'VD Invoice', href: '/claims/vd-invoice', permission: ROUTE_PERMISSIONS[ROUTES.CLAIMS as keyof typeof ROUTE_PERMISSIONS] },
        { name: 'Share', href: '/share', permission: { module: 'share', action: 'view' } }
      ].filter(item => item !== null) as { name: string; href: string; permission?: { module: string; action: string } }[],
    },
    { // Skyline Cabs with submenu (custom)
      name: 'Skyline Cabs',
      icon: Building, // Keep this as the direct component if you prefer
      permission: { module: 'driverPay', action: 'view' },
      submenu: [
        { name: 'Driver Pay', href: '/skyline-caps/driver-pay', permission: { module: 'driverPay', action: 'view' } },
        { name: 'Petty Cash', href: '/skyline-caps/aie-petty-cash', permission: { module: 'driverPay', action: 'view' } },
        { name: 'Income & Expense', href: '/skyline-caps/income-expense', permission: { module: 'driverPay', action: 'view' } }, // This is the Skyline Income & Expense
      ],
    },
    { // Finance with submenu
        name: ROUTE_METADATA[ROUTES.FINANCE as keyof typeof ROUTE_METADATA]?.title || 'Finance',
        href: ROUTES.FINANCE,
        icon: IconMap[ROUTE_METADATA[ROUTES.FINANCE as keyof typeof ROUTE_METADATA]?.icon as string] || DollarSign, // Use IconMap here
        permission: ROUTE_PERMISSIONS[ROUTES.FINANCE as keyof typeof ROUTE_PERMISSIONS],
         submenu: [
            getNavItem(ROUTES.FINANCE) as { name: string; href: string; permission?: { module: string; action: string } },
            getNavItem(ROUTES.PETTY_CASH) as { name: string; href: string; permission?: { module: string; action: string } },
            getNavItem(ROUTES.INVOICES) as { name: string; href: string; permission?: { module: string; action: string } },
            { name: 'VAT Records', href: '/finance/vat-records', icon: IconMap['Calculator'] || Calculator, permission: { module: 'vatRecord', action: 'view' } }, // Use IconMap for hardcoded icon
            getNavItem(ROUTES.INCOME_EXPENSE) as { name: string; href: string; permission?: { module: string; action: string } }, // This is the Finance Income & Expense
         ].filter(item => item !== null) as { name: string; href: string; permission?: { module: string; action: string } }[],
    },
    getNavItem(ROUTES.CUSTOMERS),
    { // Company with submenu (custom)
      name: 'Company',
      href: ROUTES.USERS, // Main link href
      icon: IconMap[ROUTE_METADATA[ROUTES.USERS as keyof typeof ROUTE_METADATA]?.icon as string] || Users, // Use IconMap here
      permission: ROUTE_PERMISSIONS[ROUTES.USERS as keyof typeof ROUTE_PERMISSIONS],
      submenu: [
        { name: 'Bulk Email', href: '/bulk-email', icon: IconMap['Mail'] || Mail, permission: ROUTE_PERMISSIONS[ROUTES.USERS as keyof typeof ROUTE_PERMISSIONS] }, // Use IconMap for hardcoded icon
        getNavItem(ROUTES.USERS) as { name: string; href: string; permission?: { module: string; action: string } },
        { name: 'Company Managers', href: '/company-managers', permission: ROUTE_PERMISSIONS[ROUTES.USERS as keyof typeof ROUTE_PERMISSIONS] }
      ].filter(item => item !== null) as { name: string; href: string; permission?: { module: string; action: string } }[],
    },
    getNavItem(ROUTES.CHAT),
  ].filter(item => item !== null) as NavItem[];

  const navigation = rawNavigation.filter(item => {
      const mainPermissionCheck = !item.permission || can(item.permission.module, item.permission.action);

      if (item.submenu) {
          item.submenu = item.submenu.filter(subitem => !subitem.permission || can(subitem.permission.module, subitem.permission.action));
          return mainPermissionCheck || item.submenu.length > 0;
      }

      return mainPermissionCheck;
  });


  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActiveRoute = (href: string, pathname: string) => {
    if (href === pathname) {
      return true;
    }
    if (href !== '/' && pathname.startsWith(href) && (pathname.length === href.length || pathname[href.length] === '/')) {
        return true;
    }
    if (href === '/' && pathname === '/') {
        return true;
    }
    return false;
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={ROUTES.DASHBOARD} className="flex-shrink-0 flex items-center">
              <img src={logo} alt="AIE Skyline" className="h-10 w-auto" />
            </Link>

            {/* Main Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon; // Icon is now the actual React component
                const isActive = isActiveRoute(item.href, location.pathname) ||
                                 (item.submenu && item.submenu.some(subitem => isActiveRoute(subitem.href, location.pathname)));


                if (item.submenu) {
                  return (
                    <div key={item.name} className="relative">
                      <button
                        onClick={() => setOpenSubmenu(openSubmenu === item.name ? null : item.name)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'text-primary bg-primary/5'
                            : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                        }`}
                      >
                        {/* Render the Icon component */}
                        {Icon && <Icon className="w-5 h-5 mr-1.5" />} {/* Added check if Icon exists */}
                        <span>{item.name}</span>
                        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${openSubmenu === item.name ? 'rotate-180' : ''}`} />
                      </button>

                      {openSubmenu === item.name && (
                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                          {item.submenu.map((subitem) => {
                             // For submenu items, the icon is available on subitem.icon if set by getNavItem or hardcoded
                             const SubitemIcon = subitem.icon; // SubitemIcon is now the actual component if available

                              return (
                                  <Link
                                    key={subitem.href}
                                    to={subitem.href}
                                    className={`block px-4 py-2 text-sm ${
                                      isActiveRoute(subitem.href, location.pathname)
                                        ? 'text-primary bg-primary/5'
                                        : 'text-gray-700 hover:bg-gray-50'
                                    } flex items-center`} // Added flex and items-center for icon alignment
                                    onClick={() => setOpenSubmenu(null)}
                                  >
                                    {SubitemIcon && <SubitemIcon className="w-4 h-4 mr-2" />} {/* Render subitem icon if it exists */}
                                    {subitem.name}
                                  </Link>
                              );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const metadata = ROUTE_METADATA[item.href as keyof typeof ROUTE_METADATA];

                return (
                  metadata && (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'text-primary bg-primary/5'
                          : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                      }`}
                    >
                      {/* Render the Icon component */}
                      {Icon && <Icon className="w-5 h-5 mr-1.5" />} {/* Added check if Icon exists */}
                      <span>{item.name}</span>
                      {item.href === ROUTES.CHAT && unreadChatCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                          {unreadChatCount}
                        </span>
                      )}
                    </Link>
                  )
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
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to={ROUTES.PROFILE}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center" // Added flex and items-center
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                       {/* Assuming Profile might have an icon in ROUTE_METADATA */}
                       {/* Use IconMap for the profile icon */}
                       {ROUTE_METADATA[ROUTES.PROFILE as keyof typeof ROUTE_METADATA]?.icon && (
                           React.createElement(IconMap[ROUTE_METADATA[ROUTES.PROFILE as keyof typeof ROUTE_METADATA]?.icon as string] || MessageSquare, { className: "w-4 h-4 mr-2" })
                       )}
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center" // Added flex and items-center
                    >
                       <LogOut className="w-4 h-4 mr-2" /> {/* LogOut icon is imported directly */}
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
        navigation={navigation}
        currentPath={location.pathname}
        unreadChatCount={unreadChatCount}
        // You might need to pass the icon components to MobileMenu if it renders them
      />

      {/* Main Content */}
      <main className="py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
