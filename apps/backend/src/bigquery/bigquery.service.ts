import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { QueryDto } from './dto/query.dto';

@Injectable()
export class BigQueryService implements OnModuleInit {
  private readonly logger = new Logger(BigQueryService.name);
  private bigQueryClient: BigQuery;
  private projectId: string;
  private datasetId: string;
  private tableName: string;
  private location: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID') || '';
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET') || '';
    this.tableName = this.configService.get<string>('BIGQUERY_TABLE') || 'logs';
    this.location = this.configService.get<string>('GCP_BQ_LOCATION') || 'asia-northeast3';
    
    const credentials = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    
    this.bigQueryClient = new BigQuery({
      projectId: this.projectId,
      keyFilename: credentials,
    });

    this.logger.log(`BigQuery client initialized for project: ${this.projectId}, dataset: ${this.datasetId}, table: ${this.tableName}`);
  }

  /**
   * Execute a custom SQL query
   */
  async executeQuery(queryDto: QueryDto): Promise<any[]> {
    const { query, maxResults = 1000 } = queryDto;

    try {
      this.logger.log(`Executing query: ${query.substring(0, 100)}...`);
      
      const options = {
        query,
        location: this.location, // Adjust based on your dataset location
        maxResults,
      };

      const [job] = await this.bigQueryClient.createQueryJob(options);
      this.logger.log(`Job ${job.id} started.`);

      const [rows] = await job.getQueryResults();
      this.logger.log(`Query returned ${rows.length} rows`);

      return rows;
    } catch (error) {
      this.logger.error(`Query execution failed: ${error.message}`, error.stack);
      throw new Error(`BigQuery query failed: ${error.message}`);
    }
  }

  /**
   * Get list of datasets
   */
  async getDatasets(): Promise<string[]> {
    try {
      const [datasets] = await this.bigQueryClient.getDatasets();
      return datasets.map(dataset => dataset.id || '').filter(id => id);
    } catch (error) {
      this.logger.error(`Failed to get datasets: ${error.message}`, error.stack);
      throw new Error(`Failed to get datasets: ${error.message}`);
    }
  }

  /**
   * Get tables in a dataset
   */
  async getTables(datasetId: string): Promise<string[]> {
    try {
      const dataset = this.bigQueryClient.dataset(datasetId);
      const [tables] = await dataset.getTables();
      return tables.map(table => table.id || '').filter(id => id);
    } catch (error) {
      this.logger.error(`Failed to get tables: ${error.message}`, error.stack);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }

  /**
   * Get sample logs from the configured dataset
   */
  async getSampleLogs(limit: number = 100): Promise<any[]> {
    // Note: If querying a view that doesn't have a timestamp column, this ORDER BY might fail.
    // We try to select * and limit first.
    const query = `
      SELECT *
      FROM \`${this.projectId}.${this.datasetId}.${this.tableName}\`
      LIMIT ${limit}
    `;

    return this.executeQuery({ query, maxResults: limit });
  }

  /**
   * Helper: Generate Mock Logs
   */
  private generateMockLogs(count: number): any[] {
     // ... (Previous implementation remains same, but omitted here for brevity if allowed, but must match strict replacement rules)
     // Since I need to replace the block, I'll copy the generateMockLogs content back in or just keep the structure if I can using careful ranges.
     // To avoid complexity, I will just rewrite the methods I changed.
     // Wait, I cannot skip lines inside a ReplaceFileContent.
     // I will use MultiReplaceFile if needed or just replace the upper part and the lower part separately.
     // Let's replace the whole file content for safety or use precise chunks.
    const logs = [];
    const now = new Date().getTime();
    const partners = ['Corp-A', 'Logistic-B', 'Retail-C', 'FinTech-D'];
    const services = ['auth-service', 'order-processor', 'inventory-sync', 'notification-gateway'];
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];

    for (let i = 0; i < count; i++) {
        const timeOffset = Math.floor(Math.random() * 1000 * 60 * 60 * 24);
        const partner = partners[Math.floor(Math.random() * partners.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const level = levels[Math.floor(Math.random() * levels.length)];
        
        logs.push({
            id: `log-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(now - timeOffset).toISOString(),
            service,
            level,
            message: `Mock log message for ${service} related to ${partner}`,
            latencyMs: Math.random() * 500,
            partnerId: partner,
            traceId: `trc-${Math.random().toString(36).substr(2, 12)}`,
            statusCode: level === 'ERROR' ? 500 : 200,
        });
    }
    return logs;
  }


  /*
  /**
   * Seed Mock Logs (Commented out for safety)
   *
   * This method inserts generated mock logs into the BigQuery table.
   * Use this only for testing purposes.
   */
  /*
  async insertMockLogs(count: number = 50): Promise<void> {
    try {
      const rows = this.generateMockLogs(count);
      const tableId = 'logs'; // Ensure this table exists

      this.logger.log(`Inserting ${count} mock logs into table '${tableId}'...`);

      // Insert data into BigQuery
      await this.bigQueryClient
        .dataset(this.datasetId)
        .table(tableId)
        .insert(rows);

      this.logger.log(`Successfully inserted ${count} rows.`);
    } catch (error) {
      this.logger.error(`Failed to insert mock logs: ${error.message}`, error.stack);
      if (error.errors) {
         error.errors.forEach(err => {
             this.logger.error(`Validation Error: ${JSON.stringify(err)}`);
         });
      }
      throw new Error(`Failed to insert mock logs: ${error.message}`);
    }
  }
  */
}
