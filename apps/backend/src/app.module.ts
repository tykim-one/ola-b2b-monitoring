import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BigQueryModule } from './bigquery/bigquery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BigQueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
