// Metro (Expo's bundler) has no built-in awareness of *.test.* files -- unlike
// Jest, which only picks up files matching its own testMatch. expo-router's
// file-based routing scans EVERY file under app/ as a candidate route by default,
// so a *.test.tsx colocated next to a route file (e.g.
// app/(protected)/hostel-warden/visitors/index.test.tsx) gets bundled into the
// real app too -- and since @testing-library/react-native pulls in Node's own
// `console` module (which the native runtime doesn't have), that breaks Android/iOS
// bundling entirely. This blockList keeps every *.test.* file (and __tests__
// directories, for the same reason) out of Metro's bundle regardless of where in
// the tree they live, without affecting Jest at all (Jest never goes through
// Metro).

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  /\.test\.[jt]sx?$/,
  /\/__tests__\//,
];

// Metro's unstable_enablePackageExports mis-resolves engine.io-client's own
// internal ESM relative imports (e.g. "./contrib/parseuri.js" from its own
// build/esm/index.js) -- the target file genuinely exists on disk, but
// Metro's exports-map-aware resolution still reports it missing under the
// "import" condition. socket.io-client (used by the messaging feature) pulls
// this in transitively. Scoped workaround: for resolutions that touch this
// package, fall back to plain (non-exports-map) resolution instead of
// disabling package-exports resolution for every dependency.
const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const touchesEngineIoClient =
    moduleName === 'engine.io-client' ||
    moduleName.startsWith('engine.io-client/') ||
    (context.originModulePath ?? '').includes('engine.io-client');
  if (touchesEngineIoClient) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    );
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
