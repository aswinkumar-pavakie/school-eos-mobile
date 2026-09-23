// Dynamic import, not a static one -- see LazyCallScreen's own header
// comment for why: a static `import` of OnlineClassCallScreen here would
// crash this route's module evaluation (and therefore Expo Router's whole
// route table build) in any environment without the native WebRTC module,
// e.g. Expo Go.
import { LazyCallScreen } from '@/components/LazyCallScreen';

export default function OnlineClassCallRoute() {
  return (
    <LazyCallScreen
      load={() =>
        import('@/features/online-class-call/screens/OnlineClassCallScreen').then((mod) => ({
          default: mod.OnlineClassCallScreen,
        }))
      }
    />
  );
}
