/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
  // ts-mls, @noble/*, and @hpke/* (the MLS/E2EE crypto stack -- see
  // src/services/e2ee/) ship as pure ESM ("type": "module", no CJS build),
  // same as several of jest-expo's own preset entries below -- extending
  // that list rather than replacing it lets Babel transform these into CJS
  // for Jest instead of choking on their `export` syntax.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|ts-mls|@noble|@hpke))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
