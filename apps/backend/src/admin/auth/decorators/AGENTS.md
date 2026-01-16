<!-- Parent: ../AGENTS.md -->
# decorators

## Purpose
인증/인가 관련 커스텀 데코레이터입니다. 컨트롤러에서 사용자 정보 접근과 권한 설정에 사용됩니다.

## Key Files
- `current-user.decorator.ts` - 현재 로그인 사용자 정보 추출 (@CurrentUser)
- `permissions.decorator.ts` - 필요 권한 설정 (@Permissions)
- `public.decorator.ts` - 공개 엔드포인트 마킹 (@Public)

## For AI Agents
- **@CurrentUser()**: Request에서 JWT payload 사용자 정보 추출
- **@Permissions('admin', 'user:read')**: 필요 권한 메타데이터 설정
- **@Public()**: JwtAuthGuard 우회, 로그인/회원가입 엔드포인트에 사용
- **SetMetadata 패턴**: Reflector로 메타데이터 읽기
