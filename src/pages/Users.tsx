import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Upload, Edit, Trash2, Eye, Shield } from 'lucide-react';
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
  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Role',
      cell: ({ row }) => (
        <StatusBadge status={row.original.role} />
      ),
    },
    {
      header: 'Created',
      cell: ({ row }) => format(row.original.createdAt, 'MMM dd, yyyy'),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
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
            <>
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
            </>
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
    const exportData = users.map(user => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      'Created At': format(user.createdAt, 'MMM dd, yyyy'),
    }));

    exportToExcel(exportData, 'users');
    toast.success('Users exported successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-2">
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
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add User
              </button>
            </>
          )}
        </div>
      </div>

      <DataTable
        data={users}
        columns={columns}
        onRowClick={(user) => setSelectedUser(user)}
        module="users"
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Add New User"
      >
        <UserForm onClose={() => setShowForm(false)} />
      </Modal>

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
                <p className="mt-1">{format(selectedUser.createdAt, 'MMM dd, yyyy')}</p>
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

      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Manage User Permissions"
        size="lg"
      >
        {editingUser && (
          <UserRoleModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
          />
        )}
      </Modal>

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