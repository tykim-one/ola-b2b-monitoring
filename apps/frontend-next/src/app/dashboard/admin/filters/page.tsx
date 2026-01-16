'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Filter, Star, Calendar, Tag } from 'lucide-react';
import { SavedFilter } from '@ola/shared-types';
import { filtersApi } from '@/lib/api-client';
import SearchInput from '@/components/ui/SearchInput';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FilterFormModal from './components/FilterFormModal';

export default function FiltersPage() {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<SavedFilter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      const data = await filtersApi.getAll();
      setFilters(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

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

  const handleDeleteConfirm = async () => {
    if (!filterToDelete) return;

    try {
      setIsDeleting(true);
      await filtersApi.delete(filterToDelete.id);
      setFilters(filters.filter((f) => f.id !== filterToDelete.id));
      setIsDeleteDialogOpen(false);
      setFilterToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete filter');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (filter: SavedFilter) => {
    try {
      setIsSettingDefault(filter.id);
      const updatedFilter = await filtersApi.setDefault(filter.id);
      // Update the filters list - remove isDefault from all others, set on this one
      setFilters(
        filters.map((f) => ({
          ...f,
          isDefault: f.id === filter.id ? true : false,
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to set default filter');
    } finally {
      setIsSettingDefault(null);
    }
  };

  const handleFormSuccess = (filter: SavedFilter) => {
    if (selectedFilter) {
      // Update
      setFilters(filters.map((f) => (f.id === filter.id ? filter : f)));
    } else {
      // Create
      setFilters([...filters, filter]);
    }
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

  const formatCriteria = (criteria: any): string => {
    const parts: string[] = [];
    if (criteria.dateRange) {
      parts.push(`Date: ${criteria.dateRange.start} ~ ${criteria.dateRange.end}`);
    }
    if (criteria.tenantIds?.length) {
      parts.push(`Tenants: ${criteria.tenantIds.length}`);
    }
    if (criteria.severities?.length) {
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-mono uppercase tracking-wider text-sm">
            Loading Filters...
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
            <h1 className="text-3xl font-mono font-bold text-purple-400 uppercase tracking-wider mb-2">
              Filter Management
            </h1>
            <p className="text-slate-400 font-mono text-sm">
              SYSTEM.ADMIN.FILTERS // {filters.length} SAVED
            </p>
          </div>
          <button
            onClick={handleCreateFilter}
            className="
              flex items-center gap-2 px-6 py-3
              bg-purple-600 hover:bg-purple-700 border-2 border-purple-500
              text-white font-mono font-bold uppercase tracking-wider text-sm
              transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40
            "
          >
            <Plus className="w-5 h-5" />
            Create Filter
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
          placeholder="SEARCH BY FILTER NAME OR DESCRIPTION..."
          className="max-w-2xl"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFilters.length === 0 ? (
          <div className="col-span-2 p-12 border-2 border-dashed border-slate-800 bg-slate-900/30 text-center">
            <Filter className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-mono text-sm">
              {searchQuery ? 'NO RESULTS FOUND' : 'NO FILTERS SAVED'}
            </p>
          </div>
        ) : (
          filteredFilters.map((filter) => (
            <div
              key={filter.id}
              className={`
                border-2 bg-slate-900/50
                hover:bg-slate-900/70
                transition-all
                ${filter.isDefault ? 'border-purple-500/50' : 'border-slate-800 hover:border-purple-500/30'}
              `}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 border ${filter.isDefault ? 'bg-purple-600/20 border-purple-500/30' : 'bg-slate-800 border-slate-700'}`}>
                      <Filter className={`w-6 h-6 ${filter.isDefault ? 'text-purple-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-mono font-bold text-purple-400 uppercase tracking-wider">
                          {filter.name}
                        </h3>
                        {filter.isDefault && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono uppercase">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {filter.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!filter.isDefault && (
                      <button
                        onClick={() => handleSetDefault(filter)}
                        disabled={isSettingDefault === filter.id}
                        className="
                          p-2 bg-slate-800 hover:bg-yellow-600/20 border border-slate-700 hover:border-yellow-500/50
                          text-slate-400 hover:text-yellow-400 transition-all
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
                        p-2 bg-slate-800 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500/50
                        text-slate-400 hover:text-purple-400 transition-all
                      "
                      title="Edit Filter"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(filter)}
                      className="
                        p-2 bg-slate-800 hover:bg-red-600/20 border border-slate-700 hover:border-red-500/50
                        text-slate-400 hover:text-red-400 transition-all
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
                  <span className="text-slate-300 font-mono text-xs font-bold uppercase tracking-wider">
                    Filter Criteria
                  </span>
                </div>
                <div className="p-3 bg-slate-800/50 border border-slate-700 text-slate-300 font-mono text-xs">
                  {formatCriteria(filter.criteria)}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/30">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
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
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Total Filters
          </p>
          <p className="text-purple-400 font-mono text-2xl font-bold">{filters.length}</p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            Default Filter
          </p>
          <p className="text-yellow-400 font-mono text-lg font-bold truncate">
            {filters.find((f) => f.isDefault)?.name || 'None'}
          </p>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/30">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider mb-1">
            With Date Range
          </p>
          <p className="text-cyan-400 font-mono text-2xl font-bold">
            {filters.filter((f) => f.criteria?.dateRange).length}
          </p>
        </div>
      </div>

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
        isLoading={isDeleting}
      />
    </div>
  );
}
