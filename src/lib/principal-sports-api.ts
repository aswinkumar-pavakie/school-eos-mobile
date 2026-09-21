// Principal Sports oversight -- GET /sports/overview
// (sports-admin-overview.controller.ts, @Roles('ADMIN', 'PRINCIPAL'), added
// 2026-09, real, single GET, no write path at all -- same read-only
// oversight shape as every other admin-*-overview controller Principal
// already has (media/dashboard, library/overview, fee-overview). No mobile
// screen existed for this yet -- net new, not a re-export.

import { authedRequest } from './auth';

interface ApiEnvelope<T> {
  data: T;
}

export interface SportsTeamRow {
  id: string;
  sportId: string;
  sportName: string;
  academicYearId: string;
  name: string;
  status: string;
}

export interface SportsTournamentRow {
  id: string;
  sportId: string;
  sportName: string;
  name: string;
  level: string;
  format: string | null;
  startDate: string;
  endDate: string;
  venue: string | null;
  state: string;
}

export interface SportsOverview {
  totals: {
    teams: number;
    tournaments: number;
    ongoingTournaments: number;
    upcomingFixtures: number;
    pendingOdRequests: number;
    outstandingEquipmentIssues: number;
    overdueEquipmentIssues: number;
  };
  teams: SportsTeamRow[];
  tournaments: SportsTournamentRow[];
}

export async function getSportsOverview(): Promise<SportsOverview> {
  const res = await authedRequest<ApiEnvelope<SportsOverview>>('/sports/overview');
  return res.data;
}
