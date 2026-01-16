'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, UserCheck, UserX, Shield } from 'lucide-react';
import { User, Role } from '@ola/shared-types';
import { usersApi, rolesApi } from '@/lib/api-client';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import UserFormModal from './components/UserFormModal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      await usersApi.delete(userToDelete.id);
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = (user: User) => {
    if (selectedUser) {
      // Update
      setUsers(users.map((u) => (u.id === user.id ? user : u)));
    } else {
      // Create
      setUsers([...users, user]);
    }
    setIsFormOpen(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.roles?.some((role) => role.name.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
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
            <h1 className="text-3xl font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2">
              User Management
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.USERS // {users.length} ACTIVE
            </p>
          </div>
          <button
            onClick={handleCreateUser}
            className="
              flex items-center gap-2 px-6 py-3
              bg-cyan-600 hover:bg-cyan-700 border-2 border-cyan-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40
            "
          >
            <Plus className="w-5 h-5" />
            Create User
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
          placeholder="SEARCH BY NAME, EMAIL, OR ROLE..."
          className="max-w-2xl"
        />
      </div>

      {/* Users Table */}
      <div className="border-2 border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-950/50">
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Roles
                </th>
                <th className="text-left px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="text-right px-6 py-4 font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500 font-mono text-sm">
                      {searchQuery ? 'NO RESULTS FOUND' : 'NO USERS IN SYSTEM'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.isActive ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-400 font-mono text-xs uppercase tracking-wider">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-slate-600" />
                            <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">
                              Inactive
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-cyan-400 font-mono font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-slate-100 font-medium">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-mono text-sm">{user.email}</span>
                    </td>

                    {/* Roles */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span
                              key={role.id}
                              className="
                                px-3 py-1 bg-amber-950/30 border border-amber-500/30
                                text-amber-400 font-mono text-xs uppercase tracking-wider
                              "
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">NO ROLES</span>
                        )}
                      </div>
                    </td>

                    {/* Last Login */}
                    <td className="px-6 py-4">
                      <span className="text-slate-400 font-mono text-xs">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'NEVER'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="
                            p-2 bg-slate-800 hover:bg-cyan-600/20 border border-slate-700 hover:border-cyan-500/50
                            text-slate-400 hover:text-cyan-400 transition-all
                          "
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="
                            p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                            text-slate-400 hover:text-red-400 transition-all
                          "
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Users
          </p>
          <p className="text-cyan-400 font-mono text-2xl font-bold">{users.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Active
          </p>
          <p className="text-green-400 font-mono text-2xl font-bold">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Inactive
          </p>
          <p className="text-slate-500 font-mono text-2xl font-bold">
            {users.filter((u) => !u.isActive).length}
          </p>
        </div>
      </div>

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
        isLoading={isDeleting}
      />
    </div>
  );
}
