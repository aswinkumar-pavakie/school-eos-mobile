import type { ParticipantRole, ParticipantSummary } from './types';

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  PARENT: 'Parent',
  SUBJECT_TEACHER: 'Subject Teacher',
  CLASS_ADVISOR: 'Class Teacher',
};

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** The conversation is shared by every authorized teacher for the ward's class, not
 * one thread per teacher (see feature README) -- but from a PARENT's own view, the
 * screen shows a single named teacher contact rather than a "+N more" summary: the
 * class advisor if one is participating, else the first subject teacher. */
export function primaryTeacherContact(participants: ParticipantSummary[]): ParticipantSummary | null {
  const teachers = participants.filter((p) => p.role !== 'PARENT');
  if (teachers.length === 0) return null;
  return teachers.find((p) => p.role === 'CLASS_ADVISOR') ?? teachers[0]!;
}

/** The parent participant, for a FACULTY's own view of the conversation. */
export function findParentContact(participants: ParticipantSummary[]): ParticipantSummary | null {
  return participants.find((p) => p.role === 'PARENT') ?? null;
}

/** "09:12" for today, "Yesterday", or "2 Sept" for anything older -- matches the
 * provided design's list-row timestamp style. */
export function formatConversationTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
