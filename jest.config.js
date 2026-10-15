/**
 * Jest config (unit tests for the JS/TS side).
 *
 * WHY transformIgnorePatterns: Jest normally skips transpiling node_modules, but
 * React Native libraries ship untranspiled ESM/Flow code. Every package listed in
 * the (?!...) group below gets run through Babel like our own source.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // WHY: lucide's "react-native" entry is a .mjs file, which the preset doesn't
  // transform. Point Jest at the library's CommonJS build instead.
  moduleNameMapper: {
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|lucide-react-native|react-native-svg|react-native-safe-area-context)/)',
  ],
};
