// Dynamic import, not a static one -- see LazyCallScreen's own header
// comment for why: a static `import` of MeetingCallScreen here would crash
// this route's module evaluation (and therefore Expo Router's whole route
// table build) in any environment without the native WebRTC module, e.g.
// Expo Go.
import { LazyCallScreen } from '@/components/LazyCallScreen';

export default function MeetingCallRoute() {
  return (
    <LazyCallScreen
      load={() =>
        import('@/features/meeting-call/screens/MeetingCallScreen').then((mod) => ({
          default: mod.MeetingCallScreen,
        }))
      }
    />
  );
}
