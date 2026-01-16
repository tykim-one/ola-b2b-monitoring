/**
 * Centralized formatting utilities
 * Used across all components for consistent data display
 */

export const formatters = {
  /**
   * Format token counts with K/M suffixes
   * @example formatters.tokens(1500000) => "1.50M"
   */
  tokens: (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  },

  /**
   * Format currency with $ prefix
   * @example formatters.currency(123.456) => "$123.46"
   */
  currency: (value: number): string => {
    return `$${value.toFixed(2)}`;
  },

  /**
   * Format percentage with % suffix
   * @example formatters.percentage(0.1234) => "12.3%"
   */
  percentage: (value: number, fromDecimal = false): string => {
    const pct = fromDecimal ? value * 100 : value;
    return `${pct.toFixed(1)}%`;
  },

  /**
   * Format date in Korean locale (short)
   * @example formatters.date("2025-01-15") => "1월 15일"
   */
  date: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  },

  /**
   * Format date in Korean locale (full)
   * @example formatters.dateFull("2025-01-15") => "2025년 1월 15일"
   */
  dateFull: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  /**
   * Format datetime in Korean locale
   * @example formatters.dateTime("2025-01-15T10:30:00") => "2025. 1. 15. 오전 10:30"
   */
  dateTime: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('ko-KR');
  },

  /**
   * Format time only
   * @example formatters.time("2025-01-15T10:30:00") => "10:30"
   */
  time: (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Format number with locale separators
   * @example formatters.number(1234567) => "1,234,567"
   */
  number: (value: number): string => {
    return value.toLocaleString('ko-KR');
  },

  /**
   * Format bytes with appropriate unit
   * @example formatters.bytes(1024) => "1 KB"
   */
  bytes: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format duration in human-readable format
   * @example formatters.duration(3661000) => "1시간 1분"
   */
  duration: (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 ${hours % 24}시간`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
    return `${seconds}초`;
  },

  /**
   * Truncate text with ellipsis
   * @example formatters.truncate("Hello World", 5) => "Hello..."
   */
  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  },
} as const;

// Type for formatter keys
export type FormatterKey = keyof typeof formatters;
