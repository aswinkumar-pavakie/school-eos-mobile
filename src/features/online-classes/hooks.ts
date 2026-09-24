import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addOnlineClassRecording,
  cancelOnlineClass,
  completeOnlineClass,
  fetchMyTeachingOfferings,
  fetchOnlineClassDetail,
  fetchOnlineClasses,
  rescheduleOnlineClass,
  scheduleOnlineClass,
  startOnlineClass,
} from './api';
import type {
  CancelOnlineClassRequest,
  OnlineClassView,
  RecordingRequest,
  RescheduleOnlineClassRequest,
  ScheduleOnlineClassRequest,
} from './types';

// Query key convention: everything under the 'online-classes' root so a single
// invalidate(['online-classes']) after any write refreshes both the list (any view)
// and any open detail screen.
export const onlineClassKeys = {
  all: ['online-classes'] as const,
  list: (view: OnlineClassView) => ['online-classes', 'list', view] as const,
  detail: (id: string) => ['online-classes', 'detail', id] as const,
};

export function useMyTeachingOfferings() {
  return useQuery({
    queryKey: ['online-classes', 'my-subject-offerings'],
    queryFn: fetchMyTeachingOfferings,
    staleTime: 5 * 60_000,
  });
}

// A class going Live (or being cancelled/rescheduled) has to show up on the other
// side without a manual pull-to-refresh: a parent waiting to join must see
// "Live now" as soon as the teacher starts. React Query only polls while the
// app is in the foreground.
const LIVE_REFRESH_MS = 15_000;

export function useOnlineClassesList(view: OnlineClassView) {
  return useQuery({
    queryKey: onlineClassKeys.list(view),
    queryFn: () => fetchOnlineClasses(view),
    refetchInterval: LIVE_REFRESH_MS,
    refetchOnMount: 'always',
  });
}

export function useOnlineClassDetail(id: string | undefined) {
  return useQuery({
    queryKey: onlineClassKeys.detail(id ?? ''),
    queryFn: () => fetchOnlineClassDetail(id as string),
    enabled: !!id,
    refetchInterval: LIVE_REFRESH_MS,
    refetchOnMount: 'always',
  });
}

function useInvalidateOnlineClasses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: onlineClassKeys.all });
}

export function useScheduleOnlineClass() {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: (body: ScheduleOnlineClassRequest) => scheduleOnlineClass(body),
    onSuccess: () => invalidate(),
  });
}

export function useRescheduleOnlineClass(id: string) {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: (body: RescheduleOnlineClassRequest) => rescheduleOnlineClass(id, body),
    onSuccess: () => invalidate(),
  });
}

export function useCancelOnlineClass(id: string) {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: (body: CancelOnlineClassRequest) => cancelOnlineClass(id, body),
    onSuccess: () => invalidate(),
  });
}

export function useStartOnlineClass(id: string) {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: () => startOnlineClass(id),
    onSuccess: () => invalidate(),
  });
}

export function useCompleteOnlineClass(id: string) {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: () => completeOnlineClass(id),
    onSuccess: () => invalidate(),
  });
}

export function useAddOnlineClassRecording(id: string) {
  const invalidate = useInvalidateOnlineClasses();
  return useMutation({
    mutationFn: (body: RecordingRequest) => addOnlineClassRecording(id, body),
    onSuccess: () => invalidate(),
  });
}

// Join/Start no longer have a hook here -- they navigate straight to
// online-class-call/[id], which requests its own LiveKit token on mount (see
// OnlineClassCallScreen). Invalidate the list on return so a SCHEDULED row that
// just went LIVE (or LIVE -> COMPLETED after End) reflects promptly; see each
// screen's router focus-effect for where that invalidation happens.
