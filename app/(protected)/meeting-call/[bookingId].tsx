// Dynamic import, not a static one -- see LazyCallScreen's own header
// comment for why: a static `import` of MeetingCallScreen here would crash
// this route's module evaluation (and therefore Expo Router's whole route
// table build) in any environment without the native WebRTC module, e.g.
// Expo Go.
import { LazyCallScreen } from '@/components/LazyCallScreen';
// The WebView room has no native dependency, so a static import is safe here --
// it is what runs when the native screen can't load (Expo Go).
import { MeetingCallWebScreen } from '@/features/meeting-call/screens/MeetingCallWebScreen';

export default function MeetingCallRoute() {
  return (
    <LazyCallScreen
      Fallback={MeetingCallWebScreen}
      load={() =>
        import('@/features/meeting-call/screens/MeetingCallScreen').then((mod) => ({
          default: mod.MeetingCallScreen,
        }))
      }
    />
  );
}
