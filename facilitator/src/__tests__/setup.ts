// Test setup file for Vitest (Facilitator)
import { expect, afterEach, beforeAll } from 'vitest';

// Global test setup
beforeAll(() => {
  // Ensure environment variables are loaded
  process.env.NODE_ENV = 'test';
});

// Cleanup after each test
afterEach(() => {
  // Clear any mocks
});

// Mock console methods if needed (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests:
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};
