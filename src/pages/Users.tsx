// src/pages/Users.tsx
import React, { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Eye, Shield, Trash2, Users as UsersIcon, ShieldCheck, Building2, UserPlus, Mail, Phone, MapPin, Edit, Calendar, Search } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import UserRoleModal from '../components/users/UserRoleModal';
import UserDeleteModal from '../components/users/UserDeleteModal';
import UserEditModal from '../components/users/UserEditModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { usePermissions } from '../hooks/usePermissions';
import { User } from '../types';

const ROLE_ORDER: Record<string, number> = {
  manager: 1, admin: 2, finance: 3, claims: 4, company: 5, member: 6,
};

const Users = () => {
  const { users, loading } = useUsers();
  const { can, isManager } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserInfo, setEditingUserInfo] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'manager').length,
    companies: users.filter(u => u.role === 'company').length,
    members: users.filter(u => u.role === 'member').length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = user.name.toLowerCase().includes(searchStr) || user.email.toLowerCase().includes(searchStr) || (user.companyName || '').toLowerCase().includes(searchStr);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] || 99;
      const orderB = ROLE_ORDER[b.role] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [users, searchQuery, roleFilter]);

  const columns = [
    {
      header: 'User Info',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
            {row.original.photoURL ? (
               <img src={row.original.photoURL} alt={row.original.name} className="h-full w-full object-cover" />
            ) : (
               <span className="text-gray-500 font-bold uppercase">{row.original.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">{row.original.name}</div>
            <div className="text-sm text-gray-500">{row.original.email}</div>
            {row.original.role === 'company' && row.original.companyName && (
              <div className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">
                🏢 {row.original.companyName}
              </div>
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
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400"/>
          {format(row.original.createdAt, 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setSelectedUser(row.original); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Profile">
            <Eye className="w-4 h-4" />
          </button>
          
          {isManager && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setEditingUserInfo(row.original); }} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit Profile">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditingUser(row.original); }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Permissions">
                <Shield className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeletingUserId(row.original.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system access, roles, and corporate accounts.</p>
        </div>
        {can('users', 'create') && (
          <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-600 transition-all shadow-sm">
            <Plus className="h-5 w-5 mr-2" /> Add New User
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-gray-300 transition-all">
          <div className="p-3 bg-white shadow-sm text-gray-600 rounded-xl"><UsersIcon className="w-6 h-6" /></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Users</p><p className="text-2xl font-black text-gray-900">{stats.total}</p></div>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50/50 p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-blue-200 transition-all">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">System Admins</p><p className="text-2xl font-black text-gray-900">{stats.admins}</p></div>
        </div>
        <div className="bg-gradient-to-br from-white to-indigo-50/50 p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-indigo-200 transition-all">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Building2 className="w-6 h-6" /></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Corporate Accounts</p><p className="text-2xl font-black text-gray-900">{stats.companies}</p></div>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50/50 p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-green-200 transition-all">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl"><UserPlus className="w-6 h-6" /></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Portal Members</p><p className="text-2xl font-black text-gray-900">{stats.members}</p></div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
           <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
           <input type="text" placeholder="Search by name, email, or company..." className="w-full pl-9 py-2.5 rounded-lg border-transparent bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary text-sm transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select className="py-2.5 px-4 rounded-lg border-transparent bg-gray-50 focus:bg-white focus:border-primary focus:ring-primary text-sm font-medium transition-all sm:w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable data={filteredUsers} columns={columns} onRowClick={(user) => setSelectedUser(user)} />
      </div>

      {/* CREATE USER MODAL */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New User" size="xl">
        <UserForm onClose={() => setShowForm(false)} />
      </Modal>

      {/* VIEW USER MODAL (ENHANCED DESIGN) */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Profile" size="xl">
        {selectedUser && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 flex items-center gap-6 mt-2 overflow-hidden shadow-md">
               <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none"><UsersIcon className="w-64 h-64 text-white" /></div>
               
               <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center text-primary text-3xl font-black uppercase shadow-lg overflow-hidden border-4 border-white relative z-10 shrink-0">
                 {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.name} className="h-full w-full object-cover" />
                 ) : (
                    selectedUser.name.charAt(0)
                 )}
               </div>
               <div className="relative z-10 text-white">
                  <h2 className="text-2xl font-black">{selectedUser.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                     <StatusBadge status={selectedUser.role} />
                     <span className="text-xs font-mono bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">ID: {selectedUser.id.substring(0,8)}</span>
                  </div>
               </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {selectedUser.role === 'company' && selectedUser.companyName && (
                   <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 md:col-span-2 flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-xl"><Building2 className="w-6 h-6 text-indigo-700" /></div>
                      <div>
                        <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Corporate Identity</p>
                        <p className="text-lg font-black text-indigo-900">{selectedUser.companyName}</p>
                      </div>
                   </div>
               )}
               
               <div className="bg-white p-5 border border-gray-200 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gray-50 rounded-xl"><Mail className="w-5 h-5 text-gray-500" /></div>
                  <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Email Address</p><p className="text-sm font-bold text-gray-900 mt-1">{selectedUser.email}</p></div>
               </div>

               <div className="bg-white p-5 border border-gray-200 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 bg-gray-50 rounded-xl"><Phone className="w-5 h-5 text-gray-500" /></div>
                  <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Phone Number</p><p className="text-sm font-bold text-gray-900 mt-1">{selectedUser.phoneNumber || 'Not provided'}</p></div>
               </div>
               
               <div className="bg-white p-5 border border-gray-200 rounded-2xl flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                  <div className="p-3 bg-gray-50 rounded-xl"><MapPin className="w-5 h-5 text-gray-500" /></div>
                  <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Physical Address</p><p className="text-sm font-medium text-gray-900 mt-1">{selectedUser.address || 'Not provided'}</p></div>
               </div>
            </div>

            <div className="text-xs text-gray-400 font-medium text-center border-t border-gray-100 pt-6">
               Account established on {format(selectedUser.createdAt, 'MMMM dd, yyyy')}
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT USER INFO MODAL */}
      <Modal isOpen={!!editingUserInfo} onClose={() => setEditingUserInfo(null)} title="Edit User Profile" size="xl">
        {editingUserInfo && <UserEditModal user={editingUserInfo} onClose={() => setEditingUserInfo(null)} />}
      </Modal>

      {/* PERMISSIONS MODAL */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Manage User Permissions" size="xl">
        {editingUser && <UserRoleModal user={editingUser} onClose={() => setEditingUser(null)} />}
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={!!deletingUserId} onClose={() => setDeletingUserId(null)} title="Delete User" size="xl">
        {deletingUserId && <UserDeleteModal userId={deletingUserId} onClose={() => setDeletingUserId(null)} />}
      </Modal>
    </div>
  );
};

export default Users;