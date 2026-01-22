<!-- Parent: ../AGENTS.md -->

# docs/ - 프로젝트 문서

## Purpose

OLA B2B Monitoring 프로젝트의 공식 문서 폴더입니다. 개발자, 기획자, 영업사원 등 다양한 대상을 위한 종합 문서를 제공합니다.

## Key Files

| 파일 | 대상 | 설명 |
|------|------|------|
| `README.md` | 모든 사람 | 문서 허브, 목차 및 Quick Start |
| `01-overview.md` | 비개발자 포함 | 프로젝트 소개, 시스템 구성, 가치 제안 |
| `02-features.md` | 기획자/영업 | 화면별 기능 상세 사용 가이드 |
| `03-architecture.md` | 개발자 | 모노레포 구조, 백엔드/프론트엔드 아키텍처 |
| `04-api-reference.md` | 개발자 | REST API 명세 (70+ 엔드포인트) |
| `05-database-schema.md` | 개발자 | Prisma/BigQuery 스키마, 공유 타입 |
| `06-data-flow.md` | 기획자/개발자 | 데이터 흐름 다이어그램 |
| `07-glossary.md` | 모든 사람 | 비즈니스/기술 용어 사전 |

### 기존 문서 (참고용)
- `BACKEND_IMPLEMENTATION.md` - 백엔드 구현 상세 문서
- `FRONTEND_IMPLEMENTATION.md` - 프론트엔드 구현 상세 문서
- `USAGE_GUIDE.md` - 시스템 사용 가이드
- `dashboard-metrics.md` - 대시보드 메트릭 정의 문서

## Subdirectories

- `guides/` - 기능별 상세 사용 가이드 (see guides/AGENTS.md)
- `plans/` - 기능 계획 및 설계 문서 (see plans/AGENTS.md)
- `learning/` - 학습 자료 및 설계 패턴 문서
- `wind/` - Wind ETL 관련 설계/구현 문서

## For AI Agents

### 문서 수정 시 주의사항
- 문서 간 상호 참조 링크가 많으므로 파일명 변경 시 모든 링크 업데이트 필요
- 마크다운 테이블 형식 유지
- 다이어그램은 ASCII 아트로 작성 (Mermaid 미사용)

### 문서 추가 시
- README.md의 목차 테이블 업데이트 필수
- 대상별 추천 문서 섹션도 필요시 업데이트
- 관련 문서 섹션에 상호 링크 추가

### 대상별 문서 분류
- **비개발자**: 01-overview, 02-features, 07-glossary
- **기획자**: 01-overview, 02-features, 06-data-flow
- **개발자**: 03-architecture, 04-api-reference, 05-database-schema
