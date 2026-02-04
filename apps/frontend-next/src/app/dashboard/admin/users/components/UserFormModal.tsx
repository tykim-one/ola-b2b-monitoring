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
          <div className="p-4 border border-red-200 bg-red-50">
            <p className="text-red-400 text-sm">ERROR: {error}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block mb-2 text-sm font-bold text-gray-600">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-4 py-3 text-sm
              bg-white border border-gray-200
              text-gray-800 placeholder-gray-400
              focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
              transition-all
            "
            placeholder="ENTER FULL NAME"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-2 text-sm font-bold text-gray-600">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!!user}
            className="
              w-full px-4 py-3 text-sm
              bg-white border border-gray-200
              text-gray-800 placeholder-gray-400
              focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
            placeholder="user@example.com"
          />
          {user && (
            <p className="mt-1 text-gray-400 text-xs">
              Email cannot be changed after creation
            </p>
          )}
        </div>

        {/* Password (only for new users or password change) */}
        {!user && (
          <>
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-600">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="
                  w-full px-4 py-3 text-sm
                  bg-white border border-gray-200
                  text-gray-800 placeholder-gray-400
                  focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
                  transition-all
                "
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-600">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="
                  w-full px-4 py-3 text-sm
                  bg-white border border-gray-200
                  text-gray-800 placeholder-gray-400
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
              w-5 h-5 bg-white border border-gray-200
              checked:bg-cyan-600 checked:border-cyan-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/50
              transition-all cursor-pointer
            "
          />
          <label htmlFor="isActive" className="text-sm text-gray-600 cursor-pointer">
            Active user (can log in)
          </label>
        </div>

        {/* Roles */}
        <div>
          <label className="block mb-3 text-sm font-bold text-gray-600">
            Assign Roles
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 bg-gray-50 p-4">
            {roles.length === 0 ? (
              <p className="text-gray-400 text-sm">No roles available</p>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`role-${role.id}`}
                    checked={formData.roleIds.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="
                      mt-1 w-5 h-5 bg-white border border-gray-200
                      checked:bg-amber-600 checked:border-amber-500
                      focus:outline-none focus:ring-2 focus:ring-amber-500/50
                      transition-all cursor-pointer
                    "
                  />
                  <label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                    <div className="text-sm text-gray-700 font-semibold">
                      {role.name}
                    </div>
                    {role.description && (
                      <div className="text-gray-500 text-xs mt-1">{role.description}</div>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              px-6 py-3 font-mono font-semibold uppercase tracking-wider text-sm
              bg-white hover:bg-gray-100 border border-gray-300
              text-gray-600 transition-all
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
              bg-blue-600 hover:bg-blue-700 border border-blue-500
              text-gray-900 transition-all
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
