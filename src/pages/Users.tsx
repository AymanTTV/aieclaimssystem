// src/pages/Users.tsx
import React, { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Eye, Shield, Trash2, Users as UsersIcon, ShieldCheck, Building2, UserPlus, Mail, Phone, MapPin, Edit } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import UserRoleModal from '../components/users/UserRoleModal';
import UserDeleteModal from '../components/users/UserDeleteModal';
import UserEditModal from '../components/users/UserEditModal'; // Added import for the new Edit Modal
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { usePermissions } from '../hooks/usePermissions';
import { User } from '../types';

// Define the exact order we want roles to appear in the table
const ROLE_ORDER: Record<string, number> = {
  manager: 1,
  admin: 2,
  finance: 3,
  claims: 4,
  company: 5,
  member: 6,
};

const Users = () => {
  const { users, loading } = useUsers();
  const { can, isManager } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserInfo, setEditingUserInfo] = useState<User | null>(null); // State for editing profile info
  const [editingUser, setEditingUser] = useState<User | null>(null); // State for editing permissions
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin' || u.role === 'manager').length,
      companies: users.filter(u => u.role === 'company').length,
      members: users.filter(u => u.role === 'member').length,
    };
  }, [users]);

  // Apply filters & Sorting
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(searchStr) || 
        user.email.toLowerCase().includes(searchStr) ||
        (user.companyName || '').toLowerCase().includes(searchStr);
        
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    // Sort by Role Hierarchy, then alphabetically by name
    return filtered.sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] || 99;
      const orderB = ROLE_ORDER[b.role] || 99;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same role, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [users, searchQuery, roleFilter]);

  const columns = [
    {
      header: 'User Info',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold uppercase">
            {row.original.photoURL ? (
               <img src={row.original.photoURL} alt={row.original.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
               row.original.name.charAt(0)
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{row.original.name}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
            {row.original.role === 'company' && row.original.companyName && (
              <div className="text-xs font-semibold text-indigo-600 mt-0.5">🏢 {row.original.companyName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: ({ row }: any) => <StatusBadge status={row.original.role} />,
    },
    {
      header: 'Joined Date',
      accessorKey: 'createdAt',
      cell: ({ row }: any) => (
        <span className="text-sm text-gray-900">
          {format(row.original.createdAt, 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(row.original);
            }}
            className="text-gray-400 hover:text-blue-500"
            title="View User"
          >
            <Eye className="h-4 w-4" />
          </button>
          
          {/* New Edit Profile Button */}
          {isManager && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingUserInfo(row.original);
              }}
              className="text-gray-400 hover:text-green-500"
              title="Edit Profile"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}

          {isManager && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingUser(row.original);
              }}
              className="text-gray-400 hover:text-indigo-500"
              title="Manage Permissions"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}

          {isManager && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingUserId(row.original.id);
              }}
              className="text-gray-400 hover:text-red-500"
              title="Delete User"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system access, roles, and corporate accounts.</p>
        </div>
        {can('users', 'create') && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" /> Add User
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><UsersIcon className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Total Users</p><p className="text-2xl font-bold text-gray-900">{stats.total}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><ShieldCheck className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">System Admins</p><p className="text-2xl font-bold text-gray-900">{stats.admins}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Corporate Accounts</p><p className="text-2xl font-bold text-gray-900">{stats.companies}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><UserPlus className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 font-medium">Portal Members</p><p className="text-2xl font-bold text-gray-900">{stats.members}</p></div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or company..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-w-[200px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="finance">Finance</option>
          <option value="claims">Claims</option>
          <option value="company">Company</option>
          <option value="member">Member</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable
          data={filteredUsers}
          columns={columns}
          onRowClick={(user) => setSelectedUser(user)}
        />
      </div>

      {/* CREATE USER MODAL */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New User" size="xl">
        <UserForm onClose={() => setShowForm(false)} />
      </Modal>

      {/* VIEW USER MODAL */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Profile" size="xl">
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
               <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold uppercase shadow-inner overflow-hidden">
                 {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.name} className="h-full w-full object-cover" />
                 ) : (
                    selectedUser.name.charAt(0)
                 )}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                     <StatusBadge status={selectedUser.role} />
                     <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">ID: {selectedUser.id.substring(0,8)}</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {selectedUser.role === 'company' && selectedUser.companyName && (
                   <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 md:col-span-2 flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Corporate Identity</p>
                        <p className="text-sm font-bold text-indigo-900">{selectedUser.companyName}</p>
                      </div>
                   </div>
               )}
               
               <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div><p className="text-xs text-gray-500 uppercase font-medium">Email</p><p className="text-sm font-medium text-gray-900">{selectedUser.email}</p></div>
               </div>

               <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div><p className="text-xs text-gray-500 uppercase font-medium">Phone</p><p className="text-sm font-medium text-gray-900">{selectedUser.phoneNumber || 'Not provided'}</p></div>
               </div>
               
               <div className="flex items-start gap-3 p-3 border rounded-lg md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div><p className="text-xs text-gray-500 uppercase font-medium">Address</p><p className="text-sm font-medium text-gray-900">{selectedUser.address || 'Not provided'}</p></div>
               </div>
            </div>

            <div className="text-xs text-gray-400 text-center border-t pt-4">
               Account created on {format(selectedUser.createdAt, 'MMMM dd, yyyy')}
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT USER INFO MODAL */}
      <Modal isOpen={!!editingUserInfo} onClose={() => setEditingUserInfo(null)} title="Edit User Profile" size="xl">
        {editingUserInfo && (
          <UserEditModal user={editingUserInfo} onClose={() => setEditingUserInfo(null)} />
        )}
      </Modal>

      {/* PERMISSIONS MODAL */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Manage User Permissions" size="xl">
        {editingUser && (
          <UserRoleModal user={editingUser} onClose={() => setEditingUser(null)} />
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={!!deletingUserId} onClose={() => setDeletingUserId(null)} title="Delete User" size="xl">
        {deletingUserId && (
          <UserDeleteModal userId={deletingUserId} onClose={() => setDeletingUserId(null)} />
        )}
      </Modal>
    </div>
  );
};

export default Users;