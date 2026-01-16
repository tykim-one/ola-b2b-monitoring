<!-- Parent: ../AGENTS.md -->
# schemas

## Purpose
Zod 기반 폼 검증 스키마입니다. react-hook-form의 zodResolver와 함께 사용하여 타입 안전한 폼 검증을 제공합니다.

## Key Files
- `user.schema.ts` - 사용자 폼 스키마 (이름, 이메일, 역할, 비밀번호)
- `role.schema.ts` - 역할 폼 스키마 (이름, 설명, 권한)
- `filter.schema.ts` - 필터 폼 스키마 (이름, 타입, 값)
- `analysis.schema.ts` - 분석 요청 폼 스키마 (프롬프트, 옵션)
- `index.ts` - 배럴 익스포트

## For AI Agents
- **사용법**: `zodResolver(userSchema)` → react-hook-form에 전달
- **타입 추론**: `z.infer<typeof userSchema>` → `UserFormData` 타입 자동 생성
- **한글 에러 메시지**: 모든 스키마에 한글 커스텀 에러 메시지 적용
- **새 스키마 추가 시**:
  1. `{도메인}.schema.ts` 파일 생성
  2. z.object()로 스키마 정의
  3. FormData 타입 export
  4. index.ts에서 re-export
