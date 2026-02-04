'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'border-red-500/50 bg-red-50',
    warning: 'border-amber-500/50 bg-amber-50',
    info: 'border-cyan-500/50 bg-cyan-50',
  };

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-700 border-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 border-amber-500',
    info: 'bg-cyan-600 hover:bg-cyan-700 border-cyan-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`
          relative z-10 w-full max-w-md mx-4
          bg-white border-2 ${variantStyles[variant]}
          shadow-2xl shadow-black/50
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded border
              ${variant === 'danger' && 'bg-red-50/50 border-red-500/50 text-red-400'}
              ${variant === 'warning' && 'bg-amber-950/50 border-amber-500/50 text-amber-400'}
              ${variant === 'info' && 'bg-cyan-950/50 border-cyan-500/50 text-cyan-400'}
            `}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              px-6 py-2.5 font-mono font-semibold uppercase tracking-wider text-sm
              bg-white hover:bg-gray-100 border border-gray-300
              text-gray-600 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-6 py-2.5 font-mono font-semibold uppercase tracking-wider text-sm
              ${buttonStyles[variant]} border
              text-gray-900 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-black/30
            `}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
