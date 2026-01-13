import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { BigQueryService } from './bigquery.service';
import { QueryDto } from './dto/query.dto';

@ApiTags('bigquery')
@Controller('bigquery')
export class BigQueryController {
  constructor(private readonly bigQueryService: BigQueryService) {}

  /**
   * POST /bigquery/query
   * Execute a custom BigQuery SQL query
   */
  @ApiOperation({ summary: 'Execute custom SQL query' })
  @ApiResponse({ status: 200, description: 'Query executed successfully' })
  @Post('query')
  async executeQuery(@Body() queryDto: QueryDto) {
    const results = await this.bigQueryService.executeQuery(queryDto);
    return {
      success: true,
      rowCount: results.length,
      data: results,
    };
  }

  /**
   * GET /bigquery/datasets
   * Get list of available datasets
   */
  @ApiOperation({ summary: 'List all datasets' })
  @ApiResponse({ status: 200, description: 'List of datasets returned' })
  @Get('datasets')
  async getDatasets() {
    const datasets = await this.bigQueryService.getDatasets();
    return {
      success: true,
      datasets,
    };
  }

  /**
   * GET /bigquery/tables/:datasetId
   * Get tables in a specific dataset
   */
  @ApiOperation({ summary: 'List tables in a dataset' })
  @ApiResponse({ status: 200, description: 'List of tables returned' })
  @Get('tables/:datasetId')
  async getTables(@Param('datasetId') datasetId: string) {
    const tables = await this.bigQueryService.getTables(datasetId);
    return {
      success: true,
      datasetId,
      tables,
    };
  }

  /**
   * GET /bigquery/logs
   * Get sample logs from the configured dataset
   */
  @ApiOperation({ summary: 'Get sample logs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of logs (default: 100)' })
  @ApiResponse({ status: 200, description: 'Sample logs returned' })
  @Get('logs')
  async getSampleLogs(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const logs = await this.bigQueryService.getSampleLogs(limitNum);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }

  /**
   * POST /bigquery/seed
   * Insert mock logs for testing (Commented out for safety)
   */
  /*
  @ApiOperation({ summary: 'Seed mock logs to BigQuery' })
  @Post('seed')
  async seedLogs(@Body('count') count?: number) {
    const num = count || 50;
    await this.bigQueryService.insertMockLogs(num);
    return {
      success: true,
      message: `Inserted ${num} mock logs`,
    };
  }
  */
}
