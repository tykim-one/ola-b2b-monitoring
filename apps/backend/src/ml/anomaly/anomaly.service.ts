import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from '../../metrics/metrics.service';

export interface AnomalyResult {
  tenant_id: string;
  metric: string;
  value: number;
  threshold: number;
  zScore: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  message: string;
}

export interface AnomalyStats {
  tenant_id: string;
  avg_tokens: number;
  stddev_tokens: number;
  avg_input_tokens: number;
  stddev_input_tokens: number;
  sample_count: number;
  p99_tokens: number;
}

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Z-Score 기반 이상 탐지
   * Z-Score = (value - mean) / stddev
   * |Z| > 3: 이상치 (99.7% 신뢰구간 외부)
   */
  calculateZScore(value: number, mean: number, stddev: number): number {
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
  }

  /**
   * Z-Score로 심각도 판단
   */
  getSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    const absZ = Math.abs(zScore);
    if (absZ >= 4) return 'critical';
    if (absZ >= 3) return 'high';
    if (absZ >= 2) return 'medium';
    return 'low';
  }

  /**
   * 토큰 사용량 이상 탐지
   */
  async detectTokenAnomalies(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      // 1. 통계 데이터 조회
      const stats: AnomalyStats[] = await this.metricsService.getAnomalyStats();

      // 2. 최근 데이터 조회
      const recentData = await this.metricsService.getTokenEfficiency();

      // 3. 각 테넌트별 이상 탐지
      for (const stat of stats) {
        const tenantData = recentData.filter(
          (d) => d.tenant_id === stat.tenant_id
        );

        for (const data of tenantData) {
          // 토큰 사용량 Z-Score 계산
          const zScore = this.calculateZScore(
            data.total_tokens,
            stat.avg_tokens,
            stat.stddev_tokens
          );

          if (Math.abs(zScore) >= 2) {
            const severity = this.getSeverity(zScore);
            const threshold = stat.avg_tokens + 3 * stat.stddev_tokens;

            anomalies.push({
              tenant_id: stat.tenant_id,
              metric: 'total_tokens',
              value: data.total_tokens,
              threshold,
              zScore: Math.round(zScore * 100) / 100,
              isAnomaly: Math.abs(zScore) >= 3,
              severity,
              timestamp: new Date(data.timestamp),
              message: this.generateAnomalyMessage(
                stat.tenant_id,
                'total_tokens',
                data.total_tokens,
                threshold,
                severity
              ),
            });
          }
        }
      }

      this.logger.log(`Detected ${anomalies.length} token anomalies`);
      return anomalies;
    } catch (error) {
      this.logger.error(`Token anomaly detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 에러율 이상 탐지
   */
  async detectErrorRateAnomalies(
    threshold: number = 5
  ): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      const kpi = await this.metricsService.getRealtimeKPI();

      if (kpi && kpi.error_rate > threshold) {
        const severity =
          kpi.error_rate > 10
            ? 'critical'
            : kpi.error_rate > 7
              ? 'high'
              : 'medium';

        anomalies.push({
          tenant_id: 'all',
          metric: 'error_rate',
          value: kpi.error_rate,
          threshold,
          zScore: 0, // 단순 임계값 기반
          isAnomaly: true,
          severity,
          timestamp: new Date(),
          message: `에러율이 임계값(${threshold}%)를 초과했습니다: ${kpi.error_rate.toFixed(2)}%`,
        });
      }

      return anomalies;
    } catch (error) {
      this.logger.error(`Error rate anomaly detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 트래픽 스파이크 탐지
   */
  async detectTrafficSpikes(): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    try {
      const hourlyTraffic = await this.metricsService.getHourlyTraffic();

      if (hourlyTraffic.length < 3) {
        return anomalies;
      }

      // 평균 및 표준편차 계산
      const counts = hourlyTraffic.map((h) => h.request_count);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const variance =
        counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
      const stddev = Math.sqrt(variance);

      // 최근 시간대 확인
      const latest = hourlyTraffic[0];
      const zScore = this.calculateZScore(latest.request_count, mean, stddev);

      if (Math.abs(zScore) >= 2) {
        const severity = this.getSeverity(zScore);
        const threshold = mean + 3 * stddev;

        anomalies.push({
          tenant_id: 'all',
          metric: 'traffic_spike',
          value: latest.request_count,
          threshold,
          zScore: Math.round(zScore * 100) / 100,
          isAnomaly: Math.abs(zScore) >= 3,
          severity,
          timestamp: new Date(latest.hour),
          message: this.generateAnomalyMessage(
            'all',
            'traffic',
            latest.request_count,
            threshold,
            severity
          ),
        });
      }

      return anomalies;
    } catch (error) {
      this.logger.error(`Traffic spike detection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 종합 이상 탐지
   */
  async detectAllAnomalies(): Promise<{
    tokenAnomalies: AnomalyResult[];
    errorRateAnomalies: AnomalyResult[];
    trafficAnomalies: AnomalyResult[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const [tokenAnomalies, errorRateAnomalies, trafficAnomalies] =
      await Promise.all([
        this.detectTokenAnomalies(),
        this.detectErrorRateAnomalies(),
        this.detectTrafficSpikes(),
      ]);

    const allAnomalies = [
      ...tokenAnomalies,
      ...errorRateAnomalies,
      ...trafficAnomalies,
    ];

    const summary = {
      total: allAnomalies.length,
      critical: allAnomalies.filter((a) => a.severity === 'critical').length,
      high: allAnomalies.filter((a) => a.severity === 'high').length,
      medium: allAnomalies.filter((a) => a.severity === 'medium').length,
      low: allAnomalies.filter((a) => a.severity === 'low').length,
    };

    this.logger.log(`Anomaly detection complete: ${JSON.stringify(summary)}`);

    return {
      tokenAnomalies,
      errorRateAnomalies,
      trafficAnomalies,
      summary,
    };
  }

  private generateAnomalyMessage(
    tenantId: string,
    metric: string,
    value: number,
    threshold: number,
    severity: string
  ): string {
    const metricNames: Record<string, string> = {
      total_tokens: '토큰 사용량',
      traffic: '트래픽',
      error_rate: '에러율',
    };

    const metricName = metricNames[metric] || metric;
    const tenantLabel = tenantId === 'all' ? '전체' : tenantId;

    return `[${severity.toUpperCase()}] ${tenantLabel}의 ${metricName}이 임계값을 초과했습니다. (현재: ${value.toLocaleString()}, 임계값: ${Math.round(threshold).toLocaleString()})`;
  }
}
