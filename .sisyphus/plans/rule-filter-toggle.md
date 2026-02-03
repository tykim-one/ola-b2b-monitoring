# 계획: User Analytics 문제 채팅 탭 - 규칙 필터 토글 기능

## 요구사항 요약

User Analytics 페이지의 "문제 채팅" 탭에서 관리자가 활성화한 Problematic Rules을 유저가 개별적으로 on/off 할 수 있도록 토글 칩/뱃지 UI를 추가한다.

### 수용 기준
- 관리자가 활성화(`isEnabled=true`)한 규칙만 토글 칩으로 표시
- 페이지 진입 시 모든 칩이 ON 상태 (현재 동작과 동일한 시작점)
- 칩 클릭으로 개별 규칙 on/off 토글
- 선택된 규칙의 ruleIds만 백엔드 API에 전달하여 필터링
- KPI 통계도 선택된 규칙 기준으로 갱신
- "문제 채팅" 탭에만 적용 (유저 목록 탭 영향 없음)

## 아키텍처 분석

### 현재 데이터 흐름
```
page.tsx → fetchProblematicChats({ days }) → Backend → BigQuery (모든 활성 규칙 적용)
page.tsx → fetchProblematicChatStats(days) → Backend → BigQuery (모든 활성 규칙)
```

### 변경 후 데이터 흐름
```
page.tsx → fetchProblematicChats({ days, ruleIds: [...선택된 규칙] }) → Backend → BigQuery (선택된 규칙만)
page.tsx → fetchProblematicChatStats(days, undefined, selectedRuleIds) → Backend → BigQuery (선택된 규칙만)
```

**핵심 발견**: `fetchProblematicChats`의 `ProblematicChatFilter`에 이미 `ruleIds` 필드가 존재하고, 백엔드도 `ruleIds` 파라미터를 처리하는 로직이 이미 구현되어 있음. 프론트엔드에서 ruleIds를 전달하기만 하면 됨.

## 구현 계획

### Step 1: 규칙 토글 상태 관리 추가 (page.tsx)

**파일**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

- `selectedRuleIds` state 추가 (Set<string> 또는 string[])
- `rules` 로드 완료 시 활성화된 규칙 전체를 selectedRuleIds에 세팅
- `fetchProblematicChats` 호출 시 `ruleIds: selectedRuleIds` 파라미터 전달
- `fetchProblematicChatStats` 호출 시에도 선택된 규칙 기준으로 필터링 (클라이언트 사이드)
- 규칙 토글 시 데이터 재조회 (useEffect dependency에 selectedRuleIds 추가)

### Step 2: 토글 칩 UI 구현 (page.tsx 내 인라인)

**파일**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

기존 "활성화된 필터링 규칙" 섹션 (line 354-378)을 인터랙티브 토글 칩으로 교체:
- 각 칩이 클릭 가능한 버튼으로 변경
- ON 상태: 기존 색상 유지 (amber/rose/cyan by type)
- OFF 상태: `bg-slate-700 text-slate-500 opacity-50`으로 비활성 표시
- "전체 선택/해제" 버튼 추가
- 선택된 규칙 수 / 전체 규칙 수 표시

### Step 3: 통계 KPI 연동

**파일**: `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx`

- KPI 통계가 선택된 규칙의 결과만 반영하도록 클라이언트 사이드 필터링
- `problematicStats.byRule`에서 선택된 규칙만 표시
- `totalCount`도 선택된 규칙 기준으로 재계산

### Step 4: 탭 뱃지 카운트 연동

문제 채팅 탭의 뱃지 카운트도 선택된 규칙 기준으로 갱신

## 수정 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `apps/frontend-next/src/app/dashboard/user-analytics/page.tsx` | 핵심 변경 - 토글 상태, UI, API 호출 |

**단일 파일 변경**으로 완료 가능. 백엔드는 이미 `ruleIds` 파라미터를 지원하므로 변경 불필요.

## 리스크 및 완화

| 리스크 | 완화 |
|--------|------|
| 규칙 토글마다 API 재호출로 서버 부하 | 디바운스 적용 또는 토글 변경 시 짧은 지연 후 한 번만 호출 |
| 모든 규칙 OFF 시 빈 결과 | "최소 1개 규칙 선택 필요" 안내 또는 빈 결과 graceful 처리 |
| stats API가 ruleIds를 지원하지 않을 수 있음 | 클라이언트 사이드에서 byRule 필터링으로 대응 |

## 검증 계획

1. 페이지 로드 시 모든 칩 ON → 현재와 동일한 결과
2. 개별 칩 토글 → 해당 규칙 기준으로 결과 필터링
3. 전체 해제 → 빈 결과 또는 안내 메시지
4. 전체 선택 → 모든 규칙 적용
5. KPI 카드가 선택된 규칙에 맞게 갱신
6. 탭 뱃지 카운트 갱신
