'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { User } from '@ola/shared-types';
import { useUsers, useRoles, useDeleteUser } from '@/hooks/queries';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserFormModal from './components/UserFormModal';
import { StatsFooter } from '@/components/ui/StatsFooter';
import { DataTable, Column } from '@/components/compound/DataTable';

export default function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers();
  const { data: roles = [] } = useRoles();
  const deleteUser = useDeleteUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    deleteUser.mutate(userToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
      },
      onError: (err: Error) => {
        alert(err.message || 'Failed to delete user');
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.roles?.some((role) => role.name.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  const userColumns: Column<User>[] = useMemo(() => [
    {
      key: 'isActive',
      header: 'Status',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {row.isActive ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-emerald-600 text-xs">Active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-gray-500 text-xs">Inactive</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'User',
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {row.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-gray-800 font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (_value, row) => (
        <span className="text-gray-600 text-sm">{row.email}</span>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (_value, row) => (
        <div className="flex flex-wrap gap-2">
          {row.roles && row.roles.length > 0 ? (
            row.roles.map((role) => (
              <span
                key={role.id}
                className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium"
              >
                {role.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">NO ROLES</span>
          )}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (_value, row) => (
        <span className="text-gray-500 text-xs">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'NEVER'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (_value, row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}
            className="p-2 bg-white hover:bg-cyan-600/20 border border-gray-200 hover:border-cyan-500/50 text-gray-500 hover:text-cyan-400 transition-all"
            title="Edit User"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            className="p-2 bg-white hover:bg-red-600/20 border border-gray-200 hover:border-red-500/50 text-gray-500 hover:text-red-400 transition-all"
            title="Delete User"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
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
              User Management
            </h1>
            <p className="text-gray-500 text-sm">
              {users.length}명의 사용자가 등록되어 있습니다
            </p>
          </div>
          <button
            onClick={handleCreateUser}
            className="
              flex items-center gap-2 px-6 py-3
              bg-blue-600 hover:bg-blue-700 border border-blue-500
              text-white font-medium text-sm
              transition-all shadow-sm
            "
          >
            <Plus className="w-5 h-5" />
            Create User
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
          placeholder="SEARCH BY NAME, EMAIL, OR ROLE..."
          className="max-w-2xl"
        />
      </div>

      {/* Users Table */}
      <DataTable data={filteredUsers} columns={userColumns} variant="flat" rowKey="id">
        <DataTable.Content>
          <DataTable.Header />
          <DataTable.Body emptyMessage={searchQuery ? 'NO RESULTS FOUND' : 'NO USERS IN SYSTEM'} />
        </DataTable.Content>
      </DataTable>

      {/* Stats Footer */}
      <StatsFooter
        className="mt-6"
        items={[
          { label: 'Total Users', value: users.length, color: 'text-cyan-400' },
          { label: 'Active', value: users.filter((u) => u.isActive).length, color: 'text-green-400' },
          { label: 'Inactive', value: users.filter((u) => !u.isActive).length, color: 'text-gray-400' },
        ]}
      />

      {/* User Form Modal */}
      {isFormOpen && (
        <UserFormModal
          user={selectedUser}
          roles={roles}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
