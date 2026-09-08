// Status label/tone mapping for every Hostel Warden status vocabulary -- centralized
// here so a screen never invents its own color/label for the same backend value.

import type { StatusTone } from '@/components/StatusBadge';
import { HOSTEL_ISSUE_TYPE_LABELS, type HostelComplaintState, type HostelIssueType } from './hostel-warden-api';

export function attendanceStatusMeta(status: 'PRESENT' | 'ABSENT' | null): { label: string; tone: StatusTone } {
  if (status === 'PRESENT') return { label: 'Present', tone: 'positive' };
  if (status === 'ABSENT') return { label: 'Absent', tone: 'negative' };
  return { label: 'Not marked', tone: 'neutral' };
}

// outing_request.state -- shared by Gate Pass and Emergency Exit.
export function outingRequestStatusMeta(state: string): { label: string; tone: StatusTone } {
  switch (state) {
    case 'REQUESTED':
      return { label: 'Pending', tone: 'warning' };
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'neutral' };
    default:
      return { label: state, tone: 'neutral' };
  }
}

export function callRequestStatusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', tone: 'warning' };
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

export function visitorStatusMeta(exitedAt: string | null): { label: string; tone: StatusTone } {
  return exitedAt ? { label: 'Exited', tone: 'neutral' } : { label: 'On premises', tone: 'positive' };
}

export function complaintStatusMeta(state: HostelComplaintState): { label: string; tone: StatusTone } {
  switch (state) {
    case 'OPEN':
      return { label: 'Open', tone: 'warning' };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'warning' };
    case 'ESCALATED':
      return { label: 'Escalated', tone: 'negative' };
    case 'RESOLVED':
      return { label: 'Resolved', tone: 'positive' };
    case 'CLOSED':
      return { label: 'Closed', tone: 'neutral' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: state, tone: 'neutral' };
  }
}

export function issueTypeLabel(issueType: string): string {
  return HOSTEL_ISSUE_TYPE_LABELS[issueType as HostelIssueType] ?? issueType;
}

export function fullName(firstName: string, lastName: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}
