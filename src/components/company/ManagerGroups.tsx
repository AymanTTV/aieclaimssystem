// src/components/company/ManagerGroups.tsx
import React from 'react';
import Badge from '../ui/Badge';
import { DEFAULT_PERMISSIONS, RolePermissions, Role } from '../../types/roles';
import { ShieldAlert } from 'lucide-react';

// Map the raw module keys to friendly display names
const SECTION_TITLE_MAP: Partial<Record<keyof RolePermissions, string>> = {
  dashboard: 'Dashboard',
  vehicles: 'Vehicles',
  maintenance: 'Maintenance',
  rentals: 'Rentals',
  accidents: 'Accidents',
  claims: 'Claims',
  finance: 'Finance',
  invoices: 'Invoices',
  pettyCash: 'AiePettyCash',
  aiePettyCash: 'SkylinePettyCash',
  share: 'Share',
  driverPay: 'Driver Pay',
  vdFinance: 'VD Finance',
  vdInvoice: 'VD Invoice',
  users: 'Users',
  vatRecord: 'VAT Record',
  customers: 'Customers',
  company: 'Company',
  products: 'Products',
  incomeExpense: 'Income & Expense',
  skylineIncomeExpense: 'Skyline Income & Expense',
  members: 'Members',
  waiting: 'Waiting List',
  whatsapp: 'WhatsApp',
  bulkEmail: 'Bulk Email',
  todo: 'Todo List',
  settings: 'Settings',
  trash: 'Trash'
};

const getActiveModules = (perms: RolePermissions) => {
  const active: string[] = [];
  
  Object.entries(perms).forEach(([key, actions]) => {
    // We filter out the member-portal specific keys just to keep the admin summary clean
    if (!key.startsWith('member') && (actions as any).view) {
      active.push(SECTION_TITLE_MAP[key as keyof RolePermissions] || key);
    }
  });

  return active;
};

const ManagerGroups = () => {
  // We extract the actual roles defined in the system
  const systemRoles = Object.keys(DEFAULT_PERMISSIONS) as Role[];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">System Role Groups</h2>
          <p className="text-sm text-gray-500 mt-1">
            These are the default base templates applied to users based on their assigned role. 
            Individual user permissions can be further customized in the Users page.
          </p>
        </div>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                Role Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Module Access
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {systemRoles.map((role) => {
              // The "member" role is heavily restricted to the customer portal side
              // For the admin dashboard view, we can highlight that they don't have standard admin modules
              const permissions = DEFAULT_PERMISSIONS[role];
              const activeModules = getActiveModules(permissions);

              return (
                <tr key={role} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-gray-900 capitalize flex items-center gap-2">
                      {role === 'admin' && <ShieldAlert className="w-4 h-4 text-red-500" />}
                      {role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {activeModules.length > 0 ? (
                        activeModules.map((mod, index) => (
                          <Badge key={index} variant="primary">
                            {mod}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm italic text-gray-400">
                          Portal User Only / No Admin Modules
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerGroups;