import { Module } from '@nestjs/common';
import { AlarmScheduleController } from './alarm-schedule.controller';
import { AlarmScheduleService } from './alarm-schedule.service';
import { AdminModule } from '../admin';

@Module({
  imports: [AdminModule],
  controllers: [AlarmScheduleController],
  providers: [AlarmScheduleService],
  exports: [AlarmScheduleService],
})
export class AlarmScheduleModule {}
