'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ==================== Types ====================

type SortDirection = 'asc' | 'desc' | null;

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
}

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
}

function DataTableRoot<T extends object>({
  children,
  data,
  columns,
  searchFields = [],
  className = '',
}: DataTableRootProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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
      }}
    >
      <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
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
      className={`p-4 border-b border-slate-700 flex items-center gap-4 ${className}`}
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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg
                   border border-slate-600 focus:border-blue-500 focus:outline-none
                   placeholder:text-slate-400"
      />
    </div>
  );
}

// ==================== Table Header ====================

function DataTableHeader() {
  const { columns, sortField, sortDirection, setSorting } = useDataTableContext();

  const getSortIcon = (key: string, sortable?: boolean) => {
    if (!sortable) return null;

    if (sortField !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-slate-500" />;
    }

    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-400" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-400" />
    );
  };

  return (
    <thead>
      <tr className="border-b border-slate-700">
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
              className={`py-3 px-4 text-slate-400 font-medium ${alignClass} ${
                col.sortable ? 'cursor-pointer hover:text-white select-none' : ''
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
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

function DataTableBody<T>({
  emptyMessage = '데이터가 없습니다',
  onRowClick,
  rowClassName,
}: DataTableBodyProps<T>) {
  const { filteredData, columns } = useDataTableContext<T>();

  if (filteredData.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={columns.length}
            className="py-12 text-center text-slate-400"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {filteredData.map((row, index) => {
        const customClass = rowClassName ? rowClassName(row, index) : '';

        return (
          <tr
            key={index}
            className={`border-b border-slate-700/50 hover:bg-slate-700/30
                       ${onRowClick ? 'cursor-pointer' : ''} ${customClass}`}
            onClick={() => onRowClick?.(row, index)}
          >
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
                  className={`py-3 px-4 text-slate-300 ${alignClass} ${col.className || ''}`}
                >
                  {col.render
                    ? col.render(value, row, index)
                    : String(value ?? '')}
                </td>
              );
            })}
          </tr>
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
      className={`p-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400 ${className}`}
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

// ==================== Export Compound Component ====================

export const DataTable = Object.assign(DataTableRoot, {
  Toolbar: DataTableToolbar,
  Search: DataTableSearch,
  Content: DataTableContent,
  Header: DataTableHeader,
  Body: DataTableBody,
  Footer: DataTableFooter,
});

// Export types
export type { Column, DataTableRootProps, DataTableBodyProps };
