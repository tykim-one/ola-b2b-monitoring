<!-- Parent: ../AGENTS.md -->
# log

## Purpose
로그 데이터 탐색 및 표시 컴포넌트입니다. BigQuery 로그를 테이블 형식으로 보여주고 검색/필터링 기능을 제공합니다.

## Key Files
- `LogTable.tsx` - 로그 테이블 컴포넌트
  - BigQuery 로그 데이터를 표 형식으로 렌더링
  - 타임스탬프, 테넌트 ID, 사용자 입력, LLM 응답, 성공 여부, 토큰 정보 표시
  - 검색 및 필터링 기능 (테넌트, 성공/실패 상태)
  - 페이지네이션 지원
  - 상세 보기 모달 (전체 입력/응답 텍스트)

## For AI Agents
- **데이터 소스**: BigQuery 로그 (플랫 스키마)
- **주요 필드**:
  - `timestamp`: 로그 타임스탬프
  - `tenant_id`: 테넌트 ID
  - `user_input`: 사용자 질문
  - `llm_response`: LLM 응답
  - `success`: 성공 여부 (BOOL)
  - `input_tokens`, `output_tokens`, `total_tokens`: 토큰 사용량 (STRING, CAST 필요)
- **스타일**: 라이트 테마, Tailwind CSS
- **테이블 라이브러리**: 기본 HTML table 사용
- **페이지네이션**: 서버 사이드 (API 파라미터: offset, limit)

## Dependencies
- 상위 컴포넌트: `LogExplorer.tsx`
- API: `/api/logs` 엔드포인트 (백엔드 구현 필요 시)
