<!-- Parent: ../AGENTS.md -->

# Batch Analysis DTOs

## Purpose

배치 분석 모듈의 데이터 전송 객체(DTO) 정의를 포함하는 디렉토리입니다. NestJS의 class-validator를 사용하여 API 요청 유효성 검사를 수행하며, Swagger 문서 생성을 위한 ApiProperty 데코레이터를 포함합니다.

## Key Files

### `create-job.dto.ts`
배치 분석 작업 생성을 위한 DTO입니다.
- `CreateJobDto`: 분석 대상 날짜, 테넌트 ID, 샘플 크기, 프롬프트 템플릿 ID 등을 검증합니다.
- `@IsDateString()`, `@IsInt()`, `@Min()`, `@Max()` 등의 유효성 검사 데코레이터 사용
- 샘플 크기는 10-500 범위로 제한됩니다.

### `create-prompt-template.dto.ts`
프롬프트 템플릿 생성 및 수정을 위한 DTO입니다.
- `CreatePromptTemplateDto`: 템플릿 이름, 설명, 프롬프트 본문, 기본 템플릿 여부를 검증합니다.
- `UpdatePromptTemplateDto`: 템플릿 수정을 위한 부분 업데이트 DTO (모든 필드 optional)
- 프롬프트 템플릿은 `{{user_input}}`, `{{llm_response}}` 변수를 지원합니다.
- 문자열 길이 제한: 이름(1-100자), 설명(최대 500자), 프롬프트(10-5000자)

### `job-filter.dto.ts`
배치 분석 작업 및 결과 조회를 위한 필터 DTO입니다.
- `JobFilterDto`: 작업 목록 조회 시 상태(PENDING/RUNNING/COMPLETED/FAILED), 테넌트 ID, 날짜 범위, 페이징(limit/offset)으로 필터링
- `ResultFilterDto`: 분석 결과 조회 시 작업 ID, 테넌트 ID, 상태(SUCCESS/FAILED), 페이징으로 필터링
- `@Type(() => Number)` 데코레이터로 쿼리 파라미터 타입 변환 처리

### `index.ts`
모든 DTO를 re-export하는 배럴 파일입니다.

## For AI Agents

### DTO 작성 패턴
- **NestJS class-validator** 사용: `@IsString()`, `@IsInt()`, `@IsOptional()`, `@IsDateString()`, `@IsIn()` 등
- **Swagger 문서화**: `@ApiProperty()`, `@ApiPropertyOptional()`로 API 스펙 자동 생성
- **문자열 길이 제한**: `@MinLength()`, `@MaxLength()`로 명시적 제약
- **숫자 범위 제한**: `@Min()`, `@Max()`로 허용 범위 설정
- **타입 변환**: 쿼리 파라미터는 `@Type(() => Number)`로 명시적 변환 필요

### 유효성 검사 규칙
- 날짜 형식: `YYYY-MM-DD` (ISO 8601 날짜 문자열)
- 작업 상태: `'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'`
- 결과 상태: `'SUCCESS' | 'FAILED'`
- 페이징: `limit`은 최소 1, `offset`은 최소 0

### Swagger 문서화 Best Practices
- `description`: 필드의 한국어 설명
- `example`: 실제 사용 가능한 예시 값
- `default`: 기본값 명시
- `minimum`, `maximum`: 숫자 범위 명시
- `enum`: 허용되는 값 목록

### 새 DTO 추가 시
1. class-validator 데코레이터로 유효성 검사 규칙 정의
2. Swagger 데코레이터로 API 문서 정보 추가
3. `index.ts`에 export 추가
4. 컨트롤러에서 `@Body()`, `@Query()` 등으로 사용
