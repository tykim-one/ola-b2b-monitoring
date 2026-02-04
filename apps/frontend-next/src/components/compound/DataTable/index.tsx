'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

// ==================== Types ====================

type SortDirection = 'asc' | 'desc' | null;

type DataTableVariant = 'default' | 'card' | 'flat';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
  className?: string;
}

// ==================== Context ====================

interface DataTableContextValue<T> {
  data: T[];
  filteredData: T[];
  columns: Column<T>[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: string | null;
  sortDirection: SortDirection;
  setSorting: (field: string) => void;
  variant: DataTableVariant;
  rowKey?: keyof T | ((row: T) => string | number);
  // Pagination
  hasPagination: boolean;
  setHasPagination: (v: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  paginatedData: T[];
  // Expandable Rows
  expandedRows: Set<string | number>;
  toggleExpandedRow: (key: string | number) => void;
  isRowExpanded: (key: string | number) => boolean;
  hasExpandableColumn: boolean;
  setHasExpandableColumn: (v: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTableContext = createContext<DataTableContextValue<any> | null>(null);

function useDataTableContext<T>() {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('DataTable components must be used within DataTable');
  }
  return context as DataTableContextValue<T>;
}

// ==================== Root Component ====================

interface DataTableRootProps<T> {
  children: ReactNode;
  data: T[];
  columns: Column<T>[];
  searchFields?: (keyof T)[];
  className?: string;
  variant?: DataTableVariant;
  rowKey?: keyof T | ((row: T) => string | number);
}

function DataTableRoot<T extends object>({
  children,
  data,
  columns,
  searchFields = [],
  className = '',
  variant = 'default',
  rowKey,
}: DataTableRootProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [hasPagination, setHasPagination] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [hasExpandableColumn, setHasExpandableColumn] = useState(false);

  const toggleExpandedRow = useCallback((key: string | number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isRowExpanded = useCallback((key: string | number) => {
    return expandedRows.has(key);
  }, [expandedRows]);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery || searchFields.length === 0) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = (item as Record<string, unknown>)[field as string];
        return String(value ?? '').toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchFields]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!hasPagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, hasPagination, currentPage, pageSize]);

  // Reset to page 1 when data, search, or sort changes
  useEffect(() => {
    // Use a ref to avoid cascading state updates
    const timer = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timer);
  }, [data, searchQuery, sortField, sortDirection, pageSize]);

  const setSorting = useCallback((field: string) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortDirection(null);
      setSortField(null);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const variantWrapperClass = {
    default: 'bg-white rounded-xl shadow-sm overflow-hidden',
    card: 'bg-white border border-gray-200 rounded-xl p-6',
    flat: 'bg-gray-50 border border-gray-200',
  }[variant];

  return (
    <DataTableContext.Provider
      value={{
        data,
        filteredData: sortedData,
        columns,
        searchQuery,
        setSearchQuery,
        sortField,
        sortDirection,
        setSorting,
        variant,
        rowKey,
        hasPagination,
        setHasPagination,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        paginatedData,
        expandedRows,
        toggleExpandedRow,
        isRowExpanded,
        hasExpandableColumn,
        setHasExpandableColumn,
      }}
    >
      <div className={`${variantWrapperClass} ${className}`}>
        {children}
      </div>
    </DataTableContext.Provider>
  );
}

// ==================== Toolbar ====================

interface DataTableToolbarProps {
  children: ReactNode;
  className?: string;
}

function DataTableToolbar({ children, className = '' }: DataTableToolbarProps) {
  return (
    <div
      className={`p-4 border-b border-gray-200 flex items-center gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ==================== Search ====================

interface DataTableSearchProps {
  placeholder?: string;
  className?: string;
}

function DataTableSearch({
  placeholder = '검색...',
  className = '',
}: DataTableSearchProps) {
  const { searchQuery, setSearchQuery } = useDataTableContext();

  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 text-gray-900 pl-10 pr-4 py-2 rounded-lg
                   border border-gray-300 focus:border-blue-500 focus:outline-none
                   placeholder:text-gray-400"
      />
    </div>
  );
}

// ==================== Table Header ====================

function DataTableHeader() {
  const { columns, sortField, sortDirection, setSorting, variant, hasExpandableColumn } = useDataTableContext();

  const getSortIcon = (key: string, sortable?: boolean) => {
    if (!sortable) return null;

    if (sortField !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-400" />
    );
  };

  const getHeaderCellClass = () => {
    switch (variant) {
      case 'card':
        return 'py-3 px-4 text-gray-500 font-medium';
      case 'flat':
        return 'px-6 py-4 text-xs font-semibold uppercase tracking-wider';
      default:
        return 'py-3 px-4 text-gray-500 font-medium';
    }
  };

  const headerCellBase = getHeaderCellClass();

  return (
    <thead>
      <tr className="border-b border-gray-200">
        {hasExpandableColumn && (
          <th className={`${headerCellBase} w-8`}></th>
        )}
        {columns.map((col) => {
          const align = col.align || 'left';
          const alignClass = {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
          }[align];

          return (
            <th
              key={String(col.key)}
              className={`${headerCellBase} ${alignClass} ${
                col.sortable ? 'cursor-pointer hover:text-gray-900 select-none' : ''
              } ${col.className || ''}`}
              onClick={() => col.sortable && setSorting(String(col.key))}
            >
              <div
                className={`flex items-center gap-1 ${
                  align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''
                }`}
              >
                <span>{col.header}</span>
                {getSortIcon(String(col.key), col.sortable)}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

// ==================== Table Body ====================

interface DataTableBodyProps<T> {
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
  expandable?: boolean;
  renderExpandedRow?: (row: T, index: number) => ReactNode;
}

function DataTableBody<T>({
  emptyMessage = '데이터가 없습니다',
  emptyIcon,
  onRowClick,
  rowClassName,
  expandable = false,
  renderExpandedRow,
}: DataTableBodyProps<T>) {
  const { filteredData, columns, variant, rowKey, hasPagination, paginatedData, toggleExpandedRow, isRowExpanded, setHasExpandableColumn } = useDataTableContext<T>();

  const displayData = hasPagination ? paginatedData : filteredData;

  // Register expandable column on mount
  useEffect(() => {
    if (expandable) setHasExpandableColumn(true);
    return () => setHasExpandableColumn(false);
  }, [expandable, setHasExpandableColumn]);

  if (filteredData.length === 0) {
    if (emptyIcon && emptyMessage) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length + (expandable ? 1 : 0)}>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4">{emptyIcon}</div>
                <p className="text-gray-400 text-sm">{emptyMessage}</p>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        <tr>
          <td
            colSpan={columns.length + (expandable ? 1 : 0)}
            className="py-12 text-center text-gray-500"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  const getBodyCellClass = () => {
    switch (variant) {
      case 'card':
        return 'py-3 px-4';
      case 'flat':
        return 'px-6 py-4';
      default:
        return 'py-3 px-4 text-gray-600';
    }
  };

  const bodyCellBase = getBodyCellClass();

  const getRowKey = (row: T, index: number): string | number => {
    if (!rowKey) return index;
    if (typeof rowKey === 'function') return rowKey(row);
    return String((row as Record<string, unknown>)[rowKey as string]);
  };

  return (
    <tbody>
      {displayData.map((row, index) => {
        const customClass = rowClassName ? rowClassName(row, index) : '';
        const key = getRowKey(row, index);
        const isExpanded = expandable && isRowExpanded(key);

        return (
          <React.Fragment key={key}>
            <tr
              className={`border-b border-gray-100 hover:bg-gray-50
                         ${onRowClick || expandable ? 'cursor-pointer' : ''} ${customClass}`}
              onClick={() => {
                if (expandable) toggleExpandedRow(key);
                onRowClick?.(row, index);
              }}
            >
              {expandable && (
                <td className={`${bodyCellBase} w-8 text-gray-400`}>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </td>
              )}
              {columns.map((col) => {
                const value = (row as Record<string, unknown>)[col.key as string];
                const align = col.align || 'left';
                const alignClass = {
                  left: 'text-left',
                  center: 'text-center',
                  right: 'text-right',
                }[align];

                return (
                  <td
                    key={String(col.key)}
                    className={`${bodyCellBase} ${alignClass} ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(value, row, index)
                      : String(value ?? '')}
                  </td>
                );
              })}
            </tr>
            {isExpanded && renderExpandedRow && (
              <tr className="bg-gray-50/50">
                <td colSpan={columns.length + 1} className="py-4 px-4">
                  {renderExpandedRow(row, index)}
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </tbody>
  );
}

// ==================== Table Container ====================

interface DataTableContentProps {
  children?: ReactNode;
}

function DataTableContent({ children }: DataTableContentProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// ==================== Footer ====================

interface DataTableFooterProps {
  children?: ReactNode;
  className?: string;
}

function DataTableFooter({ children, className = '' }: DataTableFooterProps) {
  const { filteredData, data } = useDataTableContext();

  return (
    <div
      className={`p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 ${className}`}
    >
      <div>
        {filteredData.length === data.length
          ? `총 ${data.length}개`
          : `${filteredData.length} / ${data.length}개`}
      </div>
      {children}
    </div>
  );
}

// ==================== Pagination ====================

interface DataTablePaginationProps {
  pageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
}

function DataTablePagination({
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  className = '',
}: DataTablePaginationProps) {
  const {
    filteredData,
    hasPagination,
    setHasPagination,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
  } = useDataTableContext();

  // Register pagination on mount, unregister on unmount
  useEffect(() => {
    setHasPagination(true);
    return () => setHasPagination(false);
  }, [setHasPagination]);

  // Set initial page size from prop
  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize, setPageSize]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp currentPage to valid range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  if (!hasPagination) return null;

  return (
    <div
      className={`p-4 border-t border-gray-200 flex items-center justify-between text-sm ${className}`}
    >
      <div className="text-gray-500">
        총 {totalItems}건
      </div>

      <div className="flex items-center gap-4">
        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((page, idx) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page size selector */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="bg-gray-50 border border-gray-300 text-gray-700 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ==================== Stats ====================

interface DataTableStatsProps {
  children: ReactNode;
  className?: string;
}

function DataTableStats({ children, className = '' }: DataTableStatsProps) {
  return (
    <div className={`flex flex-wrap gap-4 text-sm ${className}`}>
      {children}
    </div>
  );
}

interface DataTableStatItemProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

function DataTableStatItem({ label, value, colorClass = 'text-gray-900' }: DataTableStatItemProps) {
  return (
    <div className="text-right">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className={`font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}

// ==================== Export Compound Component ====================

export const DataTable = Object.assign(DataTableRoot, {
  Toolbar: DataTableToolbar,
  Search: DataTableSearch,
  Content: DataTableContent,
  Header: DataTableHeader,
  Body: DataTableBody,
  Footer: DataTableFooter,
  Pagination: DataTablePagination,
  Stats: DataTableStats,
  StatItem: DataTableStatItem,
});

// Export types
export type { Column, DataTableRootProps, DataTableBodyProps, DataTablePaginationProps, DataTableStatsProps, DataTableStatItemProps };
