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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: API_BASE_URL_BY_ENV[APP_ENV],
    environment: APP_ENV,
    // PLACEHOLDER - company must run `eas init` and replace this with the real project ID before EAS builds.
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'PLACEHOLDER-EAS-PROJECT-ID',
    },
  },
});
