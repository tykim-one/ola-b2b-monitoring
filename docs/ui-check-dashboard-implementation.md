# UI Check Dashboard Implementation Guide

## Overview

The UI Check Dashboard is a Playwright-based automated browser testing system that monitors IBK report page content rendering. This document records the implementation progress and current state to enable seamless backend work continuation in the next session.

### Purpose
Monitor 4 report target pages (Summary Daily, AI Daily, Dividend Daily, Forex Daily) for rendering issues using 10 check types that verify page structure, content, and integrity.

### Target Platforms
- Summary Daily: `https://content.ibk.com/gics/gold/summary/daily/{uuid}`
- AI Daily: `https://content.ibk.com/gics/gold/ai/daily/{uuid}`
- Dividend Daily: `https://content.ibk.com/gics/gold/dividend/daily/{uuid}`
- Forex Daily: `https://content.ibk.com/gics/gold/forex/daily/{uuid}`

### Check Types (10 Total)
| Check Type | Purpose | Input Fields |
|-----------|---------|--------------|
| `no_empty_page` | Verify page is not blank | - |
| `no_error_text` | Search for error keywords | patterns: string[] |
| `no_console_errors` | Verify browser console clean | - |
| `chart_rendered` | Verify chart elements exist | selector: string |
| `section_exists` | Verify required sections exist | sections: string[] |
| `element_count_min` | Verify minimum element count | minCount: number |
| `content_not_empty` | Verify content has minimum length | minContentLength: number, itemSelector: string, minItems: number |
| `element_exists` | Verify single element exists | selector: string |
| `table_structure` | Verify table has columns/rows | minColumns: number, minRows: number |
| `no_empty_cells` | Verify cells are not empty | maxEmptyCells: number |

---

## Implementation Status (2026-02-09)

### Frontend Work - COMPLETED

#### 1. UI Check Standalone Dashboard Separation
**Location**: `apps/frontend-next/src/app/dashboard/ui-check/page.tsx`

Split the combined report-monitoring page into two independent dashboards:

**Before**: Single `report-monitoring/page.tsx` (1234 lines) with mixed data validation + UI validation tabs

**After**:
- **`ui-check/page.tsx`** (NEW) - UI monitoring dedicated dashboard
- **`report-monitoring/page.tsx`** (MODIFIED) - Data validation only, tabs removed
- **`Sidebar.tsx`** (MODIFIED) - Added "UI 모니터링" menu item (/dashboard/ui-check)

#### 2. Failure Debugging Information Enhanced
Enhanced failed check items with detailed debug boxes showing:
- Type badge + durationMs
- selector, expected vs actual values
- details JSON (for structured debugging)

**Location**: `ui-check/page.tsx` > UiIssueDetailSection component

#### 3. Check Configuration Template Query (NEW)
**Backend Endpoint**: `GET /api/report-monitoring/ui-check/config`
- Returns check config for all targets
- Omits sensitive auth information
- Returns only targets and checks data

**Frontend Implementation**:
- `reportMonitoringService.ts`: Added `getUiCheckConfig()` with TypeScript types
  - `UiCheckConfigResponse`: Top-level response type
  - `UiCheckConfigTarget`: Target-level metadata
  - `UiCheckConfigCheck`: Individual check definition
- `use-report-monitoring.ts`: Added `useUiCheckConfig()` hook (LONG cache - 1 hour)
- `ui-check/page.tsx`: Added CheckConfigSection component
  - Accordion layout by target
  - Shows all check definitions
  - Displays all configuration fields

#### 4. Configuration Threshold Inline Editing (NEW)
**Backend Endpoint**: `PATCH /api/report-monitoring/ui-check/config`
- Whitelist-based editing: only allows specific field updates
- Prevents structural changes to check types

**Editable Fields** (whitelist):
- `minCount`
- `minContentLength`
- `minItems`
- `maxEmptyCells`
- `minColumns`
- `patterns`
- `description`

**Protected Fields** (cannot modify):
- `type` (structural integrity)
- `selector` (structural integrity)
- `sections` (structural integrity)

**Frontend Implementation**:
- `reportMonitoringService.ts`: Added `updateUiCheckConfig()` API call
- `use-report-monitoring.ts`: Added `useUpdateUiCheckConfig()` mutation hook
- `ui-check/page.tsx`:
  - EditableNumber component for inline editing
  - Change detection with visual feedback
  - Save button with loading state
  - Success/error toast notifications

#### 5. Bug Fixes
- `services/[serviceId]/status/page.tsx`: Added `summary` key to ReportType Record to fix TypeScript error

### Backend Work - IN PROGRESS

#### 1. New Check Type Implementations (463+ lines added)
**Location**: `src/report-monitoring/ui-check.service.ts`

**Implemented**:
- `section_exists`: Verifies required sections exist using sections array selector
- `element_count_min`: Counts elements matching selector, compares against minCount
- `content_not_empty`: Validates content length with itemSelector and minItems support

**Key Features**:
- Returns `SingleCheckResult` with `category` and `details` fields for debugging
- Proper error handling with meaningful error messages
- Integration with Playwright page object

#### 2. Dynamic URL Resolution
**Location**: `src/report-monitoring/external-db.service.ts` + `ui-check.service.ts`

**New Method**: `getTodayReportUuids(targetType: ReportType)`
- Queries gold.daily_content_list for today's report UUIDs
- Handles timezone correctly (Asia/Seoul for Korean services)
- Returns array of UUIDs for {uuid} template substitution

**URL Resolution Flow**:
1. Load config with urlTemplate containing `{uuid}`
2. Query getTodayReportUuids() based on target type
3. Replace {uuid} with actual UUID values
4. Launch browser with resolved URLs

#### 3. Interface Extensions
- `ui-check.interface.ts`: Extended UiCheckDefinition with:
  - `sections`: string[] for section_exists check
  - `minItems`: number for content_not_empty check
  - `sectionName`: string for better error messages
- `ui-check-result.interface.ts`: Added to SingleCheckResult:
  - `category`: 'rendering' | 'content' | 'structure' | 'interaction' | 'browser'
  - `details`: Record<string, any> for structured debugging info
- `report-target.interface.ts`: Added `'summary'` to ReportType enum

---

## File Changes Summary

### Frontend Changes (apps/frontend-next/)

| File | Change Type | Lines | Description |
|------|------------|-------|-------------|
| `src/app/dashboard/ui-check/page.tsx` | NEW | 450+ | UI monitoring dashboard with status, history, config sections |
| `src/app/dashboard/report-monitoring/page.tsx` | MAJOR | -400 | Removed all UI-related code, cleaned to data validation only |
| `src/components/Sidebar.tsx` | MINOR | +11 | Added UI 모니터링 menu item with proper icon and routing |
| `src/hooks/queries/use-report-monitoring.ts` | MINOR | +30 | Added useUiCheckConfig, useUpdateUiCheckConfig hooks |
| `src/services/reportMonitoringService.ts` | MINOR | +50 | Added getUiCheckConfig, updateUiCheckConfig API calls + types |
| `src/app/dashboard/services/[serviceId]/status/page.tsx` | MINIMAL | +1 | Added 'summary' to ReportType Record |

### Backend Changes (apps/backend/)

#### Session 1 - Core UI Check Implementation (Previous)

| File | Change Type | Lines | Description |
|------|------------|-------|-------------|
| `src/report-monitoring/ui-check.service.ts` | MAJOR | +463 | Implemented new check types (section_exists, element_count_min, content_not_empty), dynamic URL resolution, report pre-detection |
| `src/report-monitoring/external-db.service.ts` | MINOR | +49 | Added getTodayReportUuids() for dynamic URL resolution |
| `src/report-monitoring/interfaces/ui-check.interface.ts` | MINOR | ±25 | Extended UiCheckDefinition with sections, minItems, sectionName |
| `src/report-monitoring/interfaces/ui-check-result.interface.ts` | MINOR | +2 | Added category and details fields to SingleCheckResult |
| `src/report-monitoring/interfaces/report-target.interface.ts` | MINIMAL | +8 | Added 'summary' to ReportType enum |
| `src/report-monitoring/report-monitoring.service.ts` | MINIMAL | +1 | Added summary type support |

#### Session 2 - Configuration Management Endpoints (Current)

| File | Change Type | Lines | Description |
|------|------------|-------|-------------|
| `src/report-monitoring/report-monitoring.controller.ts` | MINOR | +18 | Added GET/PATCH ui-check/config endpoints |
| `src/report-monitoring/ui-check.service.ts` | MINOR | +50 | Added getCheckConfig(), updateCheckConfig() methods |

---

## Architecture Overview

### Request Flow Diagram

```
┌─ Frontend (React)                  Backend (NestJS)                 External Services
├─────────────────────────────────────────────────────────────────────────────────────
│
├─ useUiCheckResult()     ────GET──→ /ui-check/status
│  (5min cache)
│
├─ useUiCheckHistory()    ────GET──→ /ui-check/history
│
├─ useUiCheckConfig()     ────GET──→ /ui-check/config
│  (1hour cache)                      └─ ui-check.service.getCheckConfig()
│                                        └─ reads config/ui-checks.json
│
├─ useUpdateUiCheckConfig ────PATCH─→ /ui-check/config
│                                      └─ ui-check.service.updateCheckConfig()
│                                         └─ writes to config/ui-checks.json
│
└─ useRunUiCheck()        ────POST──→ /ui-check (manual trigger)
                                      └─ ui-check.service.runChecks()
                                         ├─ loadConfig()
                                         ├─ resolveUrls() ──→ external-db.service.getTodayReportUuids()
                                         │                    ──→ gold.daily_content_list (BigQuery)
                                         ├─ launchBrowser()  ──→ Playwright headless browser
                                         ├─ authenticate()   ──→ IBK login
                                         ├─ runChecks()      ──→ Page DOM/console interaction
                                         │  ├─ no_empty_page
                                         │  ├─ section_exists
                                         │  ├─ element_count_min
                                         │  ├─ content_not_empty
                                         │  ├─ no_error_text
                                         │  ├─ no_console_errors
                                         │  ├─ chart_rendered
                                         │  ├─ element_exists
                                         │  ├─ table_structure
                                         │  └─ no_empty_cells
                                         ├─ takeScreenshot()  ──→ ./apps/backend/screenshots/
                                         └─ sendSlackAlert() ──→ Slack webhook (if degraded/broken)

Services Used:
├─ reportMonitoringService.ts (API client)
├─ use-report-monitoring.ts (React Query hooks)
├─ @ola/shared-types (shared TypeScript definitions)
├─ ui-check.service.ts (core check logic)
├─ external-db.service.ts (BigQuery queries)
└─ config/ui-checks.json (check definitions)
```

### Data Model

#### Check Configuration (ui-checks.json structure)
```typescript
interface UiCheckConfig {
  [targetKey: string]: {
    name: string;                    // Display name
    description: string;              // Purpose description
    urlTemplate: string;              // With {uuid} placeholder
    credentials: { user: string; password: string };
    checks: UiCheckDefinition[];
  };
}

interface UiCheckDefinition {
  type: CheckType;
  description: string;
  selector?: string;                  // For DOM-based checks
  sections?: string[];                // For section_exists check
  patterns?: string[];                // For no_error_text check
  minCount?: number;                  // For element_count_min check
  minContentLength?: number;           // For content_not_empty check
  minItems?: number;                  // For content_not_empty check
  minColumns?: number;                // For table_structure check
  minRows?: number;                   // For table_structure check
  maxEmptyCells?: number;              // For no_empty_cells check
  itemSelector?: string;              // For content_not_empty check
}
```

#### Check Result
```typescript
interface SingleCheckResult {
  type: CheckType;
  status: 'passed' | 'failed' | 'skipped' | 'broken';
  category: 'rendering' | 'content' | 'structure' | 'interaction' | 'browser';
  description: string;
  durationMs: number;
  selector?: string;
  expected?: any;
  actual?: any;
  details?: Record<string, any>;      // For structured debugging
  error?: string;
}

interface UiPageCheckResult {
  target: ReportType;
  uuid: string;
  url: string;
  timestamp: Date;
  durationMs: number;
  status: 'healthy' | 'degraded' | 'broken';
  checksCount: number;
  passedCount: number;
  failedCount: number;
  results: SingleCheckResult[];
  screenshotPath?: string;
}
```

---

## Configuration File Reference

### Location
`apps/backend/config/ui-checks.json`

### Current Targets (4 Total)

#### 1. summary-daily
- **URL**: `https://content.ibk.com/gics/gold/summary/daily/{uuid}`
- **Checks**: 14 (most comprehensive)
- **Key Sections**: header, main-content, table-section, footer

#### 2. ai-daily
- **URL**: `https://content.ibk.com/gics/gold/ai/daily/{uuid}`
- **Checks**: 9
- **Key Sections**: header, ai-analysis, chart-section, footer

#### 3. dividend-daily
- **URL**: `https://content.ibk.com/gics/gold/dividend/daily/{uuid}`
- **Checks**: 10
- **Key Sections**: header, dividend-table, dividend-analysis, footer

#### 4. forex-daily
- **URL**: `https://content.ibk.com/gics/gold/forex/daily/{uuid}`
- **Checks**: 9
- **Key Sections**: header, forex-table, forex-analysis, footer

### All URLs Use Dynamic Resolution
All target URLs contain `{uuid}` placeholder that is resolved at runtime via:
1. `getTodayReportUuids(targetType)` - queries gold.daily_content_list
2. String substitution in resolveUrls()
3. Passes actual URLs to Playwright

---

## Current Status

### Build Status
- **Frontend**: ✅ `pnpm build:frontend-next` - Success (2026-02-09)
- **Backend**: ⏳ Not yet verified (verify in next session)

### Features Complete
- ✅ Standalone UI check dashboard (frontend)
- ✅ Check configuration retrieval API (backend + frontend)
- ✅ Inline configuration editing (backend + frontend)
- ✅ Enhanced failure debugging info (frontend)
- ✅ New check type implementations (backend, in-progress)
- ✅ Dynamic URL resolution framework (backend)

### Features Partially Complete
- 🟡 New check type implementations - framework done, individual implementations in progress:
  - `section_exists`: Implemented, needs testing
  - `element_count_min`: Implemented, needs testing
  - `content_not_empty`: Implemented, needs testing

---

## Next Session TODO List

### High Priority - Backend Validation

#### 1. Complete and Test New Check Types
**Files**: `src/report-monitoring/ui-check.service.ts`

Checklist:
- [ ] Verify `section_exists` implementation returns SingleCheckResult with proper category/details
- [ ] Verify `element_count_min` implementation correctly counts elements
- [ ] Verify `content_not_empty` implementation handles minContentLength, itemSelector, minItems
- [ ] Unit tests for each check type with mock Playwright pages
- [ ] Integration test running actual browser against test pages

**Validation Steps**:
```bash
cd apps/backend
# Run unit tests for ui-check service
pnpm test -- --testPathPattern="ui-check"

# Run integration test (requires test IBK credentials)
pnpm test:e2e -- ui-check.e2e.spec.ts
```

#### 2. Verify Dynamic URL Resolution
**Files**: `src/report-monitoring/external-db.service.ts` + `ui-check.service.ts`

Checklist:
- [ ] `getTodayReportUuids()` correctly queries gold.daily_content_list with timezone (Asia/Seoul)
- [ ] URL template resolution correctly replaces {uuid} with actual UUIDs
- [ ] Pre-detection of missing reports works (sets status: broken, category: structure)
- [ ] Multiple UUIDs per target are handled correctly (if target creates multiple daily reports)

**Validation Steps**:
```bash
# Check if today's reports exist
curl "http://localhost:3000/api/report-monitoring/ui-check/status"

# Verify resolved URLs in response
# Should show actual URLs like https://content.ibk.com/gics/gold/summary/daily/abc123def456

# Check backend logs for URL resolution details
tail -f .logs/backend.log | grep "resolveUrls"
```

#### 3. Validate config/ui-checks.json
**File**: `apps/backend/config/ui-checks.json`

Checklist:
- [ ] Test selectors against actual IBK report pages (manually via browser dev tools)
- [ ] Verify all section selectors use correct nth-child/nth-of-type indices
- [ ] Confirm all pattern regexes for no_error_text work as intended
- [ ] Check minCount, minContentLength values are realistic for each target

**Manual Validation**:
1. Visit each target URL in browser
2. Open DevTools Console
3. Copy selector from config and run:
   ```javascript
   // For section_exists checks
   document.querySelectorAll('.section-class').length  // should > 0

   // For element_count_min checks
   document.querySelectorAll(selector).length

   // For content_not_empty checks
   document.querySelectorAll(itemSelector)[0]?.textContent?.length
   ```

### Medium Priority - Additional Validation

#### 4. Verify Screenshot Functionality
**Files**: `src/report-monitoring/ui-check.service.ts`

Checklist:
- [ ] screenshotPath is correctly generated with timestamp
- [ ] Screenshots saved to `./apps/backend/screenshots/` directory
- [ ] Screenshot path included in API response
- [ ] Future: Add screenshot viewer to frontend

#### 5. Test Slack Integration
**Files**: `src/report-monitoring/ui-check.service.ts` + notification module

Checklist:
- [ ] Slack alerts sent when status = 'degraded' or 'broken'
- [ ] Alert includes target name, failed check count, URL
- [ ] Alert includes screenshot link (if enabled)
- [ ] No false positives from healthy checks

### Low Priority - Frontend Enhancements

#### 6. History Detail View
**Files**: `src/app/dashboard/ui-check/page.tsx`

Features:
- [ ] Click table row to view full check result details
- [ ] Show individual check results with expandable error details
- [ ] Display screenshot if available
- [ ] API endpoint exists: `GET /api/report-monitoring/ui-check/history/:id`
- [ ] Service method exists: `getUiCheckHistoryDetail(id)`

#### 7. All Results View
**Files**: `src/app/dashboard/ui-check/page.tsx`

Features:
- [ ] Current: Only shows failed checks/issues
- [ ] Enhancement: Add toggle to show all checks for all targets
- [ ] Show healthy targets in config section even if all checks pass

---

## Testing Strategy

### Unit Tests (Backend)
```bash
# Test UI check service logic
pnpm test -- ui-check.service.spec.ts

# Test external DB service
pnpm test -- external-db.service.spec.ts
```

### Integration Tests
```bash
# Full flow test (requires real BigQuery + test IBK account)
pnpm test:e2e -- ui-check.e2e.spec.ts
```

### Manual Testing Checklist
- [ ] Run /api/ui-check endpoint manually and review response
- [ ] Verify each check type produces expected result
- [ ] Test with various report states (healthy, degraded, broken)
- [ ] Verify screenshot generation
- [ ] Test Slack notifications

---

## Debugging Tips

### Check Type Debugging
Each check type should return `SingleCheckResult` with:
- `status`: 'passed', 'failed', 'skipped', or 'broken'
- `category`: Categorizes the type of check failure
- `details`: Optional structured debug info (selector matches, actual vs expected, etc.)

Example details object:
```typescript
{
  selector: '.chart-container',
  found: 2,
  expected: 3,
  matchedElements: ['<canvas>', '<canvas>'],
  nextElement: '<div class="...">'
}
```

### URL Resolution Debugging
Add logging to resolve URLs step-by-step:
```typescript
console.log('[UI Check] Target:', targetType);
console.log('[UI Check] UUIDs found:', uuids);
console.log('[UI Check] Resolved URLs:', resolvedUrls);
```

### Playwright Debugging
Enable Playwright Inspector:
```bash
PWDEBUG=1 pnpm test -- ui-check.service.spec.ts
```

---

## Known Issues & Workarounds

### Issue 1: Report Not Generated Yet
**Problem**: getDailyReportUuids() returns empty array if report not yet generated
**Solution**: Pre-detect and return status: 'broken' with category: 'structure' before launching browser
**Code**: `ui-check.service.runChecks()` - check `if (uuids.length === 0)`

### Issue 2: Selector Mismatch
**Problem**: Page DOM structure differs from expected selectors
**Solution**: Use browser inspector to find correct selectors, update config/ui-checks.json
**Impact**: Medium - affects multiple checks per target

### Issue 3: Authentication Timeout
**Problem**: IBK login may timeout or require additional steps
**Solution**: Implement retry logic, increase timeout, check for login form presence
**Status**: Planned for future enhancement

---

## Commands Reference

### Frontend Development
```bash
# Start dev server
pnpm dev:frontend-next

# Build
pnpm build:frontend-next

# Lint
pnpm lint:frontend-next
```

### Backend Development
```bash
# Start dev server
pnpm dev:backend

# Build
pnpm build:backend

# Test
pnpm test
pnpm test:watch
pnpm test -- --testPathPattern="ui-check"

# E2E tests
pnpm test:e2e

# Update Prisma
pnpm prisma:generate
pnpm prisma db push
```

### Full Stack
```bash
# Start all servers
pnpm dev:all

# Build all
pnpm build
```

---

## Related Documentation

- [UI Check Service Implementation Details](./ui-check-service.md) - Detailed check logic
- [Configuration Guide](./ui-check-config.md) - Config file structure and examples
- [API Reference](../API.md) - Full API endpoint documentation
- [Frontend Components Guide](../frontend-components.md) - UI component reference

---

## Contributors & History

- **Session 1**: Frontend dashboard separation, debug info enhancement, config endpoints (controller + service)
- **Session 2**: Check type implementations, URL resolution, backend integration

**Last Updated**: 2026-02-09
**Status**: In progress - awaiting backend validation in next session
