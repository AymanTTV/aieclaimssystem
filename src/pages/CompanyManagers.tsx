import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import CompanyDetails from '../components/company/CompanyDetails';
import ManagerGroups from '../components/company/ManagerGroups';

export const CompanyManagers = () => {
  const { can } = usePermissions();

  if (!can('users', 'view')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Company & Roles</h1>
      </div>
      
      {/* Company Details Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <CompanyDetails />
        </div>
      </div>

      {/* Role Groups Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <ManagerGroups />
        </div>
      </div>
    </div>
  );
};

export default CompanyManagers;