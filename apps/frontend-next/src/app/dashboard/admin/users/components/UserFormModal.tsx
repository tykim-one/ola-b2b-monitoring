'use client';

import React, { useState, useEffect } from 'react';
import { User, Role, CreateUserRequest, UpdateUserRequest } from '@ola/shared-types';
import { usersApi } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';

interface UserFormModalProps {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function UserFormModal({ user, roles, onClose, onSuccess }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    isActive: user?.isActive ?? true,
    roleIds: user?.roles?.map((r) => r.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!user && !formData.password) {
      setError('Password is required for new users');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      if (user) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          name: formData.name,
          isActive: formData.isActive,
          roleIds: formData.roleIds,
        };
        const updatedUser = await usersApi.update(user.id, updateData);
        onSuccess(updatedUser);
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleIds: formData.roleIds,
        };
        const newUser = await usersApi.create(createData);
        onSuccess(newUser);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={user ? `Edit User: ${user.name}` : 'Create New User'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 border-2 border-red-500/50 bg-red-950/30">
            <p className="text-red-400 font-mono text-sm">ERROR: {error}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
              transition-all
            "
            placeholder="ENTER FULL NAME"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!!user}
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
            placeholder="user@example.com"
          />
          {user && (
            <p className="mt-1 text-slate-500 font-mono text-xs">
              Email cannot be changed after creation
            </p>
          )}
        </div>

        {/* Password (only for new users or password change) */}
        {!user && (
          <>
            <div>
              <label className="block mb-2 font-mono text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="
                  w-full px-4 py-3 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100 placeholder-slate-500
                  focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
                  transition-all
                "
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block mb-2 font-mono text-sm font-bold text-cyan-400 uppercase tracking-wider">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="
                  w-full px-4 py-3 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100 placeholder-slate-500
                  focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
                  transition-all
                "
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        {/* Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="
              w-5 h-5 bg-slate-900 border-2 border-slate-700
              checked:bg-cyan-600 checked:border-cyan-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/50
              transition-all cursor-pointer
            "
          />
          <label htmlFor="isActive" className="font-mono text-sm text-slate-300 cursor-pointer">
            Active user (can log in)
          </label>
        </div>

        {/* Roles */}
        <div>
          <label className="block mb-3 font-mono text-sm font-bold text-cyan-400 uppercase tracking-wider">
            Assign Roles
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-800 bg-slate-900/50 p-4">
            {roles.length === 0 ? (
              <p className="text-slate-500 font-mono text-sm">No roles available</p>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={formData.roleIds.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="
                      mt-1 w-5 h-5 bg-slate-900 border-2 border-slate-700
                      checked:bg-amber-600 checked:border-amber-500
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50
                      transition-all cursor-pointer
                    "
                  />
                  <label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    <div className="font-mono text-sm text-slate-200 font-semibold">
                      {role.name}
                    </div>
                    {role.description && (
                      <div className="text-slate-400 text-xs mt-1">{role.description}</div>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-slate-800 hover:bg-slate-700 border border-slate-600
              text-slate-300 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-cyan-600 hover:bg-cyan-700 border border-cyan-500
              text-white transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-cyan-500/20
            "
          >
            {loading ? 'Processing...' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
