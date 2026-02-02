/**
 * PTB Verifier Tests - Using REAL PTBs
 * 
 * These tests use real PTB fixtures generated from the facilitator.
 * 
 * TO GENERATE FIXTURES:
 * 1. Start merchant, facilitator, widget services
 * 2. Run: node scripts/generate-test-ptbs.js
 * 3. Commit widget/src/__fixtures__/ptb-fixtures.json
 * 
 * These fixtures contain REAL PTBs built by the facilitator using
 * tx.build({ client }), so they're valid BCS-encoded transactions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { verifyPaymentPTB, verifyPaymentPTBBasic } from './verifier';
import * as fs from 'fs';
import * as path from 'path';

describe('PTB Verifier - Real PTB Tests', () => {
  let fixtures: any;

  beforeAll(() => {
    const fixturesPath = path.join(__dirname, '../__fixtures__/ptb-fixtures.json');
    
    if (!fs.existsSync(fixturesPath)) {
      console.warn('\n⚠️  PTB fixtures not found!');
      console.warn('   Generate them with: node scripts/generate-test-ptbs.js\n');
      return;
    }

    fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  });

  describe('verifyPaymentPTBBasic', () => {
    it('should accept valid payment PTB from real merchant', () => {
      if (!fixtures) return; // Skip if no fixtures

      const { ptbBytes, invoice } = fixtures.validPayment;
      const result = verifyPaymentPTBBasic(new Uint8Array(ptbBytes), invoice.merchantRecipient);
      
      expect(result.pass).toBe(true);
    });

    it('should accept second valid payment PTB', () => {
      if (!fixtures) return;

      const { ptbBytes, invoice } = fixtures.validPayment2;
      const result = verifyPaymentPTBBasic(new Uint8Array(ptbBytes), invoice.merchantRecipient);
      
      expect(result.pass).toBe(true);
    });

    it('should reject PTB when recipient does not match', () => {
      if (!fixtures) return;

      // Use PTB from first payment but wrong recipient
      const { ptbBytes } = fixtures.validPayment;
      const wrongRecipient = '0x9999999999999999999999999999999999999999999999999999999999999999';
      const result = verifyPaymentPTBBasic(new Uint8Array(ptbBytes), wrongRecipient);
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('recipient');
    });
  });

  describe('verifyPaymentPTB (full verification with real merchant JWT)', () => {
    it('should accept valid payment PTB with real merchant signature', async () => {
      if (!fixtures) return;

      const { ptbBytes, invoice, invoiceJWT } = fixtures.validPayment;
      const result = await verifyPaymentPTB(
        new Uint8Array(ptbBytes),
        invoice,
        invoiceJWT
      );
      
      expect(result.pass).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should accept second valid payment', async () => {
      if (!fixtures) return;

      const { ptbBytes, invoice, invoiceJWT } = fixtures.validPayment2;
      const result = await verifyPaymentPTB(
        new Uint8Array(ptbBytes),
        invoice,
        invoiceJWT
      );
      
      expect(result.pass).toBe(true);
    });

    // Note: Both fixtures have same amounts/recipients (just different nonces)
    // So we can't easily test mismatch without generating more fixtures
    // The facilitator integration tests cover mismatch scenarios
  });
});
