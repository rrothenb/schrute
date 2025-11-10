export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^~/(.*)\.js$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2020',
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/examples/smykowski/', // Smykowski has its own jest config and should be tested separately
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli/**',
    '!src/mcp-servers/**/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
  coverageThreshold: {
    global: {
      branches: 19,
      functions: 30,
      lines: 25,
      statements: 25,
    },
  },
}
