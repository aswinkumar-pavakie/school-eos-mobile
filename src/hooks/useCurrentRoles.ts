// Which role(s) the signed-in person actually holds -- the one thing that
// decides Faculty vs Parent navigation (the "My class" tab becomes "ERP" for
// Faculty, see BottomTabBar.tsx). Same ['me'] query key fees/index.tsx already
// uses for its own /auth/me call, so react-query shares one real fetch across
// every screen that needs it rather than each asking separately.

import { useQuery } from '@tanstack/react-query';
import { authedRequest, type PersonSummary, type RoleSummary } from '@/lib/auth';

interface MeResponse {
  data: { person: PersonSummary; roles: RoleSummary[] };
}

export function useCurrentRoles() {
  const query = useQuery({ queryKey: ['me'], queryFn: () => authedRequest<MeResponse>('/auth/me') });
  const roleCodes = query.data?.data.roles.map((r) => r.role_code) ?? [];
  return {
    person: query.data?.data.person ?? null,
    roleCodes,
    isFaculty: roleCodes.includes('FACULTY'),
    isLoading: query.isLoading,
  };
}
