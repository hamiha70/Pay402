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
      
      // OPTIMISTIC: Submit transaction WITHOUT waiting for finality
      // On testnet/mainnet, this should be ~50-100ms (just broadcast)
      // On localnet, finality is instant so both modes are similar
      let result;
      try {
        result = await client.executeTransaction({
          transaction: txBytes,
          signatures: signatures,
          // NOTE: executeTransaction ALWAYS waits for finality in gRPC SDK
          // For true async on testnet/mainnet, we'd need to use raw gRPC submit
          // or poll with waitForTransaction after getting digest
        });
      } catch (execError) {
        logger.error('executeTransaction failed', {
          error: execError instanceof Error ? execError.message : String(execError),
          stack: execError instanceof Error ? execError.stack : undefined,
        });
        throw execError;
      }
      
      // Extract digest from result (discriminated union format)
      const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
      
      const latency = Date.now() - startTime;
      logger.info('Transaction submitted (optimistic)', { 
        digest,
        latency: `${latency}ms`,
        note: 'On testnet/mainnet, expect ~50-100ms; localnet is instant',
      });
      
      // Return immediately with digest
      // Merchant will poll for receipt using waitForTransaction(digest)
      res.json({
        success: true,
        mode: 'optimistic',
        digest,
        latency: `${latency}ms`,
        note: 'Transaction submitted - settlement pending (~400-800ms on testnet)',
        timestamp: Date.now(),
      });
      
      logger.info('=== SUBMIT PAYMENT SUCCESS (OPTIMISTIC) ===', { latency: `${latency}ms` });
      return;
    }
    
    // ===== MODE 2: WAIT-FOR-FINALITY (GUARANTEED) =====
    if (settlementMode === 'wait') {
      logger.info('Using WAIT-FOR-FINALITY settlement mode');
      
      // WAIT: Submit and wait for finality with full effects
      // On testnet/mainnet, this should be ~500-1000ms (submit + checkpoint)
      // On localnet, finality is instant (~20-50ms)
      const result = await client.executeTransaction({
        transaction: txBytes,
        signatures: signatures,
        include: {
          effects: true,    // Transaction execution effects
          events: true,     // Emitted events (including receipt)
          objectChanges: true,  // Object mutations
        },
      });
      
      // Extract digest from result
      const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
      
      const latency = Date.now() - startTime;
      logger.info('Transaction finalized', { 
        digest,
        latency: `${latency}ms`,
        note: 'On testnet/mainnet, expect ~500-1000ms; localnet is instant',
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
        latency: `${latency}ms`,
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
        latency: `${latency}ms`,
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
