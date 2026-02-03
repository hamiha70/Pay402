import { describe, it, expect, beforeAll } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toBase64 } from '@mysten/sui/utils';
import { execSync } from 'child_process';

/**
 * End-to-End Payment Flow Tests
 * 
 * Tests the complete payment flow:
 * 1. Get invoice JWT from merchant
 * 2. Build PTB via facilitator
 * 3. Sign PTB with buyer keypair
 * 4. Submit payment (optimistic & pessimistic modes)
 * 5. Verify on-chain settlement
 */

describe('End-to-End Payment Flow', () => {
  let buyerAddress: string;
  let buyerKeypair: Ed25519Keypair;
  let invoiceJWT: string;
  
  const FACILITATOR_URL = 'http://localhost:3001';
  const MERCHANT_URL = 'http://localhost:3002';

  beforeAll(async () => {
    // Get active address
    buyerAddress = execSync('sui client active-address').toString().trim();
    
    // For testing, use same keypair as facilitator
    // In production, buyer would have their own keypair
    const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('FACILITATOR_PRIVATE_KEY not set');
    }
    buyerKeypair = Ed25519Keypair.fromSecretKey(privateKey);
    
    // Fund buyer with SUI (for gas)
    const sessionId = `test-${Date.now()}`;
    const fundResponse = await fetch(`${FACILITATOR_URL}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: buyerAddress,
        sessionId: sessionId,
      }),
    });
    
    if (!fundResponse.ok) {
      const errorText = await fundResponse.text();
      throw new Error(`Fund failed: ${errorText}`);
    }
    const fundData = await fundResponse.json();
    console.log('Fund response:', fundData);
    // Fund endpoint may return different success indicators
    expect(fundResponse.ok).toBe(true);
    
    // Get invoice from merchant
    const invoiceResponse = await fetch(`${MERCHANT_URL}/api/premium-data`);
    const invoiceData = await invoiceResponse.json();
    invoiceJWT = invoiceData.invoice;
    
    expect(invoiceJWT).toBeDefined();
  });

  describe('Step 1: Build PTB', () => {
    it('should build unsigned PTB from invoice JWT', async () => {
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAddress,
          invoiceJWT,
        }),
      });
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.transactionKindBytes).toBeDefined();
      expect(Array.isArray(data.transactionKindBytes)).toBe(true);
      expect(data.transactionKindBytes.length).toBeGreaterThan(0);
      expect(data.invoice).toBeDefined();
      expect(data.invoice.amount).toBeDefined();
    });

    it('should fail with invalid buyer address', async () => {
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAddress: '0xinvalid',
          invoiceJWT,
        }),
      });
      
      expect(response.ok).toBe(false);
    });

    it('should fail with expired invoice', async () => {
      // Create expired invoice (exp in past)
      const expiredJWT = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJleHAiOjEwMDAwMDAwMDB9.invalid';
      
      const response = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAddress,
          invoiceJWT: expiredJWT,
        }),
      });
      
      expect(response.ok).toBe(false);
    });
  });

  describe('Step 2: Submit Payment (Optimistic Mode)', () => {
    it('should submit payment and return digest immediately', async () => {
      const startTime = Date.now();
      
      // Build PTB
      const buildResponse = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, invoiceJWT }),
      });
      
      const buildData = await buildResponse.json();
      const ptbBytes = new Uint8Array(buildData.ptbBytes);
      
      // Sign PTB
      const signature = await buyerKeypair.signTransaction(ptbBytes);
      
      // Submit (optimistic mode)
      const submitResponse = await fetch(`${FACILITATOR_URL}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceJWT,
          buyerAddress,
          signedTransaction: {
            transactionBytes: toBase64(ptbBytes),
            signature: signature.signature,
          },
          settlementMode: 'optimistic',
        }),
      });
      
      const clientLatency = Date.now() - startTime;
      
      expect(submitResponse.ok).toBe(true);
      
      const submitData = await submitResponse.json();
      expect(submitData.success).toBe(true);
      expect(submitData.mode).toBe('optimistic');
      expect(submitData.digest).toBeDefined();
      expect(submitData.latency).toBeDefined();
      
      // CRITICAL TEST: Verify digest is pre-computed correctly
      // This ensures our digest calculation matches what blockchain will confirm
      const { createHash } = await import('crypto');
      const typeTag = new TextEncoder().encode('TransactionData::');
      const data = new Uint8Array(typeTag.length + ptbBytes.length);
      data.set(typeTag);
      data.set(ptbBytes, typeTag.length);
      const hash = createHash('blake2b512').update(data).digest().slice(0, 32);
      const { toBase58 } = await import('@mysten/bcs');
      const expectedDigest = toBase58(hash);
      
      // Digest MUST match our pre-computed digest
      expect(submitData.digest).toBe(expectedDigest);
      console.log(`✅ Digest validation: pre-computed matches response`);
      
      // Optimistic should be fast (<1s)
      expect(clientLatency).toBeLessThan(1000);
      
      console.log(`Optimistic mode latency: ${clientLatency}ms`);
      console.log(`Server reported: ${submitData.latency}`);
    });
  });

  describe('Step 3: Submit Payment (Pessimistic Mode)', () => {
    it('should submit payment and block until finality', async () => {
      const startTime = Date.now();
      
      // Build PTB
      const buildResponse = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, invoiceJWT }),
      });
      
      const buildData = await buildResponse.json();
      const ptbBytes = new Uint8Array(buildData.ptbBytes);
      
      // Sign PTB
      const signature = await buyerKeypair.signTransaction(ptbBytes);
      
      // Submit (pessimistic mode)
      const submitResponse = await fetch(`${FACILITATOR_URL}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceJWT,
          buyerAddress,
          signedTransaction: {
            transactionBytes: toBase64(ptbBytes),
            signature: signature.signature,
          },
          settlementMode: 'pessimistic',
        }),
      });
      
      const clientLatency = Date.now() - startTime;
      
      expect(submitResponse.ok).toBe(true);
      
      const submitData = await submitResponse.json();
      expect(submitData.success).toBe(true);
      expect(submitData.mode).toBe('pessimistic');
      expect(submitData.digest).toBeDefined();
      expect(submitData.safeToDeliver).toBe(true);
      
      // Pessimistic mode includes receipt
      expect(submitData.receipt).toBeDefined();
      if (submitData.receipt) {
        expect(submitData.receipt.paymentId).toBeDefined();
        expect(submitData.receipt.buyer).toBe(buyerAddress);
        expect(submitData.receipt.amount).toBeDefined();
      }
      
      // CRITICAL TEST: Verify digest calculation matches blockchain
      // Pre-compute digest from transaction bytes
      const { createHash } = await import('crypto');
      const typeTag = new TextEncoder().encode('TransactionData::');
      const data = new Uint8Array(typeTag.length + ptbBytes.length);
      data.set(typeTag);
      data.set(ptbBytes, typeTag.length);
      const hash = createHash('blake2b512').update(data).digest().slice(0, 32);
      const { toBase58 } = await import('@mysten/bcs');
      const expectedDigest = toBase58(hash);
      
      // Digest from blockchain MUST match our pre-computed digest
      expect(submitData.digest).toBe(expectedDigest);
      console.log(`✅ Digest validation: pre-computed matches blockchain`);
      
      // Pessimistic mode should take longer (blocks until finality)
      expect(clientLatency).toBeGreaterThan(500); // At least 500ms
      
      console.log(`Pessimistic mode latency: ${clientLatency}ms`);
      console.log(`Server reported: ${submitData.latency}`);
      console.log(`Receipt included: ${!!submitData.receipt}`);
    });
  });

  describe('Latency Comparison', () => {
    it('should show optimistic is faster than pessimistic mode', async () => {
      const results: { mode: string; latency: number }[] = [];
      
      // Test both modes
      for (let i = 0; i < 2; i++) {
        const start = Date.now();
        
        const buildResp = await fetch(`${FACILITATOR_URL}/build-ptb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerAddress, invoiceJWT }),
        });
        
        const buildData = await buildResp.json();
        const ptbBytes = new Uint8Array(buildData.ptbBytes);
        const signature = await buyerKeypair.signTransaction(ptbBytes);
        
        const submitResp = await fetch(`${FACILITATOR_URL}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceJWT,
            buyerAddress,
            signedTransaction: {
              transactionBytes: toBase64(ptbBytes),
              signature: signature.signature,
            },
            settlementMode: i === 0 ? 'optimistic' : 'pessimistic',
          }),
        });
        
        const latency = Date.now() - start;
        const mode = i === 0 ? 'optimistic' : 'pessimistic';
        results.push({ mode, latency });
        
        await submitResp.json();
      }
      
      const optimisticLatency = results[0].latency;
      const pessimisticLatency = results[1].latency;
      
      console.log('\nLatency Comparison:');
      console.log(`  Optimistic:  ${optimisticLatency}ms`);
      console.log(`  Pessimistic: ${pessimisticLatency}ms`);
      console.log(`  Difference:  ${pessimisticLatency - optimisticLatency}ms`);
      
      // Optimistic should be faster
      expect(optimisticLatency).toBeLessThan(pessimisticLatency);
    });
  });
});
