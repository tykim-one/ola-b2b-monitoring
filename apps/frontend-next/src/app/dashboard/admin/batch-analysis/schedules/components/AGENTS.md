<!-- Parent: ../AGENTS.md -->

# Schedule Components

배치 분석 스케줄 관련 UI 컴포넌트 모음입니다.

## Purpose

스케줄 생성/수정 폼 모달 및 관련 UI 컴포넌트를 제공합니다.

## Key Components

### ScheduleFormModal.tsx

스케줄 생성 및 수정을 위한 모달 폼 컴포넌트입니다.

**Props:**
```typescript
interface ScheduleFormModalProps {
  schedule: BatchSchedulerConfig | null;  // null이면 생성 모드
  templates: AnalysisPromptTemplate[];    // 프롬프트 템플릿 목록
  tenants: TenantInfo[];                  // 테넌트 목록
  onClose: () => void;
  onSuccess: (schedule: BatchSchedulerConfig) => void;
}
```

**Features:**
- 스케줄 이름 입력 (필수)
- 활성화/비활성화 토글
- 실행 시간 선택 (시: 0-23, 분: 0-59)
- 요일 선택 버튼 (월~일)
- 대상 테넌트 드롭다운 (전체 또는 특정 테넌트)
- 샘플 크기 입력 (10-500)
- 프롬프트 템플릿 드롭다운 (기본 템플릿 또는 커스텀)

**Validation:**
- 최소 1개 이상의 요일 선택 필수
- 샘플 크기 범위 체크 (10-500)
- 스케줄 이름 필수

**UI/UX:**
- 다크 테마 (slate-900, violet 강조색)
- 로딩 상태 표시
- 에러 메시지 표시
- 백드롭 클릭으로 닫기
- ESC 키로 닫기 (X 버튼)

## For AI Agents

- 생성 모드: `schedule` prop이 null
- 수정 모드: `schedule` prop에 기존 데이터 전달
- 요일 선택은 버튼 토글 방식 (체크박스 아님)
- 제출 시 API 호출 후 `onSuccess` 콜백 호출
- `daysOfWeek`는 "1,2,3,4,5" 형태의 문자열로 변환
