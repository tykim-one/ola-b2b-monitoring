<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-09 | Updated: 2026-02-09 -->

# users

## Purpose
Service-specific user analytics page. Displays user activity analysis (based on x_enc_data) and problematic chat detection with customizable rule filtering.

## Key Files
| File | Description |
|------|-------------|
| `page.tsx` | Dual-tab user analytics dashboard: User List tab (activity metrics, question patterns) and Problematic Chat tab (rule-based chat filtering with LLM analysis) |

## For AI Agents
### Working In This Directory
- **Tab System**: Two tabs - 'users' and 'problematic'
- **Users Tab**:
  - Data Hook: `useUserAnalyticsDashboard(projectId, days, enabled)`
  - KPIs: Total users, total requests, total tokens, avg requests per user
  - User List Table:
    - Columns: userId, questionCount, successRate, totalTokens, avgTokens, errorCount, firstActivity, lastActivity
    - Row action: External link to `/dashboard/user-analytics/${userId}` (full profile page)
    - OnRowClick: Opens UserActivityDialog (quick view modal)
    - Color-coded success rate: ≥90% = green, ≥70% = yellow, else red
    - Search by userId
    - Pagination: 20 items per page
  - Question Patterns Table:
    - Top 30 patterns (user-specific repeated questions)
    - Expandable rows showing full userId and question text
    - Color-coded frequency: ≥10 = rose, ≥5 = yellow, else emerald
- **Problematic Chat Tab**:
  - Data Hooks: `useProblematicRules`, `useProblematicChats`, `useProblematicStats`
  - Rule Selection UI:
    - Checkbox-style toggleable rule filters
    - Auto-selects enabled rules on mount
    - "Select All" / "Deselect All" buttons
    - Color-coded by rule type: Purple = compound, Amber = numeric, Rose = text, Cyan = boolean
    - Shows rule summary (e.g., "3개 조건 (AND)", "contains 5개 키워드")
  - KPIs: Total problematic count, top 3 matched rules with percentages
  - Problematic Chats Table:
    - Columns: timestamp, userId, userInput, llmResponse, outputTokens, matchedRules, actions
    - Matched rules shown as colored badges
    - Eye icon button opens ProblematicChatDialog (detailed view)
    - Filtered by selected rule IDs (empty selection = no results)
  - Stats calculated client-side from `problematicStats.byRule` filtered by `selectedRuleIds`
- **Dialogs**:
  - UserActivityDialog: Quick view modal for user metrics and timeline
  - ProblematicChatDialog: Detailed chat view with rule explanation
- **Data Types** (from `@ola/shared-types`):
  - `UserListItem`: userId, questionCount, successRate, totalTokens, avgTokens, errorCount, firstActivity, lastActivity
  - `UserQuestionPattern`: userId, question, frequency, lastAsked
  - `ProblematicChat`: id, timestamp, userId, userInput, llmResponse, outputTokens, matchedRules[]
  - `ProblematicChatRule`: id, name, config (simple or compound), isEnabled
- **Rule Config Utilities**:
  - `isCompoundConfig()`: Check if rule uses AND/OR logic
  - `getFieldDefinition()`: Get field metadata (dataType, label)
  - `getOperatorDefinition()`: Get operator metadata (label)
- **Date Range**: 7-day default
- **State Initialization**: Rules pre-selected based on `isEnabled` flag after data loads

### Testing Considerations
- Verify tab switching preserves state
- Test rule selection/deselection logic
- Validate dialog open/close behavior
- Check external link navigation to user profile page
- Test empty states (no users, no problematic chats)
- Verify rule filtering updates chat list reactively
- Test search functionality in user table
- Validate pagination in user list
- Check color coding for all status indicators
- Test with both simple and compound rule configs

## Dependencies
### Internal
- `@/hooks/useServiceContext` - Project ID from context
- `@/hooks/queries/use-user-analytics` - useUserAnalyticsDashboard, useProblematicRules, useProblematicChats, useProblematicStats
- `@/components/compound/Dashboard` - Dashboard layout
- `@/components/compound/DataTable` - User/pattern/chat tables
- `@/components/kpi/KPICard` - User metrics
- `@/components/charts/UserActivityDialog` - User quick view modal
- `@/components/charts/ProblematicChatDialog` - Chat detail modal
- `@/components/ui/DateRangeFilter` - Time range selection
- `@ola/shared-types` - UserListItem, UserQuestionPattern, ProblematicChat, ProblematicChatRule, getFieldDefinition, getOperatorDefinition, isCompoundConfig

### External
- `next/navigation` - useRouter for profile navigation
- `lucide-react` - Icons (Users, BarChart3, MessageSquare, Activity, AlertTriangle, ExternalLink, Eye)
