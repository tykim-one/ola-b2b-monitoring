'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  BarChart3,
  MessageSquare,
  Activity,
  AlertTriangle,
  User,
  CheckCircle,
  XCircle,
  Coins,
  Calendar,
  ExternalLink,
  Eye,
  Clock,
  Hash,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Dashboard } from '@/components/compound/Dashboard';
import { DataTable, type Column } from '@/components/compound/DataTable';
import KPICard from '@/components/kpi/KPICard';
import UserActivityDialog from '@/components/charts/UserActivityDialog';
import ProblematicChatDialog from '@/components/charts/ProblematicChatDialog';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import {
  useUserAnalyticsDashboard,
  useProblematicRules,
  useProblematicChats,
  useProblematicStats,
} from '@/hooks/queries/use-user-analytics';
import {
  type ProblematicChat,
  type ProblematicChatRule,
  getFieldDefinition,
  getOperatorDefinition,
  isCompoundConfig,
} from '@ola/shared-types';
import type { UserListItem, UserQuestionPattern } from '@ola/shared-types';
import { PROJECT_ID } from '@/lib/config';

type TabType = 'users' | 'problematic';

export default function UserAnalyticsPage() {
  // Tab & date state
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  // Dialog state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ProblematicChat | null>(null);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);

  // Rule filter state
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [rulesInitialized, setRulesInitialized] = useState(false);

  // ---- Data hooks ----

  // Users tab data
  const {
    userList,
    userPatterns,
    kpis,
    isLoading: usersLoading,
    error: usersError,
  } = useUserAnalyticsDashboard(PROJECT_ID, dateRange.days, activeTab === 'users');

  // Rules (loaded when problematic tab active)
  const { data: rules = [] } = useProblematicRules({
    enabled: activeTab === 'problematic',
  });

  // Initialize selected rules when first loaded
  useEffect(() => {
    if (rules.length > 0 && !rulesInitialized) {
      const enabledIds = new Set(rules.filter((r) => r.isEnabled).map((r) => r.id));
      // Use a timeout to avoid setting state during render
      setTimeout(() => {
        setSelectedRuleIds(enabledIds);
        setRulesInitialized(true);
      }, 0);
    }
  }, [rules, rulesInitialized]);

  // Problematic chats & stats
  const ruleIdsArray = useMemo(() => Array.from(selectedRuleIds), [selectedRuleIds]);

  const {
    data: problematicChats = [],
    isLoading: problematicLoading,
  } = useProblematicChats(
    dateRange.days,
    rulesInitialized ? ruleIdsArray : undefined,
  );

  const { data: problematicStats = null } = useProblematicStats(dateRange.days, {
    enabled: activeTab === 'problematic' && rulesInitialized,
  });

  // ---- Derived data ----

  const enabledRules = useMemo(() => rules.filter((r) => r.isEnabled), [rules]);

  // Show empty array when no rules selected (matches original behavior)
  const displayChats = ruleIdsArray.length > 0 ? problematicChats : [];

  const filteredStats = useMemo(() => {
    if (!problematicStats) return null;
    const byRule = problematicStats.byRule.filter((r) => selectedRuleIds.has(r.ruleId));
    return {
      ...problematicStats,
      byRule,
      totalCount: byRule.reduce((sum, r) => sum + r.count, 0),
    };
  }, [problematicStats, selectedRuleIds]);

  const selectedUserInfo = selectedUserId
    ? userList.find((u) => u.userId === selectedUserId)
    : undefined;

  // Determine error based on active tab
  const error = activeTab === 'users' ? usersError : null;

  // ---- Handlers ----

  const handleToggleRule = (ruleId: string) => {
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const handleSelectAllRules = () => {
    setSelectedRuleIds(new Set(enabledRules.map((r) => r.id)));
  };

  const handleDeselectAllRules = () => {
    setSelectedRuleIds(new Set());
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUserId(null);
  };

  const handleViewChatDetail = (chat: ProblematicChat) => {
    setSelectedChat(chat);
    setIsChatDialogOpen(true);
  };

  const handleCloseChatDialog = () => {
    setIsChatDialogOpen(false);
    setSelectedChat(null);
  };

  const router = useRouter();

  // ---- Helper functions for table rendering ----
  const formatDate = (date: string): string => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  const truncateText = (text: string, maxLength: number = 50): string => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const truncateUserId = (userId: string, maxLen: number = 20): string => {
    if (userId.length <= maxLen) return userId;
    return `${userId.substring(0, maxLen)}...`;
  };

  const getRuleColor = (ruleName: string) => {
    const rule = rules.find((r: ProblematicChatRule) => r.name === ruleName);
    if (!rule) return 'bg-gray-300';
    if (isCompoundConfig(rule.config)) return 'bg-purple-600';
    const fieldDef = getFieldDefinition(rule.config.field);
    if (!fieldDef) return 'bg-gray-300';
    if (fieldDef.dataType === 'numeric') return 'bg-amber-600';
    if (fieldDef.dataType === 'text') return 'bg-rose-600';
    if (fieldDef.dataType === 'boolean') return 'bg-cyan-600';
    return 'bg-gray-300';
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ---- Column definitions ----

  const userListColumns: Column<UserListItem>[] = [
    {
      key: 'userId', header: '유저 ID',
      render: (v) => (
        <span className="text-blue-400 text-xs hover:underline" title={v as string}>
          {truncateUserId(v as string)}
        </span>
      ),
    },
    { key: 'questionCount', header: '질문수', sortable: true, align: 'center',
      render: (v) => <span className="font-medium">{(v as number).toLocaleString()}</span>,
    },
    { key: 'successRate', header: '성공률', sortable: true, align: 'center',
      render: (v) => (
        <span className={`font-medium ${(v as number) >= 90 ? 'text-emerald-400' : (v as number) >= 70 ? 'text-yellow-400' : 'text-rose-400'}`}>
          {(v as number).toFixed(1)}%
        </span>
      ),
    },
    { key: 'totalTokens', header: '총 토큰', sortable: true, align: 'center',
      render: (v) => <span className="text-gray-600">{(v as number).toLocaleString()}</span>,
    },
    { key: 'avgTokens', header: '평균 토큰', sortable: true, align: 'center',
      render: (v) => <span className="text-gray-500">{(v as number).toFixed(0)}</span>,
    },
    { key: 'errorCount', header: '에러', sortable: true, align: 'center',
      render: (v) => (
        <span className={`font-medium ${(v as number) > 10 ? 'text-rose-400' : (v as number) > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
          {v as number}
        </span>
      ),
    },
    { key: 'firstActivity', header: '첫 활동', align: 'center',
      render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
    },
    { key: 'lastActivity', header: '마지막 활동', sortable: true, align: 'center',
      render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
    },
    { key: 'profile' as any, header: '프로필', align: 'center',
      className: 'w-20',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/user-analytics/${encodeURIComponent((row as UserListItem).userId)}`);
          }}
          className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 transition-colors"
          title="프로필 보기"
        >
          <ExternalLink size={14} />
        </button>
      ),
    },
  ];

  const patternColumns: Column<UserQuestionPattern>[] = [
    { key: 'userId', header: '유저 ID',
      render: (v) => (
        <span className="text-blue-400 text-xs" title={v as string}>
          {truncateUserId(v as string, 16)}
        </span>
      ),
    },
    { key: 'question', header: '질문 패턴',
      render: (v) => (
        <span className="text-gray-900 truncate block max-w-[350px]" title={v as string}>
          {v as string}
        </span>
      ),
    },
    { key: 'frequency', header: '빈도', align: 'center',
      render: (v) => (
        <span className={`font-medium ${(v as number) >= 10 ? 'text-rose-400' : (v as number) >= 5 ? 'text-yellow-400' : 'text-emerald-400'}`}>
          {v as number}회
        </span>
      ),
    },
    { key: 'lastAsked', header: '최근 질문', align: 'center',
      render: (v) => <span className="text-gray-500 text-xs">{formatDate(v as string)}</span>,
    },
  ];

  const problematicColumns: Column<ProblematicChat>[] = [
    { key: 'timestamp', header: '시간', sortable: true,
      render: (v) => <span className="text-gray-600 whitespace-nowrap">{formatTimestamp(v as string)}</span>,
    },
    { key: 'userId', header: '유저',
      render: (v) => <span className="text-gray-600 text-xs truncate max-w-[180px]" title={v as string}>{(v as string) || '-'}</span>,
    },
    { key: 'userInput', header: '입력',
      render: (v) => <span title={v as string}>{truncateText(v as string)}</span>,
    },
    { key: 'llmResponse', header: '응답',
      render: (v) => <span className="text-gray-500" title={v as string}>{truncateText(v as string)}</span>,
    },
    { key: 'outputTokens', header: '토큰', sortable: true, align: 'center',
      render: (v) => (
        <span className={(v as number) < 1500 ? 'text-amber-400' : ''}>
          {(v as number).toLocaleString()}
        </span>
      ),
    },
    { key: 'matchedRules', header: '매칭 규칙',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {(row as ProblematicChat).matchedRules.map((name: string) => (
            <span key={name} className={`px-2 py-0.5 text-xs rounded-full text-white ${getRuleColor(name)}`}>
              {name}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'id', header: '액션', align: 'center',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleViewChatDetail(row as ProblematicChat); }}
          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
          title="상세 보기"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // Summary stats for userList
  const { totalUsers, totalQuestions, avgSuccessRate } = useMemo(() => {
    const total = userList.length;
    const questions = userList.reduce((sum: number, d: UserListItem) => sum + d.questionCount, 0);
    const avgRate = total > 0 ? userList.reduce((sum: number, d: UserListItem) => sum + d.successRate, 0) / total : 0;
    return { totalUsers: total, totalQuestions: questions, avgSuccessRate: avgRate };
  }, [userList]);

  // Summary stats for userPatterns
  const { uniquePatternUsers, totalPatterns, totalFrequency } = useMemo(() => ({
    uniquePatternUsers: new Set(userPatterns.map((p: UserQuestionPattern) => p.userId)).size,
    totalPatterns: userPatterns.length,
    totalFrequency: userPatterns.reduce((sum: number, d: UserQuestionPattern) => sum + d.frequency, 0),
  }), [userPatterns]);

  return (
    <Dashboard isLoading={false} error={error as Error | null}>
      <Dashboard.Header
        title="유저 분석"
        description="x_enc_data 기준 유저별 활동 분석"
        rightContent={
          <DateRangeFilter
            defaultPreset="week"
            onChange={(range) => setDateRange(range)}
          />
        }
      />

      <Dashboard.Error />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-blue-400'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            유저 목록
          </div>
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('problematic')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'problematic'
              ? 'text-amber-400'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            문제 채팅
            {filteredStats && filteredStats.totalCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-600 text-gray-900">
                {filteredStats.totalCount}
              </span>
            )}
          </div>
          {activeTab === 'problematic' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {usersLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                <div className="text-gray-500">데이터 로딩 중...</div>
              </div>
            </div>
          )}

          {usersError && !usersLoading && (
            <div className="py-8">
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-400">
                오류: {usersError instanceof Error ? usersError.message : String(usersError)}
              </div>
            </div>
          )}

          {!usersLoading && !usersError && (
            <>
              {/* KPI Cards */}
              <Dashboard.KPISection columns={4}>
                <KPICard
                  title="총 유저 수"
                  value={kpis.totalUsers}
                  format="number"
                  icon={<Users className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="총 질문 수"
                  value={kpis.totalRequests}
                  format="number"
                  icon={<Activity className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="총 토큰 사용량"
                  value={kpis.totalTokens}
                  format="tokens"
                  icon={<BarChart3 className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="유저당 평균 질문"
                  value={kpis.avgRequestsPerUser}
                  format="number"
                  icon={<MessageSquare className="w-5 h-5" />}
                  status="neutral"
                />
              </Dashboard.KPISection>

              {/* User List Table */}
              <div className="mb-8">
                <DataTable data={userList} columns={userListColumns} searchFields={['userId'] as (keyof UserListItem)[]} rowKey={(row: UserListItem) => row.userId}>
                  <DataTable.Toolbar>
                    <DataTable.Search placeholder="유저 ID 검색..." />
                    <DataTable.Stats>
                      <DataTable.StatItem label="총 유저" value={`${totalUsers.toLocaleString()}명`} colorClass="text-blue-400" />
                      <DataTable.StatItem label="총 질문" value={`${totalQuestions.toLocaleString()}개`} colorClass="text-purple-400" />
                      <DataTable.StatItem label="평균 성공률" value={`${avgSuccessRate.toFixed(1)}%`} colorClass="text-emerald-400" />
                    </DataTable.Stats>
                  </DataTable.Toolbar>
                  <DataTable.Content>
                    <DataTable.Header />
                    <DataTable.Body
                      onRowClick={(row: UserListItem) => handleUserClick(row.userId)}
                      emptyMessage="데이터가 없습니다"
                    />
                  </DataTable.Content>
                  <DataTable.Pagination pageSize={20} />
                </DataTable>
              </div>

              {/* User Patterns Table */}
              <div className="mb-8">
                <DataTable data={userPatterns.slice(0, 30)} columns={patternColumns} searchFields={['userId'] as (keyof UserQuestionPattern)[]}>
                  <DataTable.Toolbar>
                    <DataTable.Search placeholder="유저 ID 검색..." />
                    <DataTable.Stats>
                      <DataTable.StatItem label="유저 수" value={`${uniquePatternUsers}명`} colorClass="text-blue-400" />
                      <DataTable.StatItem label="총 패턴" value={`${totalPatterns}개`} colorClass="text-purple-400" />
                      <DataTable.StatItem label="총 빈도" value={`${totalFrequency.toLocaleString()}회`} colorClass="text-emerald-400" />
                    </DataTable.Stats>
                  </DataTable.Toolbar>
                  <DataTable.Content>
                    <DataTable.Header />
                    <DataTable.Body
                      expandable
                      renderExpandedRow={(row: UserQuestionPattern) => (
                        <div className="space-y-3">
                          <div>
                            <div className="text-gray-500 text-xs mb-1">전체 유저 ID:</div>
                            <div className="text-blue-400 bg-white p-2 rounded text-xs break-all">{row.userId}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">전체 질문:</div>
                            <div className="text-gray-900 bg-white p-3 rounded-lg text-sm break-all">{row.question}</div>
                          </div>
                        </div>
                      )}
                      emptyMessage="데이터가 없습니다"
                    />
                  </DataTable.Content>
                  <DataTable.Footer />
                </DataTable>
                {userPatterns.length > 30 && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    상위 30개 패턴 표시 중 (전체 {userPatterns.length}개)
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Problematic Tab */}
      {activeTab === 'problematic' && (
        <>
          {problematicLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
                <div className="text-gray-500">문제 채팅 분석 중...</div>
              </div>
            </div>
          )}

          {!problematicLoading && (
            <>
              {/* Stats KPI (filtered by selected rules) */}
              {filteredStats && (
                <Dashboard.KPISection columns={4}>
                  <KPICard
                    title="문제 채팅 수"
                    value={filteredStats.totalCount}
                    format="number"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    status={filteredStats.totalCount > 50 ? 'warning' : 'neutral'}
                  />
                  {filteredStats.byRule.slice(0, 3).map((rule) => (
                    <KPICard
                      key={rule.ruleId}
                      title={rule.ruleName}
                      value={rule.count}
                      format="number"
                      subtitle={`${rule.percentage}%`}
                      icon={<AlertTriangle className="w-5 h-5" />}
                      status="warning"
                    />
                  ))}
                </Dashboard.KPISection>
              )}

              {/* Rule filter toggle chips */}
              {enabledRules.length > 0 && (
                <div className="bg-white rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-500">
                      필터링 규칙 선택
                      <span className="ml-2 text-xs text-gray-400">
                        ({selectedRuleIds.size}/{enabledRules.length}개 선택)
                      </span>
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllRules}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      >
                        전체 선택
                      </button>
                      <button
                        onClick={handleDeselectAllRules}
                        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      >
                        전체 해제
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {enabledRules.map((rule) => {
                      const isSelected = selectedRuleIds.has(rule.id);
                      let typeColor = 'bg-cyan-600';
                      let summary = '';
                      if (isCompoundConfig(rule.config)) {
                        typeColor = 'bg-purple-600';
                        summary = `${rule.config.conditions.length}개 조건 (${rule.config.logic})`;
                      } else {
                        const fieldDef = getFieldDefinition(rule.config.field);
                        const opDef = getOperatorDefinition(rule.config.operator);
                        typeColor =
                          fieldDef?.dataType === 'numeric'
                            ? 'bg-amber-600'
                            : fieldDef?.dataType === 'text'
                              ? 'bg-rose-600'
                              : 'bg-cyan-600';
                        summary = Array.isArray(rule.config.value)
                          ? `${(rule.config.value as string[]).length}개 키워드`
                          : `${opDef?.label || rule.config.operator} ${rule.config.value}`;
                      }
                      return (
                        <button
                          key={rule.id}
                          onClick={() => handleToggleRule(rule.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer select-none ${
                            isSelected
                              ? `${typeColor} text-white shadow-lg`
                              : 'bg-gray-100 text-gray-400 opacity-60 hover:opacity-80'
                          }`}
                        >
                          <span className="font-medium">{rule.name}</span>
                          <span className="ml-2 text-xs opacity-75">{summary}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Problematic Chat Table */}
              <DataTable data={displayChats} columns={problematicColumns} rowKey="id">
                <DataTable.Toolbar>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {`문제 채팅 목록 (최근 ${dateRange.days}일)`}
                  </h3>
                  <span className="text-sm text-gray-500">{displayChats.length}건</span>
                </DataTable.Toolbar>
                <DataTable.Content>
                  <DataTable.Header />
                  <DataTable.Body
                    emptyMessage="필터링 조건에 맞는 문제 채팅이 없습니다."
                    emptyIcon={<AlertTriangle className="w-12 h-12 text-gray-300" />}
                  />
                </DataTable.Content>
                <DataTable.Footer />
              </DataTable>
            </>
          )}
        </>
      )}

      {/* User Activity Dialog */}
      {selectedUserId && (
        <UserActivityDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          userId={selectedUserId}
          userInfo={selectedUserInfo}
          projectId={PROJECT_ID}
        />
      )}

      {/* Problematic Chat Dialog */}
      <ProblematicChatDialog
        isOpen={isChatDialogOpen}
        onClose={handleCloseChatDialog}
        chat={selectedChat}
        rules={rules}
      />
    </Dashboard>
  );
}
