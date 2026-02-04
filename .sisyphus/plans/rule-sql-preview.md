# 규칙 SQL 쿼리 미리보기 기능

> **목표**: 규칙 관리 페이지에서 각 규칙의 전체 BigQuery SQL 쿼리를 확인할 수 있게 함
> **작성일**: 2026-02-04
> **상태**: 계획 완료, 구현 대기

---

## 요구사항 요약

- **위치**: `/dashboard/admin/problematic-rules` 규칙 관리 페이지의 규칙별 상세 다이얼로그
- **SQL 수준**: 전체 쿼리 (SELECT, FROM, WHERE, ORDER BY 등 실행 가능한 완전한 SQL)
- **UI 패턴**: 접이식 (기본 숨김, 클릭 시 펼침) + SQL 복사 버튼

---

## 수용 기준

1. 규칙 테이블에서 각 규칙의 "상세 보기" 버튼(Eye 아이콘)을 클릭하면 상세 다이얼로그가 열림
2. 다이얼로그에 규칙 메타정보(이름, 설명, 활성 상태, 조건 요약) 표시
3. "SQL 쿼리 미리보기" 접이식 섹션이 있으며, 펼치면 해당 규칙이 적용된 전체 BigQuery SQL 표시
4. SQL 복사 버튼으로 클립보드 복사 가능
5. 복합 규칙(compound)과 단순 규칙 모두 올바른 SQL 생성
6. CTE가 필요한 규칙(next_user_input)은 CTE 포함된 전체 쿼리 표시

---

## 구현 계획

### Task 1: 백엔드 - 규칙별 SQL 미리보기 API 추가

**파일**: `apps/backend/src/problematic-chat/problematic-chat.service.ts`

**변경사항**:
- `generateRulePreviewQuery(ruleId: string, days?: number): string` 메서드 추가
- 기존 `buildWhereConditions()`, `buildProblematicChatsQuery()` 로직을 활용
- 단일 규칙의 config로 WHERE 절 생성 → 전체 쿼리 문자열 반환
- CTE 필요 여부도 자동 판단 (`rulesNeedCTE()` 활용)

**파일**: `apps/backend/src/problematic-chat/problematic-chat.controller.ts`

**변경사항**:
- `GET /api/problematic-chat/rules/:id/preview-query?days=7` 엔드포인트 추가
- 응답: `{ success: true, data: { query: string, needsCTE: boolean } }`

### Task 2: 프론트엔드 - API 서비스 함수 추가

**파일**: `apps/frontend-next/src/services/problematicChatService.ts`

**변경사항**:
- `fetchRulePreviewQuery(ruleId: string, days?: number): Promise<{ query: string; needsCTE: boolean }>` 추가

### Task 3: 프론트엔드 - 규칙 상세 다이얼로그 컴포넌트 생성

**파일**: `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` (기존 파일 내 또는 별도 컴포넌트)

**변경사항**:
- 테이블 액션 열에 "상세 보기" 버튼(Eye 아이콘) 추가 (편집/삭제 옆)
- `RuleDetailDialog` 다이얼로그 추가:
  - 규칙 메타정보: 이름, 설명, 활성 상태, 생성/수정 날짜
  - 조건 요약: 단순 규칙은 "필드 연산자 값", 복합 규칙은 조건 목록
  - **접이식 SQL 미리보기 섹션**:
    - `<ChevronDown>` 아이콘 + "SQL 쿼리 미리보기" 텍스트
    - 펼치면 `<pre><code>` 블록에 SQL 표시 (monospace, 다크 배경)
    - 오른쪽 상단 "복사" 버튼
    - 로딩 상태 표시 (API 호출 중)
  - CTE 사용 시 안내 배지: "이 규칙은 윈도우 함수(LEAD)를 사용합니다"

### Task 4: 빌드 검증

- `pnpm build` 전체 빌드 통과 확인
- 타입 에러 수정

---

## 기술 세부사항

### SQL 생성 로직 (백엔드)

기존 `buildProblematicChatsQuery()` 메서드의 로직을 재사용:

```typescript
generateRulePreviewQuery(ruleId: string, days: number = 7): string {
  // 1. 규칙 조회
  const rule = await this.getRuleById(ruleId);

  // 2. 단일 규칙의 WHERE 절 생성
  const condition = isCompoundConfig(rule.config)
    ? this.buildCompoundCondition(rule.config)
    : this.buildSingleCondition(rule.config);

  // 3. CTE 필요 여부
  const needsCTE = this.rulesNeedCTE([rule]);

  // 4. 전체 쿼리 조립
  return this.buildProblematicChatsQuery(
    condition ? [condition] : [],
    days,
    100,  // default limit
    0,    // default offset
    undefined, undefined,
    needsCTE
  );
}
```

### 프론트엔드 접이식 패턴

```tsx
const [showSQL, setShowSQL] = useState(false);
const [sqlQuery, setSqlQuery] = useState<string | null>(null);
const [sqlLoading, setSqlLoading] = useState(false);

const handleToggleSQL = async () => {
  if (!showSQL && !sqlQuery) {
    // 처음 펼칠 때만 API 호출 (lazy loading)
    setSqlLoading(true);
    const result = await fetchRulePreviewQuery(rule.id);
    setSqlQuery(result.query);
    setSqlLoading(false);
  }
  setShowSQL(!showSQL);
};
```

---

## 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 프로덕션 테이블명 노출 | 보안 | API에 @Permissions('rules:read') 가드 적용 |
| SQL 생성 실패 (잘못된 config) | UX | try-catch로 에러 핸들링, "SQL 생성 불가" 메시지 표시 |
| 레거시 규칙 (v0 config) | 호환성 | migrateConfig()로 먼저 변환 후 SQL 생성 |

---

## 수정 파일 목록

| 파일 | 변경 유형 |
|------|----------|
| `apps/backend/src/problematic-chat/problematic-chat.service.ts` | 메서드 추가 |
| `apps/backend/src/problematic-chat/problematic-chat.controller.ts` | 엔드포인트 추가 |
| `apps/frontend-next/src/services/problematicChatService.ts` | API 함수 추가 |
| `apps/frontend-next/src/app/dashboard/admin/problematic-rules/page.tsx` | 상세 다이얼로그 + Eye 버튼 |
