<!-- Parent: ../AGENTS.md -->

# Log Filtering Feature

로그 필터링 기능 모듈입니다.

## Purpose

B2B 로그 데이터의 다양한 필터링 기능을 제공합니다.

## Current Status

현재 디렉토리는 비어있으며, 향후 로그 필터링 기능 구현 시 사용될 예정입니다.

## Planned Structure

```
log-filtering/
├── ui/
│   ├── FilterBar.tsx           # 필터 바 컴포넌트
│   ├── FilterChips.tsx         # 선택된 필터 칩
│   └── DateRangePicker.tsx     # 날짜 범위 선택기
├── model/
│   ├── filterStore.ts          # Zustand 필터 상태 관리
│   ├── filterSchema.ts         # Zod 필터 스키마
│   └── types.ts                # 필터 타입 정의
└── lib/
    └── filterUtils.ts          # 필터 유틸리티 함수
```

## Expected Features

- **날짜 범위 필터**: 시작일/종료일 선택
- **테넌트 필터**: 특정 테넌트 선택
- **성공/실패 필터**: success 필드 기반 필터링
- **토큰 범위 필터**: input/output/total 토큰 범위
- **심각도 필터**: INFO/WARN/ERROR 레벨
- **키워드 검색**: user_input, llm_response 전문 검색

## Expected State Management

```typescript
// 예상되는 필터 상태 구조
interface LogFilter {
  dateRange: { start: Date; end: Date };
  tenantIds: string[];
  success?: boolean;
  severities: string[];
  tokenRange?: { min: number; max: number };
  keyword?: string;
}
```

## Integration Points

- `log` 엔티티와 연동
- `log-viewer` 페이지에서 사용
- URL 쿼리 파라미터로 필터 상태 동기화 (선택)

## For AI Agents

- 이 기능은 아직 구현되지 않은 FSD 레이어 스켈레톤입니다
- 로그 뷰어 페이지에 필터 기능 추가 시 이 디렉토리에 구현하세요
- BigQuery 쿼리 파라미터 생성 로직 포함 필요
- 필터 상태는 Zustand로 관리 권장
