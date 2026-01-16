import { Injectable } from '@nestjs/common';
import { B2BLog, LogLevel } from '@ola/shared-types';
import { ProjectStrategy } from './project.strategy.interface';

@Injectable()
export class DefaultProjectStrategy implements ProjectStrategy {
  parseLog(raw: any): B2BLog {
    // 플랫 스키마: 모든 필드가 루트 레벨에 존재
    // request_metadata는 중첩 객체로 service, endpoint 등 포함
    const metadata = raw.request_metadata || {};

    return {
      id: raw.insertId || crypto.randomUUID(),
      timestamp: raw.timestamp,
      level: this.mapLevel(raw.severity || 'INFO'),
      message: raw.llm_response || '',
      user_input: raw.user_input || '',
      llm_response: raw.llm_response || '',
      tenant_id: raw.tenant_id || '',
      service: metadata.service || 'unknown',
    };
  }

  getFilterQuery(projectId: string): string {
    // 플랫 스키마: tenant_id가 루트 레벨에 존재
    return `tenant_id IS NOT NULL`;
  }

  private mapLevel(level: string): LogLevel {
    if (!level) return LogLevel.INFO;
    const l = level.toUpperCase();
    if (l.includes('ERR')) return LogLevel.ERROR;
    if (l.includes('WARN')) return LogLevel.WARN;
    if (l.includes('DEBUG')) return LogLevel.DEBUG;
    return LogLevel.INFO;
  }
}
