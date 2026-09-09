// Principal Communities module -- GET /communities and its memberships/
// activities/announcements sub-resources already grant PRINCIPAL the
// identical class-level access as VICE_PRINCIPAL and COMMUNITY (confirmed by
// direct backend audit: communities/community-activities/community-
// memberships/community-announcements.controller.ts, every write method
// stays ADMIN or ADMIN+COMMUNITY only). This is the school's own Communities/
// PTA module -- distinct from the standalone COMMUNITY login/application,
// never redirected there. Re-exporting the already-correct VP module rather
// than duplicating it.

export {
  listCommunities,
  getCommunity,
  listCommunityActivities,
  listCommunityMemberships,
  listCommunityAnnouncements,
  type CommunityRow,
  type CommunityListParams,
  type CommunityActivityRow,
  type CommunityMembershipRow,
  type CommunityAnnouncementRow,
} from './vice-principal-communities-api';
