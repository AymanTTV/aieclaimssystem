// src/pages/CompanyManagers.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import CompanyDetails from '../components/company/CompanyDetails';
import ManagerGroups from '../components/company/ManagerGroups';

export const CompanyManagers = () => {
  const { can } = usePermissions();

  // Changed to correctly check the 'company' view permission
  if (!can('company', 'view')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">Company & Roles</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Business entity details, system role assignments, and corporate permissions.</p>
        </div>
      </div>
      
      {/* Company Details Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
        <div className="p-6">
          <CompanyDetails />
        </div>
      </div>

      {/* Role Groups Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
        <div className="p-6">
          <ManagerGroups />
        </div>
      </div>
    </div>
  );
};

export default CompanyManagers;