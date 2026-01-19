<!-- Parent: ../AGENTS.md -->
# Prisma Directory

## Purpose
Prisma 스키마, 마이그레이션, 시드 스크립트.

## Key Files
- `schema.prisma` - 데이터베이스 스키마 정의
- `seed.ts` - 기본 역할/권한/관리자 계정/프롬프트 템플릿/스케줄러 설정 생성
- `admin.db` - SQLite 데이터베이스 파일

## Key Models
| Model | Description |
|-------|-------------|
| `User`, `Role`, `Permission` | 인증/권한 관리 |
| `BatchAnalysisJob` | 배치 분석 작업 |
| `BatchAnalysisResult` | 분석 결과 (파싱된 점수 포함) |
| `AnalysisPromptTemplate` | 분석 프롬프트 템플릿 |
| `BatchSchedulerConfig` | 스케줄러 설정 |

### BatchAnalysisResult 파싱 필드
`qualityScore`, `relevance`, `completeness`, `clarity` (점수)
`sentiment`, `summaryText` (메타)
`issues`, `improvements`, `missingData` (JSON 배열)
`issueCount`, `avgScore` (집계용)

## Subdirectories
- `migrations/` - Prisma 마이그레이션 히스토리

## For AI Agents
- `npx prisma migrate dev` - 마이그레이션 실행
- `npx prisma db seed` - 시드 실행
- `npx prisma studio` - DB 브라우저 실행
- ID는 UUID 문자열 (number 아님)
