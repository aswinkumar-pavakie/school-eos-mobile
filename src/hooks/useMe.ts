// Shared "who am I" query -- the current person + their role codes, via the existing
// GET /auth/me. Lives outside src/features/* (not online-classes-specific) so any
// feature needing role-aware rendering can reuse it without importing another
// feature's internals.

import { useQuery } from '@tanstack/react-query';
import { authedRequest, type PersonSummary, type RoleSummary } from '@/lib/auth';

interface MeResponse {
  data: { person: PersonSummary; roles: RoleSummary[] };
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await authedRequest<MeResponse>('/auth/me')).data,
    staleTime: 5 * 60_000,
  });
}

export function hasRole(roles: RoleSummary[] | undefined, roleCode: string): boolean {
  return roles?.some((r) => r.role_code === roleCode) ?? false;
}
