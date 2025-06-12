// src/routes/index.ts

// Export the main AppRoutes component
export { default } from './AppRoutes';

// Export route configurations and utilities
export * from './lazyLoad';

// Export route constants
export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  ADMIN_SETUP: '/admin-setup',
  PRODUCTS: '/products',

  // Protected routes
  DASHBOARD: '/',
  PROFILE: '/profile',
  VEHICLES: '/vehicles',
  MAINTENANCE: '/maintenance',
  INCOME_EXPENSE: '/income-expense', // This route is defined
  RENTALS: '/rentals',
  ACCIDENTS: '/accidents',
  CLAIMS: '/claims',
  PERSONAL_INJURY: '/claims/personal-injury',
  VD_FINANCE: '/claims/vd-finance',
  PETTY_CASH: '/finance/petty-cash', // This is the Finance Petty Cash
  FINANCE: '/finance',
  INVOICES: '/finance/invoices',
  USERS: '/users',
  CUSTOMERS: '/customers',
  CHAT: '/chat',
  // Assuming Skyline Income & Expense also has a route constant if needed,
  SKYLINE_INCOME_EXPENSE: '/skyline-caps/income-expense',
  SKYLINE_PETTY_CASH: '/skyline-caps/aie-petty-cash', // Added Skyline Petty Cash route
  DRIVER_PAY: '/skyline-caps/driver-pay', // Added Driver Pay route
  VAT_RECORD: '/finance/vat-records', // Added VAT Record route
  BULK_EMAIL: '/bulk-email', // Added Bulk Email route
  COMPANY_MANAGERS: '/company-managers', // Added Company Managers route
  SHARE: '/share', // Added Share route
  VD_INVOICE: '/claims/vd-invoice', // Added VD Invoice route
} as const;

// Export route permissions mapping
export const ROUTE_PERMISSIONS = {
  [ROUTES.VEHICLES]: { module: 'vehicles', action: 'view' },
  [ROUTES.MAINTENANCE]: { module: 'maintenance', action: 'view' },
  [ROUTES.RENTALS]: { module: 'rentals', action: 'view' },
  [ROUTES.ACCIDENTS]: { module: 'accidents', action: 'view' },
  [ROUTES.CLAIMS]: { module: 'claims', action: 'view' },
  [ROUTES.PERSONAL_INJURY]: { module: 'claims', action: 'view' },
  [ROUTES.PRODUCTS]: { module: 'products', action: 'view' },
  

  [ROUTES.VD_FINANCE]: { module: 'claims', action: 'view' },
  [ROUTES.PETTY_CASH]: { module: 'finance', action: 'view' },
  [ROUTES.FINANCE]: { module: 'finance', action: 'view' },
  [ROUTES.INVOICES]: { module: 'finance', action: 'view' },
  [ROUTES.USERS]: { module: 'users', action: 'view' },
  [ROUTES.CUSTOMERS]: { module: 'customers', action: 'view' },
  [ROUTES.INCOME_EXPENSE]: { module: 'finance', action: 'view' },
  [ROUTES.SKYLINE_INCOME_EXPENSE]: { module: 'driverPay', action: 'view' },
  [ROUTES.SKYLINE_PETTY_CASH]: { module: 'driverPay', action: 'view' },
  [ROUTES.DRIVER_PAY]: { module: 'driverPay', action: 'view' },
  [ROUTES.VAT_RECORD]: { module: 'vatRecord', action: 'view' },
  [ROUTES.BULK_EMAIL]: { module: 'users', action: 'view' }, // Assuming bulk email permission is tied to users module
  [ROUTES.COMPANY_MANAGERS]: { module: 'users', action: 'view' }, // Assuming company managers permission is tied to users module
  [ROUTES.SHARE]: { module: 'share', action: 'view' },
  [ROUTES.VD_INVOICE]: { module: 'claims', action: 'view' },
} as const;

// Export route metadata
export const ROUTE_METADATA = {
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    icon: 'Home',
  },
  [ROUTES.PROFILE]: {
    title: 'Profile',
    icon: 'User', // Assuming you have a 'User' icon in your IconMap
  },
  [ROUTES.VEHICLES]: {
    title: 'Fleet Management',
    icon: 'Car',
  },
  [ROUTES.MAINTENANCE]: {
    title: 'Maintenance',
    icon: 'Wrench',
  },
  [ROUTES.RENTALS]: {
    title: 'Rentals',
    icon: 'Calendar',
  },
  [ROUTES.ACCIDENTS]: {
    title: 'Accidents',
    icon: 'AlertTriangle',
  },
  [ROUTES.CLAIMS]: {
    title: 'Claims',
    icon: 'FileText',
  },
  // [ROUTES.PERSONAL_INJURY]: {
  //   title: 'Personal Injury',
  //   icon: 'Activity',
  // },
  [ROUTES.VD_FINANCE]: {
    title: 'VD Finance',
    icon: 'DollarSign',
  },
  [ROUTES.PRODUCTS]: {
    title: 'Products',
    icon: 'Box',     // pick any Lucide icon name you like
  },
  [ROUTES.VD_INVOICE]: {
    title: 'VD Invoice',
    icon: 'FileText', // Or a different icon
  },
  [ROUTES.FINANCE]: {
    title: 'Finance',
    icon: 'DollarSign',
  },
  [ROUTES.INVOICES]: {
    title: 'Invoices',
    icon: 'FileText',
  },
  [ROUTES.PETTY_CASH]: { // <<< ADDED THIS METADATA
    title: 'Petty Cash',
    icon: 'DollarSign', // You can choose a different icon if preferred
  },
  [ROUTES.VAT_RECORD]: {
    title: 'VAT Records',
    icon: 'Calculator',
  },
  [ROUTES.USERS]: {
    title: 'Users',
    icon: 'Users',
  },
  [ROUTES.CUSTOMERS]: {
    title: 'Customers',
    icon: 'UserPlus',
  },
  [ROUTES.COMPANY_MANAGERS]: {
    title: 'Company Managers',
    icon: 'Users', // Or a different icon
  },
  [ROUTES.CHAT]: {
    title: 'Chat',
    icon: 'MessageSquare',
  },
  [ROUTES.INCOME_EXPENSE]: {
    title: 'Income & Expense',
    icon: 'DollarSign',
  },
  [ROUTES.SKYLINE_INCOME_EXPENSE]: {
    title: 'Income & Expense', // Display name for Skyline
    icon: 'Building', // Icon for Skyline Cabs related items
  },
  [ROUTES.SKYLINE_PETTY_CASH]: {
    title: 'Petty Cash', // Display name for Skyline
    icon: 'Building', // Icon for Skyline Cabs related items
  },
  [ROUTES.DRIVER_PAY]: {
    title: 'Driver Pay',
    icon: 'Truck', // Or a different icon
  },
  [ROUTES.BULK_EMAIL]: {
    title: 'Bulk Email',
    icon: 'Mail',
  },
  [ROUTES.SHARE]: {
    title: 'Share',
    icon: 'Share2',
  },
} as const;

// Export route utilities
export const isPublicRoute = (path: string): boolean => {
  return [ROUTES.LOGIN, ROUTES.ADMIN_SETUP].includes(path as any);
};

export const getRoutePermission = (path: string) => {
  return ROUTE_PERMISSIONS[path as keyof typeof ROUTE_PERMISSIONS];
};

export const getRouteMetadata = (path: string) => {
  return ROUTE_METADATA[path as keyof typeof ROUTE_METADATA];
};