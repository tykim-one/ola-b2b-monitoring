import { Injectable } from '@nestjs/common';
import { B2BLog, LogLevel } from '@ola/shared-types';
import { ProjectStrategy } from './project.strategy.interface';

@Injectable()
export class DefaultProjectStrategy implements ProjectStrategy {
  parseLog(raw: any): B2BLog {
    // Default mapping (matches current logic)
    return {
        id: raw.id || crypto.randomUUID(),
        timestamp: raw.created_at || raw.timestamp, // BigQuery timestamp usually
        level: this.mapLevel(raw.severity || raw.level),
        message: raw.message || raw.textPayload || raw.jsonPayload?.message || '',
        user_input: raw.user_input || '',
        llm_response: raw.llm_response || '',
        tenant_id: raw.tenant_id || '',
        service: raw.service_name || 'unknown',
        latencyMs: raw.latency ? parseFloat(raw.latency) : 0,
    };
  }

  getFilterQuery(projectId: string): string {
    // Default strategy: assumes 'tenant_id' column matches 'projectId'
    return `tenant_id = '${projectId}'`;
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
