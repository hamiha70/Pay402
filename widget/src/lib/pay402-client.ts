/**
 * Pay402 Client Library
 * 
 * Browser-compatible shared logic for Pay402 payment flow.
 * Used by both the widget UI and the facilitator e2e tests.
 * 
 * Core responsibilities:
 * 1. Build PTB via facilitator API
 * 2. Verify PTB client-side (security)
 * 3. Submit signed payment
 * 
 * Design principles:
 * - Browser-compatible (no Node.js deps like Buffer, execSync)
 * - Stateless (no internal state, just pure functions)
 * - Type-safe (full TypeScript interfaces)
 * - Testable (each function independently testable)
 */

import { Transaction } from '@mysten/sui/transactions';
import { verifyPaymentPTB, type InvoiceJWT, type VerificationResult } from './verifier.js';

/**
 * Configuration for Pay402 client
 */
export interface Pay402ClientConfig {
  facilitatorUrl: string;  // e.g., "http://localhost:3001"
}

/**
 * Build PTB response from facilitator
 */
export interface BuildPTBResponse {
  transactionKindBytes: number[];  // Transaction kind (no gas/sender)
  invoice: {
    resource: string;
    amount: string;
    merchant: string;
    facilitatorFee: string;
    facilitator: string;
    invoiceId: string;
  };
}

/**
 * Submit payment response from facilitator
 */
export interface SubmitPaymentResponse {
  success: boolean;
  mode: 'optimistic' | 'pessimistic';
  digest: string;
  latency?: string;
  receipt?: unknown;
}

/**
 * Build PTB via facilitator
 * 
 * @param config - Client configuration
 * @param invoiceJWT - Invoice JWT from merchant
 * @param buyerAddress - Buyer's Sui address
 * @returns Transaction kind bytes and invoice details
 */
export async function buildPTB(
  config: Pay402ClientConfig,
  invoiceJWT: string,
  buyerAddress: string
): Promise<{ kindBytes: Uint8Array; invoice: BuildPTBResponse['invoice'] }> {
  const response = await fetch(`${config.facilitatorUrl}/build-ptb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerAddress,
      invoiceJWT,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    
    // Provide helpful error messages for common issues
    let errorMessage = error.error || 'Failed to build PTB';
    
    if (error.details?.includes('insufficient SUI balance') || 
        error.details?.includes('gas selection')) {
      errorMessage = 'Insufficient SUI for gas. This is a known issue - gas sponsorship coming soon!';
    } else if (error.details?.includes('No coins found')) {
      errorMessage = 'No coins found for your address. Please fund your wallet first.';
    } else if (error.error === 'No single coin with sufficient balance') {
      errorMessage = 'Need to merge coins (not yet implemented). Use an address with a single large coin.';
    }
    
    throw new Error(errorMessage);
  }

  const data: BuildPTBResponse = await response.json();
  
  // Convert array to Uint8Array
  const kindBytes = new Uint8Array(data.transactionKindBytes);
  
  return {
    kindBytes,
    invoice: data.invoice,
  };
}

/**
 * Verify PTB client-side before signing
 * 
 * CRITICAL SECURITY FUNCTION: Never sign a PTB without verifying it first!
 * 
 * @param kindBytes - Transaction kind bytes from facilitator
 * @param invoice - Parsed invoice JWT
 * @param invoiceJWT - Raw invoice JWT (for verification)
 * @returns Verification result with pass/fail and details
 */
export async function verifyPTB(
  kindBytes: Uint8Array,
  invoice: InvoiceJWT,
  invoiceJWT: string
): Promise<VerificationResult> {
  return verifyPaymentPTB(kindBytes, invoice, invoiceJWT);
}

/**
 * Sign transaction using provided signer
 * 
 * Note: This is intentionally generic - the caller provides their own signing logic
 * (e.g., wallet extension, keypair, zkLogin, etc.)
 * 
 * @param kindBytes - Transaction kind bytes
 * @param buyerAddress - Buyer's address (will be set as sender)
 * @param signFn - Function to sign the transaction
 * @returns Signature and full transaction bytes
 */
export async function signPTB(
  kindBytes: Uint8Array,
  buyerAddress: string,
  signFn: (tx: Transaction) => Promise<{ signature: string; bytes: Uint8Array }>
): Promise<{ signature: string; transactionBytes: Uint8Array }> {
  // Reconstruct transaction from kind bytes (sponsored transaction pattern)
  const tx = Transaction.fromKind(kindBytes);
  tx.setSender(buyerAddress);
  
  // Sign using provided function
  const { signature, bytes: transactionBytes } = await signFn(tx);
  
  return {
    signature,
    transactionBytes,
  };
}

/**
 * Submit signed payment to facilitator
 * 
 * @param config - Client configuration
 * @param params - Submit parameters
 * @returns Payment digest and receipt
 */
export async function submitPayment(
  config: Pay402ClientConfig,
  params: {
    invoiceJWT: string;
    buyerAddress: string;
    transactionKindBytes: Uint8Array;
    buyerSignature: string;
    settlementMode: 'optimistic' | 'pessimistic';
  }
): Promise<SubmitPaymentResponse> {
  const response = await fetch(`${config.facilitatorUrl}/submit-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceJWT: params.invoiceJWT,
      buyerAddress: params.buyerAddress,
      transactionKindBytes: Array.from(params.transactionKindBytes),
      buyerSignature: params.buyerSignature,
      settlementMode: params.settlementMode,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment submission failed');
  }

  const data: SubmitPaymentResponse = await response.json();
  return data;
}

/**
 * Complete payment flow (convenience function)
 * 
 * Combines all steps: build → verify → sign → submit
 * 
 * @param config - Client configuration
 * @param params - Payment parameters
 * @returns Payment result with digest
 */
export async function pay402(
  config: Pay402ClientConfig,
  params: {
    invoiceJWT: string;
    invoice: InvoiceJWT;
    buyerAddress: string;
    signFn: (tx: Transaction) => Promise<{ signature: string; bytes: Uint8Array }>;
    settlementMode?: 'optimistic' | 'pessimistic';
  }
): Promise<{
  digest: string;
  verificationResult: VerificationResult;
  latency: number;
}> {
  const startTime = Date.now();
  
  // Step 1: Build PTB
  const { kindBytes } = await buildPTB(config, params.invoiceJWT, params.buyerAddress);
  
  // Step 2: Verify PTB (CRITICAL - never skip!)
  const verificationResult = await verifyPTB(kindBytes, params.invoice, params.invoiceJWT);
  if (!verificationResult.pass) {
    throw new Error(`PTB verification failed: ${verificationResult.reason}`);
  }
  
  // Step 3: Sign PTB
  const { signature } = await signPTB(kindBytes, params.buyerAddress, params.signFn);
  
  // Step 4: Submit payment
  const result = await submitPayment(config, {
    invoiceJWT: params.invoiceJWT,
    buyerAddress: params.buyerAddress,
    transactionKindBytes: kindBytes,
    buyerSignature: signature,
    settlementMode: params.settlementMode || 'optimistic',
  });
  
  const latency = Date.now() - startTime;
  
  return {
    digest: result.digest,
    verificationResult,
    latency,
  };
}
