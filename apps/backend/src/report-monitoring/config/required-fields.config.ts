import { ReportType } from '../interfaces';

/**
 * 리포트 타입별 필수 필드 검증 설정
 *
 * nullCheck: NULL 여부를 체크할 필드 목록
 * compareYesterday: 전날 값과 비교할 필드 목록 (값이 동일하면 suspicious)
 */
export interface RequiredFieldsConfig {
  nullCheck: string[];
  compareYesterday: string[];
}

/**
 * 공통 필수 필드 (모든 리포트 타입에 적용)
 */
export const COMMON_REQUIRED_FIELDS: RequiredFieldsConfig = {
  nullCheck: ['value', 'diff'],
  compareYesterday: ['value', 'diff'],
};

/**
 * 리포트 타입별 추가 필수 필드
 */
export const REPORT_TYPE_REQUIRED_FIELDS: Partial<
  Record<ReportType, RequiredFieldsConfig>
> = {
  forex: {
    nullCheck: ['change_value'],
    compareYesterday: ['change_value', 'updated_at'],
  },
  commodity: {
    nullCheck: ['change_value'],
    compareYesterday: ['change_value', 'updated_at'],
  },
  // ai_stock과 dividend는 공통 필드만 사용
};

/**
 * 리포트 타입에 따른 전체 필수 필드 반환
 */
export function getRequiredFields(reportType: ReportType): RequiredFieldsConfig {
  const typeSpecific = REPORT_TYPE_REQUIRED_FIELDS[reportType];

  if (!typeSpecific) {
    return COMMON_REQUIRED_FIELDS;
  }

  // 공통 필드 + 타입별 추가 필드 병합
  return {
    nullCheck: [
      ...COMMON_REQUIRED_FIELDS.nullCheck,
      ...typeSpecific.nullCheck,
    ],
    compareYesterday: [
      ...COMMON_REQUIRED_FIELDS.compareYesterday,
      ...typeSpecific.compareYesterday,
    ],
  };
}

/**
 * 전체 검증 필드 목록 (중복 제거)
 */
export function getAllFieldsToFetch(reportType: ReportType): string[] {
  const config = getRequiredFields(reportType);
  const allFields = new Set([
    ...config.nullCheck,
    ...config.compareYesterday,
    'symbol', // 항상 필요
  ]);
  return Array.from(allFields);
}
