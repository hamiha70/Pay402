import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000, // 30s timeout for E2E tests (funding + transaction)
    // CRITICAL: Run tests sequentially to avoid blockchain state conflicts
    // Parallel execution causes race conditions with shared facilitator gas coins
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // All tests in single process (sequential)
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    // Allow ESM imports
    deps: {
      inline: ['@mysten/sui'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
