import React from 'react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  searchQuery?: string;
  searchMessage?: string;
  action?: EmptyStateAction;
  variant?: 'dashed' | 'solid' | 'compact';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  searchQuery,
  searchMessage = 'NO RESULTS FOUND',
  action,
  variant = 'dashed',
  className = '',
}) => {
  const isCompact = variant === 'compact';
  const baseClasses = {
    dashed: 'border border-dashed border-gray-200 bg-gray-50 text-center p-12',
    solid: 'bg-white border border-gray-200 rounded-xl text-center p-12',
    compact: 'text-center py-8 px-4',
  }[variant];

  const combinedClasses = `${baseClasses} ${className}`.trim();

  if (searchQuery) {
    return (
      <div className={combinedClasses}>
        <p className="text-gray-400 text-sm">{searchMessage}</p>
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      {icon && (
        <div className="w-full flex justify-center mb-4">{icon}</div>
      )}
      {title && (
        <h3 className={`${isCompact ? 'text-base' : 'text-xl'} font-semibold text-gray-900 mb-2`}>{title}</h3>
      )}
      {action ? (
        <p className={`text-gray-500 mb-6 ${isCompact ? 'text-xs' : ''}`}>{description}</p>
      ) : (
        <p className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.icon && action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
};
