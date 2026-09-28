// src/pages/Users.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useUsers } from '../hooks/useUsers';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Eye, Shield, Trash2, Users as UsersIcon, ShieldCheck, Building2, UserPlus, Mail, Phone, MapPin, Edit, Calendar, Search, RefreshCw, Share2 } from 'lucide-react';
import UserForm from '../components/users/UserForm';
import UserRoleModal from '../components/users/UserRoleModal';
import UserDeleteModal from '../components/users/UserDeleteModal';
import UserEditModal from '../components/users/UserEditModal';
import SyncPermissionsModal from '../components/users/SyncPermissionsModal';
import { ShareSystemModal } from '../components/common/ShareSystemModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { usePermissions } from '../hooks/usePermissions';
import { User } from '../types';
import { normalizePermissions, RolePermissions, Permission } from '../types/roles';
import ModulePermissionsPageView, { PermissionAction } from '../components/users/ModulePermissionsPageView';
import { doc, writeBatch, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_ORDER: Record<string, number> = {
  superadmin: 1, manager: 2, admin: 3, supervisor: 4, accountant: 5, finance: 6, claims: 7, staff: 8, company: 9, member: 10,
};

const Users = () => {
  const { user: currentUser, updateUserPermissions } = useAuth();
  const { users, loading } = useUsers();
  const { can } = usePermissions();
  const isManager = can('users', 'update');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserInfo, setEditingUserInfo] = useState<User | null>(null);
  const [showRolePermissionsModal, setShowRolePermissionsModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showShareSystemModal, setShowShareSystemModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Dedicated Module Permissions Page Tab States
  const [activePageTab, setActivePageTab] = useState<'users' | 'permissions'>('users');
  const [pageRole, setPageRole] = useState<User['role']>('admin');
  const [pagePermissions, setPagePermissions] = useState<RolePermissions>(() => normalizePermissions('admin'));
  const [pageSelectedModule, setPageSelectedModule] = useState<keyof RolePermissions>('vehicles');
  const [pageSaving, setPageSaving] = useState(false);

  // Fetch saved role template from Firestore if it exists, otherwise use normalizePermissions
  const loadRolePermissions = async (targetRole: User['role']) => {
    try {
      const docSnap = await getDoc(doc(db, 'roleTemplates', targetRole));
      if (docSnap.exists() && docSnap.data().permissions) {
        setPagePermissions(normalizePermissions(targetRole, docSnap.data().permissions));
      } else {
        setPagePermissions(normalizePermissions(targetRole));
      }
    } catch {
      setPagePermissions(normalizePermissions(targetRole));
    }
  };

  useEffect(() => {
    loadRolePermissions(pageRole);
  }, []);

  const handleRoleTemplateChange = (newRole: User['role']) => {
    setPageRole(newRole);
    loadRolePermissions(newRole);
    toast.success(`Loaded permissions template for ${newRole.toUpperCase()}`);
  };

  const handlePagePermissionChange = (moduleKey: keyof RolePermissions, actionKey: PermissionAction, value: boolean) => {
    setPagePermissions((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [actionKey]: value,
      },
    }));
  };

  const handlePageToggleModuleAll = (moduleKey: keyof RolePermissions, value: boolean) => {
    setPagePermissions((prev) => {
      const next = { ...prev };
      const mod = { ...(next[moduleKey] || {}) } as Record<string, boolean>;
      Object.keys(mod).forEach((k) => {
        mod[k] = value;
      });
      next[moduleKey] = mod as Permission;
      return next;
    });
    toast.success(value ? `Enabled all on ${moduleKey}` : `Cleared all on ${moduleKey}`);
  };

  const handleSavePagePermissions = async () => {
    if (!isManager) return;
    setPageSaving(true);
    const toastId = toast.loading(`Saving ${pageRole.toUpperCase()} permissions...`);
    try {
      const batch = writeBatch(db);
      const roleDocRef = doc(db, 'roleTemplates', pageRole);
      batch.set(
        roleDocRef,
        {
          role: pageRole,
          permissions: pagePermissions,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Batch update all users assigned this role so changes take effect immediately
      const usersQuery = query(collection(db, 'users'), where('role', '==', pageRole));
      const usersSnap = await getDocs(usersQuery);
      usersSnap.docs.forEach((uDoc) => {
        batch.update(uDoc.ref, {
          permissions: pagePermissions,
          updatedAt: new Date(),
        });
      });

      await batch.commit();

      if (currentUser?.role === pageRole) {
        updateUserPermissions(pagePermissions);
      }
      try {
        window.dispatchEvent(
          new CustomEvent('user_permissions_updated', {
            detail: { role: pageRole, permissions: pagePermissions, timestamp: Date.now() },
          })
        );
      } catch {}

      toast.success(`Successfully saved and synced permissions for role: ${pageRole.toUpperCase()}`, { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save permissions template', { id: toastId });
    } finally {
      setPageSaving(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'manager' || u.role === 'superadmin').length,
    supervisors: users.filter(u => u.role === 'supervisor').length,
    staff: users.filter(u => u.role === 'staff').length,
    accountants: users.filter(u => u.role === 'accountant' || u.role === 'finance').length,
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
          
          {(can('share', 'view') || can('users', 'share')) && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setShowShareSystemModal(true); 
              }} 
              className="p-2 text-gray-400 hover:text-[#423fbd] hover:bg-indigo-50 rounded-lg transition-colors" 
              title="Share System link"
            >
              <Share2 className="w-4 h-4 text-[#423fbd]" />
            </button>
          )}
          
          {(isManager || can('users', 'update')) && (
            <button onClick={(e) => { e.stopPropagation(); setEditingUserInfo(row.original); }} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit Profile">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {(isManager || can('users', 'update')) && (
            <button onClick={(e) => { e.stopPropagation(); setEditingUser(row.original); }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Manage Permissions">
              <Shield className="w-4 h-4" />
            </button>
          )}
          {(isManager || can('users', 'delete')) && (
            <button onClick={(e) => { e.stopPropagation(); setDeletingUserId(row.original.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
              <Trash2 className="w-4 h-4" />
            </button>
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

  if (!can('users', 'view')) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">You do not have permission to view User Management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">User Management</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-medium">Manage system access, roles, and corporate accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {can('share', 'view') && (
            <button 
              onClick={() => setShowShareSystemModal(true)} 
              className="flex items-center px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-[#212049] border border-blue-200 font-bold rounded-xl transition-all shadow-xs cursor-pointer text-sm"
              title="Share AIE Skyline System link with social preview card and QR code"
            >
              <Share2 className="h-4 w-4 mr-1.5 text-[#423fbd]" /> Share System
            </button>
          )}
          {isManager && (
            <>
              <button 
                onClick={() => setShowSyncModal(true)} 
                className="flex items-center px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl transition-all shadow-xs cursor-pointer text-sm"
                title="Cross-check all defined action bars across every module (Claims, Finance, etc.) against permissions schema"
              >
                <RefreshCw className="h-4 w-4 mr-1.5 text-indigo-600" /> Sync Permissions
              </button>
              <button 
                onClick={() => setShowRolePermissionsModal(true)} 
                className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-sm"
                title="Bulk Select & Apply actions across pages, configure and assign permissions to roles in 1-click"
              >
                <Shield className="h-4 w-4 mr-1.5" /> Role Permissions Matrix
              </button>
            </>
          )}
          {can('users', 'create') && (
            <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-sm">
              <Plus className="h-4 w-4 mr-1.5" /> Add New User
            </button>
          )}
        </div>
      </div>

      {/* ── TOP PAGE-LEVEL TAB SWITCHER: USER DIRECTORY vs MODULE PERMISSIONS PAGES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActivePageTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activePageTab === 'users'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>User Accounts ({stats.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageTab('permissions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activePageTab === 'permissions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Module Permissions Pages</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activePageTab === 'permissions' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              35 Modules
            </span>
          </button>
        </div>

        {activePageTab === 'permissions' ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Every module has its own dedicated page with a complete list of permissions</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            <span>Manage accounts, view activity, and assign role access</span>
          </div>
        )}
      </div>

      {/* ── VIEW TAB 1: MODULE PERMISSIONS PAGES (EVERY MODULE HAS ITS OWN PAGE & PERMISSION LIST) ── */}
      {activePageTab === 'permissions' && (
        <div className="h-[calc(100vh-210px)] min-h-[720px] flex flex-col">
          <ModulePermissionsPageView
            role={pageRole}
            onRoleChange={handleRoleTemplateChange}
            customPermissions={pagePermissions}
            onChangePermission={handlePagePermissionChange}
            onToggleModuleAll={handlePageToggleModuleAll}
            isManager={isManager}
            selectedModule={pageSelectedModule}
            onSelectModule={setPageSelectedModule}
            onSave={handleSavePagePermissions}
            saving={pageSaving}
          />
        </div>
      )}

      {/* ── VIEW TAB 2: USER DIRECTORY & ACCOUNTS TABLE ── */}
      {activePageTab === 'users' && (
        <>
          {/* SUMMARY CARDS */}
          {can('users', 'cards') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#F8FAFC] p-5 rounded-2xl shadow-xs border border-[#CBD5E1] hover:border-slate-300 flex items-center gap-4 transition-all text-[#0F172A]">
                <div className="p-3 bg-white border border-[#CBD5E1] text-[#334155] rounded-xl shadow-xs"><UsersIcon className="w-6 h-6" /></div>
                <div><p className="text-xs text-[#334155] font-bold uppercase tracking-wider">Total Users</p><p className="text-2xl sm:text-3xl font-black font-mono text-[#0F172A] tracking-tight">{stats.total}</p></div>
              </div>
              <div className="bg-[#F0F9FF] p-5 rounded-2xl shadow-xs border border-[#BAE6FD] hover:border-sky-300 flex items-center gap-4 transition-all text-[#0F172A]">
                <div className="p-3 bg-white border border-[#BAE6FD] text-[#0284C7] rounded-xl shadow-xs"><ShieldCheck className="w-6 h-6" /></div>
                <div><p className="text-xs text-[#0284C7] font-bold uppercase tracking-wider">System Admins</p><p className="text-2xl sm:text-3xl font-black font-mono text-[#0369A1] tracking-tight">{stats.admins}</p></div>
              </div>
              <div className="bg-[#FAF5FF] p-5 rounded-2xl shadow-xs border border-[#E9D5FF] hover:border-purple-300 flex items-center gap-4 transition-all text-[#0F172A]">
                <div className="p-3 bg-white border border-[#E9D5FF] text-[#7E22CE] rounded-xl shadow-xs"><Building2 className="w-6 h-6" /></div>
                <div><p className="text-xs text-[#7E22CE] font-bold uppercase tracking-wider">Corporate Accounts</p><p className="text-2xl sm:text-3xl font-black font-mono text-[#6B21A8] tracking-tight">{stats.companies}</p></div>
              </div>
              <div className="bg-[#ECFDF5] p-5 rounded-2xl shadow-xs border border-[#A7F3D0] hover:border-emerald-300 flex items-center gap-4 transition-all text-[#0F172A]">
                <div className="p-3 bg-white border border-[#A7F3D0] text-[#059669] rounded-xl shadow-xs"><UserPlus className="w-6 h-6" /></div>
                <div><p className="text-xs text-[#059669] font-bold uppercase tracking-wider">Portal Members</p><p className="text-2xl sm:text-3xl font-black font-mono text-[#047857] tracking-tight">{stats.members}</p></div>
              </div>
            </div>
          )}

          {/* FILTERS */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#E2E8F0] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#94A3B8]" />
              <input 
                type="text" 
                placeholder="Search by name, email, or company..." 
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all shadow-xs" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <select 
              className="py-2.5 px-4 rounded-xl border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all sm:w-48 shadow-xs" 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="accountant">Accountant</option>
              <option value="finance">Finance</option>
              <option value="claims">Claims</option>
              <option value="staff">Staff</option>
              <option value="company">Company</option>
              <option value="member">Member</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <DataTable data={filteredUsers} columns={columns} onRowClick={(user) => setSelectedUser(user)} />
          </div>
        </>
      )}

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

      {/* ROLE PERMISSIONS MATRIX MODAL */}
      <Modal 
        isOpen={showRolePermissionsModal} 
        onClose={() => setShowRolePermissionsModal(false)} 
        title="Role Permissions Matrix & Bulk Assignment"
        subtitle="Bulk Select pages & actions, Bulk Apply and assign permissions to roles in 1-click"
        size="full"
        hideHeader={true}
        theme="default"
        className="w-[99vw] max-w-[99vw] h-[98vh] max-h-[98vh] border border-slate-200/90 rounded-2xl overflow-hidden bg-[#F8FAFC] shadow-2xl"
        contentClassName="p-0 flex flex-col min-h-0 overflow-hidden bg-[#F8FAFC]"
      >
        <UserRoleModal user={null} initialRole="admin" onClose={() => setShowRolePermissionsModal(false)} />
      </Modal>

      {/* PERMISSIONS MODAL */}
      <Modal 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        title={editingUser ? `Access Permissions: ${editingUser.name}` : "User Permissions Matrix"}
        subtitle={editingUser ? `${editingUser.email} • Role: ${editingUser.role.toUpperCase()}` : undefined}
        size="full"
        hideHeader={true}
        theme="default"
        className="w-[99vw] max-w-[99vw] h-[98vh] max-h-[98vh] border border-slate-200/90 rounded-2xl overflow-hidden bg-[#F8FAFC] shadow-2xl"
        contentClassName="p-0 flex flex-col min-h-0 overflow-hidden bg-[#F8FAFC]"
      >
        {editingUser && <UserRoleModal user={editingUser} onClose={() => setEditingUser(null)} />}
      </Modal>

      {/* SYNC PERMISSIONS MODAL */}
      <SyncPermissionsModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        activeRole="admin"
        customPermissions={normalizePermissions('admin')}
      />

      {/* SHARE SYSTEM MODAL */}
      <ShareSystemModal
        isOpen={showShareSystemModal}
        onClose={() => setShowShareSystemModal(false)}
        defaultPath="/users"
      />

      {/* DELETE MODAL */}
      <Modal isOpen={!!deletingUserId} onClose={() => setDeletingUserId(null)} title="Delete User" size="xl">
        {deletingUserId && <UserDeleteModal userId={deletingUserId} onClose={() => setDeletingUserId(null)} />}
      </Modal>
    </div>
  );
};

export default Users;