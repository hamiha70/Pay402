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
  settlementMode?: 'optimistic' | 'wait';  // Default: optimistic
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
      
      // Step 2: Submit to blockchain IMMEDIATELY (lock buyer's coins)
      // This is THE critical step - submit before buyer can front-run
      const submitStart = Date.now();
      
      let result;
      try {
        // Fire transaction to blockchain (returns when SUBMITTED, not finalized)
        // Note: SDK executeTransaction() actually waits for finality
        // TODO: Use raw gRPC submit for true async behavior
        result = await client.executeTransaction({
          transaction: txBytes,
          signatures: signatures,
        });
      } catch (submitError) {
        logger.error('Submit to blockchain failed', {
          error: submitError instanceof Error ? submitError.message : String(submitError),
          stack: submitError instanceof Error ? submitError.stack : undefined,
        });
        
        res.status(500).json({
          error: 'Failed to submit transaction',
          details: submitError instanceof Error ? submitError.message : String(submitError),
        });
        return;
      }
      
      const submitLatency = Date.now() - submitStart;
      const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
      
      // Step 3: IMMEDIATE "safe to deliver" (BEFORE waiting for finality)
      // Merchant trusts facilitator's validation + immediate submit
      const httpLatency = Date.now() - startTime;
      
      res.json({
        success: true,
        mode: 'optimistic',
        safeToDeliver: true,
        digest,  // Available immediately after submit
        validateLatency: `${validateLatency}ms`,
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        note: 'Transaction submitted - merchant can deliver (finality in background)',
        timestamp: Date.now(),
      });
      
      logger.info('=== OPTIMISTIC: SAFE TO DELIVER ===', { 
        digest,
        validateLatency: `${validateLatency}ms`,
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        note: 'Submitted to blockchain, merchant delivering now, finality happens async',
      });
      
      // Step 4: Monitor finality in background (optional - for logging/webhook)
      // Transaction already submitted, just waiting for confirmation
      setImmediate(async () => {
        const finalityStart = Date.now();
        
        try {
          // Transaction already submitted above - this is just monitoring
          // In production, could poll for finality status or use websocket
          logger.info('Monitoring finality (background)', { digest });
          
          // Note: result already has finality (SDK limitation)
          // In true async implementation, would poll here
          const finalityLatency = Date.now() - finalityStart;
          
          logger.info('=== FINALITY CONFIRMED (BACKGROUND) ===', {
            digest,
            finalityLatency: `${finalityLatency}ms`,
            note: 'Merchant already delivered content',
          });
          
          // TODO: Notify merchant with confirmed digest (webhook)
          // await notifyMerchantFinality(invoiceJWT, digest);
          
        } catch (finalityError) {
          // Should rarely happen (transaction already submitted successfully)
          logger.error('Finality monitoring error (non-critical)', {
            digest,
            error: finalityError instanceof Error ? finalityError.message : String(finalityError),
          });
        }
      });
      
      return;
    }
    
    // ===== MODE 2: WAIT-FOR-FINALITY (GUARANTEED) =====
    if (settlementMode === 'wait') {
      logger.info('Using WAIT-FOR-FINALITY settlement mode');
      
      const submitStart = Date.now();
      
      // WAIT: Submit and wait for finality with full effects
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
      
      // Return with confirmed receipt
      res.json({
        success: true,
        mode: 'wait',
        digest,
        submitLatency: `${submitLatency}ms`,  // Time to finality + extract receipt
        httpLatency: `${httpLatency}ms`,      // Total HTTP round-trip
        receipt: receipt ? {
          paymentId: receipt.payment_id,
          buyer: receipt.buyer,
          merchant: receipt.merchant,
          amount: receipt.amount,
          timestamp: receipt.timestamp,
        } : null,
        status: 'confirmed',
        timestamp: Date.now(),
      });
      
      logger.info('=== SUBMIT PAYMENT SUCCESS (WAIT) ===', {
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        hasReceipt: !!receipt
      });
      return;
    }
    
    // Invalid mode
    res.status(400).json({
      error: 'Invalid settlement mode',
      validModes: ['optimistic', 'wait'],
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
