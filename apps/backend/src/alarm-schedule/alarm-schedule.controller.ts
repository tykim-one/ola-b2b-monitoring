import { Controller, Get, Patch, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../admin/auth/decorators/public.decorator';
import { AlarmScheduleService } from './alarm-schedule.service';
import { UpdateAlarmScheduleDto } from './dto/alarm-schedule.dto';

@ApiTags('Alarm Schedules')
@Controller('api/admin/alarm-schedules')
@Public()
export class AlarmScheduleController {
  constructor(private readonly alarmScheduleService: AlarmScheduleService) {}

  @Get()
  @ApiOperation({ summary: '전체 알림 스케줄 목록 조회' })
  @ApiResponse({ status: 200, description: '스케줄 목록 반환' })
  async findAll() {
    const data = await this.alarmScheduleService.findAll();
    return { success: true, data };
  }

  @Get(':module')
  @ApiOperation({ summary: '모듈별 알림 스케줄 조회' })
  @ApiResponse({ status: 200, description: '스케줄 반환' })
  async findByModule(@Param('module') module: string) {
    const data = await this.alarmScheduleService.findByModule(module);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: '알림 스케줄 수정' })
  @ApiResponse({ status: 200, description: '수정된 스케줄 반환' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlarmScheduleDto,
  ) {
    const data = await this.alarmScheduleService.update(id, dto);
    return { success: true, data };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: '알림 스케줄 활성/비활성 토글' })
  @ApiResponse({ status: 200, description: '토글된 스케줄 반환' })
  async toggle(@Param('id', ParseIntPipe) id: number) {
    const data = await this.alarmScheduleService.toggle(id);
    return { success: true, data };
  }
}
