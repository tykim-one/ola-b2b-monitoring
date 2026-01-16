'use client';

import React, { useState } from 'react';
import { SavedFilter, CreateFilterRequest, UpdateFilterRequest, FilterCriteria } from '@ola/shared-types';
import { filtersApi } from '@/lib/api-client';
import Modal from '@/components/ui/Modal';

interface FilterFormModalProps {
  filter: SavedFilter | null;
  onClose: () => void;
  onSuccess: (filter: SavedFilter) => void;
}

export default function FilterFormModal({ filter, onClose, onSuccess }: FilterFormModalProps) {
  const [formData, setFormData] = useState({
    name: filter?.name || '',
    description: filter?.description || '',
    isDefault: filter?.isDefault || false,
    criteria: {
      dateRange: filter?.criteria?.dateRange || null,
      tenantIds: filter?.criteria?.tenantIds || [],
      severities: filter?.criteria?.severities || [],
      minTokens: filter?.criteria?.minTokens || undefined,
      maxTokens: filter?.criteria?.maxTokens || undefined,
      searchQuery: filter?.criteria?.searchQuery || '',
    } as FilterCriteria,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantInput, setTenantInput] = useState('');

  const severityOptions = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Filter name is required');
      return;
    }

    try {
      setLoading(true);

      // Clean up criteria - remove empty values
      const cleanCriteria: FilterCriteria = {};
      if (formData.criteria.dateRange) {
        cleanCriteria.dateRange = formData.criteria.dateRange;
      }
      if (formData.criteria.tenantIds && formData.criteria.tenantIds.length > 0) {
        cleanCriteria.tenantIds = formData.criteria.tenantIds;
      }
      if (formData.criteria.severities && formData.criteria.severities.length > 0) {
        cleanCriteria.severities = formData.criteria.severities;
      }
      if (formData.criteria.minTokens !== undefined && formData.criteria.minTokens !== null) {
        cleanCriteria.minTokens = formData.criteria.minTokens;
      }
      if (formData.criteria.maxTokens !== undefined && formData.criteria.maxTokens !== null) {
        cleanCriteria.maxTokens = formData.criteria.maxTokens;
      }
      if (formData.criteria.searchQuery?.trim()) {
        cleanCriteria.searchQuery = formData.criteria.searchQuery.trim();
      }

      if (filter) {
        // Update existing filter
        const updateData: UpdateFilterRequest = {
          name: formData.name,
          description: formData.description || undefined,
          criteria: cleanCriteria,
          isDefault: formData.isDefault,
        };
        const updatedFilter = await filtersApi.update(filter.id, updateData);
        onSuccess(updatedFilter);
      } else {
        // Create new filter
        const createData: CreateFilterRequest = {
          name: formData.name,
          description: formData.description || undefined,
          criteria: cleanCriteria,
          isDefault: formData.isDefault,
        };
        const newFilter = await filtersApi.create(createData);
        onSuccess(newFilter);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save filter');
    } finally {
      setLoading(false);
    }
  };

  const handleSeverityToggle = (severity: string) => {
    const current = formData.criteria.severities || [];
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    setFormData({
      ...formData,
      criteria: { ...formData.criteria, severities: updated },
    });
  };

  const handleAddTenant = () => {
    const trimmed = tenantInput.trim();
    if (trimmed && !formData.criteria.tenantIds?.includes(trimmed)) {
      setFormData({
        ...formData,
        criteria: {
          ...formData.criteria,
          tenantIds: [...(formData.criteria.tenantIds || []), trimmed],
        },
      });
      setTenantInput('');
    }
  };

  const handleRemoveTenant = (tenant: string) => {
    setFormData({
      ...formData,
      criteria: {
        ...formData.criteria,
        tenantIds: (formData.criteria.tenantIds || []).filter((t) => t !== tenant),
      },
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={filter ? `Edit Filter: ${filter.name}` : 'Create New Filter'}
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
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Filter Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-purple-500/50 focus:shadow-lg focus:shadow-purple-500/10
              transition-all
            "
            placeholder="ENTER FILTER NAME (e.g., HIGH-ERROR-RATE)"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-purple-500/50 focus:shadow-lg focus:shadow-purple-500/10
              transition-all resize-none
            "
            placeholder="Describe the purpose of this filter..."
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-500 text-xs">Start Date</label>
              <input
                type="date"
                value={formData.criteria.dateRange?.start || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    criteria: {
                      ...formData.criteria,
                      dateRange: {
                        start: e.target.value,
                        end: formData.criteria.dateRange?.end || '',
                      },
                    },
                  })
                }
                className="
                  w-full px-4 py-2 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100
                  focus:outline-none focus:border-purple-500/50
                  transition-all
                "
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-500 text-xs">End Date</label>
              <input
                type="date"
                value={formData.criteria.dateRange?.end || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    criteria: {
                      ...formData.criteria,
                      dateRange: {
                        start: formData.criteria.dateRange?.start || '',
                        end: e.target.value,
                      },
                    },
                  })
                }
                className="
                  w-full px-4 py-2 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100
                  focus:outline-none focus:border-purple-500/50
                  transition-all
                "
              />
            </div>
          </div>
        </div>

        {/* Severities */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Severities
          </label>
          <div className="flex flex-wrap gap-2">
            {severityOptions.map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => handleSeverityToggle(severity)}
                className={`
                  px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider
                  border transition-all
                  ${
                    formData.criteria.severities?.includes(severity)
                      ? 'bg-purple-600/30 border-purple-500/50 text-purple-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }
                `}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>

        {/* Tenant IDs */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Tenant IDs
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTenant())}
              className="
                flex-1 px-4 py-2 font-mono text-sm
                bg-slate-900 border border-slate-700
                text-slate-100 placeholder-slate-500
                focus:outline-none focus:border-purple-500/50
                transition-all
              "
              placeholder="Enter tenant ID and press Enter"
            />
            <button
              type="button"
              onClick={handleAddTenant}
              className="
                px-4 py-2 font-mono text-sm font-semibold uppercase
                bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50
                text-purple-400 transition-all
              "
            >
              Add
            </button>
          </div>
          {formData.criteria.tenantIds && formData.criteria.tenantIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.criteria.tenantIds.map((tenant) => (
                <span
                  key={tenant}
                  className="
                    flex items-center gap-2 px-3 py-1
                    bg-cyan-950/30 border border-cyan-500/30
                    text-cyan-400 font-mono text-xs uppercase tracking-wider
                  "
                >
                  {tenant}
                  <button
                    type="button"
                    onClick={() => handleRemoveTenant(tenant)}
                    className="text-cyan-400 hover:text-red-400 transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Token Range */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Token Range
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-500 text-xs">Min Tokens</label>
              <input
                type="number"
                value={formData.criteria.minTokens || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    criteria: {
                      ...formData.criteria,
                      minTokens: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                className="
                  w-full px-4 py-2 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100
                  focus:outline-none focus:border-purple-500/50
                  transition-all
                "
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-500 text-xs">Max Tokens</label>
              <input
                type="number"
                value={formData.criteria.maxTokens || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    criteria: {
                      ...formData.criteria,
                      maxTokens: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                className="
                  w-full px-4 py-2 font-mono text-sm
                  bg-slate-900 border border-slate-700
                  text-slate-100
                  focus:outline-none focus:border-purple-500/50
                  transition-all
                "
                placeholder="No limit"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Search Query */}
        <div>
          <label className="block mb-2 font-mono text-sm font-bold text-purple-400 uppercase tracking-wider">
            Search Query
          </label>
          <input
            type="text"
            value={formData.criteria.searchQuery || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                criteria: { ...formData.criteria, searchQuery: e.target.value },
              })
            }
            className="
              w-full px-4 py-3 font-mono text-sm
              bg-slate-900 border border-slate-700
              text-slate-100 placeholder-slate-500
              focus:outline-none focus:border-purple-500/50 focus:shadow-lg focus:shadow-purple-500/10
              transition-all
            "
            placeholder="Enter search query to filter logs..."
          />
        </div>

        {/* Set as Default */}
        <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="
              w-5 h-5 bg-slate-900 border-2 border-slate-700
              checked:bg-yellow-600 checked:border-yellow-500
              focus:outline-none focus:ring-2 focus:ring-yellow-500/50
              transition-all cursor-pointer
            "
          />
          <label htmlFor="isDefault" className="cursor-pointer">
            <span className="text-slate-300 font-mono text-sm font-semibold">Set as Default Filter</span>
            <p className="text-slate-500 text-xs mt-1">This filter will be automatically applied when loading the dashboard</p>
          </label>
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
              bg-purple-600 hover:bg-purple-700 border border-purple-500
              text-white transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-purple-500/20
            "
          >
            {loading ? 'Processing...' : filter ? 'Update Filter' : 'Create Filter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
