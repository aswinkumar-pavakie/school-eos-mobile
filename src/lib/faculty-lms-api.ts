// Current Term (LMS) -- real backend calls only (faculty/lms controller).
// Sensitive, class-scoped content: every write is re-validated server-side
// regardless of what this client sends.

import { authedRequest, getValidAccessToken } from './auth';
import { API_BASE_URL } from './api';

interface ApiEnvelope<T> {
  data: T;
}

export interface LmsSubjectFolder {
  subjectId: string;
  subjectName: string;
  classes: { subjectOfferingId: string; gradeName: string; sectionName: string }[];
}

export async function listLmsSubjects(): Promise<LmsSubjectFolder[]> {
  const res = await authedRequest<ApiEnvelope<LmsSubjectFolder[]>>('/faculty/lms/subjects');
  return res.data;
}

export interface LmsFile {
  id: string;
  folderId: string;
  fileName: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface LmsFolder {
  id: string;
  staffId: string;
  subjectId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  shareOfferingIds: string[];
  files: LmsFile[];
}

export async function listLmsFolders(subjectId: string): Promise<LmsFolder[]> {
  const res = await authedRequest<ApiEnvelope<LmsFolder[]>>(`/faculty/lms/subjects/${subjectId}/folders`);
  return res.data;
}

export async function getLmsFolder(folderId: string): Promise<LmsFolder> {
  const res = await authedRequest<ApiEnvelope<LmsFolder>>(`/faculty/lms/folders/${folderId}`);
  return res.data;
}

export async function createLmsFolder(input: { subjectId: string; title: string; description?: string; shareOfferingIds?: string[] }): Promise<LmsFolder> {
  const res = await authedRequest<ApiEnvelope<LmsFolder>>('/faculty/lms/folders', { method: 'POST', body: input });
  return res.data;
}

export async function updateLmsFolder(
  folderId: string,
  input: Partial<{ title: string; description: string; shareOfferingIds: string[] }>,
): Promise<LmsFolder> {
  const res = await authedRequest<ApiEnvelope<LmsFolder>>(`/faculty/lms/folders/${folderId}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteLmsFolder(folderId: string): Promise<void> {
  await authedRequest(`/faculty/lms/folders/${folderId}`, { method: 'DELETE' });
}

/** Multipart upload -- authedRequest's own JSON body helper doesn't cover
 * this, so this builds the fetch call directly, same token-refresh
 * convention as everywhere else. */
export async function uploadLmsFile(folderId: string, file: { uri: string; name: string; mimeType: string }): Promise<LmsFile[]> {
  const token = await getValidAccessToken();
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/faculty/lms/folders/${folderId}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as ApiEnvelope<LmsFile[]>;
  return json.data;
}

export async function getLmsFileUrl(fileId: string): Promise<string> {
  const res = await authedRequest<ApiEnvelope<{ url: string }>>(`/faculty/lms/files/${fileId}/url`);
  return res.data.url;
}

export async function deleteLmsFile(fileId: string): Promise<void> {
  await authedRequest(`/faculty/lms/files/${fileId}`, { method: 'DELETE' });
}

export interface LmsTask {
  id: string;
  subjectOfferingId: string;
  createdBy: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export async function listLmsTasks(subjectOfferingId: string): Promise<LmsTask[]> {
  const res = await authedRequest<ApiEnvelope<LmsTask[]>>(`/faculty/lms/tasks?subjectOfferingId=${subjectOfferingId}`);
  return res.data;
}

export async function createLmsTask(input: { subjectOfferingId: string; title: string; description?: string; dueDate?: string }): Promise<LmsTask> {
  const res = await authedRequest<ApiEnvelope<LmsTask>>('/faculty/lms/tasks', { method: 'POST', body: input });
  return res.data;
}

export async function updateLmsTask(id: string, input: Partial<{ title: string; description: string; dueDate: string; status: 'OPEN' | 'CLOSED' }>): Promise<LmsTask> {
  const res = await authedRequest<ApiEnvelope<LmsTask>>(`/faculty/lms/tasks/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteLmsTask(id: string): Promise<void> {
  await authedRequest(`/faculty/lms/tasks/${id}`, { method: 'DELETE' });
}

export interface LmsLessonPlan {
  id: string;
  subjectOfferingId: string;
  createdBy: string;
  title: string;
  content: string;
  weekStart: string | null;
  attachmentObjectKey: string | null;
  attachmentFileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listLmsLessonPlans(subjectOfferingId: string): Promise<LmsLessonPlan[]> {
  const res = await authedRequest<ApiEnvelope<LmsLessonPlan[]>>(`/faculty/lms/lesson-plans?subjectOfferingId=${subjectOfferingId}`);
  return res.data;
}

export async function createLmsLessonPlan(input: { subjectOfferingId: string; title: string; content: string; weekStart?: string }): Promise<LmsLessonPlan> {
  const res = await authedRequest<ApiEnvelope<LmsLessonPlan>>('/faculty/lms/lesson-plans', { method: 'POST', body: input });
  return res.data;
}

export async function updateLmsLessonPlan(id: string, input: Partial<{ title: string; content: string; weekStart: string }>): Promise<LmsLessonPlan> {
  const res = await authedRequest<ApiEnvelope<LmsLessonPlan>>(`/faculty/lms/lesson-plans/${id}`, { method: 'PATCH', body: input });
  return res.data;
}

export async function deleteLmsLessonPlan(id: string): Promise<void> {
  await authedRequest(`/faculty/lms/lesson-plans/${id}`, { method: 'DELETE' });
}
