// Library -- real backend calls only (faculty/library controller, additive
// over the existing Library module). No "E-resources" tab -- that concept
// doesn't exist anywhere in this schema (physical library only); the design's
// own E-resources tab is dropped rather than faked.

import { authedRequest } from './auth';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  categoryName: string | null;
  status: string;
  copiesSummary: { total: number; available: number; issued: number };
}

export async function searchLibraryBooks(search: string): Promise<{ data: LibraryBook[]; meta?: unknown }> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return authedRequest<{ data: LibraryBook[]; meta?: unknown }>(`/faculty/library/books${qs}`);
}

export interface LibraryIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  copyCode: string;
  memberId: string;
  issuedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';
  isOverdue: boolean;
  daysOverdue: number;
}

export async function listMyIssues(status?: string): Promise<{ data: LibraryIssue[]; meta?: unknown; hasLibraryCard: boolean }> {
  const qs = status ? `?status=${status}` : '';
  return authedRequest<{ data: LibraryIssue[]; meta?: unknown; hasLibraryCard: boolean }>(`/faculty/library/my-issues${qs}`);
}
