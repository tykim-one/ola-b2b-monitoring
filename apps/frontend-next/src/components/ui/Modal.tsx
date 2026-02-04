'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  maxWidth,
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative z-10 w-full ${maxWidth || sizeClasses[size]}
          bg-white border border-gray-200 rounded-2xl
          shadow-xl
          max-h-[90vh] flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="
              text-gray-500 hover:text-gray-800 transition-colors
              p-2 hover:bg-gray-100 rounded
            "
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
