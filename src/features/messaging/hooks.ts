import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversationDetail,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  searchFacultyDirectory,
  searchStudentDirectory,
  sendMessage,
  startFacultyConversation,
  startStudentConversation,
  translateMessage,
} from './api';

export const messagingKeys = {
  all: ['messaging'] as const,
  conversations: ['messaging', 'conversations'] as const,
  conversation: (id: string) => ['messaging', 'conversations', id] as const,
  messages: (id: string) => ['messaging', 'conversations', id, 'messages'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: messagingKeys.conversations,
    queryFn: fetchConversations,
    refetchInterval: 15_000,
  });
}

export function useConversationDetail(id: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.conversation(id ?? ''),
    queryFn: () => fetchConversationDetail(id as string),
    enabled: !!id,
  });
}

export function useMessages(id: string | undefined) {
  return useQuery({
    queryKey: messagingKeys.messages(id ?? ''),
    queryFn: () => fetchMessages(id as string),
    enabled: !!id,
    refetchInterval: 5_000,
  });
}

function useInvalidateMessaging() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: messagingKeys.all });
}

export function useSendMessage(conversationId: string) {
  const invalidate = useInvalidateMessaging();
  return useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, text),
    onSuccess: () => invalidate(),
  });
}

export function useMarkConversationRead(conversationId: string) {
  const invalidate = useInvalidateMessaging();
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => invalidate(),
  });
}

export function useTranslateMessage(conversationId: string) {
  return useMutation({
    mutationFn: ({ messageId, targetLanguage }: { messageId: string; targetLanguage: string }) =>
      translateMessage(conversationId, messageId, targetLanguage),
  });
}

// ---- Principal: start a new conversation, search directories -------------------

export function useSearchFaculty(query: string) {
  return useQuery({
    queryKey: ['messaging', 'principal', 'faculty-search', query],
    queryFn: () => searchFacultyDirectory(query),
  });
}

export function useSearchStudents(query: string) {
  return useQuery({
    queryKey: ['messaging', 'principal', 'student-search', query],
    queryFn: () => searchStudentDirectory(query),
  });
}

export function useStartFacultyConversation() {
  const invalidate = useInvalidateMessaging();
  return useMutation({
    mutationFn: (facultyPersonId: string) => startFacultyConversation(facultyPersonId),
    onSuccess: () => invalidate(),
  });
}

export function useStartStudentConversation() {
  const invalidate = useInvalidateMessaging();
  return useMutation({
    mutationFn: (studentId: string) => startStudentConversation(studentId),
    onSuccess: () => invalidate(),
  });
}
