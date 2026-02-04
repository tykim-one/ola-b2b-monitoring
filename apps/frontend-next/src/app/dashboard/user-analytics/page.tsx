'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Users, BarChart3, MessageSquare, Activity, AlertTriangle } from 'lucide-react';
import KPICard from '@/components/kpi/KPICard';
import UserListTable from '@/components/charts/UserListTable';
import UserActivityDialog from '@/components/charts/UserActivityDialog';
import UserPatternsTable from '@/components/charts/UserPatternsTable';
import ProblematicChatTable from '@/components/charts/ProblematicChatTable';
import ProblematicChatDialog from '@/components/charts/ProblematicChatDialog';
import DateRangeFilter, { type DateRange } from '@/components/ui/DateRangeFilter';
import {
  fetchUserList,
  fetchUserQuestionPatterns,
} from '@/services/userAnalyticsService';
import {
  fetchProblematicChats,
  fetchRules,
  fetchProblematicChatStats,
} from '@/services/problematicChatService';
import {
  UserListItem,
  UserQuestionPattern,
  ProblematicChat,
  ProblematicChatRule,
  ProblematicChatStats,
  getFieldDefinition,
  getOperatorDefinition,
  isCompoundConfig,
} from '@ola/shared-types';

const PROJECT_ID = 'ibks';

type TabType = 'users' | 'problematic';

export default function UserAnalyticsPage() {
  // 현재 탭
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // 유저 분석 데이터
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userPatterns, setUserPatterns] = useState<UserQuestionPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '', days: 7 });

  // 유저 다이얼로그 상태
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 문제 채팅 데이터
  const [problematicChats, setProblematicChats] = useState<ProblematicChat[]>([]);
  const [rules, setRules] = useState<ProblematicChatRule[]>([]);
  const [problematicStats, setProblematicStats] = useState<ProblematicChatStats | null>(null);
  const [problematicLoading, setProblematicLoading] = useState(false);
  const [problematicError, setProblematicError] = useState<string | null>(null);

  // 유저가 선택한 규칙 필터 (활성화된 규칙 중 유저가 on/off 하는 것)
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [rulesInitialized, setRulesInitialized] = useState(false);

  // 문제 채팅 다이얼로그 상태
  const [selectedChat, setSelectedChat] = useState<ProblematicChat | null>(null);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);

  // AbortController를 사용한 요청 취소 관리
  const abortControllerRef = useRef<AbortController | null>(null);

  // 15분마다 자동 새로고침을 위한 트리거
  const [refreshKey, setRefreshKey] = useState(0);

  // 유저 데이터 로드
  useEffect(() => {
    if (activeTab !== 'users') return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [listData, patternsData] = await Promise.all([
          fetchUserList(PROJECT_ID, dateRange.days, 9999),
          fetchUserQuestionPatterns(PROJECT_ID, undefined, dateRange.days, 9999),
        ]);

        if (!controller.signal.aborted) {
          setUserList(listData);
          setUserPatterns(patternsData);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [activeTab, dateRange.days, refreshKey]);

  // 규칙 목록 로드 (탭 전환 시 한 번만)
  useEffect(() => {
    if (activeTab !== 'problematic') return;

    const loadRules = async () => {
      try {
        const rulesData = await fetchRules();
        setRules(rulesData);
        // 최초 로드 시 활성화된 규칙 전체를 선택 상태로 설정
        if (!rulesInitialized) {
          const enabledIds = new Set(rulesData.filter((r) => r.isEnabled).map((r) => r.id));
          setSelectedRuleIds(enabledIds);
          setRulesInitialized(true);
        }
      } catch (err) {
        setProblematicError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    loadRules();
  }, [activeTab, refreshKey, rulesInitialized]);

  // 문제 채팅 데이터 로드 (선택된 규칙이 변경될 때마다 재조회)
  useEffect(() => {
    if (activeTab !== 'problematic' || !rulesInitialized) return;

    const fetchProblematicData = async () => {
      try {
        setProblematicLoading(true);
        setProblematicError(null);

        const ruleIdsArray = Array.from(selectedRuleIds);

        const [chatsData, statsData] = await Promise.all([
          fetchProblematicChats({
            days: dateRange.days,
            limit: 200,
            ruleIds: ruleIdsArray.length > 0 ? ruleIdsArray : undefined,
          }),
          fetchProblematicChatStats(dateRange.days),
        ]);

        setProblematicChats(ruleIdsArray.length > 0 ? chatsData : []);
        setProblematicStats(statsData);
      } catch (err) {
        setProblematicError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setProblematicLoading(false);
      }
    };

    fetchProblematicData();
  }, [activeTab, dateRange.days, refreshKey, rulesInitialized, selectedRuleIds]);

  // 15분마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 활성화된 규칙 목록
  const enabledRules = rules.filter((r) => r.isEnabled);

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

  // 선택된 규칙 기준으로 필터링된 통계
  const filteredStats = problematicStats
    ? {
        ...problematicStats,
        byRule: problematicStats.byRule.filter((r) => selectedRuleIds.has(r.ruleId)),
        totalCount: problematicStats.byRule
          .filter((r) => selectedRuleIds.has(r.ruleId))
          .reduce((sum, r) => sum + r.count, 0),
      }
    : null;

  // 유저 클릭 핸들러
  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUserId(null);
  };

  // 문제 채팅 상세 보기 핸들러
  const handleViewChatDetail = (chat: ProblematicChat) => {
    setSelectedChat(chat);
    setIsChatDialogOpen(true);
  };

  const handleCloseChatDialog = () => {
    setIsChatDialogOpen(false);
    setSelectedChat(null);
  };

  // 선택된 유저 정보
  const selectedUserInfo = selectedUserId
    ? userList.find((u) => u.userId === selectedUserId)
    : undefined;

  // KPI 계산
  const totalUsers = userList.length;
  const totalRequests = userList.reduce((sum, u) => sum + u.questionCount, 0);
  const totalTokens = userList.reduce((sum, u) => sum + u.totalTokens, 0);
  const avgRequestsPerUser = totalUsers > 0 ? Math.round(totalRequests / totalUsers) : 0;

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">유저 분석</h2>
          <p className="text-slate-400 mt-1">x_enc_data 기준 유저별 활동 분석</p>
        </div>

        <DateRangeFilter
          defaultPreset="week"
          onChange={(range) => setDateRange(range)}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'users'
              ? 'text-blue-400'
              : 'text-slate-400 hover:text-white'
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
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            문제 채팅
            {filteredStats && filteredStats.totalCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-600 text-white">
                {filteredStats.totalCount}
              </span>
            )}
          </div>
          {activeTab === 'problematic' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      </div>

      {/* 유저 목록 탭 */}
      {activeTab === 'users' && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                <div className="text-slate-400">데이터 로딩 중...</div>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="py-8">
              <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
                오류: {error}
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                  title="총 유저 수"
                  value={totalUsers}
                  format="number"
                  icon={<Users className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="총 질문 수"
                  value={totalRequests}
                  format="number"
                  icon={<Activity className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="총 토큰 사용량"
                  value={totalTokens}
                  format="tokens"
                  icon={<BarChart3 className="w-5 h-5" />}
                  status="neutral"
                />
                <KPICard
                  title="유저당 평균 질문"
                  value={avgRequestsPerUser}
                  format="number"
                  icon={<MessageSquare className="w-5 h-5" />}
                  status="neutral"
                />
              </div>

              {/* User List Table */}
              <div className="mb-8">
                <UserListTable
                  data={userList}
                  title={`유저 목록 (최근 ${dateRange.days}일)`}
                  onUserClick={handleUserClick}
                />
              </div>

              {/* User Patterns Table */}
              <div className="mb-8">
                <UserPatternsTable
                  data={userPatterns}
                  title={`유저별 자주 묻는 질문 패턴 (최근 ${dateRange.days}일)`}
                  maxDisplay={30}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* 문제 채팅 탭 */}
      {activeTab === 'problematic' && (
        <>
          {problematicLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
                <div className="text-slate-400">문제 채팅 분석 중...</div>
              </div>
            </div>
          )}

          {problematicError && !problematicLoading && (
            <div className="py-8">
              <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 text-rose-400">
                오류: {problematicError}
              </div>
            </div>
          )}

          {!problematicLoading && !problematicError && (
            <>
              {/* 통계 KPI (선택된 규칙 기준) */}
              {filteredStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                </div>
              )}

              {/* 규칙 필터 토글 칩 */}
              {enabledRules.length > 0 && (
                <div className="bg-slate-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-400">
                      필터링 규칙 선택
                      <span className="ml-2 text-xs text-slate-500">
                        ({selectedRuleIds.size}/{enabledRules.length}개 선택)
                      </span>
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllRules}
                        className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                      >
                        전체 선택
                      </button>
                      <button
                        onClick={handleDeselectAllRules}
                        className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
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
                              : 'bg-slate-700 text-slate-500 opacity-60 hover:opacity-80'
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

              {/* 문제 채팅 테이블 */}
              <ProblematicChatTable
                data={problematicChats}
                rules={rules}
                title={`문제 채팅 목록 (최근 ${dateRange.days}일)`}
                onViewDetail={handleViewChatDetail}
                loading={problematicLoading}
              />
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
    </div>
  );
}
