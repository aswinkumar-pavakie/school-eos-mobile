import { useLocalSearchParams } from 'expo-router';
import { ConversationScreen } from '@/features/messaging/screens/ConversationScreen';

export default function ConversationRoute() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return <ConversationScreen conversationId={conversationId} />;
}
