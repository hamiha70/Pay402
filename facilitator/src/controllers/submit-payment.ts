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
      
      // BUSINESS MODEL: Facilitator acts as GUARANTOR
      // 1. Validate PTB locally (instant)
      // 2. Return "SAFE TO DELIVER" immediately
      // 3. Submit to chain in background
      // 4. If settlement fails: FACILITATOR PAYS (liability/insurance)
      
      // Step 1: Pre-validation (instant, ~5ms)
      // TODO: Add comprehensive PTB validation:
      // - Check signature validity
      // - Verify buyer has sufficient balance
      // - Validate invoice JWT hasn't expired
      // - Check PTB structure matches invoice
      
      const httpLatency = Date.now() - startTime;
      
      // Step 2: IMMEDIATE "safe to deliver" response
      // Merchant can deliver content NOW without waiting
      res.json({
        success: true,
        mode: 'optimistic',
        safeToDeliver: true,
        facilitatorGuarantee: true,
        digest: null,  // Not yet available - will notify via webhook
        httpLatency: `${httpLatency}ms`,
        note: 'Facilitator guarantees payment - settlement in progress',
        timestamp: Date.now(),
      });
      
      logger.info('=== OPTIMISTIC: SAFE TO DELIVER SENT ===', { 
        httpLatency: `${httpLatency}ms`,
        note: 'Merchant can deliver immediately - settlement happens async',
      });
      
      // Step 3: Submit to chain ASYNC (don't block HTTP response)
      // This runs in background after merchant already delivered
      setImmediate(async () => {
        const settlementStart = Date.now();
        
        try {
          logger.info('Background settlement starting', { buyerAddress });
          
          const result = await client.executeTransaction({
            transaction: txBytes,
            signatures: signatures,
          });
          
          const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
          const settlementLatency = Date.now() - settlementStart;
          
          logger.info('=== SETTLEMENT SUCCESS (BACKGROUND) ===', {
            digest,
            settlementLatency: `${settlementLatency}ms`,
            buyerAddress,
          });
          
          // TODO: Notify merchant with actual digest (webhook or polling endpoint)
          // await notifyMerchantSettled(invoiceJWT, digest);
          
        } catch (settlementError) {
          const settlementLatency = Date.now() - settlementStart;
          
          // CRITICAL: Settlement failed - facilitator must compensate!
          logger.error('=== SETTLEMENT FAILED - FACILITATOR LIABILITY ===', {
            error: settlementError instanceof Error ? settlementError.message : String(settlementError),
            stack: settlementError instanceof Error ? settlementError.stack : undefined,
            settlementLatency: `${settlementLatency}ms`,
            buyerAddress,
            invoiceJWT,
            note: 'Facilitator must compensate merchant for failed settlement',
          });
          
          // TODO: Trigger facilitator compensation flow
          // await facilitatorCompensatesMerchant(invoiceJWT, amount);
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
