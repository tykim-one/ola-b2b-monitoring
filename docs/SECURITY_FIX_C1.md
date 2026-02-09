# Security Fix: C1 - POST /query Authentication Bypass

## Issue
CRITICAL security vulnerability where the class-level `@Public()` decorator made ALL endpoints in MetricsController unauthenticated, including the dangerous `POST /query` endpoint that executes arbitrary SQL.

## Fix Applied
1. **Removed** class-level `@Public()` decorator (line 35)
2. **Added** `@Permissions('admin:query')` to `POST /query` endpoint
3. **Added** `@Public()` decorator to 26 individual read-only metric endpoints
4. **Admin endpoints** now require JWT authentication by default:
   - `POST /query` - requires `admin:query` permission
   - `GET /datasets` - requires auth
   - `GET /tables/:datasetId` - requires auth
   - `GET /logs` - requires auth
   - `GET /cache/stats` - requires auth
   - `DELETE /cache` - requires auth

## Files Modified
- `/apps/backend/src/metrics/metrics.controller.ts`

## Verification
- TypeScript compilation: ✅ PASSED
- @Public() count: 26 (all read-only endpoints)
- @Permissions('admin:query'): 1 (POST /query)

## Impact
- Read-only metric endpoints remain publicly accessible (backward compatible)
- Admin/dangerous endpoints now require JWT authentication
- SQL injection vector secured with permission check
