/**
 * PTB Verifier Test Suite
 * 
 * Tests all verification scenarios including:
 * - Valid payments
 * - Invalid amounts
 * - Wrong recipients
 * - Unauthorized commands
 * - Expired invoices
 * - Attack scenarios
 */

import { describe, it, expect } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import {
  verifyPaymentPTB,
  verifyPaymentPTBBasic,
  computeInvoiceHash,
  type InvoiceJWT,
} from './verifier';

// Test addresses
const MERCHANT_ADDRESS = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const FACILITATOR_ADDRESS = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
const BUYER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const ATTACKER_ADDRESS = '0x9999999999999999999999999999999999999999999999999999999999999999';

// Sample invoice
const createInvoice = (overrides: Partial<InvoiceJWT> = {}): InvoiceJWT => ({
  resource: '/api/premium-data',
  amount: '100000', // 0.1 USDC
  merchantRecipient: MERCHANT_ADDRESS,
  facilitatorFee: '10000', // 0.01 USDC
  facilitatorRecipient: FACILITATOR_ADDRESS,
  coinType: '0x2::sui::SUI',
  expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  nonce: 'test-nonce-123',
  ...overrides,
});

// Helper: Create valid payment PTB
function createValidPaymentPTB(): Uint8Array {
  const tx = new Transaction();
  
  // Simulate: Split coins (payment + fee)
  const [paymentCoin, feeCoin] = tx.splitCoins(tx.gas, [100000, 10000]);
  
  // Transfer payment to merchant
  tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
  
  // Transfer fee to facilitator
  tx.transferObjects([feeCoin], FACILITATOR_ADDRESS);
  
  return tx.serialize();
}

// Helper: Create PTB with wrong recipient
function createWrongRecipientPTB(): Uint8Array {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
  tx.transferObjects([paymentCoin], ATTACKER_ADDRESS); // Wrong!
  return tx.serialize();
}

// Helper: Create PTB with unauthorized transfer
function createUnauthorizedTransferPTB(): Uint8Array {
  const tx = new Transaction();
  const [paymentCoin, feeCoin, extraCoin] = tx.splitCoins(tx.gas, [100000, 10000, 50000]);
  tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
  tx.transferObjects([feeCoin], FACILITATOR_ADDRESS);
  tx.transferObjects([extraCoin], ATTACKER_ADDRESS); // Unauthorized!
  return tx.serialize();
}

describe('PTB Verifier', () => {
  describe('computeInvoiceHash', () => {
    it('should compute consistent SHA-256 hash', () => {
      const jwt = 'test-jwt-string';
      const hash1 = computeInvoiceHash(jwt);
      const hash2 = computeInvoiceHash(jwt);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = computeInvoiceHash('jwt1');
      const hash2 = computeInvoiceHash('jwt2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPaymentPTBBasic', () => {
    it('should pass for valid recipient', () => {
      const ptb = createValidPaymentPTB();
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(true);
    });

    it('should fail for wrong recipient', () => {
      const ptb = createWrongRecipientPTB();
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('recipient not found');
    });

    it('should fail for empty PTB', () => {
      const tx = new Transaction();
      const ptb = tx.serialize();
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(false);
    });
  });

  describe('verifyPaymentPTB - Valid Cases', () => {
    it('should pass for valid payment PTB', () => {
      const invoice = createInvoice();
      const ptb = createValidPaymentPTB();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(true);
      expect(result.details?.expectedAmount).toBe('100000');
      expect(result.details?.invoiceHash).toBeDefined();
    });

    it('should pass for zero facilitator fee', () => {
      const invoice = createInvoice({ facilitatorFee: '0' });
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(true);
    });
  });

  describe('verifyPaymentPTB - Invalid Cases', () => {
    it('should fail for expired invoice', () => {
      const invoice = createInvoice({
        expiry: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });
      const ptb = createValidPaymentPTB();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should fail for missing merchant transfer', () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [feeCoin] = tx.splitCoins(tx.gas, [10000]);
      tx.transferObjects([feeCoin], FACILITATOR_ADDRESS); // Only fee, no payment
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Merchant payment transfer not found');
    });

    it('should fail for missing facilitator fee (when fee > 0)', () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS); // No fee transfer
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Facilitator fee transfer not found');
    });

    it('should fail for unauthorized transfer', () => {
      const invoice = createInvoice();
      const ptb = createUnauthorizedTransferPTB();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Unauthorized transfer');
    });

    it('should fail for wrong merchant recipient', () => {
      const invoice = createInvoice();
      const ptb = createWrongRecipientPTB();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Merchant payment transfer not found');
      expect(result.details?.expectedRecipient).toBe(MERCHANT_ADDRESS);
    });

    it('should fail for empty transaction', () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const ptb = tx.serialize();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Empty transaction');
    });
  });

  describe('verifyPaymentPTB - Attack Scenarios', () => {
    it('should block PTB sending to attacker instead of merchant', () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], ATTACKER_ADDRESS);
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
    });

    it('should block PTB with extra unauthorized transfer', () => {
      const invoice = createInvoice();
      const ptb = createUnauthorizedTransferPTB();
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Unauthorized transfer');
    });

    it('should block PTB stealing facilitator fee', () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin, feeCoin] = tx.splitCoins(tx.gas, [100000, 10000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      tx.transferObjects([feeCoin], ATTACKER_ADDRESS); // Stealing fee!
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed PTB bytes gracefully', () => {
      const invoice = createInvoice();
      const badBytes = new Uint8Array([1, 2, 3, 4, 5]); // Invalid
      const result = verifyPaymentPTB(badBytes, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('parsing failed');
    });

    it('should handle very large amounts', () => {
      const invoice = createInvoice({
        amount: '999999999999999', // Very large
        facilitatorFee: '99999999999',
      });
      const tx = new Transaction();
      const [p, f] = tx.splitCoins(tx.gas, [999999999999999, 99999999999]);
      tx.transferObjects([p], MERCHANT_ADDRESS);
      tx.transferObjects([f], FACILITATOR_ADDRESS);
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(true);
    });

    it('should handle zero amount (free resource)', () => {
      const invoice = createInvoice({
        amount: '0',
        facilitatorFee: '0',
      });
      const tx = new Transaction();
      // No splits or transfers needed for zero amount
      const ptb = tx.serialize();
      
      const result = verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      // This will fail because no transfers, which is correct
      // A free resource shouldn't need PTB verification
      expect(result.pass).toBe(false);
    });
  });
});
