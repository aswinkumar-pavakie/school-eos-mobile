// TanStack Query hooks for Permissions -- mirrors messaging/hooks.ts's query-key
// factory + invalidate-on-mutation pattern exactly.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelPermissionActivity,
  consentPermissionRequest,
  createPermissionActivity,
  declinePermissionRequest,
  fetchMyPermissionSections,
  fetchPermissionActivities,
  fetchPermissionActivityRequests,
  fetchPermissionActivityStatus,
  fetchPermissionRequestDetail,
  fetchPermissionRequests,
} from './api';
import type { CreatePermissionActivityInput } from './types';

export const permissionsKeys = {
  all: ['permissions'] as const,
  requests: ['permissions', 'requests'] as const,
  request: (id: string) => ['permissions', 'requests', id] as const,
  activities: ['permissions', 'activities'] as const,
  activityStatus: (id: string) => ['permissions', 'activities', id, 'status'] as const,
  activityRequests: (id: string) => ['permissions', 'activities', id, 'requests'] as const,
  mySections: ['permissions', 'my-sections'] as const,
};

function useInvalidatePermissions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: permissionsKeys.all });
}

// ---- Parent ------------------------------------------------------------------------

export function usePermissionRequests() {
  return useQuery({
    queryKey: permissionsKeys.requests,
    queryFn: fetchPermissionRequests,
  });
}

export function usePermissionRequestDetail(id: string | undefined) {
  return useQuery({
    queryKey: permissionsKeys.request(id ?? ''),
    queryFn: () => fetchPermissionRequestDetail(id as string),
    enabled: !!id,
  });
}

export function useConsentPermissionRequest() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: (id: string) => consentPermissionRequest(id),
    onSuccess: () => invalidate(),
  });
}

export function useDeclinePermissionRequest() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => declinePermissionRequest(id, reason),
    onSuccess: () => invalidate(),
  });
}

// ---- Faculty ------------------------------------------------------------------------

export function usePermissionActivities() {
  return useQuery({
    queryKey: permissionsKeys.activities,
    queryFn: fetchPermissionActivities,
  });
}

export function usePermissionActivityStatus(id: string | undefined) {
  return useQuery({
    queryKey: permissionsKeys.activityStatus(id ?? ''),
    queryFn: () => fetchPermissionActivityStatus(id as string),
    enabled: !!id,
  });
}

export function usePermissionActivityRequests(id: string | undefined) {
  return useQuery({
    queryKey: permissionsKeys.activityRequests(id ?? ''),
    queryFn: () => fetchPermissionActivityRequests(id as string),
    enabled: !!id,
  });
}

export function useMyPermissionSections() {
  return useQuery({
    queryKey: permissionsKeys.mySections,
    queryFn: fetchMyPermissionSections,
    staleTime: 5 * 60_000,
  });
}

export function useCreatePermissionActivity() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: (input: CreatePermissionActivityInput) => createPermissionActivity(input),
    onSuccess: () => invalidate(),
  });
}

export function useCancelPermissionActivity() {
  const invalidate = useInvalidatePermissions();
  return useMutation({
    mutationFn: (id: string) => cancelPermissionActivity(id),
    onSuccess: () => invalidate(),
  });
}
