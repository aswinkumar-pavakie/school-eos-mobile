// Status -> {label, tone} maps for the Community app -- same pattern as
// hostel-warden-status.ts's own complaintStatusMeta, one small pure function
// per status vocabulary, no invented statuses (these are the exact enum
// values the backend/website already use).

import type { StatusTone } from '@/components/StatusBadge';

export function proposalStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    case 'SENT_BACK':
      return { label: 'Sent back', tone: 'warning' };
    default:
      return { label: 'Pending', tone: 'neutral' };
  }
}

export function initiativeStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Completed', tone: 'positive' };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'warning' };
    default:
      return { label: 'Planned', tone: 'neutral' };
  }
}

export function membershipRequestStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: 'Pending', tone: 'neutral' };
  }
}

export function membershipStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'REMOVED':
      return { label: 'Removed', tone: 'negative' };
    default:
      return { label: 'Consent pending', tone: 'warning' };
  }
}

export function announcementStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PUBLISHED':
      return { label: 'Published', tone: 'positive' };
    case 'ARCHIVED':
      return { label: 'Archived', tone: 'negative' };
    default:
      return { label: 'Draft', tone: 'neutral' };
  }
}
