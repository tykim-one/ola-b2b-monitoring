import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnomalyService } from './anomaly.service';

@ApiTags('anomaly')
@Controller('projects/:projectId/ml/anomaly')
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  /**
   * GET /projects/:projectId/ml/anomaly/detect
   * 종합 이상 탐지 실행
   */
  @ApiOperation({ summary: 'Run comprehensive anomaly detection' })
  @ApiResponse({ status: 200, description: 'Anomaly detection results' })
  @Get('detect')
  async detectAnomalies() {
    const results = await this.anomalyService.detectAllAnomalies();
    return {
      success: true,
      ...results,
    };
  }

  /**
   * GET /projects/:projectId/ml/anomaly/tokens
   * 토큰 사용량 이상 탐지
   */
  @ApiOperation({ summary: 'Detect token usage anomalies' })
  @ApiResponse({ status: 200, description: 'Token anomalies returned' })
  @Get('tokens')
  async detectTokenAnomalies() {
    const anomalies = await this.anomalyService.detectTokenAnomalies();
    return {
      success: true,
      count: anomalies.length,
      data: anomalies,
    };
  }

  /**
   * GET /projects/:projectId/ml/anomaly/errors
   * 에러율 이상 탐지
   */
  @ApiOperation({ summary: 'Detect error rate anomalies' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Error rate threshold (default: 5)' })
  @ApiResponse({ status: 200, description: 'Error rate anomalies returned' })
  @Get('errors')
  async detectErrorRateAnomalies(@Query('threshold') threshold?: string) {
    const thresholdNum = threshold ? parseFloat(threshold) : 5;
    const anomalies = await this.anomalyService.detectErrorRateAnomalies(thresholdNum);
    return {
      success: true,
      count: anomalies.length,
      data: anomalies,
    };
  }

  /**
   * GET /projects/:projectId/ml/anomaly/traffic
   * 트래픽 스파이크 탐지
   */
  @ApiOperation({ summary: 'Detect traffic spikes' })
  @ApiResponse({ status: 200, description: 'Traffic anomalies returned' })
  @Get('traffic')
  async detectTrafficSpikes() {
    const anomalies = await this.anomalyService.detectTrafficSpikes();
    return {
      success: true,
      count: anomalies.length,
      data: anomalies,
    };
  }
}
