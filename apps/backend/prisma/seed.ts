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

// 프롬프트 템플릿 정의
const promptTemplates = [
  {
    name: '기본 품질 분석',
    description: '대화 품질을 다각도로 분석하는 기본 템플릿 (품질점수, 관련성, 완성도, 명확성)',
    prompt: `당신은 대화 품질 분석 전문가입니다. 다음 고객-AI 대화를 분석하고 JSON 형식으로 응답해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "quality_score": (1-10 점수),
  "relevance": (질문에 대한 응답 관련성 1-10),
  "completeness": (응답의 완성도 1-10),
  "clarity": (응답의 명확성 1-10),
  "issues": ["발견된 문제점 목록"],
  "improvements": ["개선 제안 목록"],
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "한 줄 요약"
}`,
    isDefault: true,
  },
  {
    name: '감정 분석',
    description: '사용자 감정 상태, 만족도, 불만 요소를 분석',
    prompt: `당신은 감정 분석 전문가입니다. 다음 고객-AI 대화에서 사용자의 감정 상태를 분석해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "user_sentiment": "positive" | "neutral" | "negative" | "frustrated" | "confused",
  "satisfaction_level": (1-10 예상 만족도),
  "frustration_points": ["불만/좌절 요소 목록"],
  "emotion_keywords": ["감정 관련 키워드"],
  "tone": "formal" | "casual" | "urgent" | "friendly",
  "needs_followup": true | false,
  "summary": "감정 상태 한 줄 요약"
}`,
    isDefault: false,
  },
  {
    name: '요약 분석',
    description: '대화 핵심 요약, 주요 주제, 키워드 추출',
    prompt: `당신은 대화 요약 전문가입니다. 다음 고객-AI 대화를 요약하고 핵심 정보를 추출해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "summary": "대화 전체 요약 (2-3문장)",
  "user_intent": "사용자의 주요 의도",
  "main_topics": ["주요 주제 목록"],
  "keywords": ["핵심 키워드 목록"],
  "question_type": "information" | "troubleshooting" | "request" | "feedback" | "other",
  "response_type": "answer" | "clarification" | "action" | "rejection",
  "key_entities": ["언급된 주요 개체/이름"]
}`,
    isDefault: false,
  },
  {
    name: '이슈 탐지',
    description: '응답 오류, 부적절한 답변, 개선 필요 사항 탐지',
    prompt: `당신은 품질 관리 전문가입니다. 다음 AI 응답에서 문제점이나 개선이 필요한 부분을 탐지해주세요.

## 분석 대상 대화

**사용자 질문:**
{{user_input}}

**AI 응답:**
{{llm_response}}

## 분석 항목

다음 JSON 형식으로 응답해주세요:
{
  "has_issues": true | false,
  "issue_types": ["factual_error" | "incomplete" | "irrelevant" | "unclear" | "inappropriate" | "hallucination"],
  "severity": "low" | "medium" | "high" | "critical",
  "specific_issues": [
    {
      "type": "이슈 유형",
      "description": "구체적 설명",
      "location": "문제 위치 (인용)"
    }
  ],
  "recommendations": ["개선 권장사항"],
  "requires_human_review": true | false,
  "confidence": (분석 확신도 0-1)
}`,
    isDefault: false,
  },
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

  // 4. 프롬프트 템플릿 생성
  console.log('Creating prompt templates...');
  for (const template of promptTemplates) {
    await prisma.analysisPromptTemplate.upsert({
      where: { name: template.name },
      update: {
        description: template.description,
        prompt: template.prompt,
        isDefault: template.isDefault,
      },
      create: {
        name: template.name,
        description: template.description,
        prompt: template.prompt,
        isDefault: template.isDefault,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${promptTemplates.length} prompt templates`);

  // 5. 기본 배치 스케줄러 설정 생성
  console.log('Creating default batch scheduler config...');
  const defaultSchedule = {
    name: '일일 품질 분석',
    isEnabled: true,
    hour: 8,
    minute: 10,
    daysOfWeek: '1,2,3,4,5,6,0', // 매일
    timeZone: 'Asia/Seoul',
    targetTenantId: null, // 전체 테넌트
    sampleSize: 100,
    promptTemplateId: null, // 기본 템플릿 사용
  };

  const existingSchedule = await prisma.batchSchedulerConfig.findFirst({
    where: { name: defaultSchedule.name },
  });

  if (!existingSchedule) {
    await prisma.batchSchedulerConfig.create({
      data: defaultSchedule,
    });
    console.log(`✅ Created default batch schedule: "${defaultSchedule.name}"`);
  } else {
    console.log(`⏭️ Default batch schedule already exists: "${defaultSchedule.name}"`);
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
