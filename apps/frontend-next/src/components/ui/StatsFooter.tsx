export interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  valueSize?: 'lg' | '2xl';
}

export interface StatsFooterProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsFooter({
  items,
  columns = 3,
  className = '',
}: StatsFooterProps) {
  const colsMap = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  const sizeMap = {
    lg: 'text-lg',
    '2xl': 'text-2xl',
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className={`grid ${colsMap[columns]} gap-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="p-4 border border-gray-200 bg-gray-50">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
            {item.label}
          </p>
          <p
            className={`${item.color || 'text-gray-500'} ${sizeMap[item.valueSize || '2xl']} font-bold`}
          >
            {formatValue(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
