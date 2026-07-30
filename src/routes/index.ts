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
  TRASH: '/trash',
  PRODUCTS: '/products',
  TODO: '/todo',
  AUTOMATION: '/automation',
  // Protected routes
  DASHBOARD: '/',
  PROFILE: '/profile',
  VEHICLES: '/vehicles',
  UTILISATION: '/utilisation',
  MAINTENANCE: '/maintenance',
  INCOME_EXPENSE: '/income-expense',
  RENTALS: '/rentals',
  ACCIDENTS: '/accidents',
  CLAIMS: '/claims',
  PERSONAL_INJURY: '/claims/personal-injury',
  VD_FINANCE: '/claims/vd-finance',
  PETTY_CASH: '/finance/petty-cash',
  FINANCE: '/finance',
  INVOICES: '/finance/invoices',
  USERS: '/users',
  CUSTOMERS: '/customers',
  CHAT: '/chat',
  WHATSAPP: '/whatsapp-communication',

  SKYLINE_INCOME_EXPENSE: '/skyline-caps/income-expense',
  SKYLINE_PETTY_CASH: '/skyline-caps/aie-petty-cash',
  DRIVER_PAY: '/skyline-caps/driver-pay',

  VAT_RECORD: '/finance/vat-records',
  BULK_EMAIL: '/bulk-email',
  COMPANY_MANAGERS: '/company-managers',
  SHARE: '/share',
  VD_INVOICE: '/claims/vd-invoice',
  WAITING: '/waiting',
} as const;

// Export route permissions mapping
export const ROUTE_PERMISSIONS = {
  [ROUTES.VEHICLES]: { module: 'vehicles', action: 'view' },
  [ROUTES.UTILISATION]: { module: 'utilisation', action: 'view' },
  [ROUTES.MAINTENANCE]: { module: 'maintenance', action: 'view' },
  [ROUTES.RENTALS]: { module: 'rentals', action: 'view' },
  [ROUTES.ACCIDENTS]: { module: 'accidents', action: 'view' },
  [ROUTES.CLAIMS]: { module: 'claims', action: 'view' },
  [ROUTES.PERSONAL_INJURY]: { module: 'claims', action: 'view' },
  [ROUTES.PRODUCTS]: { module: 'products', action: 'view' },
  [ROUTES.WHATSAPP]: { module: 'whatsapp', action: 'view' },
  
  // ✅ Fixed: use dedicated modules, not umbrella ones
  [ROUTES.VD_FINANCE]: { module: 'vdFinance', action: 'view' },
  [ROUTES.VD_INVOICE]: { module: 'vdInvoice', action: 'view' },

  [ROUTES.FINANCE]:  { module: 'finance', action: 'view' },
  [ROUTES.INVOICES]: { module: 'invoices', action: 'view' },     // was finance
  [ROUTES.PETTY_CASH]: { module: 'pettyCash', action: 'view' },  // was finance

  [ROUTES.USERS]: { module: 'users', action: 'view' },
  [ROUTES.CUSTOMERS]: { module: 'customers', action: 'view' },

  [ROUTES.INCOME_EXPENSE]: { module: 'incomeExpense', action: 'view' },
  [ROUTES.SKYLINE_INCOME_EXPENSE]: { module: 'skylineIncomeExpense', action: 'view' },

  [ROUTES.SKYLINE_PETTY_CASH]: { module: 'aiePettyCash', action: 'view' }, // was driverPay
  [ROUTES.DRIVER_PAY]: { module: 'driverPay', action: 'view' },
  [ROUTES.WAITING]: { module: 'waiting', action: 'view' },
  [ROUTES.TODO]: { module: 'todo', action: 'view' },
  [ROUTES.VAT_RECORD]: { module: 'vatRecord', action: 'view' },
  [ROUTES.BULK_EMAIL]: { module: 'bulkEmail', action: 'view' },
  [ROUTES.COMPANY_MANAGERS]: { module: 'users', action: 'view' },
  [ROUTES.SHARE]: { module: 'share', action: 'view' },
} as const;

// Export route metadata
export const ROUTE_METADATA = {
  [ROUTES.DASHBOARD]: { title: 'Dashboard', icon: 'Home' },
  [ROUTES.PROFILE]: { title: 'Profile', icon: 'User' },
  [ROUTES.TRASH]: { title: 'Recycle Bin', icon: 'Trash2' },


  [ROUTES.VEHICLES]: { title: 'AIE Vehicles', icon: 'Car' },
  [ROUTES.UTILISATION]: { title: 'Fleet Utilisation', icon: 'Activity' },
  [ROUTES.MAINTENANCE]: { title: 'Maintenance', icon: 'Wrench' },
  [ROUTES.RENTALS]: { title: 'Rentals', icon: 'Calendar' },
  [ROUTES.ACCIDENTS]: { title: 'Accidents', icon: 'AlertTriangle' },
  [ROUTES.CLAIMS]: { title: 'Claims', icon: 'FileText' },
  // [ROUTES.PERSONAL_INJURY]: { title: 'Personal Injury', icon: 'Activity' },
  [ROUTES.WHATSAPP]: { title: 'Whatsapp Communication' },
  [ROUTES.VD_FINANCE]: { title: 'VD Finance', icon: 'DollarSign' },
  [ROUTES.VD_INVOICE]: { title: 'VD Invoice', icon: 'FileText' },

  [ROUTES.PRODUCTS]: { title: 'Products', icon: 'Box' },
  [ROUTES.WAITING]: { title: 'Waiting List', icon: 'Clock' },
  [ROUTES.FINANCE]:  { title: 'Finance', icon: 'DollarSign' },
  [ROUTES.INVOICES]: { title: 'Invoices', icon: 'FileText' },
  [ROUTES.PETTY_CASH]: { title: 'AIE Petty Cash', icon: 'DollarSign' },
  [ROUTES.VAT_RECORD]: { title: 'VAT Records', icon: 'Calculator' },
  

  [ROUTES.USERS]: { title: 'Users', icon: 'Users' },
  [ROUTES.CUSTOMERS]: { title: 'Customers', icon: 'UserPlus' },

  [ROUTES.CHAT]: { title: 'Chat', icon: 'MessageSquare' },

  [ROUTES.INCOME_EXPENSE]: { title: 'AIE Income & Expense', icon: 'DollarSign' },
  [ROUTES.SKYLINE_INCOME_EXPENSE]: { title: 'Income & Expense', icon: 'Building' },

  [ROUTES.SKYLINE_PETTY_CASH]: { title: 'Skyline Petty Cash', icon: 'Building' },
  [ROUTES.DRIVER_PAY]: { title: 'Driver Pay', icon: 'Truck' },
  [ROUTES.TODO]: { title: 'To-Do' },
  [ROUTES.BULK_EMAIL]: { title: 'Bulk Email', icon: 'Mail' },
  [ROUTES.COMPANY_MANAGERS]: { title: 'Company Managers', icon: 'Users' },
  [ROUTES.SHARE]: { title: 'Share', icon: 'Share2' },
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
