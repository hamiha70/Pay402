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
      
      const submitStart = Date.now();
      
      // OPTIMISTIC: Submit transaction WITHOUT waiting for finality
      // PROBLEM: SDK executeTransaction() ALWAYS waits for finality
      // We're measuring TOTAL time (submit + finality), not just submit
      let result;
      try {
        result = await client.executeTransaction({
          transaction: txBytes,
          signatures: signatures,
          // NOTE: This blocks until finality (~20ms localnet, ~500ms testnet)
          // For true optimistic, we'd need to:
          // 1. Use raw gRPC submitTransaction (returns digest immediately)
          // 2. Return HTTP response with digest
          // 3. Settlement happens in background
        });
      } catch (execError) {
        logger.error('executeTransaction failed', {
          error: execError instanceof Error ? execError.message : String(execError),
          stack: execError instanceof Error ? execError.stack : undefined,
        });
        throw execError;
      }
      
      const submitLatency = Date.now() - submitStart;
      
      // Extract digest from result (discriminated union format)
      const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
      
      const httpLatency = Date.now() - startTime;
      
      logger.info('Transaction submitted (optimistic)', { 
        digest,
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
        note: 'SDK blocks until finality - not true optimistic yet',
      });
      
      // Return digest to merchant
      // In true optimistic, this would be ~50ms on testnet
      // Currently: ~500ms because SDK waits for finality
      res.json({
        success: true,
        mode: 'optimistic',
        digest,
        submitLatency: `${submitLatency}ms`,  // Time to finality
        httpLatency: `${httpLatency}ms`,      // Total HTTP time
        note: 'SDK limitation: waits for finality even in optimistic mode',
        timestamp: Date.now(),
      });
      
      logger.info('=== SUBMIT PAYMENT SUCCESS (OPTIMISTIC) ===', { 
        submitLatency: `${submitLatency}ms`,
        httpLatency: `${httpLatency}ms`,
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
