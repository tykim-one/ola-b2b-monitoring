# 리팩토링 실행 프롬프트

> 아래 프롬프트를 다음 Claude Code 세션에 그대로 복사하여 전달하세요.

---

## 프롬프트 시작

다음 계획서를 읽고, Phase 1부터 Phase 4까지 빠짐없이 모두 실행해줘. 계획서 경로: `.sisyphus/plans/data-fetching-table-refactoring.md`

### 프로젝트 컨텍스트

- **프로젝트**: OLA B2B Monitoring - Next.js 16 + React 19 + TanStack React Query v5 모노레포
- **프론트엔드 경로**: `apps/frontend-next/`
- **브랜치**: `dev`
- **빌드 명령**: `pnpm build:frontend-next`

### 실행 규칙

1. **계획서를 먼저 읽어라**: `.sisyphus/plans/data-fetching-table-refactoring.md`를 처음부터 끝까지 읽고 전체 범위를 파악한 후 작업을 시작해라
2. **Phase 순서를 지켜라**: Phase 1 → Phase 2 → Phase 3 → Phase 4 순서로 진행. 의존성 그래프에 따라 병렬 가능한 작업은 병렬로 실행해도 된다
3. **각 Phase 완료 후 빌드 검증**: 각 Phase가 끝날 때마다 `pnpm build:frontend-next`를 실행하여 타입 오류가 없는지 확인해라
4. **BEFORE/AFTER 코드를 정확히 따라라**: 계획서에 명시된 BEFORE(현재 패턴)과 AFTER(목표 패턴) 코드를 기준으로 변환해라. 단, 실제 코드를 먼저 읽고 계획서의 스니펫과 차이가 있으면 실제 코드를 기준으로 해라
5. **커밋 전략을 따라라**: 계획서 하단의 커밋 전략에 따라 5개 커밋을 생성해라. 각 커밋은 빌드가 성공하는 상태여야 한다
6. **Momus 검토 반영 사항을 빠뜨리지 마라**: 계획서에 "Momus 검토 반영"으로 표기된 부분들은 원래 계획의 오류를 수정한 것이므로 반드시 해당 내용을 따라라

### 핵심 주의사항 (계획서에서 발견된 위험 요소)

1. **MetricsSidePanel의 `projectId`**: 기존 MetricsContext는 projectId 없이 API를 호출했지만, `useRealtimeKPI` 등은 projectId가 필수다. 소비처(`analysis/page.tsx`)를 읽어서 어떤 projectId를 사용하는지 확인한 후 props로 전달해라
2. **`useTenantUsage`에 `limit` 없음**: 기존 코드는 `?limit=5`로 상위 5개만 가져왔다. 훅은 limit을 지원하지 않으므로 반드시 `.slice(0, 5)`를 적용해라
3. **ProblematicChatTable의 `getRuleColor`**: `rules` 배열에 의존하는 클로저 함수다. `isCompoundConfig`, `getFieldDefinition`을 `@ola/shared-types`에서 import해야 한다
4. **UserActivityDialog 소비처 2곳**: `user-analytics/page.tsx`와 `user-analytics/[userId]/page.tsx` 두 곳에서 사용된다
5. **정렬 동작 차이**: 기존 테이블은 2-state(asc/desc), DataTable은 3-state(asc/desc/none). 이 차이는 의도적으로 수용한다
6. **Server Action + useMutation**: `geminiService`의 `analyzeLogs`는 `"use server"` Server Action이다. useMutation으로 래핑 시 빌드 경고가 나면 별도 래퍼 함수로 분리해라

### 작업 목록 (체크리스트)

Phase 1: React Query 훅 생성 및 데이터 패칭 마이그레이션
- [ ] 1.1 `hooks/queries/use-faq-analysis.ts` 신규 생성 (useFAQTenants query + useRunFAQAnalysis mutation)
- [ ] 1.2 `hooks/queries/use-session-analysis.ts` 신규 생성 (useSessionTimeline query + useAnalyzeSessionWithLLM mutation)
- [ ] 1.3 `hooks/queries/use-log-analysis.ts` 신규 생성 (useAnalyzeLogsWithGemini mutation)
- [ ] 1.4 `hooks/queries/use-user-analytics.ts`에 `useUserActivity` 훅 추가
- [ ] 1.5 `hooks/queries/index.ts` 중앙 허브에 신규 export 추가
- [ ] 1.6 `MetricsContext.tsx` → `MetricsSidePanel.tsx` 리네이밍 + 기존 훅 3개로 교체 + `.slice(0,5)` 적용 + `analysis/page.tsx` import 업데이트
- [ ] 1.7 `UserActivityDialog.tsx` 내부 fetch를 `useUserActivity` 훅으로 교체
- [ ] 1.8 `FAQAnalysisSection.tsx` 내부 fetch를 `useFAQTenants` + `useRunFAQAnalysis` 훅으로 교체
- [ ] 1.9 `SessionTimelineModal.tsx` 내부 fetch를 `useSessionTimeline` + `useAnalyzeSessionWithLLM` 훅으로 교체
- [ ] 1.10 `LogExplorer.tsx` 내부 `analyzeLogs`를 `useAnalyzeLogsWithGemini` mutation으로 교체
- [ ] 커밋 1: `feat: React Query 훅 신규 생성 (faq-analysis, session-analysis, log-analysis)`
- [ ] 커밋 2: `refactor: 5개 컴포넌트의 데이터 패칭을 React Query 훅으로 마이그레이션`

Phase 2: Compound DataTable 확장
- [ ] 2.1 `compound/DataTable/index.tsx`에 Expandable Row 기능 추가 (Context 확장 + Body 확장 + Header 업데이트)
- [ ] 2.2 `DataTable.Stats`, `DataTable.StatItem` 서브컴포넌트 추가
- [ ] 기존 DataTable 소비처 회귀 테스트 (빌드 성공 확인)
- [ ] 커밋 3: `feat: Compound DataTable에 Expandable Row 및 Stats 기능 추가`

Phase 3: 독립 테이블 마이그레이션
- [ ] 3.1 `ProblematicChatTable` → DataTable 마이그레이션 (`user-analytics/page.tsx`에서 교체, `getRuleColor` 헬퍼 포함)
- [ ] 3.2 `UserListTable` → DataTable 마이그레이션 (`user-analytics/page.tsx`에서 교체, 9개 컬럼 전부 포함)
- [ ] 3.3 `RepeatedQueriesTable` → DataTable 마이그레이션 (`quality/page.tsx`에서 교체, expandable row 사용, 커스텀 footer 메시지 포함)
- [ ] 3.4 `UserPatternsTable` → DataTable 마이그레이션 (`user-analytics/page.tsx`에서 교체, expandable row 사용)
- [ ] 커밋 4: `refactor: 4개 독립 테이블을 Compound DataTable로 마이그레이션`

Phase 4: 정리 및 검증
- [ ] 4.1 4개 독립 테이블 파일 삭제 (ProblematicChatTable, UserListTable, RepeatedQueriesTable, UserPatternsTable)
- [ ] 4.1 삭제 전 grep으로 import 잔여 확인
- [ ] 4.2 `pnpm build:frontend-next` 최종 빌드 검증
- [ ] 커밋 5: `chore: 사용하지 않는 독립 테이블 컴포넌트 삭제 및 빌드 검증`

### 수락 기준

1. `hooks/queries/` 디렉토리에 모든 데이터 패칭 훅이 집중되어 있을 것
2. 5개 대상 컴포넌트에서 `useEffect` + `fetch()` 패턴이 완전히 제거될 것
3. MetricsContext.tsx가 MetricsSidePanel.tsx로 리네이밍되고 훅 기반으로 동작할 것
4. Compound DataTable이 Expandable Row를 지원할 것
5. 4개 독립 테이블이 Compound DataTable로 대체되고 기존 파일이 삭제될 것
6. `pnpm build:frontend-next` 빌드가 성공할 것
7. 모든 기존 핵심 기능(데이터 표시, 검색, 페이지네이션, 확장 행, 상세 보기)이 동일하게 동작할 것. 정렬 동작은 DataTable의 3-state 패턴(asc -> desc -> none)을 따르되 기능적 퇴화 없을 것
8. 기존 쿼리 키 컨벤션(`{ all, lists, detail }` 패턴)을 준수할 것
9. DataTable Expandable Row 추가가 기존 DataTable 소비처에 회귀를 발생시키지 않을 것

모든 Phase를 완료하고 수락 기준 9개를 모두 충족할 때까지 작업을 멈추지 마라.
