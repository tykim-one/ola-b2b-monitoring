import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  usersApi,
  rolesApi,
  filtersApi,
  analysisApi,
} from '@/lib/api-client';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  SavedFilter,
  CreateFilterRequest,
  UpdateFilterRequest,
  AnalysisSession,
  CreateSessionRequest,
  SendMessageRequest,
} from '@ola/shared-types';

// ==================== Query Keys ====================

export const adminKeys = {
  all: ['admin'] as const,
  // Users
  users: () => [...adminKeys.all, 'users'] as const,
  user: (id: string) => [...adminKeys.users(), id] as const,
  // Roles
  roles: () => [...adminKeys.all, 'roles'] as const,
  role: (id: string) => [...adminKeys.roles(), id] as const,
  // Filters
  filters: () => [...adminKeys.all, 'filters'] as const,
  filter: (id: string) => [...adminKeys.filters(), id] as const,
  // Analysis Sessions
  sessions: () => [...adminKeys.all, 'sessions'] as const,
  session: (id: string) => [...adminKeys.sessions(), id] as const,
};

// ==================== Users Hooks ====================

export function useUsers(
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => usersApi.getAll(),
    ...options,
  });
}

export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// ==================== Roles Hooks ====================

export function useRoles(
  options?: Omit<UseQueryOptions<Role[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.roles(),
    queryFn: () => rolesApi.getAll(),
    ...options,
  });
}

export function useRole(
  id: string,
  options?: Omit<UseQueryOptions<Role>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.role(id),
    queryFn: () => rolesApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoleRequest) => rolesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      rolesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
      queryClient.invalidateQueries({ queryKey: adminKeys.role(id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.roles() });
    },
  });
}

// ==================== Filters Hooks ====================

export function useFilters(
  options?: Omit<UseQueryOptions<SavedFilter[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.filters(),
    queryFn: () => filtersApi.getAll(),
    ...options,
  });
}

export function useFilter(
  id: string,
  options?: Omit<UseQueryOptions<SavedFilter>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.filter(id),
    queryFn: () => filtersApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFilterRequest) => filtersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.filters() });
    },
  });
}

export function useUpdateFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFilterRequest }) =>
      filtersApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.filters() });
      queryClient.invalidateQueries({ queryKey: adminKeys.filter(id) });
    },
  });
}

export function useDeleteFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filtersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.filters() });
    },
  });
}

export function useSetDefaultFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filtersApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.filters() });
    },
  });
}

// ==================== Analysis Session Hooks ====================

export function useAnalysisSessions(
  options?: Omit<UseQueryOptions<AnalysisSession[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.sessions(),
    queryFn: () => analysisApi.getSessions(),
    ...options,
  });
}

export function useAnalysisSession(
  id: string,
  options?: Omit<UseQueryOptions<AnalysisSession>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: adminKeys.session(id),
    queryFn: () => analysisApi.getSession(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateAnalysisSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionRequest) => analysisApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.sessions() });
    },
  });
}

export function useSendAnalysisMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: SendMessageRequest;
    }) => analysisApi.sendMessage(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.session(sessionId) });
    },
  });
}

export function useDeleteAnalysisSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => analysisApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.sessions() });
    },
  });
}
