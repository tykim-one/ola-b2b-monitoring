<!-- Parent: ../AGENTS.md -->
# strategies

## Purpose
Passport.js 인증 전략입니다. JWT 토큰 검증 로직을 구현합니다.

## Key Files
- `jwt.strategy.ts` - JWT 토큰 검증 전략 (PassportStrategy 확장)

## For AI Agents
- **PassportStrategy(Strategy)**: @nestjs/passport의 JWT 전략 확장
- **validate() 메서드**: 토큰 페이로드 검증 후 사용자 객체 반환
- **jwtFromRequest**: Bearer 토큰에서 JWT 추출
- **secretOrKey**: 환경변수 JWT_SECRET 사용
- **새 전략 추가 시**: PassportStrategy 상속, validate() 구현 필수
