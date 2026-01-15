import { Injectable } from '@nestjs/common';
import { B2BLog, LogLevel } from '@ola/shared-types';
import { ProjectStrategy } from './project.strategy.interface';

@Injectable()
export class DefaultProjectStrategy implements ProjectStrategy {
  parseLog(raw: any): B2BLog {
    // Cloud Logging Sink 스키마에 맞춤 (jsonPayload는 STRUCT 타입)
    const payload = raw.jsonPayload || {};

    return {
        id: raw.insertId || crypto.randomUUID(),
        timestamp: raw.timestamp, // BigQuery timestamp
        level: this.mapLevel(raw.severity || 'INFO'),
        message: payload.llm_response || raw.textPayload || '',
        user_input: payload.user_input || '',
        llm_response: payload.llm_response || '',
        tenant_id: payload.tenant_id || '',
        service: raw.resource?.labels?.service_name || 'unknown',
        latencyMs: payload.latency ? parseFloat(payload.latency) : 0,
    };
  }

  getFilterQuery(projectId: string): string {
    // Cloud Logging Sink 스키마: jsonPayload.tenant_id 사용
    return `jsonPayload.tenant_id IS NOT NULL`;
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
