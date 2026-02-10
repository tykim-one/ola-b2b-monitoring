// Load .env for local development; in Docker, env vars are injected directly
try { require('dotenv/config'); } catch { /* not available in production */ }
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

// Resolve database path from DATABASE_URL env var (Docker/production)
// Fallback to __dirname-relative path (local development with ts-node)
function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const filePath = databaseUrl.replace(/^file:/, '');
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    return `file:${absolutePath}`;
  }
  return `file:${path.join(__dirname, 'admin.db')}`;
}

const adapter = new PrismaLibSql({ url: resolveDatabaseUrl() });
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
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_SEED_PASSWORD environment variable is required for seeding');
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
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
    console.log(`✅ Created admin user: ${adminEmail}`);
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

  // 6. 문제 채팅 필터링 규칙 생성
  console.log('Creating problematic chat rules...');
  const problematicRules = [
    // --- 기존 레거시 규칙 (하위 호환) ---
    {
      name: 'Output 토큰 부족',
      description: 'Output 토큰이 1500 미만인 응답',
      type: 'token_threshold',
      config: JSON.stringify({ threshold: 1500, operator: 'lt' }),
      isEnabled: true,
    },
    {
      name: '데이터 없음 응답',
      description: 'LLM이 데이터 부재를 언급하는 응답',
      type: 'keyword_match',
      config: JSON.stringify({
        keywords: ['질문의 범위가', '죄송합니다', '데이터', '없습니다', '존재하지 않습니다'],
        matchField: 'llm_response',
      }),
      isEnabled: true,
    },
    // --- Tier 1 규칙: 즉시 적용 가능 (난이도 하, 임팩트 높음) ---
    // #1 정형화된 에러 응답 탐지 (1.4)
    {
      name: '정형화된 에러 응답',
      description: '챗봇이 질문을 처리하지 못한 정형화된 실패 응답 탐지',
      type: 'llm_response',
      config: JSON.stringify({
        field: 'llm_response',
        operator: 'contains_any',
        value: ['이해하지 못했습니다', '다시 질문해', '잠시 후 다시 시도', '입력하신 내용을 정확히'],
      }),
      isEnabled: true,
    },
    // #2 과도한 사과/거부 패턴 (1.3)
    {
      name: '과도한 사과/거부',
      description: '사과 표현이 2회 이상 등장하는 응답 (답변 거부 또는 무능력)',
      type: 'apology_count',
      config: JSON.stringify({
        field: 'apology_count',
        operator: 'gte',
        value: 2,
      }),
      isEnabled: true,
    },
    // #3a 응답 잘림 - 미완결 응답 (1.1)
    {
      name: '응답 잘림 - 미완결',
      description: '응답이 종결어미 없이 끝나는 경우 (토큰 한도 도달 의심)',
      type: 'response_ends_complete',
      config: JSON.stringify({
        field: 'response_ends_complete',
        operator: 'eq',
        value: false,
      }),
      isEnabled: true,
    },
    // #3b 응답 잘림 - 코드블록 깨짐 (1.1)
    {
      name: '응답 잘림 - 코드블록 깨짐',
      description: '코드블록(```)이 열린 채 닫히지 않은 응답',
      type: 'has_unclosed_code_block',
      config: JSON.stringify({
        field: 'has_unclosed_code_block',
        operator: 'eq',
        value: true,
      }),
      isEnabled: true,
    },
    // #4 언어 불일치 탐지 (1.6)
    {
      name: '언어 불일치',
      description: '한글 비율이 30% 미만인 응답 (영어 응답 의심)',
      type: 'korean_ratio',
      config: JSON.stringify({
        field: 'korean_ratio',
        operator: 'lt',
        value: 0.3,
      }),
      isEnabled: true,
    },
    // #5 면책 조항 누락 (5.1) - CRITICAL
    {
      name: '면책 조항 누락',
      description: '투자 관련 내용 포함 시 면책 표현 누락 탐지 (법적 리스크)',
      type: 'compound_and',
      config: JSON.stringify({
        version: 2,
        logic: 'AND',
        conditions: [
          { field: 'llm_response', operator: 'contains_any', value: ['주가', '수익률', '매수', '매도', '투자'] },
          { field: 'llm_response', operator: 'not_contains_any', value: ['투자 책임', '참고 용도', '투자 권유가 아님'] },
        ],
      }),
      isEnabled: true,
    },
    // #6 단정적 투자 표현 (5.2) - CRITICAL
    {
      name: '단정적 투자 표현',
      description: '불확실한 미래를 확정적으로 표현하는 금지 패턴 (법적 리스크)',
      type: 'llm_response',
      config: JSON.stringify({
        field: 'llm_response',
        operator: 'contains_any',
        value: ['확실히 오를', '100% 수익', '반드시 상승', '무조건 사세요', '절대 안전', '손해 없는'],
      }),
      isEnabled: true,
    },
    // #7 규제 금지어 (5.3) - CRITICAL
    {
      name: '규제 금지어',
      description: '자본시장법상 명시적 금지 표현 탐지',
      type: 'llm_response',
      config: JSON.stringify({
        field: 'llm_response',
        operator: 'contains_any',
        value: ['원금 보장', '무위험 수익', '확정 수익률', '보장된 이익', '위험 없는 투자'],
      }),
      isEnabled: true,
    },
    // #8 질문 되돌리기 탐지 (4.3)
    {
      name: '질문 되돌리기',
      description: '사용자 질문에 답변 대신 질문으로 회피하는 패턴',
      type: 'compound_and',
      config: JSON.stringify({
        version: 2,
        logic: 'AND',
        conditions: [
          { field: 'user_input', operator: 'contains', value: '?' },
          { field: 'response_question_count', operator: 'gte', value: 2 },
        ],
      }),
      isEnabled: true,
    },
    // #9 부정적 후속 반응 (3.5)
    {
      name: '부정적 후속 반응',
      description: '응답 직후 사용자가 부정적 반응을 보인 경우 (세션 기반)',
      type: 'next_user_input',
      config: JSON.stringify({
        field: 'next_user_input',
        operator: 'contains_any',
        value: ['아니', '틀렸', '잘못', '다시', 'wrong', '제대로'],
      }),
      isEnabled: true,
    },
  ];

  for (const rule of problematicRules) {
    const existing = await prisma.problematicChatRule.findUnique({
      where: { name: rule.name },
    });

    if (!existing) {
      await prisma.problematicChatRule.create({ data: rule });
      console.log(`  ✅ Created rule: "${rule.name}"`);
    } else {
      console.log(`  ⏭️ Rule already exists: "${rule.name}"`);
    }
  }
  console.log(`✅ Processed ${problematicRules.length} problematic chat rules`);

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
