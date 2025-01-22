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

  // Protected routes
  DASHBOARD: '/',
  PROFILE: '/profile',
  VEHICLES: '/vehicles',
  MAINTENANCE: '/maintenance',
  RENTALS: '/rentals',
  ACCIDENTS: '/accidents',
  CLAIMS: '/claims',
  FINANCE: '/finance',
  INVOICES: '/finance/invoices', // Add this line
  USERS: '/users',
  CUSTOMERS: '/customers',
} as const;

// Export route permissions mapping
export const ROUTE_PERMISSIONS = {
  [ROUTES.VEHICLES]: { module: 'vehicles', action: 'view' },
  [ROUTES.MAINTENANCE]: { module: 'maintenance', action: 'view' },
  [ROUTES.RENTALS]: { module: 'rentals', action: 'view' },
  [ROUTES.ACCIDENTS]: { module: 'accidents', action: 'view' },
  [ROUTES.CLAIMS]: { module: 'claims', action: 'view' },
  [ROUTES.FINANCE]: { module: 'finance', action: 'view' },
  [ROUTES.INVOICES]: { module: 'finance', action: 'view' }, // Add this line
  [ROUTES.USERS]: { module: 'users', action: 'view' },
  [ROUTES.CUSTOMERS]: { module: 'customers', action: 'view' },
} as const;

// Export route metadata
export const ROUTE_METADATA = {
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    icon: 'Home',
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
  [ROUTES.FINANCE]: {
    title: 'Finance',
    icon: 'DollarSign',
  },
  [ROUTES.INVOICES]: {
    title: 'Invoices',
    icon: 'FileText',
  },
  [ROUTES.USERS]: {
    title: 'Users',
    icon: 'Users',
  },
  [ROUTES.CUSTOMERS]: {
    title: 'Customers',
    icon: 'UserPlus',
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
