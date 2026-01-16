<!-- Parent: ../AGENTS.md -->
# guards

## Purpose
NestJS 인증/인가 가드입니다. JWT 토큰 검증과 권한 검사를 수행합니다.

## Key Files
- `jwt-auth.guard.ts` - JWT 토큰 검증 가드 (AuthGuard 확장)
- `permissions.guard.ts` - 역할/권한 기반 접근 제어 가드

## For AI Agents
- **JwtAuthGuard**: @UseGuards(JwtAuthGuard) 데코레이터로 적용
- **PermissionsGuard**: @Permissions() 데코레이터와 함께 사용
- **Public 엔드포인트**: @Public() 데코레이터로 인증 우회 가능
- **가드 순서**: JwtAuthGuard → PermissionsGuard 순으로 적용
