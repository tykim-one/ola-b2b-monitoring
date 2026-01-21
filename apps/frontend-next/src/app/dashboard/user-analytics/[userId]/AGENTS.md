<!-- Parent: ../AGENTS.md -->
# [userId]

## Purpose
특정 사용자(x_enc_data 기준)의 상세 분석 페이지입니다. 사용자별 활동 내역, 카테고리 분포, 감정 분석, 세션 타임라인 등을 표시합니다.

## Key Files
- `page.tsx` - 사용자 상세 분석 페이지 컴포넌트

## For AI Agents
- 동적 라우트: `[userId]` 파라미터로 사용자 ID 전달
- 백엔드 User Profiling API (`/api/admin/user-profiling/:userId`) 연동
- 관련 컴포넌트: `src/components/user-profiling/`

## Dependencies
- `user-profiling` 백엔드 서비스
- 사용자 프로파일링 컴포넌트
