import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HanaMtsService } from './hana-mts.service';
import { HanaMtsController } from './hana-mts.controller';

@Module({
  imports: [ConfigModule],
  controllers: [HanaMtsController],
  providers: [HanaMtsService],
})
export class HanaMtsModule {}
