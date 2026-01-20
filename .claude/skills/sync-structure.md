# /sync-structure

Notion에 코드베이스 구조 문서를 동기화합니다.

## 사용법

```
/sync-structure [options]
```

## 옵션

- `--path <dir>` - 특정 디렉토리만 동기화 (예: apps/backend)
- `--dry-run` - 실제 동기화 없이 미리보기
- `--verbose` - 상세 로그 출력

## 예시

```
/sync-structure                    # 전체 동기화
/sync-structure --path apps/backend  # 백엔드만 동기화
/sync-structure --dry-run          # 미리보기
```

## 실행 방법

이 명령어를 실행하면 다음 작업을 수행합니다:

1. 모든 AGENTS.md 파일을 파싱합니다
2. 비개발자 친화적 형태로 변환합니다 (용어 설명, 요약 추가)
3. Notion 페이지를 생성/업데이트합니다

---

## 실행 지침 (Claude Code용)

사용자가 `/sync-structure`를 요청하면:

### 1. 환경 확인
```bash
# 환경변수 확인
echo "NOTION_API_KEY: ${NOTION_API_KEY:+설정됨}"
echo "NOTION_ROOT_PAGE_ID: ${NOTION_ROOT_PAGE_ID:+설정됨}"
```

### 2. 의존성 설치 (최초 1회)
```bash
cd scripts/notion-sync && pnpm install
```

### 3. 동기화 실행
```bash
cd scripts/notion-sync && pnpm sync:structure
```

옵션이 있는 경우:
```bash
# --dry-run
cd scripts/notion-sync && pnpm sync:structure:dry

# --path
cd scripts/notion-sync && npx tsx sync-structure.ts --path apps/backend

# --verbose
cd scripts/notion-sync && npx tsx sync-structure.ts --verbose
```

### 4. 결과 보고
동기화 완료 후 사용자에게 다음을 알려주세요:
- 생성된 페이지 수
- 업데이트된 페이지 수
- 오류가 있다면 오류 내용

## 문제 해결

### 환경변수 미설정
```
Error: NOTION_API_KEY environment variable is not set
```
→ `~/.zshrc`에 환경변수 추가 후 `source ~/.zshrc` 실행

### Rate Limit
→ 스크립트에 350ms 지연이 적용되어 있음. 문제 지속 시 지연 시간 증가

### 페이지 권한 오류
→ Notion Integration이 대상 페이지에 연결되어 있는지 확인
