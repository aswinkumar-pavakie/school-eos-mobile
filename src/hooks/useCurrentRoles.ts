// Which role(s) the signed-in person actually holds -- the one thing that decides
// Faculty vs Parent navigation (the "My class" tab becomes "ERP" for Faculty, see
// BottomTabBar.tsx). Built on useMe() (not a second raw /auth/me query) so this
// shares the exact same ['me'] cache entry and response shape as every other
// screen that already calls useMe() -- two queries under the same key with
// different unwrapping expectations previously crashed BottomTabBar with
// "Cannot read property 'roles' of undefined" whenever useMe()'s query won the
// race to populate the cache first.

import { useMe } from '@/hooks/useMe';

export function useCurrentRoles() {
  const query = useMe();
  const roleCodes = query.data?.roles.map((r) => r.role_code) ?? [];
  return {
    person: query.data?.person ?? null,
    roleCodes,
    isFaculty: roleCodes.includes('FACULTY'),
    isHostelWarden: roleCodes.includes('HOSTEL_WARDEN'),
    isPrincipal: roleCodes.includes('PRINCIPAL'),
    isCommunity: roleCodes.includes('COMMUNITY'),
    isLoading: query.isLoading,
  };
}
