// src/pages/Users.tsx
import React, { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Eye, Shield, Trash2 } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import UserRoleModal from '../components/users/UserRoleModal';
import UserDeleteModal from '../components/users/UserDeleteModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel } from '../utils/excel';
import { User } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { users, loading } = useUsers();
  const { can } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { user } = useAuth();


  // NEW: “Show members” filter (off by default)
  const [showMembers, setShowMembers] = useState(false);

  // Apply filter: hide role === 'member' unless showMembers is true
  
const filteredUsers = useMemo(() => {
  if (showMembers) {
    // only members
    return users.filter(u => u.role === 'member');
  } else {
    // everyone except members
    return users.filter(u => u.role !== 'member');
  }
}, [users, showMembers]);

  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    {
      header: 'Role',
      cell: ({ row }: any) => <StatusBadge status={row.original.role} />,
    },
    {
      header: 'Created',
      cell: ({ row }: any) => format(row.original.createdAt, 'MMM dd, yyyy'),
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          {can('users', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('users', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingUser(row.original);
              }}
              className="text-purple-600 hover:text-purple-800"
              title="Manage Permissions"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}
          {can('users', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingUserId(row.original.id);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleExport = () => {
    // Export what’s visible in the table (respects the members filter)
    const exportData = filteredUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      'Created At': format(u.createdAt, 'MMM dd, yyyy'),
    }));
    exportToExcel(exportData, 'users');
    toast.success('Users exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

        <div className="flex items-center gap-3">
          {/* NEW: Show members toggle */}
         <label className="inline-flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
    checked={showMembers}
    onChange={(e) => setShowMembers(e.target.checked)}
  />
  <span className="text-gray-700">Show members only</span>
</label>


          {user?.role === 'manager' && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
          )}

          {can('users', 'create') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        onRowClick={(u) => setSelectedUser(u)}
        module="users"
      />

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add New User">
        <UserForm onClose={() => setShowForm(false)} />
      </Modal>

      {/* View modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1">{selectedUser.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1">{selectedUser.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Role</h3>
                <div className="mt-1">
                  <StatusBadge status={selectedUser.role} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1">
                  {format(selectedUser.createdAt, 'MMM dd, yyyy')}
                </p>
              </div>
              {selectedUser.phoneNumber && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1">{selectedUser.phoneNumber}</p>
                </div>
              )}
              {selectedUser.address && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Address</h3>
                  <p className="mt-1">{selectedUser.address}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Permissions modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Manage User Permissions"
        size="lg"
      >
        {editingUser && (
          <UserRoleModal user={editingUser} onClose={() => setEditingUser(null)} />
        )}
      </Modal>

      {/* Delete modal */}
      <Modal
        isOpen={!!deletingUserId}
        onClose={() => setDeletingUserId(null)}
        title="Delete User"
      >
        {deletingUserId && (
          <UserDeleteModal
            userId={deletingUserId}
            onClose={() => setDeletingUserId(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Users;
