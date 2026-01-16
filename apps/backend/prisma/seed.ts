import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

// Resolve database path - the db is in the same directory as this seed file
const absoluteDbPath = path.join(__dirname, 'admin.db');

// Create Prisma with libSQL adapter (supports local SQLite files via file: protocol)
const adapter = new PrismaLibSql({ url: `file:${absoluteDbPath}` });
const prisma = new PrismaClient({ adapter });

// 기본 권한 정의
const permissions = [
  // Metrics 권한
  { name: 'metrics:read', description: '메트릭 데이터 조회' },
  { name: 'metrics:write', description: '메트릭 데이터 수정' },
  { name: 'metrics:delete', description: '메트릭 데이터 삭제' },

  // Admin 권한
  { name: 'admin:read', description: '관리자 데이터 조회' },
  { name: 'admin:write', description: '사용자/역할 관리' },
  { name: 'admin:delete', description: '사용자/역할 삭제' },

  // Analysis 권한
  { name: 'analysis:read', description: 'LLM 분석 세션 조회' },
  { name: 'analysis:write', description: 'LLM 분석 세션 생성' },
  { name: 'analysis:delete', description: 'LLM 분석 세션 삭제' },

  // Filters 권한
  { name: 'filters:read', description: '저장된 필터 조회' },
  { name: 'filters:write', description: '필터 생성/수정' },
  { name: 'filters:delete', description: '필터 삭제' },
];

// 기본 역할 정의
const roles = [
  {
    name: 'admin',
    description: '시스템 관리자 - 모든 권한 보유',
    permissions: ['metrics:read', 'metrics:write', 'metrics:delete',
                  'admin:read', 'admin:write', 'admin:delete',
                  'analysis:read', 'analysis:write', 'analysis:delete',
                  'filters:read', 'filters:write', 'filters:delete'],
  },
  {
    name: 'analyst',
    description: '데이터 분석가 - 메트릭 조회, 분석, 필터 권한',
    permissions: ['metrics:read',
                  'analysis:read', 'analysis:write', 'analysis:delete',
                  'filters:read', 'filters:write', 'filters:delete'],
  },
  {
    name: 'viewer',
    description: '뷰어 - 메트릭 조회 전용',
    permissions: ['metrics:read'],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. 권한 생성
  console.log('Creating permissions...');
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // 2. 역할 생성 및 권한 연결
  console.log('Creating roles...');
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    // 기존 역할-권한 매핑 삭제 후 재생성
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // 권한 연결
    for (const permName of roleData.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
    console.log(`  ✅ Role "${roleData.name}" with ${roleData.permissions.length} permissions`);
  }

  // 3. 기본 관리자 계정 생성
  console.log('Creating default admin user...');
  const adminEmail = 'admin@ola.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        isActive: true,
      },
    });

    // admin 역할 연결
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
    });
    if (adminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
    }
    console.log(`✅ Created admin user: ${adminEmail} (password: admin123)`);
  } else {
    console.log(`⏭️ Admin user already exists: ${adminEmail}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
