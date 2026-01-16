import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private configService: ConfigService) {
    // Resolve database path
    const dbUrl =
      configService.get<string>('DATABASE_URL') || 'file:./prisma/admin.db';
    const dbPath = dbUrl.replace('file:', '');
    const absoluteDbPath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(process.cwd(), dbPath);

    // Create libSQL adapter
    const adapter = new PrismaLibSql({ url: `file:${absoluteDbPath}` });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clear database - useful for testing
   */
  async cleanDatabase() {
    // Delete in order to respect foreign key constraints
    await this.auditLog.deleteMany();
    await this.analysisMessage.deleteMany();
    await this.analysisSession.deleteMany();
    await this.savedFilter.deleteMany();
    await this.apiKey.deleteMany();
    await this.refreshToken.deleteMany();
    await this.userRole.deleteMany();
    await this.rolePermission.deleteMany();
    await this.permission.deleteMany();
    await this.role.deleteMany();
    await this.user.deleteMany();
  }
}
