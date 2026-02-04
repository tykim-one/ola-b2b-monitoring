'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        <Search className="w-5 h-5" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-12 pr-12 py-3 text-sm
          bg-white border border-gray-200
          text-gray-800 placeholder-slate-500
          focus:outline-none focus:border-cyan-500/50 focus:shadow-lg focus:shadow-cyan-500/10
          transition-all
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="
            absolute right-4 top-1/2 -translate-y-1/2
            text-gray-400 hover:text-gray-600 transition-colors
          "
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
