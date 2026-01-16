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
    danger: 'border-red-500/50 bg-red-950/30',
    warning: 'border-amber-500/50 bg-amber-950/30',
    info: 'border-cyan-500/50 bg-cyan-950/30',
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`
          relative z-10 w-full max-w-md mx-4
          bg-slate-900 border-2 ${variantStyles[variant]}
          shadow-2xl shadow-black/50
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded border
              ${variant === 'danger' && 'bg-red-950/50 border-red-500/50 text-red-400'}
              ${variant === 'warning' && 'bg-amber-950/50 border-amber-500/50 text-amber-400'}
              ${variant === 'info' && 'bg-cyan-950/50 border-cyan-500/50 text-cyan-400'}
            `}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-mono text-lg font-bold text-slate-100 uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-700 bg-slate-950/50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              px-6 py-2.5 font-mono font-semibold uppercase tracking-wider text-sm
              bg-slate-800 hover:bg-slate-700 border border-slate-600
              text-slate-300 transition-all
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
              text-white transition-all
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
