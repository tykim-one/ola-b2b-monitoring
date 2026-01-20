<!-- Parent: ../AGENTS.md -->
# faq-analysis

## Purpose
FAQ 분석 UI 컴포넌트입니다. 사용자가 기간/테넌트 필터를 설정하고 분석을 실행하면, 클러스터링된 FAQ 결과와 LLM 사유 분석을 표시합니다.

## Key Files
- `FAQAnalysisSection.tsx` - 메인 섹션 컨테이너 (필터 폼, 분석 실행 버튼, 결과 표시)
- `FAQClusterCard.tsx` - 개별 FAQ 클러스터 카드 (순위, 대표 질문, 빈도, 포함된 질문 목록, 사유 분석)

## Features
1. **필터 폼**: 기간(7/14/30일), Top N(10/20/50), 테넌트 선택
2. **분석 실행 버튼**: 클릭 시 POST /api/quality/faq-analysis 호출
3. **결과 표시**: 클러스터 카드 목록으로 FAQ 표시
4. **클러스터 카드**: 순위 뱃지, 대표 질문, 빈도, 포함된 질문 접기/펼치기, 사유 분석 하이라이트

## Dependencies
- `@/services/faqAnalysisService` - API 호출 서비스
- `@/lib/api-client` - 인증된 API 클라이언트 (JWT 토큰 자동 첨부)

## For AI Agents
- 'use client' 컴포넌트 (클라이언트 사이드 렌더링)
- Tailwind CSS로 스타일링 (다크 테마: bg-slate-800, border-slate-700)
- lucide-react 아이콘 사용
- Quality 페이지(`/dashboard/quality/page.tsx`)에서 import하여 사용
