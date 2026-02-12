import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../admin/database/prisma.service';
import { AlarmScheduleResponse, UpdateAlarmScheduleDto } from './dto/alarm-schedule.dto';

type ModuleCallback = () => Promise<void>;

@Injectable()
export class AlarmScheduleService implements OnModuleInit {
  private readonly logger = new Logger(AlarmScheduleService.name);
  private readonly moduleCallbacks = new Map<string, ModuleCallback>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    // Wait a short delay to ensure dependent services are initialized
    setTimeout(() => this.loadAllSchedules(), 3000);
  }

  /**
   * 모듈 콜백 등록 (각 모듈에서 호출)
   */
  registerModuleCallback(module: string, callback: ModuleCallback): void {
    this.moduleCallbacks.set(module, callback);
    this.logger.log(`Registered callback for module: ${module}`);
  }

  /**
   * DB에서 모든 스케줄 로드 후 cron job 등록
   */
  async loadAllSchedules(): Promise<void> {
    try {
      const schedules = await this.prisma.alarmSchedule.findMany();

      for (const schedule of schedules) {
        if (schedule.isEnabled) {
          this.registerCronJob(schedule.module, schedule.cronExpression, schedule.timezone);
        }
      }

      this.logger.log(`Loaded ${schedules.length} alarm schedules`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load alarm schedules: ${message}`);
    }
  }

  /**
   * 특정 모듈의 cron job 등록/재등록
   */
  private registerCronJob(module: string, cronExpression: string, timezone: string): void {
    const jobName = `alarm-${module}`;

    try {
      // 기존 job 제거
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }

      const callback = this.moduleCallbacks.get(module);
      if (!callback) {
        this.logger.warn(`No callback registered for module: ${module}, skipping cron registration`);
        return;
      }

      const job = new CronJob(
        cronExpression,
        async () => {
          this.logger.log(`Executing alarm schedule: ${module} (${cronExpression})`);
          try {
            await callback();
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Alarm execution failed for ${module}: ${msg}`);
          }
        },
        null,
        true,
        timezone,
      );

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.log(`Cron job registered: ${jobName} = "${cronExpression}" (${timezone})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register cron job for ${module}: ${message}`);
    }
  }

  /**
   * 특정 모듈의 cron job 제거
   */
  private removeCronJob(module: string): void {
    const jobName = `alarm-${module}`;
    try {
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Cron job removed: ${jobName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove cron job for ${module}: ${message}`);
    }
  }

  /**
   * 전체 스케줄 목록 조회
   */
  async findAll(): Promise<AlarmScheduleResponse[]> {
    const schedules = await this.prisma.alarmSchedule.findMany({
      orderBy: { id: 'asc' },
    });

    return schedules.map((s) => this.toResponse(s));
  }

  /**
   * 특정 모듈 스케줄 조회
   */
  async findByModule(module: string): Promise<AlarmScheduleResponse> {
    const schedule = await this.prisma.alarmSchedule.findUnique({
      where: { module },
    });

    if (!schedule) {
      throw new NotFoundException(`Alarm schedule for module "${module}" not found`);
    }

    return this.toResponse(schedule);
  }

  /**
   * 스케줄 수정
   */
  async update(id: number, dto: UpdateAlarmScheduleDto): Promise<AlarmScheduleResponse> {
    const schedule = await this.prisma.alarmSchedule.findFirst({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`Alarm schedule #${id} not found`);
    }

    const updated = await this.prisma.alarmSchedule.update({
      where: { id },
      data: {
        ...(dto.cronExpression !== undefined && { cronExpression: dto.cronExpression }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    // Cron job 재등록
    if (updated.isEnabled) {
      this.registerCronJob(updated.module, updated.cronExpression, updated.timezone);
    } else {
      this.removeCronJob(updated.module);
    }

    this.logger.log(
      `Alarm schedule updated: ${updated.module} = "${updated.cronExpression}" (enabled: ${updated.isEnabled})`,
    );

    return this.toResponse(updated);
  }

  /**
   * 활성/비활성 토글
   */
  async toggle(id: number): Promise<AlarmScheduleResponse> {
    const schedule = await this.prisma.alarmSchedule.findFirst({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(`Alarm schedule #${id} not found`);
    }

    return this.update(id, { isEnabled: !schedule.isEnabled });
  }

  /**
   * DB 모델 → Response DTO 변환
   */
  private toResponse(schedule: any): AlarmScheduleResponse {
    const jobName = `alarm-${schedule.module}`;
    let nextExecution: string | null = null;
    let isRunning = false;

    try {
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        isRunning = true;
        const job = this.schedulerRegistry.getCronJob(jobName);
        const nextDate = job.nextDate();
        nextExecution = nextDate ? nextDate.toISO() : null;
      }
    } catch {
      // ignore
    }

    return {
      id: schedule.id,
      module: schedule.module,
      name: schedule.name,
      description: schedule.description,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      isEnabled: schedule.isEnabled,
      createdAt: schedule.createdAt instanceof Date ? schedule.createdAt.toISOString() : String(schedule.createdAt),
      updatedAt: schedule.updatedAt instanceof Date ? schedule.updatedAt.toISOString() : String(schedule.updatedAt),
      nextExecution,
      isRunning,
    };
  }
}
