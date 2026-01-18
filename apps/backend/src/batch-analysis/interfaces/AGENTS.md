<!-- Parent: ../AGENTS.md -->

# Batch Analysis Interfaces

## Purpose

배치 분석 모듈의 TypeScript 인터페이스 정의를 포함하는 디렉토리입니다. BigQuery 데이터 모델, 분석 결과 구조, 필터 옵션 등 도메인 타입을 정의합니다. 런타임 유효성 검사가 필요 없는 내부 데이터 구조에 사용됩니다.

## Key Files

### `batch-analysis.interface.ts`
배치 분석 모듈의 핵심 인터페이스를 정의합니다.

**데이터 모델:**
- `ChatSample`: BigQuery에서 가져온 채팅 샘플 데이터 (timestamp, tenant_id, session_id, user_input, llm_response, success)
- `TenantForDate`: 특정 날짜의 테넌트별 채팅 개수 정보 (tenant_id, chat_count)

**분석 결과:**
- `ChatAnalysisResult`: 개별 채팅 분석 결과 (샘플, 프롬프트, 결과, 모델명, 레이턴시, 토큰 사용량, 상태, 에러 메시지)
- 상태는 `'SUCCESS' | 'FAILED'` 리터럴 타입

**작업 관리:**
- `JobStatus`: 작업 상태 타입 (`'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'`)
- `CreateJobOptions`: 작업 생성 옵션 (targetDate, tenantId, sampleSize, promptTemplateId)

**필터링:**
- `JobFilterOptions`: 작업 목록 필터 (status, tenantId, startDate, endDate, limit, offset)
- `ResultFilterOptions`: 분석 결과 필터 (jobId, tenantId, status, limit, offset)

## For AI Agents

### Interface vs DTO 구분
- **Interface**: 내부 로직에서 사용하는 타입 정의 (런타임 체크 없음)
- **DTO**: API 요청/응답 유효성 검사용 (class-validator 데코레이터 사용)
- DTO는 문자열 날짜(`string`), Interface는 Date 객체(`Date`)를 사용하는 경우가 많음

### 데이터 흐름
1. **API 요청** → DTO 유효성 검사 → Interface로 변환
2. **BigQuery 쿼리** → `ChatSample`, `TenantForDate` 인터페이스로 매핑
3. **LLM 분석** → `ChatAnalysisResult` 인터페이스로 결과 저장
4. **API 응답** → Interface → DTO(or plain object) 직렬화

### 타입 안전성 패턴
- **리터럴 타입**: `'SUCCESS' | 'FAILED'` 등으로 허용 값 제한
- **Optional 필드**: `?`로 명시적 표시 (session_id, errorMessage 등)
- **타입 앨리어스**: `type JobStatus = ...`로 재사용 가능한 타입 정의

### 새 인터페이스 추가 시
1. 데이터 구조를 명확히 정의 (필수/선택 필드 구분)
2. 리터럴 타입으로 허용 값 제한 (상태, 타입 등)
3. JSDoc 주석으로 용도 설명
4. 관련 서비스/컨트롤러에서 import하여 사용

### BigQuery 데이터 매핑 주의사항
- `ChatSample`의 `session_id`는 `null` 가능 (BigQuery의 nullable 필드)
- `timestamp`는 BigQuery TIMESTAMP → JavaScript Date 객체로 변환
- `success`는 BigQuery BOOL → JavaScript boolean으로 변환
- 필드명은 snake_case (BigQuery 컬럼명과 일치)
