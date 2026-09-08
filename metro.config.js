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

module.exports = config;
