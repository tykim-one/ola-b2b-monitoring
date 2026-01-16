'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shield, Users, Key } from 'lucide-react';
import { Role, Permission, User } from '@ola/shared-types';
import { rolesApi, usersApi } from '@/lib/api-client';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RoleFormModal from './components/RoleFormModal';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesData, usersData] = await Promise.all([
        rolesApi.getAll(),
        usersApi.getAll(),
      ]);
      setRoles(rolesData);
      setUsers(usersData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      setIsDeleting(true);
      await rolesApi.delete(roleToDelete.id);
      setRoles(roles.filter((r) => r.id !== roleToDelete.id));
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = (role: Role) => {
    if (selectedRole) {
      // Update
      setRoles(roles.map((r) => (r.id === role.id ? role : r)));
    } else {
      // Create
      setRoles([...roles, role]);
    }
    setIsFormOpen(false);
    setSelectedRole(null);
  };

  const filteredRoles = roles.filter((role) => {
    const query = searchQuery.toLowerCase();
    return (
      role.name.toLowerCase().includes(query) ||
      role.description?.toLowerCase().includes(query)
    );
  });

  const getUserCountForRole = (roleId: string): number => {
    return users.filter((user) => user.roles?.some((r) => r.id === roleId)).length;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading System Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              Role Management
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.ROLES // {roles.length} CONFIGURED
            </p>
          </div>
          <button
            onClick={handleCreateRole}
            className="
              flex items-center gap-2 px-6 py-3
              bg-amber-600 hover:bg-amber-700 border-2 border-amber-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40
            "
          >
            <Plus className="w-5 h-5" />
            Create Role
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-950/30">
          <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="SEARCH BY ROLE NAME OR DESCRIPTION..."
          className="max-w-2xl"
        />
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRoles.length === 0 ? (
          <div className="col-span-2 p-12 border-2 border-dashed border-slate-800 bg-slate-900/30 text-center">
            <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-mono text-sm">
              {searchQuery ? 'NO RESULTS FOUND' : 'NO ROLES IN SYSTEM'}
            </p>
          </div>
        ) : (
          filteredRoles.map((role) => {
            const userCount = getUserCountForRole(role.id);
            return (
              <div
                key={role.id}
                className="
                  border-2 border-slate-800 bg-slate-900/50
                  hover:border-amber-500/30 hover:bg-slate-900/70
                  transition-all
                "
              >
                {/* Card Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-600/20 border border-amber-500/30">
                        <Shield className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-mono font-bold text-amber-400 uppercase tracking-wider">
                          {role.name}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                          {role.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="
                          p-2 bg-slate-800 hover:bg-amber-600/20 border border-slate-700 hover:border-amber-500/50
                          text-slate-400 hover:text-amber-400 transition-all
                        "
                        title="Edit Role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(role)}
                        className="
                          p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                          text-slate-400 hover:text-red-400 transition-all
                        "
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* User Count */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 font-mono text-sm">
                      {userCount} {userCount === 1 ? 'user' : 'users'} assigned
                    </span>
                  </div>

                  {/* Permissions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300 font-mono text-xs font-bold uppercase tracking-wider">
                        Permissions ({role.permissions?.length || 0})
                      </span>
                    </div>
                    {role.permissions && role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((permission) => (
                          <span
                            key={permission.id}
                            className="
                              px-3 py-1 bg-green-950/30 border border-green-500/30
                              text-green-400 font-mono text-xs uppercase tracking-wider
                            "
                          >
                            {permission.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 font-mono text-xs">NO PERMISSIONS</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/30">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <span>ID: {role.id.slice(0, 8)}</span>
                    <span>
                      Created: {new Date(role.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Roles
          </p>
          <p className="text-amber-400 font-mono text-2xl font-bold">{roles.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Users
          </p>
          <p className="text-cyan-400 font-mono text-2xl font-bold">{users.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Avg Users/Role
          </p>
          <p className="text-slate-400 font-mono text-2xl font-bold">
            {roles.length > 0 ? Math.round(users.length / roles.length) : 0}
          </p>
        </div>
      </div>

      {/* Role Form Modal */}
      {isFormOpen && (
        <RoleFormModal
          role={selectedRole}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedRole(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        message={
          roleToDelete
            ? `Are you sure you want to delete role "${roleToDelete.name}"? ${
                getUserCountForRole(roleToDelete.id) > 0
                  ? `This role is currently assigned to ${getUserCountForRole(roleToDelete.id)} user(s).`
                  : ''
              } This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
