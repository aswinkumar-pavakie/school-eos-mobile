import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addOnlineClassRecording,
  cancelOnlineClass,
  completeOnlineClass,
  fetchMyTeachingOfferings,
  fetchOnlineClassDetail,
  fetchOnlineClasses,
  joinOnlineClass,
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

export function useOnlineClassesList(view: OnlineClassView) {
  return useQuery({
    queryKey: onlineClassKeys.list(view),
    queryFn: () => fetchOnlineClasses(view),
  });
}

export function useOnlineClassDetail(id: string | undefined) {
  return useQuery({
    queryKey: onlineClassKeys.detail(id ?? ''),
    queryFn: () => fetchOnlineClassDetail(id as string),
    enabled: !!id,
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

// Join is a read (no cache invalidation needed) but still a mutation-shaped call
// since it's user-triggered on demand rather than fetched eagerly with the detail
// screen -- the meeting link/state should reflect the moment the parent taps Join,
// not a possibly-stale cached detail response.
export function useJoinOnlineClass() {
  return useMutation({
    mutationFn: (id: string) => joinOnlineClass(id),
  });
}
