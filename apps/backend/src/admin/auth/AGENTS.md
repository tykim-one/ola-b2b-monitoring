<!-- Parent: ../AGENTS.md -->
# Auth Module

## Purpose
JWT 기반 인증 및 역할 기반 접근 제어(RBAC) 시스템.

## Key Files
- `auth.module.ts` - 모듈 정의
- `auth.service.ts` - 로그인, 토큰 갱신, 로그아웃 로직
- `auth.controller.ts` - /api/admin/auth/* 엔드포인트

## Subdirectories
- `strategies/` - JWT 전략 (jwt.strategy.ts)
- `guards/` - JwtAuthGuard, PermissionsGuard
- `decorators/` - @Public, @Permissions, @CurrentUser
- `dto/` - LoginDto, RefreshTokenDto

## For AI Agents
- 계정 잠금: 5회 실패 시 15분
- Access Token: Authorization: Bearer {token}
- Refresh Token: httpOnly Cookie
