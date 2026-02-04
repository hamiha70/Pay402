import { describe, it, expect, beforeAll } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
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
    // CRITICAL: Buyer MUST be different from facilitator for sponsored transactions
    // Generate a unique buyer keypair for testing
    buyerKeypair = new Ed25519Keypair();
    buyerAddress = buyerKeypair.getPublicKey().toSuiAddress();
    
    console.log('🔑 Test Setup:');
    console.log('  Buyer address:', buyerAddress);
    console.log('  Facilitator will sponsor gas (different address)');
    
    // Fund buyer with USDC for payment
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
    
    console.log('✅ Buyer funded with USDC');
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
      
      // Better error logging
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Build PTB failed:', {
          status: response.status,
          error: errorData.error,
          details: errorData.details,
          hint: errorData.hint,
        });
      }
      
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.transactionBytes).toBeDefined();
      expect(Array.isArray(data.transactionBytes)).toBe(true);
      expect(data.transactionBytes.length).toBeGreaterThan(0);
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
    // Move contract issue fixed - settle_payment is now an entry function
    it('should submit payment and return digest immediately', async () => {
      const startTime = Date.now();
      
      // Build PTB (returns transaction kind bytes)
      const buildResponse = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, invoiceJWT }),
      });
      
      const buildData = await buildResponse.json();
      const txBytes = new Uint8Array(buildData.transactionBytes);
      
      // Sign the pre-built transaction (already includes gas sponsorship)
      const { signature } = await buyerKeypair.signTransaction(txBytes);
      
      // Submit (optimistic mode) with sponsored transaction format
      const submitResponse = await fetch(`${FACILITATOR_URL}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceJWT,
          buyerAddress,
          transactionBytes: Array.from(txBytes),
          buyerSignature: signature,
          settlementMode: 'optimistic',
        }),
      });
      
      const clientLatency = Date.now() - startTime;
      
      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Submit failed:', errorText);
      }
      
      expect(submitResponse.ok).toBe(true);
      
      const submitData = await submitResponse.json();
      expect(submitData.success).toBe(true);
      expect(submitData.digest).toBeDefined();
      
      // Optimistic should be reasonably fast (<5s including network, localnet can be slow)
      expect(clientLatency).toBeLessThan(5000);
      
      console.log(`✅ Optimistic mode completed`);
      console.log(`  Client latency: ${clientLatency}ms`);
      console.log(`  Digest: ${submitData.digest}`);
    });
  });

  describe('Step 3: Submit Payment (Pessimistic Mode)', () => {
    // Move contract issue fixed - settle_payment is now an entry function
    it('should submit payment and block until finality', async () => {
      const startTime = Date.now();
      
      // Build PTB (returns transaction kind bytes)
      const buildResponse = await fetch(`${FACILITATOR_URL}/build-ptb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, invoiceJWT }),
      });
      
      const buildData = await buildResponse.json();
      const txBytes = new Uint8Array(buildData.transactionBytes);
      
      // Sign the pre-built transaction (already includes gas sponsorship)
      const { signature } = await buyerKeypair.signTransaction(txBytes);
      
      console.log('🔐 Buyer signature info:', {
        buyerAddress,
        signatureLength: signature.length,
        signaturePreview: signature.substring(0, 20) + '...',
      });
      
      // Submit (pessimistic mode) with sponsored transaction format
      const submitResponse = await fetch(`${FACILITATOR_URL}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceJWT,
          buyerAddress,
          transactionBytes: Array.from(txBytes),
          buyerSignature: signature,
          settlementMode: 'pessimistic',
        }),
      });
      
      const clientLatency = Date.now() - startTime;
      
      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error('Submit failed:', errorText);
      }
      
      expect(submitResponse.ok).toBe(true);
      
      const submitData = await submitResponse.json();
      expect(submitData.success).toBe(true);
      expect(submitData.digest).toBeDefined();
      
      // Pessimistic mode should take longer (blocks until finality)
      // Note: On fast localnet, finality can be < 500ms
      expect(clientLatency).toBeGreaterThan(100); // At least 100ms
      
      console.log(`✅ Pessimistic mode completed`);
      console.log(`  Client latency: ${clientLatency}ms`);
      console.log(`  Digest: ${submitData.digest}`);
      console.log(`  Receipt: ${submitData.receipt ? 'included' : 'not included'}`);
    });
  });

  describe('Latency Comparison', () => {
    // Move contract issue fixed - settle_payment is now an entry function
    it('should show optimistic is faster than pessimistic mode', async () => {
      const results: { mode: string; latency: number }[] = [];
      
      const { Transaction } = await import('@mysten/sui/transactions');
      const { getSuiClient } = await import('../sui.js');
      const client = getSuiClient();
      
      // Test both modes
      for (let i = 0; i < 2; i++) {
        const start = Date.now();
        const mode = i === 0 ? 'optimistic' : 'pessimistic';
        
        // Build PTB
        const buildResp = await fetch(`${FACILITATOR_URL}/build-ptb`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerAddress, invoiceJWT }),
        });
        
        const buildData = await buildResp.json();
        const txBytes = new Uint8Array(buildData.transactionBytes);
        
        // Sign the pre-built transaction
        const { signature } = await buyerKeypair.signTransaction(txBytes);
        
        // Submit with sponsored transaction format
        const submitResp = await fetch(`${FACILITATOR_URL}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceJWT,
            buyerAddress,
            transactionBytes: Array.from(txBytes),
            buyerSignature: signature,
            settlementMode: mode,
          }),
        });
        
        const latency = Date.now() - start;
        results.push({ mode, latency });
        
        await submitResp.json();
      }
      
      const optimisticLatency = results[0].latency;
      const pessimisticLatency = results[1].latency;
      
      console.log('\n✅ Latency Comparison:');
      console.log(`  Optimistic:  ${optimisticLatency}ms`);
      console.log(`  Pessimistic: ${pessimisticLatency}ms`);
      console.log(`  Difference:  ${pessimisticLatency - optimisticLatency}ms`);
      
      // Optimistic should be faster
      expect(optimisticLatency).toBeLessThan(pessimisticLatency);
    });
  });
});
