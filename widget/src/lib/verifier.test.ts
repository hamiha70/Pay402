import { describe, it, expect } from 'vitest';
import {
  computeInvoiceHash,
} from './verifier';

describe('PTB Verifier', () => {
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
  });
});
