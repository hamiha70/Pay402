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

// Helper: Normalize serialize() output to Uint8Array
const toUint8Array = (serialized: string | Uint8Array): Uint8Array => {
  return typeof serialized === 'string' ? new TextEncoder().encode(serialized) : serialized;
};

// Test addresses
const MERCHANT_ADDRESS = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const FACILITATOR_ADDRESS = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
// const BUYER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';  // Unused
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
  
  return toUint8Array(tx.serialize());
}

// Helper: Create PTB with wrong recipient
function createWrongRecipientPTB(): Uint8Array {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
  tx.transferObjects([paymentCoin], ATTACKER_ADDRESS); // Wrong!
  return toUint8Array(tx.serialize());
}

// Helper: Create PTB with unauthorized transfer
function createUnauthorizedTransferPTB(): Uint8Array {
  const tx = new Transaction();
  const [paymentCoin, feeCoin, extraCoin] = tx.splitCoins(tx.gas, [100000, 10000, 50000]);
  tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
  tx.transferObjects([feeCoin], FACILITATOR_ADDRESS);
  tx.transferObjects([extraCoin], ATTACKER_ADDRESS); // Unauthorized!
  return toUint8Array(tx.serialize());
}

describe('PTB Verifier', async () => {
  describe('computeInvoiceHash', async () => {
    it.concurrent('should compute consistent SHA-256 hash', async () => {
      const jwt = 'test-jwt-string';
      const hash1 = computeInvoiceHash(jwt);
      const hash2 = computeInvoiceHash(jwt);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it.concurrent('should produce different hashes for different inputs', async () => {
      const hash1 = computeInvoiceHash('jwt1');
      const hash2 = computeInvoiceHash('jwt2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPaymentPTBBasic', async () => {
    it.concurrent('should pass for valid recipient', async () => {
      const ptb = createValidPaymentPTB();
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(true);
    });

    it.concurrent('should fail for wrong recipient', async () => {
      const ptb = createWrongRecipientPTB();
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('recipient not found');
    });

    it.concurrent('should fail for empty PTB', async () => {
      const tx = new Transaction();
      const ptb = toUint8Array(tx.serialize());
      const result = verifyPaymentPTBBasic(ptb, MERCHANT_ADDRESS);
      
      expect(result.pass).toBe(false);
    });
  });

  describe('verifyPaymentPTB - Valid Cases', async () => {
    it.concurrent('should pass for valid payment PTB', async () => {
      const invoice = createInvoice();
      const ptb = createValidPaymentPTB();
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(true);
      expect(result.details?.expectedAmount).toBe('100000');
      expect(result.details?.invoiceHash).toBeDefined();
    });

    it.concurrent('should pass for zero facilitator fee', async () => {
      const invoice = createInvoice({ facilitatorFee: '0' });
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(true);
    });
  });

  describe('verifyPaymentPTB - Invalid Cases', async () => {
    it.concurrent('should fail for expired invoice', async () => {
      const invoice = createInvoice({
        expiry: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      });
      const ptb = createValidPaymentPTB();
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it.concurrent('should fail for missing merchant transfer', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [feeCoin] = tx.splitCoins(tx.gas, [10000]);
      tx.transferObjects([feeCoin], FACILITATOR_ADDRESS); // Only fee, no payment
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Merchant payment transfer not found');
    });

    it.concurrent('should fail for missing facilitator fee (when fee > 0)', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS); // No fee transfer
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Facilitator fee transfer not found');
    });

    it.concurrent('should fail for unauthorized transfer', async () => {
      const invoice = createInvoice();
      const ptb = createUnauthorizedTransferPTB();
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Unauthorized transfer');
    });

    it.concurrent('should fail for wrong merchant recipient', async () => {
      const invoice = createInvoice();
      const ptb = createWrongRecipientPTB();
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Merchant payment transfer not found');
      expect(result.details?.expectedRecipient).toBe(MERCHANT_ADDRESS);
    });

    it.concurrent('should fail for empty transaction', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const ptb = toUint8Array(tx.serialize());
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Empty transaction');
    });
  });

  describe('verifyPaymentPTB - Attack Scenarios', async () => {
    it.concurrent('should block PTB sending to attacker instead of merchant', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [100000]);
      tx.transferObjects([paymentCoin], ATTACKER_ADDRESS);
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
    });

    it.concurrent('should block PTB with extra unauthorized transfer', async () => {
      const invoice = createInvoice();
      const ptb = createUnauthorizedTransferPTB();
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Unauthorized transfer');
    });

    it.concurrent('should block PTB stealing facilitator fee', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin, feeCoin] = tx.splitCoins(tx.gas, [100000, 10000]);
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      tx.transferObjects([feeCoin], ATTACKER_ADDRESS); // Stealing fee!
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
    });

    it.concurrent('should block PTB with wrong merchant amount (underpayment)', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin, feeCoin] = tx.splitCoins(tx.gas, [1, 10000]); // Only 1 instead of 100000!
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      tx.transferObjects([feeCoin], FACILITATOR_ADDRESS);
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('amount mismatch');
    });

    it.concurrent('should block PTB with wrong fee amount (fee stealing)', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [paymentCoin, feeCoin] = tx.splitCoins(tx.gas, [100000, 1]); // Fee is 1 instead of 10000!
      tx.transferObjects([paymentCoin], MERCHANT_ADDRESS);
      tx.transferObjects([feeCoin], FACILITATOR_ADDRESS);
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('amount mismatch');
    });

    it.concurrent('should block PTB with extra splits (total mismatch)', async () => {
      const invoice = createInvoice();
      const tx = new Transaction();
      const [p, f, _extra] = tx.splitCoins(tx.gas, [100000, 10000, 50000]); // Extra 50000!
      tx.transferObjects([p], MERCHANT_ADDRESS);
      tx.transferObjects([f], FACILITATOR_ADDRESS);
      // Note: extra coin not transferred, but split exists
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('Total split amount does not match');
    });
  });

  describe('Edge Cases', async () => {
    it.concurrent('should handle malformed PTB bytes gracefully', async () => {
      const invoice = createInvoice();
      const badBytes = new Uint8Array([1, 2, 3, 4, 5]); // Invalid
      const result = await verifyPaymentPTB(badBytes, invoice, 'mock-jwt');
      
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('parsing failed');
    });

    it.concurrent('should handle very large amounts', async () => {
      const invoice = createInvoice({
        amount: '999999999999999', // Very large
        facilitatorFee: '99999999999',
      });
      const tx = new Transaction();
      const [p, f] = tx.splitCoins(tx.gas, [999999999999999, 99999999999]);
      tx.transferObjects([p], MERCHANT_ADDRESS);
      tx.transferObjects([f], FACILITATOR_ADDRESS);
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      expect(result.pass).toBe(true);
    });

    it.concurrent('should handle zero amount (free resource)', async () => {
      const invoice = createInvoice({
        amount: '0',
        facilitatorFee: '0',
      });
      const tx = new Transaction();
      // No splits or transfers needed for zero amount
      const ptb = toUint8Array(tx.serialize());
      
      const result = await verifyPaymentPTB(ptb, invoice, 'mock-jwt');
      // This will fail because no transfers, which is correct
      // A free resource shouldn't need PTB verification
      expect(result.pass).toBe(false);
    });
  });
});
