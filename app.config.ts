import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic app config (TS instead of app.json) so build-time environment
 * separation (dev/preview/production) is explicit code, not three
 * hand-copied JSON files. Public runtime values go in `extra` (readable via
 * expo-constants, and bundled into the client - see src/constants/app.ts).
 * NEVER put a secret here or in an EXPO_PUBLIC_* env var - see .env.example.
 */

type AppEnv = 'development' | 'preview' | 'production';

const APP_ENV = (process.env.APP_ENV as AppEnv) ?? 'development';

const API_BASE_URL_BY_ENV: Record<AppEnv, string> = {
  development: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  // PLACEHOLDER - company must replace with the real preview/production API hosts before release.
  preview: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api-preview.PLACEHOLDER.example.com',
  production: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.PLACEHOLDER.example.com',
};

// The separate, independently-deployable School EOS Messaging microservice --
// same env-branch pattern as API_BASE_URL_BY_ENV above, deliberately its own
// env var rather than derived from apiBaseUrl (this is a genuinely different
// service, not a route on Core).
const MESSAGING_API_BASE_URL_BY_ENV: Record<AppEnv, string> = {
  development: process.env.EXPO_PUBLIC_MESSAGING_API_BASE_URL ?? 'http://localhost:3001',
  // PLACEHOLDER - company must replace with the real preview/production messaging hosts before release.
  preview: process.env.EXPO_PUBLIC_MESSAGING_API_BASE_URL ?? 'https://messaging-preview.PLACEHOLDER.example.com',
  production: process.env.EXPO_PUBLIC_MESSAGING_API_BASE_URL ?? 'https://school-eos-messaging.onrender.com',
};

// The separate AI assistant bot service (school-eos-ai-bot) -- same
// env-branch pattern as the two above. Its current value is a Cloudflare
// Tunnel URL that changes on restart, so there's no stable production
// fallback to hardcode here the way messaging has one; every env falls back
// to the same dev tunnel URL until a real one exists per environment.
const AI_BOT_BASE_URL_BY_ENV: Record<AppEnv, string> = {
  development: process.env.EXPO_PUBLIC_AI_BOT_BASE_URL ?? 'http://localhost:8000',
  preview: process.env.EXPO_PUBLIC_AI_BOT_BASE_URL ?? 'http://localhost:8000',
  production: process.env.EXPO_PUBLIC_AI_BOT_BASE_URL ?? 'http://localhost:8000',
};

// PLACEHOLDER - company must register real bundle identifiers before any store submission. See docs/release/eas.md.
const BUNDLE_IDENTIFIER = 'com.placeholder.schooleos';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'School EOS',
  slug: 'school-eos-mobile',
  scheme: 'schooleos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_IDENTIFIER,
  },
  android: {
    package: BUNDLE_IDENTIFIER,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-sqlite',
    'expo-sharing',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-notifications',
      {
        // No dedicated notification icon/sound asset exists yet -- omitting
        // `icon`/`color`/`sounds` here just falls back to the app icon and
        // system default sound, same as leaving this plugin out entirely
        // would on iOS; on Android it's what actually lets a real dev/prod
        // build register the notification channel/permission correctly.
      },
    ],
    // Parent-Teacher Meeting video calls (LiveKit). Native WebRTC code --
    // requires a Development Build, NOT usable in Expo Go (see
    // src/features/meeting-call/README.md). @config-plugins/react-native-webrtc's
    // own version table tops out at Expo 56 as of this writing; 15.0.2 (the
    // latest published) is what's installed -- verify at `expo prebuild`
    // time that this still links cleanly against Expo 57/RN 0.86, and bump
    // if a newer major has shipped by then.
    [
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission: 'Camera access is needed to join a video call.',
        microphonePermission: 'Microphone access is needed to join a video call.',
      },
    ],
    '@livekit/react-native-expo-plugin',
    // Recording playback (Online Class "Watch recording") -- plain foreground
    // playback only, no background audio or Picture-in-Picture needed.
    'expo-video',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL_BY_ENV[APP_ENV],
    messagingApiBaseUrl: MESSAGING_API_BASE_URL_BY_ENV[APP_ENV],
    aiBotBaseUrl: AI_BOT_BASE_URL_BY_ENV[APP_ENV],
    environment: APP_ENV,
    // Real EAS project id (@krishnavaruns-team/school-eos-mobile), created via `eas init`.
    // Not a secret -- just an identifier -- and `eas-cli`'s own project-linking check
    // needs to statically find this literal value in app.config.ts; it can't resolve
    // an env-var-sourced one (confirmed: `eas build` failed with "Cannot automatically
    // write to dynamic config" until this was hardcoded).
    eas: {
      projectId: '56a94647-8f67-4cca-8daa-2ee8909877f0',
    },
  },
});
