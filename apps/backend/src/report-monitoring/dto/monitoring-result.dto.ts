import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ReportType,
  ReportCheckResult,
  MonitoringResult,
} from '../interfaces/report-target.interface';

export class StaleDetailDto {
  @ApiProperty({ description: '심볼' })
  symbol: string;

  @ApiProperty({ description: '마지막 업데이트 시간' })
  updatedAt: Date;

  @ApiProperty({ description: '지연 일수' })
  daysBehind: number;
}

export class IncompleteDetailDto {
  @ApiProperty({ description: '심볼' })
  symbol: string;

  @ApiProperty({ description: 'NULL인 필드 목록', type: [String] })
  missingFields: string[];
}

export class SuspiciousDetailDto {
  @ApiProperty({ description: '심볼' })
  symbol: string;

  @ApiProperty({ description: '전날과 동일한 필드 목록', type: [String] })
  unchangedFields: string[];
}

export class ReportCheckResultDto implements ReportCheckResult {
  @ApiProperty({ description: '리포트 타입', enum: ['ai_stock', 'commodity', 'forex', 'dividend'] })
  reportType: ReportType;

  @ApiProperty({ description: '전체 타겟 수' })
  totalTargets: number;

  // 존재 여부
  @ApiProperty({ description: '존재하는 데이터 수' })
  existingCount: number;

  @ApiProperty({ description: '누락된 심볼 목록', type: [String] })
  missingSymbols: string[];

  // 완전성 (NEW)
  @ApiProperty({ description: '완전한 데이터 수' })
  completeCount: number;

  @ApiProperty({ description: '불완전한 심볼 목록 (필수 필드 NULL)', type: [String] })
  incompleteSymbols: string[];

  @ApiProperty({ description: '불완전 데이터 상세', type: [IncompleteDetailDto] })
  incompleteDetails: IncompleteDetailDto[];

  @ApiProperty({ description: '확인필요 심볼 목록 (전날과 값 동일)', type: [String] })
  suspiciousSymbols: string[];

  @ApiProperty({ description: '확인필요 데이터 상세', type: [SuspiciousDetailDto] })
  suspiciousDetails: SuspiciousDetailDto[];

  // 신선도
  @ApiProperty({ description: '신선한 데이터 수' })
  freshCount: number;

  @ApiProperty({ description: '오래된 심볼 목록', type: [String] })
  staleSymbols: string[];

  @ApiProperty({ description: '오래된 데이터 상세', type: [StaleDetailDto] })
  staleDetails: StaleDetailDto[];

  @ApiProperty({ description: '중요 이슈 존재 여부' })
  hasCriticalIssues: boolean;

  @ApiProperty({ description: '체크 시간' })
  checkedAt: Date;
}

export class MonitoringSummaryDto {
  @ApiProperty({ description: '전체 리포트 수' })
  totalReports: number;

  @ApiProperty({ description: '정상 리포트 수' })
  healthyReports: number;

  @ApiProperty({ description: '이슈 있는 리포트 수' })
  issueReports: number;

  @ApiProperty({ description: '전체 누락 데이터 수' })
  totalMissing: number;

  @ApiProperty({ description: '전체 불완전 데이터 수' })
  totalIncomplete: number;

  @ApiProperty({ description: '전체 확인필요 데이터 수' })
  totalSuspicious: number;

  @ApiProperty({ description: '전체 오래된 데이터 수' })
  totalStale: number;
}

export class MonitoringResultDto implements MonitoringResult {
  @ApiProperty({ description: '리포트별 체크 결과', type: [ReportCheckResultDto] })
  results: ReportCheckResultDto[];

  @ApiProperty({ description: '요약', type: MonitoringSummaryDto })
  summary: MonitoringSummaryDto;

  @ApiProperty({ description: '체크 시간' })
  timestamp: Date;
}

export class CheckReportParamDto {
  @ApiProperty({
    description: '리포트 타입',
    enum: ['ai_stock', 'commodity', 'forex', 'dividend'],
  })
  reportType: ReportType;
}
