<!-- Parent: ../AGENTS.md -->

# Markdown 컴포넌트

## Purpose

마크다운 콘텐츠를 React 컴포넌트로 렌더링하는 기능을 제공합니다.
LLM 응답, 챗봇 메시지, 분석 결과 등 마크다운 형식의 텍스트를 다크 모드 스타일로 포매팅하여 표시합니다.

## Key Files

### MarkdownViewer.tsx
마크다운을 HTML로 렌더링하는 메인 컴포넌트. `react-markdown` 라이브러리를 기반으로 하며:
- **두 가지 크기 변형 지원** (`sm`/`base`): 챗 버블과 일반 콘텐츠 영역에 맞게 동적 스타일 적용
- **GitHub Flavored Markdown (GFM)** 지원: 체크리스트, 테이블, 스트라이크스루 등
- **코드 하이라이팅**: `rehype-highlight`를 통한 구문 강조
- **대화형 기능**: 코드 블록 복사 버튼, 외부 링크 아이콘, 다크 모드 색상 팔레트
- Props: `content` (마크다운 텍스트), `className`, `size` ('sm'/'base'), `enableCodeCopy`

### index.ts
모듈 export 진입점. `MarkdownViewer` 컴포넌트를 외부에 노출합니다.

## For AI Agents

### 컴포넌트 구조
- **크기 기반 스타일**: `sizeClasses` 객체에서 `sm`/`base` 변형의 Tailwind 클래스 관리
  - `sm`: 챗 메시지/버블용 (텍스트 작고, 여백 최소화)
  - `base`: 분석 결과/콘텐츠용 (텍스트 크고, 여백 넉넉함)
- **마크다운 플러그인**:
  - `remark-gfm`: 테이블, 체크리스트, 스트라이크스루 처리
  - `rehype-highlight`: 코드 블록 구문 강조
- **Lucide React 아이콘**: Copy (복사), Check (복사됨), ExternalLink (외부 링크)

### 주요 커스터마이징 포인트
1. **구성 컴포넌트** (`Components` 객체): h1-h4, p, ul, ol, li, a, code, pre, table, blockquote 등
2. **CopyButton**: 코드 블록 위에 호버 시 표시되는 복사 버튼 (2초 동안 Check 아이콘 표시)
3. **링크 처리**: HTTP(S) 시작 링크는 `target="_blank"` + 외부 링크 아이콘 표시

### 다크 모드 색상 팔레트
- 배경: `bg-slate-800`, `bg-slate-900/60`
- 텍스트: `text-slate-100` (강함), `text-slate-200` (중간), `text-slate-300/400` (약함)
- 강조: `text-blue-400`, `text-blue-300` (링크), `text-blue-500` (버튼)
- 경계선: `border-slate-700`, `border-slate-600`

### 확장 방법
새로운 마크다운 요소 지원 추가:
1. `components` 객체에 새 속성 추가 (예: `details`, `summary`)
2. Tailwind 클래스로 스타일링 (`sizeClasses` 참고)
3. 필요시 `remarkPlugins`/`rehypePlugins` 추가

### 사용 위치
- **ChatMessage.tsx**: 챗봇 응답 렌더링 (`size="sm"`)
- **분석 결과 패널**: LLM 분석 결과 표시 (`size="base"`)
- **MessageBubble.tsx**: 사용자/AI 메시지 표시
