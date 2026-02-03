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
 * 4. Submit payment (optimistic & wait modes)
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
    
    // Fund buyer with USDC
    const fundResponse = await fetch(`${FACILITATOR_URL}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: buyerAddress,
        amount: '1000000', // 1 USDC
      }),
    });
    
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
      expect(data.ptbBytes).toBeDefined();
      expect(Array.isArray(data.ptbBytes)).toBe(true);
      expect(data.ptbBytes.length).toBeGreaterThan(0);
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
      
      // Optimistic should be fast (<1s)
      expect(clientLatency).toBeLessThan(1000);
      
      console.log(`Optimistic mode latency: ${clientLatency}ms`);
      console.log(`Server reported: ${submitData.latency}`);
    });
  });

  describe('Step 3: Submit Payment (Wait Mode)', () => {
    it('should submit payment and wait for finality', async () => {
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
      
      // Submit (wait mode)
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
          settlementMode: 'wait',
        }),
      });
      
      const clientLatency = Date.now() - startTime;
      
      expect(submitResponse.ok).toBe(true);
      
      const submitData = await submitResponse.json();
      expect(submitData.success).toBe(true);
      expect(submitData.mode).toBe('wait');
      expect(submitData.digest).toBeDefined();
      expect(submitData.status).toBe('confirmed');
      
      // Wait mode includes receipt
      expect(submitData.receipt).toBeDefined();
      if (submitData.receipt) {
        expect(submitData.receipt.paymentId).toBeDefined();
        expect(submitData.receipt.buyer).toBe(buyerAddress);
        expect(submitData.receipt.amount).toBeDefined();
      }
      
      // Wait mode should take longer (includes finality wait)
      expect(clientLatency).toBeGreaterThan(500); // At least 500ms
      
      console.log(`Wait mode latency: ${clientLatency}ms`);
      console.log(`Server reported: ${submitData.latency}`);
      console.log(`Receipt included: ${!!submitData.receipt}`);
    });
  });

  describe('Latency Comparison', () => {
    it('should show optimistic is faster than wait mode', async () => {
      const results: { mode: string; latency: number }[] = [];
      
      // Test optimistic
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
            settlementMode: i === 0 ? 'optimistic' : 'wait',
          }),
        });
        
        const latency = Date.now() - start;
        const mode = i === 0 ? 'optimistic' : 'wait';
        results.push({ mode, latency });
        
        await submitResp.json();
      }
      
      const optimisticLatency = results[0].latency;
      const waitLatency = results[1].latency;
      
      console.log('\nLatency Comparison:');
      console.log(`  Optimistic: ${optimisticLatency}ms`);
      console.log(`  Wait:       ${waitLatency}ms`);
      console.log(`  Difference: ${waitLatency - optimisticLatency}ms`);
      
      // Optimistic should be faster
      expect(optimisticLatency).toBeLessThan(waitLatency);
    });
  });
});
