// Types mirror school-eos-backend/src/modules/messaging exactly (MessagingService's
// ConversationSummaryDto/ConversationDetailDto/MessageDto). One shared conversation
// per ward, not one thread per teacher -- `participants` is the full authorized
// faculty set (subject teachers + class advisor, deduplicated) for that ward's
// class, always excluding the viewer themselves. There is no per-teacher subject
// name on a participant (the backend doesn't track one at the conversation level),
// so the UI shows role only ("Class Teacher"/"Subject Teacher"), never a fabricated
// subject.
//
// conversationType/directParticipant are the Principal-messaging additions: a
// 'STUDENT_CONTEXT' conversation (every conversation before this existed, and
// still every Parent<->Faculty one) keeps returning student/grade/section/
// academicYear exactly as before -- purely additive. A 'STAFF_DIRECT' thread
// (Principal <-> Faculty, no student attached) has none of those; it has
// `directParticipant` instead (the one other party, never a list -- always
// exactly 2 people in a direct thread).

export type ParticipantRole = 'PARENT' | 'SUBJECT_TEACHER' | 'CLASS_ADVISOR' | 'PRINCIPAL' | 'FACULTY_DIRECT';

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
  conversationType: 'STUDENT_CONTEXT' | 'STAFF_DIRECT';
  student?: { id: string; name: string };
  grade?: { name: string };
  section?: { name: string };
  academicYear?: { id: string; name: string };
  directParticipant?: { personId: string; name: string; role: ParticipantRole };
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

// Principal's search-a-target pickers -- deliberately narrow (just enough to
// display + pick someone to message), mirroring only the fields the backend's
// GET /messages/principal/faculty/search and .../students/search actually
// return (thin wrappers over the existing StaffService/StudentsService.list,
// themselves unchanged).
export interface FacultyDirectoryEntry {
  id: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  designation: string | null;
  photoUrl: string | null;
}

export interface StudentDirectoryEntry {
  id: string;
  personId: string;
  firstName: string;
  lastName: string | null;
  gradeName: string | null;
  sectionName: string | null;
  photoUrl: string | null;
}
