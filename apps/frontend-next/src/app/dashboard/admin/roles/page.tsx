'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Users, Key } from 'lucide-react';
import { Role } from '@ola/shared-types';
import { useRoles, useUsers, useDeleteRole } from '@/hooks/queries';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import RoleFormModal from './components/RoleFormModal';
import { StatsFooter } from '@/components/ui/StatsFooter';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RolesPage() {
  const { data: roles = [], isLoading, error } = useRoles();
  const { data: users = [] } = useUsers();
  const deleteRole = useDeleteRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

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

  const handleDeleteConfirm = () => {
    if (!roleToDelete) return;
    deleteRole.mutate(roleToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
      },
      onError: (err: Error) => {
        alert(err.message || 'Failed to delete role');
      },
    });
  };

  const handleFormSuccess = () => {
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Loading System Data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Role Management
            </h1>
            <p className="text-gray-500 text-sm">
              {roles.length}개의 역할이 설정되어 있습니다
            </p>
          </div>
          <button
            onClick={handleCreateRole}
            className="
              flex items-center gap-2 px-6 py-3
              bg-amber-600 hover:bg-amber-700 border-2 border-amber-500
              text-white font-medium text-sm
              transition-all shadow-sm
            "
          >
            <Plus className="w-5 h-5" />
            Create Role
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50">
          <p className="text-red-400 text-sm">ERROR: {(error as Error).message}</p>
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
          <EmptyState
            icon={<Shield className="w-12 h-12 text-gray-300" />}
            description="NO ROLES IN SYSTEM"
            searchQuery={searchQuery}
            className="col-span-2"
          />
        ) : (
          filteredRoles.map((role) => {
            const userCount = getUserCountForRole(role.id);
            return (
              <div
                key={role.id}
                className="
                  border border-gray-200 bg-gray-50
                  hover:border-amber-500/30 hover:bg-gray-50
                  transition-all
                "
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-50 border border-amber-200">
                        <Shield className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {role.name}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {role.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="
                          p-2 bg-white hover:bg-amber-600/20 border border-gray-200 hover:border-amber-500/50
                          text-gray-500 hover:text-amber-400 transition-all
                        "
                        title="Edit Role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(role)}
                        className="
                          p-2 bg-white hover:bg-red-600/20 border border-gray-200 hover:border-red-500/50
                          text-gray-500 hover:text-red-400 transition-all
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
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-600 text-sm">
                      {userCount} {userCount === 1 ? 'user' : 'users'} assigned
                    </span>
                  </div>

                  {/* Permissions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Key className="w-4 h-4 text-green-400" />
                      <span className="text-gray-600 text-xs font-medium">
                        Permissions ({role.permissions?.length || 0})
                      </span>
                    </div>
                    {role.permissions && role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((permission) => (
                          <span
                            key={permission.id}
                            className="
                              px-3 py-1 bg-emerald-50 border border-emerald-200
                              text-emerald-700 text-xs font-medium
                            "
                          >
                            {permission.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs">NO PERMISSIONS</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/30">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400">
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
      <StatsFooter
        className="mt-8"
        items={[
          { label: 'Total Roles', value: roles.length, color: 'text-amber-400' },
          { label: 'Total Users', value: users.length, color: 'text-cyan-400' },
          { label: 'Avg Users/Role', value: roles.length > 0 ? Math.round(users.length / roles.length) : 0, color: 'text-gray-500' },
        ]}
      />

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
        isLoading={deleteRole.isPending}
      />
    </div>
  );
}
