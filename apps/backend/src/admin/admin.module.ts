import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { DatabaseModule } from './database';
import { AuthModule, JwtAuthGuard, PermissionsGuard } from './auth';
import { UsersModule } from './users';
import { RolesModule } from './roles';
import { FiltersModule } from './filters';
import { AnalysisModule } from './analysis';

@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute default
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),

    // Database module (global)
    DatabaseModule,

    // Auth module (provides JWT strategy, guards, etc.)
    AuthModule,

    // Admin feature modules
    UsersModule,
    RolesModule,
    FiltersModule,
    AnalysisModule,
  ],
  providers: [
    // Global JWT Auth Guard - applied to all routes
    // Use @Public() decorator to skip authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Permissions Guard - applied after JwtAuthGuard
    // Use @Permissions() decorator to require specific permissions
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AdminModule {}
