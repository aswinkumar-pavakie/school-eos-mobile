// Types mirror school-eos-backend/src/modules/messaging exactly (MessagingService's
// ConversationSummaryDto/ConversationDetailDto/MessageDto). One shared conversation
// per ward, not one thread per teacher -- `participants` is the full authorized
// faculty set (subject teachers + class advisor, deduplicated) for that ward's
// class, always excluding the viewer themselves. There is no per-teacher subject
// name on a participant (the backend doesn't track one at the conversation level),
// so the UI shows role only ("Class Teacher"/"Subject Teacher"), never a fabricated
// subject.

export type ParticipantRole = 'PARENT' | 'SUBJECT_TEACHER' | 'CLASS_ADVISOR';

export interface ParticipantSummary {
  personId: string;
  name: string;
  role: ParticipantRole;
}

export interface MessageSummary {
  id: string;
  senderPersonId: string;
  text: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  student: { id: string; name: string };
  grade: { name: string };
  section: { name: string };
  academicYear: { id: string; name: string };
  participants: ParticipantSummary[];
  lastMessage: MessageSummary | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface ConversationDetail extends ConversationSummary {
  ownLastReadAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: { personId: string; name: string; role: ParticipantRole };
  text: string;
  createdAt: string;
  readAt: string | null;
  status: 'SENT';
}

export interface MessagesPage {
  items: Message[];
  meta: { hasMore: boolean; nextCursor: string | null };
}

export interface TranslateMessageResult {
  messageId: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
}
