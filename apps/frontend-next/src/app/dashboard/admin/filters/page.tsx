'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Filter, Star, Calendar, Tag } from 'lucide-react';
import { SavedFilter } from '@ola/shared-types';
import { useFilters, useDeleteFilter, useSetDefaultFilter } from '@/hooks/queries';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FilterFormModal from './components/FilterFormModal';
import { StatsFooter } from '@/components/ui/StatsFooter';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FiltersPage() {
  const { data: filters = [], isLoading, error } = useFilters();
  const deleteFilter = useDeleteFilter();
  const setDefaultFilter = useSetDefaultFilter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<SavedFilter | null>(null);

  const handleCreateFilter = () => {
    setSelectedFilter(null);
    setIsFormOpen(true);
  };

  const handleEditFilter = (filter: SavedFilter) => {
    setSelectedFilter(filter);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (filter: SavedFilter) => {
    setFilterToDelete(filter);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!filterToDelete) return;
    deleteFilter.mutate(filterToDelete.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setFilterToDelete(null);
      },
      onError: (err: Error) => {
        alert(err.message || 'Failed to delete filter');
      },
    });
  };

  const handleSetDefault = (filter: SavedFilter) => {
    setDefaultFilter.mutate(filter.id, {
      onError: (err: Error) => {
        alert(err.message || 'Failed to set default filter');
      },
    });
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedFilter(null);
  };

  const filteredFilters = filters.filter((filter) => {
    const query = searchQuery.toLowerCase();
    return (
      filter.name.toLowerCase().includes(query) ||
      filter.description?.toLowerCase().includes(query)
    );
  });

  const formatCriteria = (criteria: Record<string, unknown>): string => {
    const parts: string[] = [];
    if (criteria.dateRange) {
      const dateRange = criteria.dateRange as { start: string; end: string };
      parts.push(`Date: ${dateRange.start} ~ ${dateRange.end}`);
    }
    if (Array.isArray(criteria.tenantIds) && criteria.tenantIds.length) {
      parts.push(`Tenants: ${criteria.tenantIds.length}`);
    }
    if (Array.isArray(criteria.severities) && criteria.severities.length) {
      parts.push(`Severities: ${criteria.severities.join(', ')}`);
    }
    if (criteria.minTokens || criteria.maxTokens) {
      const range = `${criteria.minTokens || 0} - ${criteria.maxTokens || 'unlimited'}`;
      parts.push(`Tokens: ${range}`);
    }
    if (criteria.searchQuery) {
      parts.push(`Query: "${criteria.searchQuery}"`);
    }
    return parts.join(' | ') || 'No criteria set';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Loading Filters...
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
              Filter Management
            </h1>
            <p className="text-gray-500 text-sm">
              {filters.length}개의 필터가 저장되어 있습니다
            </p>
          </div>
          <button
            onClick={handleCreateFilter}
            className="
              flex items-center gap-2 px-6 py-3
              bg-purple-600 hover:bg-purple-700 border-2 border-purple-500
              text-white font-medium text-sm
              transition-all shadow-sm
            "
          >
            <Plus className="w-5 h-5" />
            Create Filter
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
          placeholder="SEARCH BY FILTER NAME OR DESCRIPTION..."
          className="max-w-2xl"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFilters.length === 0 ? (
          <EmptyState
            icon={<Filter className="w-12 h-12 text-gray-300" />}
            description="NO FILTERS SAVED"
            searchQuery={searchQuery}
            className="col-span-2"
          />
        ) : (
          filteredFilters.map((filter) => (
            <div
              key={filter.id}
              className={`
                border-2 bg-gray-50
                hover:bg-gray-50
                transition-all
                ${filter.isDefault ? 'border-purple-500/50' : 'border-gray-200 hover:border-purple-500/30'}
              `}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 border ${filter.isDefault ? 'bg-purple-600/20 border-purple-500/30' : 'bg-white border-gray-200'}`}>
                      <Filter className={`w-6 h-6 ${filter.isDefault ? 'text-purple-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {filter.name}
                        </h3>
                        {filter.isDefault && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono uppercase">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-1">
                        {filter.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!filter.isDefault && (
                      <button
                        onClick={() => handleSetDefault(filter)}
                        disabled={setDefaultFilter.isPending}
                        className="
                          p-2 bg-white hover:bg-yellow-600/20 border border-gray-200 hover:border-yellow-500/50
                          text-gray-500 hover:text-yellow-400 transition-all
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                        title="Set as Default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditFilter(filter)}
                      className="
                        p-2 bg-white hover:bg-purple-600/20 border border-gray-200 hover:border-purple-500/50
                        text-gray-500 hover:text-purple-400 transition-all
                      "
                      title="Edit Filter"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(filter)}
                      className="
                        p-2 bg-white hover:bg-red-600/20 border border-gray-200 hover:border-red-500/50
                        text-gray-500 hover:text-red-400 transition-all
                      "
                      title="Delete Filter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Content - Criteria */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-600 text-xs font-bold uppercase tracking-wider">
                    Filter Criteria
                  </span>
                </div>
                <div className="p-3 bg-gray-50/50 border border-gray-200 text-gray-600 text-xs">
                  {formatCriteria(filter.criteria as Record<string, unknown>)}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/30">
                <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created: {new Date(filter.createdAt).toLocaleDateString('en-US')}
                  </span>
                  <span>
                    Updated: {new Date(filter.updatedAt).toLocaleDateString('en-US')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <StatsFooter
        className="mt-8"
        items={[
          { label: 'Total Filters', value: filters.length, color: 'text-purple-400' },
          { label: 'Default Filter', value: filters.find((f) => f.isDefault)?.name || 'None', color: 'text-yellow-400', valueSize: 'lg' },
          { label: 'With Date Range', value: filters.filter((f) => f.criteria?.dateRange).length, color: 'text-cyan-400' },
        ]}
      />

      {/* Filter Form Modal */}
      {isFormOpen && (
        <FilterFormModal
          filter={selectedFilter}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedFilter(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Filter"
        message={
          filterToDelete
            ? `Are you sure you want to delete filter "${filterToDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        isLoading={deleteFilter.isPending}
      />
    </div>
  );
}
