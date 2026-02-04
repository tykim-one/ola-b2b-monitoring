# UI 컴포넌트 명세 및 중복 분석 보고서

> 생성일: 2026-02-04 | 대상: apps/frontend-next/src/

---

## 1. 공유 컴포넌트 현황 (이미 존재하는 추상화)

### UI 프리미티브 (`components/ui/`)
| 컴포넌트 | Props | 용도 | 실제 사용률 |
|----------|-------|------|------------|
| `Modal` | isOpen, onClose, title, size | 범용 모달 | ⚠️ **1곳만 사용** (QueryResponseScatterPlot) |
| `ConfirmDialog` | isOpen, onConfirm, variant, isLoading | 삭제 확인 | ✅ Admin 페이지 5곳 |
| `SearchInput` | value, onChange, placeholder | 검색 입력 | ⚠️ **Admin 3곳만** (나머지 인라인 구현) |
| `DateRangeFilter` | defaultPreset, onChange | 기간 선택 | ✅ 대시보드 6곳 |

### Compound 컴포넌트 (`components/compound/`)
| 컴포넌트 | 서브 컴포넌트 | 용도 | 실제 사용률 |
|----------|-------------|------|------------|
| `Dashboard` | Header, KPISection, ChartsSection, TableSection, Skeleton, Error, Empty, Content | 대시보드 레이아웃 | ⚠️ **2곳만** (Business, Chatbot Quality) |
| `Chart` | Legend, Metric, Loading, NoData, Wrapper | Recharts 래퍼 | ❌ **0곳 사용** |
| `DataTable` | Toolbar, Search, Content, Header, Body, Footer | 정렬/검색 테이블 | ⚠️ **2곳만** (Business, Chatbot Quality) |

### 도메인 컴포넌트
| 컴포넌트 | 용도 | 사용 페이지 |
|----------|------|------------|
| `KPICard` | KPI 메트릭 카드 | ✅ 8개 대시보드 페이지 |
| `MarkdownViewer` | Markdown 렌더링 | ✅ 4곳 (2개 채팅 시스템 + ScatterPlot + BatchAnalysis) |

---

## 2. 페이지별 컴포넌트 사용 맵

### 대시보드 페이지

| 페이지 | 공유 컴포넌트 | 인라인 구현 패턴 |
|--------|-------------|----------------|
| **Business** | Dashboard✅, DataTable✅, KPICard, TenantPie, CostTrend, Heatmap, DateRange | (없음 - 모범 사례) |
| **Operations** | KPICard, RealtimeTraffic, ErrorGauge, DateRange | 로딩/에러 상태, 시스템 상태 카드 |
| **Quality** | KPICard, TokenEfficiency, ScatterPlot, RepeatedQueries, FAQSection, DateRange | 로딩/에러 상태 |
| **Chatbot Quality** | Dashboard✅, DataTable✅, KPICard, DateRange | 인라인 Badge 컴포넌트 |
| **AI Performance** | KPICard, TokenScatter, DateRange | 인라인 HTML 테이블, 로딩/에러 상태 |
| **User Analytics** | KPICard, UserList, UserActivity, UserPatterns, ProblematicChat×2, DateRange | 인라인 탭 네비게이션, 필터 칩 |
| **User Detail** | UserProfile, Sentiment, CategoryDist, UserActivity | 인라인 로딩, 뒤로가기, 기간 선택 |
| **Report Monitoring** | KPICard | 인라인 테이블, 상태 배지, 접기/펼치기, 태그 칩 |
| **Analysis** | SessionList, ChatInterface, MetricsContext | (없음 - 도메인 컴포넌트에 위임) |

### Admin 페이지

| 페이지 | 공유 컴포넌트 | 인라인 구현 패턴 |
|--------|-------------|----------------|
| **Users** | SearchInput, ConfirmDialog, UserFormModal | 인라인 테이블, 아바타, 역할 배지, Stats 푸터 |
| **Roles** | SearchInput, ConfirmDialog, RoleFormModal | 인라인 카드 그리드, 권한 배지, Stats 푸터 |
| **Filters** | SearchInput, ConfirmDialog, FilterFormModal | 인라인 카드 그리드, Stats 푸터 |
| **Analysis Sessions** | SearchInput, ConfirmDialog, NewSessionModal | 인라인 카드 그리드, Stats 푸터 |
| **Analysis Chat** | MarkdownViewer | 인라인 채팅 UI (버블, 입력폼, 타이핑 인디케이터) |
| **Batch Analysis** | ChatQualityTab, FAQTab, SessionTab | 인라인 탭 네비게이션 |
| **Job Detail** | MarkdownViewer | 인라인 점수 카드, 필터 패널, 아코디언 |
| **Prompts** | ConfirmDialog | 인라인 폼, 코드 프리뷰 |
| **Schedules** | ConfirmDialog, ScheduleFormModal | 인라인 테이블, 토글 스위치, Stats 푸터 |
| **Issue Frequency** | (Recharts 직접 사용) | 인라인 필터바, 아코디언, 통계 카드 |
| **FAQ Detail** | (없음) | 전체 인라인 (통계 카드, 아코디언, 상태 아이콘) |
| **Problematic Rules** | (없음) | **전체 인라인 (1127줄)** - 커스텀 모달, 토글, 규칙 빌더 |

### ETL 페이지

| 페이지 | 공유 컴포넌트 | 인라인 구현 패턴 |
|--------|-------------|----------------|
| **Minkabu ETL** | KPICard, DateRange, chart-theme | 인라인 Recharts, 인라인 테이블, 상태 배지 |
| **Wind ETL** | KPICard, DateRange, chart-theme | Minkabu와 **거의 동일한 구조** |

---

## 3. 🔴 Critical: 중복 컴포넌트 그룹

### 그룹 A: 채팅 시스템 이중화
```
analysis/MessageBubble  ≈  chatbot/ChatMessage     (메시지 버블)
analysis/ChatInterface  ≈  chatbot/ChatWindow       (채팅 UI)
analysis/ChatInterface  ≈  chatbot/ChatInput         (입력 컴포넌트)
admin/analysis/[id]     ≈  위 두 시스템과 유사       (인라인 채팅 UI)
```
**영향**: 3곳에서 동일한 채팅 UI를 독립 구현. MarkdownViewer만 공유.

### 그룹 B: 테이블 5중 구현
```
DataTable (compound)     -- 존재하지만 2곳에서만 사용
UserListTable            -- 자체 정렬/검색/페이지네이션
UserPatternsTable        -- 자체 정렬/검색/펼치기
RepeatedQueriesTable     -- 자체 정렬/펼치기
ProblematicChatTable     -- 자체 정렬
+ Admin 페이지 인라인 <table> × 5곳
```
**영향**: 정렬, 필터, 페이지네이션 로직이 10곳에서 중복 구현.

### 그룹 C: 모달 4중 구현
```
Modal (ui/)              -- 존재하지만 1곳에서만 사용
UserActivityDialog       -- 자체 모달 오버레이
SessionTimelineModal     -- 자체 모달 오버레이
ProblematicChatDialog    -- 자체 모달 오버레이
ProblematicRules page    -- 자체 모달 오버레이
```
**영향**: 각각 다른 backdrop, border-radius, 애니메이션 사용 → 불일관한 UX.

### 그룹 D: 인라인 UI 패턴 반복
| 패턴 | 등장 횟수 | 현재 상태 |
|------|----------|----------|
| 로딩 상태 (스피너/텍스트) | 15+ 페이지 | 페이지마다 다른 구현 |
| 에러 Alert (rose bg) | 12+ 페이지 | 동일 마크업 반복 |
| 페이지 헤더 (제목+액션) | 15+ 페이지 | 동일 구조 반복 |
| Stats 푸터 (3열 숫자) | 6 Admin 페이지 | 동일 구조 반복 |
| 상태 배지 (색상 span) | 5+ 페이지 | 각각 함수 정의 |
| 탭 네비게이션 | 2-3 페이지 | 각각 다른 구현 |
| 뒤로가기 버튼 | 7+ 페이지 | 각각 구현 |
| 토글 스위치 | 2 페이지 | 각각 다른 구현 |
| 아코디언/펼치기 | 4+ 페이지 | 각각 구현 |

### 그룹 E: 유틸리티 함수 중복
```
formatDate()      → 8+ 파일에서 독립 정의
formatNumber()    → 6+ 파일에서 독립 정의
truncateText()    → 5+ 파일에서 독립 정의
formatTokens()    → 4+ 파일에서 독립 정의
COLORS 배열       → TenantPieChart, UserTokensPieChart, CategoryDistribution 각각 정의
```

---

## 4. 🟡 구조적 비일관성

### Dashboard Compound 미사용 페이지 (12개)
Operations, Quality, AI Performance, User Analytics, User Detail, Report Monitoring, Analysis, Minkabu ETL, Wind ETL, + 모든 Admin 페이지

→ 각 페이지가 `useEffect + fetch + useState` 보일러플레이트를 반복

### ETL 페이지 중복
Minkabu와 Wind ETL 페이지가 **구조적으로 동일** (헤더, KPI, 차트 2개, 테이블, 에러 분석, 시스템 상태)
→ 파라미터화된 `ETLMonitoringPage` 컴포넌트로 통합 가능

### Chart Compound 완전 미사용
12개 차트 컴포넌트 모두 자체 white card + ResponsiveContainer 래퍼 구현
→ Chart compound가 제공하는 Loading, NoData, Legend 기능 활용 안 됨

---

## 5. 🟢 통합 우선순위 권장

### Phase 1: Low Risk, High Impact (유틸리티 + 프리미티브)
1. **`utils/format.ts` 추출** - formatDate, formatNumber, truncateText 등 공통 함수 → 8+ 파일 정리
2. **`ui/Badge` 컴포넌트** 추출 - 상태 배지, 역할 배지, 감정 배지 통합
3. **`ui/PageHeader` 컴포넌트** 추출 - 제목 + 부제목 + 우측 액션 패턴
4. **`ui/LoadingSpinner` 컴포넌트** 추출 - 통일된 로딩 인디케이터
5. **`ui/ErrorAlert` 컴포넌트** 추출 - rose bg 에러 표시 패턴
6. **`COLORS` 팔레트 통합** - Chart compound의 palette 활용

### Phase 2: Medium Risk, High Impact (모달 + 테이블)
7. **Modal 컴포넌트 확장** - footer prop, size='full' 추가 → 4개 커스텀 모달 마이그레이션
8. **DataTable에 pagination 추가** → UserListTable, ProblematicChatTable 마이그레이션
9. **`ui/TabBar` 컴포넌트** 추출 → User Analytics, Batch Analysis 탭 통합
10. **`ui/Accordion` 컴포넌트** 추출 → Job Detail, FAQ Detail, Report Monitoring 통합

### Phase 3: Medium Risk, Architecture Impact (레이아웃)
11. **Admin CRUD 패턴 추출** - `AdminPageLayout` 또는 `useAdminCRUD` hook
12. **ETL 페이지 통합** - `ETLMonitoringPage` 파라미터화 컴포넌트
13. **Dashboard compound 마이그레이션** - Operations, Quality 등 미사용 페이지

### Phase 4: High Risk, High Impact (도메인 통합)
14. **채팅 메시지 버블 통합** - `ChatBubble` 공통 인터페이스 + 타입 어댑터
15. **채팅 입력 통합** - `ChatInput` 공유 (이미 chatbot/에 존재)
16. **Chart compound 마이그레이션** - 12개 차트를 Chart 래퍼로 전환

---

## 6. 예상 효과

| 지표 | 현재 | 통합 후 (예상) |
|------|------|---------------|
| 중복 테이블 구현 | 10곳 | 1 (DataTable) |
| 중복 모달 구현 | 5곳 | 1 (Modal) |
| 중복 채팅 버블 | 3곳 | 1 (ChatBubble) |
| 중복 유틸 함수 | 30+ 정의 | 1 (utils/format.ts) |
| 인라인 로딩/에러 | 15+ 곳 | 0 (공유 컴포넌트) |
| 총 제거 가능 코드 | - | ~2000-3000줄 |
