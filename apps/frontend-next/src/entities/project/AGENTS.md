<!-- Parent: ../AGENTS.md -->

# Project Entity

프로젝트(멀티 프로젝트) 엔티티입니다.

## Purpose

멀티 프로젝트 지원을 위한 도메인 엔티티 정의를 제공합니다.

## Current Status

현재 디렉토리는 비어있으며, 향후 멀티 프로젝트 기능 구현 시 사용될 예정입니다.

## Planned Structure

```
project/
├── model/
│   ├── index.ts          # Project 타입, 인터페이스
│   └── schemas.ts        # Zod 스키마
└── api/
    └── projectApi.ts     # 프로젝트 API 클라이언트
```

## Expected Types

```typescript
// 예상되는 타입 구조
interface Project {
  id: string;
  name: string;
  datasourceType: 'bigquery' | 'mysql' | 'mongodb';
  config: DataSourceConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Related Components

- 현재 API는 `/projects/:projectId/api/*` 패턴을 사용하여 프로젝트별 라우팅 지원
- 백엔드의 DataSource 추상화 레이어와 연동

## For AI Agents

- 이 엔티티는 아직 구현되지 않은 FSD 레이어 스켈레톤입니다
- 멀티 프로젝트 기능 구현 시 이 디렉토리에 타입과 API 클라이언트를 추가하세요
- 기존 코드의 `:projectId` 파라미터와 호환되도록 설계하세요
