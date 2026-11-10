import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }],
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/test/**'],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 80, branches: 80 },
  },
  testTimeout: 120_000,
};

export = config;
