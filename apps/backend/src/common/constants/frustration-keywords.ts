/**
 * Frustration/complaint keywords for sentiment analysis.
 * Used in both BigQuery SQL queries and TypeScript analysis.
 * Keep these lists in sync.
 */

export const FRUSTRATION_KEYWORDS_KR = [
  '왜',
  '도대체',
  '짜증',
  '화나',
  '답답',
  '이상해',
  '바보',
  '멍청',
  '안돼',
  '못해',
  '실망',
  '최악',
  '쓰레기',
  '환불',
  '고소',
  '신고',
];

export const FRUSTRATION_KEYWORDS_EN = [
  'stupid',
  'useless',
  'terrible',
  'worst',
  'angry',
  'frustrated',
  'refund',
  'sue',
  'report',
  'ridiculous',
  'awful',
  'horrible',
];

/** Combined regex pattern for BigQuery SQL (Korean) */
export const FRUSTRATION_REGEX_KR_SQL = `(${FRUSTRATION_KEYWORDS_KR.join('|')})`;

/** Combined regex pattern for BigQuery SQL (English) */
export const FRUSTRATION_REGEX_EN_SQL = `(${FRUSTRATION_KEYWORDS_EN.join('|')})`;

/** Combined regex pattern for BigQuery SQL (All keywords) */
export const FRUSTRATION_REGEX_ALL_SQL = `(${[...FRUSTRATION_KEYWORDS_KR, ...FRUSTRATION_KEYWORDS_EN].join('|')})`;

/** JavaScript RegExp for TypeScript code */
export const FRUSTRATION_REGEX = new RegExp(
  [...FRUSTRATION_KEYWORDS_KR, ...FRUSTRATION_KEYWORDS_EN].join('|'),
  'i',
);
