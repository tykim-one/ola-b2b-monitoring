import { Module, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSourceConfigService } from './datasource.config';
import { DataSourceFactory } from './factory';
import { METRICS_DATASOURCE, MetricsDataSource } from './interfaces';

/**
 * Provider factory for METRICS_DATASOURCE.
 * Creates the default data source using the factory.
 */
const metricsDataSourceProvider = {
  provide: METRICS_DATASOURCE,
  useFactory: async (factory: DataSourceFactory): Promise<MetricsDataSource> => {
    return factory.getDefaultDataSource();
  },
  inject: [DataSourceFactory],
};

/**
 * NestJS module for data source abstraction.
 * Provides MetricsDataSource interface for accessing metrics data from various sources.
 *
 * Usage in other modules:
 * ```typescript
 * import { DataSourceModule, METRICS_DATASOURCE, MetricsDataSource } from '../datasource';
 *
 * @Module({
 *   imports: [DataSourceModule],
 * })
 * export class MyModule {}
 *
 * @Injectable()
 * class MyService {
 *   constructor(@Inject(METRICS_DATASOURCE) private dataSource: MetricsDataSource) {}
 * }
 * ```
 */
@Module({
  providers: [
    DataSourceConfigService,
    DataSourceFactory,
    metricsDataSourceProvider,
  ],
  exports: [
    DataSourceConfigService,
    DataSourceFactory,
    METRICS_DATASOURCE,
  ],
})
export class DataSourceModule implements OnModuleDestroy {
  private readonly logger = new Logger(DataSourceModule.name);

  constructor(private readonly factory: DataSourceFactory) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disposing data source instances...');
    await this.factory.disposeAll();
  }
}
