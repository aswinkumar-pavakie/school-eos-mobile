/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
};
