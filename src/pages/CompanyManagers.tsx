import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import CompanyDetails from '../components/company/CompanyDetails';
import ManagerGroups from '../components/company/ManagerGroups';
import ManagersList from '../components/company/ManagersList';
import ManagerForm from '../components/company/ManagerForm';
import Modal from '../components/ui/Modal';
import { User } from '../types';

export const CompanyManagers = () => {
  const { can } = usePermissions();
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [showAddManager, setShowAddManager] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

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
        <h1 className="text-2xl font-bold text-gray-900">Company & Managers</h1>
      </div>
      
      {/* Company Details Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <CompanyDetails />
        </div>
      </div>

      {/* Manager Groups Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <ManagerGroups 
            onAddGroup={() => setShowAddGroup(true)} 
          />
        </div>
      </div>

      {/* Managers List Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <ManagersList 
            onAddManager={() => setShowAddManager(true)}
            onSelectManager={setSelectedManager}
          />
        </div>
      </div>

      {/* Add Manager Modal */}
      <Modal
        isOpen={showAddManager}
        onClose={() => setShowAddManager(false)}
        title="Add New Manager"
      >
        <ManagerForm onClose={() => setShowAddManager(false)} />
      </Modal>

      {/* Add Group Modal */}
      <Modal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        title="Add New Manager Group"
      >
        {/* Add group form component here */}
      </Modal>

      {/* Manager Details Modal */}
      <Modal
        isOpen={!!selectedManager}
        onClose={() => setSelectedManager(null)}
        title="Manager Details"
      >
        {/* Manager details component here */}
      </Modal>
    </div>
  );
};

export default CompanyManagers;