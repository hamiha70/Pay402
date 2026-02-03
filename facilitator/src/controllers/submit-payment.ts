import { Request, Response } from 'express';
import { getSuiClient } from '../sui.js';
import { logger } from '../utils/logger.js';

interface SubmitPaymentRequest {
  invoiceJWT: string;
  buyerAddress: string;
  signedTransaction: {
    transactionBytes: string | number[] | Uint8Array;  // base64 string, array, or Uint8Array
    signature: string;                                  // base64 encoded signature
  };
  settlementMode?: 'optimistic' | 'pessimistic';  // Default: optimistic
}

interface ReceiptEvent {
  payment_id: string;
  invoice_hash: string;
  buyer: string;
  merchant: string;
  amount: string;
  asset_type: { name: string };
  timestamp: string;
}

/**
 * POST /submit-payment
 * Submit buyer-signed PTB to blockchain
 * 
 * Two settlement modes:
 * 1. Optimistic: Return digest immediately (~500ms UX)
 * 2. Wait-for-finality: Poll until confirmed (~1-3s UX)
 */
export async function submitPaymentController(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  console.log('[SUBMIT] Request received');
  console.log('[SUBMIT] Has body:', !!req.body);
  
  try {
    const {
      invoiceJWT,
      buyerAddress,
      signedTransaction,
      settlementMode = 'optimistic', // Default to optimistic
    } = req.body as SubmitPaymentRequest;
    
    console.log('[SUBMIT] Parsed OK');
    
    logger.info('Request parsed', { 
      buyerAddress, 
      mode: settlementMode,
      hasJWT: !!invoiceJWT,
      hasTxBytes: !!signedTransaction?.transactionBytes,
      hasSignature: !!signedTransaction?.signature,
    });
    
    // Validate required fields
    if (!buyerAddress || !signedTransaction?.transactionBytes || !signedTransaction?.signature) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['buyerAddress', 'signedTransaction.transactionBytes', 'signedTransaction.signature'],
      });
      return;
    }
    
    const client = getSuiClient();
    
    // Convert transaction bytes to Uint8Array (BCS-encoded format required by gRPC)
    let txBytes: Uint8Array;
    if (Array.isArray(signedTransaction.transactionBytes)) {
      txBytes = new Uint8Array(signedTransaction.transactionBytes);
    } else if (typeof signedTransaction.transactionBytes === 'string') {
      // If base64 string, decode it
      txBytes = new Uint8Array(Buffer.from(signedTransaction.transactionBytes, 'base64'));
    } else {
      txBytes = signedTransaction.transactionBytes as Uint8Array;
    }
    
    // Signatures must be an array
    const signatures = [signedTransaction.signature];
    
    logger.info('Transaction data BEFORE execute', {
      txBytesLength: txBytes.length,
      txBytesType: txBytes.constructor.name,
      signaturesArray: signatures,
      signaturesLength: signatures.length,
      signaturesIsDefined: signatures !== undefined,
      signaturesIsArray: Array.isArray(signatures),
    });
    
    // ===== MODE 1: OPTIMISTIC SETTLEMENT (FAST UX) =====
    if (settlementMode === 'optimistic') {
      logger.info('Using OPTIMISTIC settlement mode');
      
      // CRITICAL UNDERSTANDING:
      // Both modes do SAME validation + submit
      // ONLY difference: When to trigger "safe to deliver"
      //   - Optimistic: AFTER submit (before finality)
      //   - Wait: AFTER finality
      //
      // Facilitator's ONLY risk in optimistic:
      //   Buyer front-runs (spends coins elsewhere before our tx settles)
      //   Mitigation: Submit IMMEDIATELY to win blockchain race
      
      const validateStart = Date.now();
      
      // Step 1: Comprehensive validation (SAME in both modes)
      // TODO: Add actual validation logic:
      // - Verify signature matches buyer address
      // - Check buyer has sufficient balance (RPC call ~20ms)
      // - Validate PTB structure matches invoice
      // - Check invoice JWT hasn't expired
      logger.info('Validating PTB', { buyerAddress });
      
      const validateLatency = Date.now() - validateStart;
      
      // Step 2: Submit to blockchain and return IMMEDIATELY (don't wait!)
      // This is THE critical step - submit before buyer can front-run
      const submitStart = Date.now();
      
      // Return "safe to deliver" IMMEDIATELY after validation
      // Submit happens in background (non-blocking)
      const httpLatency = Date.now() - startTime;
      
      res.json({
        success: true,
        mode: 'optimistic',
        safeToDeliver: true,
        digest: null,  // Will be available in background
        receipt: null,  // Not available yet (transaction not finalized)
        validateLatency: `${validateLatency}ms`,
        submitLatency: 'pending',
        httpLatency: `${httpLatency}ms`,
        timestamp: Date.now(),
      });
      
      logger.info('=== OPTIMISTIC: SAFE TO DELIVER (IMMEDIATE) ===', { 
        httpLatency: `${httpLatency}ms`,
        note: 'HTTP response sent BEFORE blockchain submit - true optimistic!',
      });
      
      // Step 3: Submit to blockchain in background (async, non-blocking)
      setImmediate(async () => {
        try {
          logger.info('Background: Submitting to blockchain', { buyerAddress });
          
          const result = await client.executeTransaction({
            transaction: txBytes,
            signatures: signatures,
          });
          
          const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
          const submitLatency = Date.now() - submitStart;
          
          logger.info('=== BACKGROUND: TRANSACTION SUBMITTED & FINALIZED ===', {
            digest,
            submitLatency: `${submitLatency}ms`,
            note: 'Merchant already delivered content',
          });
          
          // TODO: Notify merchant with confirmed digest (webhook or polling endpoint)
          // await notifyMerchantFinality(invoiceJWT, digest);
          
        } catch (submitError) {
          // CRITICAL: Settlement failed AFTER we told merchant "safe to deliver"
          // This is the facilitator's liability!
          logger.error('=== FACILITATOR LIABILITY: SETTLEMENT FAILED ===', {
            error: submitError instanceof Error ? submitError.message : String(submitError),
            stack: submitError instanceof Error ? submitError.stack : undefined,
            buyerAddress,
            invoiceJWT,
            note: 'Merchant already delivered - facilitator must compensate!',
          });
          
          // TODO: Trigger facilitator compensation flow
          // await facilitatorCompensatesMerchant(invoiceJWT, amount);
        }
      });
      
      return;
    }
    
    // ===== MODE 2: PESSIMISTIC SETTLEMENT (GUARANTEED) =====
    if (settlementMode === 'pessimistic') {
      logger.info('Using PESSIMISTIC settlement mode');
      
      const submitStart = Date.now();
      
      // PESSIMISTIC: Submit and wait for finality with full effects
      // This is the INTENDED behavior - block until confirmed
      const result = await client.executeTransaction({
        transaction: txBytes,
        signatures: signatures,
        include: {
          effects: true,    // Transaction execution effects
          events: true,     // Emitted events (including receipt)
          objectChanges: true,  // Object mutations
        },
      });
      
      const submitLatency = Date.now() - submitStart;
      
      // Extract digest from result
      const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
      
      const httpLatency = Date.now() - startTime;
      
      logger.info('Transaction finalized', { 
        digest,
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        note: 'Localnet: ~20-50ms | Testnet: ~500-1000ms',
      });
      
      // Check if transaction succeeded
      if (result.$kind === 'FailedTransaction') {
        res.status(500).json({
          error: 'Transaction failed on-chain',
          digest,
          details: result.FailedTransaction,
        });
        return;
      }
      
      // Extract receipt event
      const receiptEvent = result.Transaction?.events?.find(e =>
        e.type?.includes('::payment::ReceiptEmitted')
      );
      
      if (!receiptEvent) {
        logger.warn('No receipt event found', { 
          digest,
          events: result.Transaction?.events 
        });
      }
      
      const receipt = receiptEvent?.parsedJson as ReceiptEvent | undefined;
      
      // Return "SAFE TO DELIVER" with confirmed receipt
      // Merchant trusts facilitator (transaction already finalized)
      // Zero risk: settlement already confirmed on-chain
      res.json({
        success: true,
        mode: 'pessimistic',
        safeToDeliver: true,  // Confirmed on-chain (no risk)
        digest,
        receipt: receipt ? {
          paymentId: receipt.payment_id,
          buyer: receipt.buyer,
          merchant: receipt.merchant,
          amount: receipt.amount,
          timestamp: receipt.timestamp,
        } : null,
        submitLatency: `${submitLatency}ms`,  // Time to finality + extract receipt
        httpLatency: `${httpLatency}ms`,      // Total HTTP round-trip
        timestamp: Date.now(),
      });
      
      logger.info('=== SUBMIT PAYMENT SUCCESS (PESSIMISTIC) ===', {
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        hasReceipt: !!receipt
      });
      return;
    }
    
    // Invalid mode
    res.status(400).json({
      error: 'Invalid settlement mode',
      validModes: ['optimistic', 'pessimistic'],
      provided: settlementMode,
    });
    
  } catch (err) {
    const latency = Date.now() - startTime;
    
    // Log full error details
    console.error('[SUBMIT PAYMENT ERROR]');
    console.error('Message:', err instanceof Error ? err.message : String(err));
    console.error('Stack:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('Full error:', err);
    
    logger.error('=== SUBMIT PAYMENT FAILED ===', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      latency: `${latency}ms`,
    });
    
    res.status(500).json({
      error: 'Failed to submit payment',
      details: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : undefined,
      latency: `${latency}ms`,
    });
  }
}
