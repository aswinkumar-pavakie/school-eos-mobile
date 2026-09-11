export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderPersonId: string;
  sequence: number;
  plaintext: string;
  createdAt: string;
}
