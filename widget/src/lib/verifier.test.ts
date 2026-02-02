/**
 * PTB Verifier Test Suite - Utility Functions
 * 
 * This file tests browser-compatible utility functions.
 * 
 * For PTB verification tests with REAL PTBs, see:
 * - verifier.real-ptb.test.ts (uses generated fixtures)
 * - facilitator/src/__tests__/api-integration.test.ts (integration tests)
 * 
 * To generate PTB fixtures:
 * 1. Start all services (merchant, facilitator, widget)
 * 2. Run: node scripts/generate-test-ptbs.js
 */

import { describe, it, expect } from 'vitest';
import { computeInvoiceHash } from './verifier';

describe('PTB Verifier - Browser Utilities', () => {
  describe('computeInvoiceHash', () => {
    it('should compute consistent SHA-256 hash', async () => {
      const jwt = 'test-jwt-string';
      const hash1 = await computeInvoiceHash(jwt);
      const hash2 = await computeInvoiceHash(jwt);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it('should produce different hashes for different inputs', async () => {
      const hash1 = await computeInvoiceHash('jwt-1');
      const hash2 = await computeInvoiceHash('jwt-2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce known hash for known input', async () => {
      // SHA-256 of "test"
      const hash = await computeInvoiceHash('test');
      expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });
});
