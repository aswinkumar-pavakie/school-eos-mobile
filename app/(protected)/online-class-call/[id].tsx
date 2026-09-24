// Dynamic import, not a static one -- see LazyCallScreen's own header
// comment for why: a static `import` of OnlineClassCallScreen here would
// crash this route's module evaluation (and therefore Expo Router's whole
// route table build) in any environment without the native WebRTC module,
// e.g. Expo Go.
import { LazyCallScreen } from '@/components/LazyCallScreen';
// The WebView room has no native dependency, so a static import is safe here --
// it is what runs when the native screen can't load (Expo Go).
import { OnlineClassCallWebScreen } from '@/features/online-class-call/screens/OnlineClassCallWebScreen';

export default function OnlineClassCallRoute() {
  return (
    <LazyCallScreen
      Fallback={OnlineClassCallWebScreen}
      load={() =>
        import('@/features/online-class-call/screens/OnlineClassCallScreen').then((mod) => ({
          default: mod.OnlineClassCallScreen,
        }))
      }
    />
  );
}
