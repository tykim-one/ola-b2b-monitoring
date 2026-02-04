'use client';

import React, { useState, useEffect } from 'react';
import { Role, Permission, CreateRoleRequest, UpdateRoleRequest } from '@ola/shared-types';
import { rolesApi } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';
import axios from 'axios';

interface RoleFormModalProps {
  role: Role | null;
  onClose: () => void;
  onSuccess: (role: Role) => void;
}

export default function RoleFormModal({ role, onClose, onSuccess }: RoleFormModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissionIds: role?.permissions?.map((p) => p.id) || [],
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      // Fetch all available permissions
      const apiClient = (await import('@/lib/api-client')).default;
      const response = await apiClient.get<Permission[]>('/api/admin/permissions');
      setPermissions(response.data);
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setLoading(true);

      if (role) {
        // Update existing role
        const updateData: UpdateRoleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        };
        const updatedRole = await rolesApi.update(role.id, updateData);
        onSuccess(updatedRole);
      } else {
        // Create new role
        const createData: CreateRoleRequest = {
          name: formData.name,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        };
        const newRole = await rolesApi.create(createData);
        onSuccess(newRole);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: permissions.map((p) => p.id),
    }));
  };

  const handleDeselectAll = () => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: [],
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={role ? `Edit Role: ${role.name}` : 'Create New Role'}
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
          <label className="block mb-2 text-sm font-medium text-gray-600">
            Role Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-4 py-3 text-sm
              bg-white border border-gray-200
              text-gray-800 placeholder-gray-400
              focus:outline-none focus:border-amber-500/50 focus:shadow-lg focus:shadow-amber-500/10
              transition-all
            "
            placeholder="ENTER ROLE NAME (e.g., ADMIN, VIEWER)"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-600">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="
              w-full px-4 py-3 text-sm
              bg-white border border-gray-200
              text-gray-800 placeholder-gray-400
              focus:outline-none focus:border-amber-500/50 focus:shadow-lg focus:shadow-amber-500/10
              transition-all resize-none
            "
            placeholder="Describe the purpose of this role..."
          />
        </div>

        {/* Permissions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-600">
              Permissions
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="
                  px-3 py-1 text-xs font-semibold uppercase tracking-wider
                  bg-green-50 hover:bg-green-950/50 border border-green-500/30 hover:border-green-500/50
                  text-green-400 transition-all
                "
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="
                  px-3 py-1 text-xs font-semibold uppercase tracking-wider
                  bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300
                  text-gray-500 transition-all
                "
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="border border-gray-200 bg-gray-50 max-h-96 overflow-y-auto">
            {loadingPermissions ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-xs">LOADING PERMISSIONS...</p>
              </div>
            ) : permissions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm">NO PERMISSIONS AVAILABLE</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="p-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`permission-${permission.id}`}
                        checked={formData.permissionIds.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="
                          mt-1 w-5 h-5 bg-white border border-gray-200
                          checked:bg-green-600 checked:border-green-500
                          focus:outline-none focus:ring-2 focus:ring-green-500/50
                          transition-all cursor-pointer
                        "
                      />
                      <label
                        htmlFor={`permission-${permission.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="text-sm text-emerald-600 font-medium">
                          {permission.name}
                        </div>
                        {permission.description && (
                          <div className="text-gray-500 text-xs mt-1">
                            {permission.description}
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-2 text-gray-400 text-xs">
            {formData.permissionIds.length} of {permissions.length} permissions selected
          </p>
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
            disabled={loading || loadingPermissions}
            className="
              px-6 py-3 font-medium text-sm
              bg-amber-600 hover:bg-amber-700 border border-amber-500
              text-white transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-amber-500/20
            "
          >
            {loading ? 'Processing...' : role ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
