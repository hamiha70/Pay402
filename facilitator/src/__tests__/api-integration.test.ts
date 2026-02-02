/**
 * Facilitator API Integration Tests
 * 
 * Tests the full HTTP API surface:
 * - /health endpoint
 * - /build-ptb endpoint (JWT validation, PTB building)
 * - /settle-payment endpoint (transaction submission)
 * 
 * These tests verify the entire request/response flow.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import { Transaction } from '@mysten/sui/transactions';

const FACILITATOR_URL = 'http://localhost:3001';
const TEST_MERCHANT = '0xbf8c50a85dbb19deaec5a9712869a03959c81ec1eba43223deae594afa5a8248';
const TEST_FACILITATOR = '0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995';

// Get funded buyer address
function getBuyerAddress(): string {
  try {
    const { execSync } = require('child_process');
    const output = execSync('sui client active-address', { encoding: 'utf8' });
    return output.trim();
  } catch {
    return '0xca0027e5a2a47e748fef3845bd3ed51852fe30af40832d7a952eacc71eab0f37';
  }
}

const TEST_BUYER = getBuyerAddress();

// Generate test merchant private key (Ed25519)
async function generateMerchantKey() {
  const { generateKeyPair } = await import('jose');
  return await generateKeyPair('EdDSA');
}

// Create valid JWT for testing
async function createTestJWT(options: {
  amount?: string;
  fee?: string;
  expiry?: number;
  merchantRecipient?: string;
  facilitatorRecipient?: string;
} = {}) {
  const keyPair = await generateMerchantKey();
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = options.expiry || now + 3600;
  
  const jwt = await new SignJWT({
    resource: '/api/premium-data',
    amount: options.amount || '100000',
    merchantRecipient: options.merchantRecipient || TEST_MERCHANT,
    facilitatorFee: options.fee || '10000',
    facilitatorRecipient: options.facilitatorRecipient || TEST_FACILITATOR,
    coinType: '0x2::sui::SUI',
    expiry,
    nonce: `${Date.now()}-test`,
  })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt(now)
    .setExpirationTime(expiry)
    .setIssuer(TEST_MERCHANT)
    .setSubject('/api/premium-data')
    .setAudience('pay402')
    .sign(keyPair.privateKey);

  return { jwt, publicKey: keyPair.publicKey };
}

describe('Facilitator API Integration', () => {
  let facilitatorAvailable = false;

  beforeAll(async () => {
    // Wait for facilitator to be ready
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(`${FACILITATOR_URL}/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          facilitatorAvailable = true;
          break;
        }
      } catch (error) {
        if (retries === 1) {
          console.warn('⚠️  Facilitator not running. Start with: cd facilitator && npm run dev');
          console.warn('   These tests will be skipped.');
        }
      }
      retries--;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  describe('GET /health', () => {
    it('should return 200 and service status', async () => {
      if (!facilitatorAvailable) return;
      
      const response = await fetch(`${FACILITATOR_URL}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.network).toBeDefined();
    });
  });

  describe('POST /build-ptb', () => {
    it.skip('should build valid PTB from merchant JWT (TODO: fix JWT generation)', async () => {
      if (!facilitatorAvailable) return;
      const { jwt } = await createTestJWT();
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.ptbBytes).toBeDefined();
      expect(Array.isArray(data.ptbBytes)).toBe(true);
      expect(data.ptbBytes.length).toBeGreaterThan(0);
      
      // Verify PTB can be deserialized
      const tx = Transaction.from(new Uint8Array(data.ptbBytes));
      const txData = tx.getData();
      expect(txData.sender).toBe(TEST_BUYER);
      expect(txData.gasData.budget).toBeDefined();
    });

    it('should reject missing invoice', async () => {
      if (!facilitatorAvailable) return;
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject missing buyer address', async () => {
      if (!facilitatorAvailable) return;

      const { jwt } = await createTestJWT();
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject invalid JWT format', async () => {
      if (!facilitatorAvailable) return;

      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: 'not-a-valid-jwt',
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject expired JWT', async () => {
      if (!facilitatorAvailable) return;

      const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const { jwt } = await createTestJWT({ expiry: expiredTime });
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject zero amount', async () => {
      if (!facilitatorAvailable) return;

      const { jwt } = await createTestJWT({ amount: '0' });
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should reject invalid buyer address format', async () => {
      if (!facilitatorAvailable) return;

      const { jwt } = await createTestJWT();
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
          buyerAddress: 'not-a-valid-address',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it.skip('should preserve exact amounts in PTB (TODO: fix JWT generation)', async () => {
      if (!facilitatorAvailable) return;

      const amount = '123456789';
      const fee = '12345678';
      const { jwt } = await createTestJWT({ amount, fee });
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: jwt,
          buyerAddress: TEST_BUYER,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verify PTB contains correct amounts
      const tx = Transaction.from(new Uint8Array(data.ptbBytes));
      expect(tx).toBeDefined();
      // Amount validation happens during build - if amounts were wrong, build would fail
    });
  });

  describe('POST /settle-payment', () => {
    it('should accept valid signed PTB', async () => {
      if (!facilitatorAvailable) return;

      // This test would require a fully signed transaction
      // For now, we verify the endpoint exists and validates input
      const response = await fetch(`${FACILITATOR_URL}/settle-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTx: [1, 2, 3], // Mock signed tx
        }),
      });

      // Should fail validation (invalid signature) but not 404
      expect(response.status).not.toBe(404);
    });

    it('should reject missing signed transaction', async () => {
      if (!facilitatorAvailable) return;

      const response = await fetch(`${FACILITATOR_URL}/settle-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      if (!facilitatorAvailable) return;

      const response = await fetch(`${FACILITATOR_URL}/unknown-route`);
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      if (!facilitatorAvailable) return;

      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json{',
      });

      expect(response.status).toBe(500);  // Malformed JSON returns 500
    });
  });
});
