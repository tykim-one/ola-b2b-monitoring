// Metrics Query Hooks
export {
  metricsKeys,
  useRealtimeKPI,
  useHourlyTraffic,
  useDailyTraffic,
  useTenantUsage,
  useCostTrend,
  useHeatmap,
  useErrorAnalysis,
  useAnomalyStats,
  useTokenEfficiency,
  type TokenEfficiencyData,
} from './use-metrics';

// Admin Query Hooks
export {
  adminKeys,
  // Users
  useUsers,
  useUser,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  // Roles
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  // Filters
  useFilters,
  useFilter,
  useCreateFilter,
  useUpdateFilter,
  useDeleteFilter,
  useSetDefaultFilter,
  // Analysis Sessions
  useAnalysisSessions,
  useAnalysisSession,
  useCreateAnalysisSession,
  useSendAnalysisMessage,
  useDeleteAnalysisSession,
} from './use-admin';

// Batch Schedule Hooks
export {
  batchScheduleKeys,
  useSchedules,
  useScheduleTemplates,
  useScheduleTenants,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useToggleSchedule,
} from './use-batch-schedules';

// Dashboard Combined Hooks
export {
  useBusinessDashboard,
  useOperationsDashboard,
  useAIPerformanceDashboard,
  type BusinessDashboardData,
  type OperationsDashboardData,
  type AIPerformanceDashboardData,
} from './use-dashboard';

// Report Monitoring Hooks
export {
  reportMonitoringKeys,
  useReportMonitoringHealth,
  useReportMonitoringResult,
  useRunReportCheck,
} from './use-report-monitoring';

// Quality Query Hooks
export {
  qualityKeys,
  useEfficiencyTrend,
  useQueryResponseCorrelation,
  useRepeatedPatterns,
  useQualityDashboard,
  type QualityDashboardData,
  type EfficiencyTrendData,
  type CorrelationData,
  type RepeatedQueryData,
} from './use-quality';

// User Analytics Query Hooks
export {
  userAnalyticsKeys,
  useUserList,
  useUserPatterns,
  useUserActivity,
  useProblematicRules,
  useProblematicChats,
  useProblematicStats,
  useUserAnalyticsDashboard,
  type UserAnalyticsDashboardData,
} from './use-user-analytics';

// FAQ Analysis Hooks
export {
  faqAnalysisKeys,
  useFAQTenants,
  useRunFAQAnalysis,
} from './use-faq-analysis';

// Session Analysis Hooks
export {
  sessionAnalysisKeys,
  useSessionTimeline,
  useAnalyzeSessionWithLLM,
} from './use-session-analysis';

// Log Analysis Hooks
export {
  logAnalysisKeys,
  useAnalyzeLogsWithGemini,
} from './use-log-analysis';

// ETL Hooks
export {
  etlKeys,
  // Wind
  useWindSummary,
  useWindRecentRuns,
  useWindDailyTrend,
  useWindFileStats,
  useWindErrors,
  useWindHealth,
  useWindETLDashboard,
  // Minkabu
  useMinkabuSummary,
  useMinkabuRecentRuns,
  useMinkabuDailyTrend,
  useMinkabuHeadlineStats,
  useMinkabuErrors,
  useMinkabuHealth,
  useMinkabuETLDashboard,
  // Types
  type WindETLDashboardData,
  type MinkabuETLDashboardData,
} from './use-etl';
