import { Request, Response } from 'express';
import { getSuiClient } from '../sui.js';
import { logger } from '../utils/logger.js';

interface SubmitPaymentRequest {
  invoiceJWT: string;
  buyerAddress: string;
  signedTransaction: {
    transactionBytes: string;  // base64 encoded PTB bytes
    signature: string;          // base64 encoded signature
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
  logger.info('=== SUBMIT PAYMENT REQUEST START ===');
  
  try {
    const {
      invoiceJWT,
      buyerAddress,
      signedTransaction,
      settlementMode = 'optimistic', // Default to optimistic
    } = req.body as SubmitPaymentRequest;
    
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
    
    // ===== MODE 1: OPTIMISTIC SETTLEMENT (FAST UX) =====
    if (settlementMode === 'optimistic') {
      logger.info('Using OPTIMISTIC settlement mode');
      
      // Submit transaction (non-blocking - just get digest)
      const result = await client.executeTransaction({
        transaction: signedTransaction.transactionBytes,
        signature: signedTransaction.signature,
      });
      
      const latency = Date.now() - startTime;
      logger.info('Transaction submitted (optimistic)', { 
        digest: result.digest,
        latency: `${latency}ms`,
      });
      
      // Return immediately with digest
      // Merchant will poll for receipt
      res.json({
        success: true,
        mode: 'optimistic',
        digest: result.digest,
        latency: `${latency}ms`,
        note: 'Transaction submitted - settlement pending (1-3s)',
        timestamp: Date.now(),
      });
      
      logger.info('=== SUBMIT PAYMENT SUCCESS (OPTIMISTIC) ===', { latency: `${latency}ms` });
      return;
    }
    
    // ===== MODE 2: WAIT-FOR-FINALITY (GUARANTEED) =====
    if (settlementMode === 'wait') {
      logger.info('Using WAIT-FOR-FINALITY settlement mode');
      
      // Submit and wait for finality
      const result = await client.executeTransaction({
        transaction: signedTransaction.transactionBytes,
        signature: signedTransaction.signature,
        include: {
          effects: true,
          events: true,
          objectChanges: true,
        },
      });
      
      const latency = Date.now() - startTime;
      logger.info('Transaction finalized', { 
        digest: result.digest,
        latency: `${latency}ms`,
      });
      
      // Check if transaction succeeded
      if (result.$kind === 'FailedTransaction') {
        res.status(500).json({
          error: 'Transaction failed on-chain',
          digest: result.digest,
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
          digest: result.digest,
          events: result.Transaction?.events 
        });
      }
      
      const receipt = receiptEvent?.parsedJson as ReceiptEvent | undefined;
      
      // Return with confirmed receipt
      res.json({
        success: true,
        mode: 'wait',
        digest: result.digest,
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
    logger.error('=== SUBMIT PAYMENT FAILED ===', err, { latency: `${latency}ms` });
    
    res.status(500).json({
      error: 'Failed to submit payment',
      details: err instanceof Error ? err.message : String(err),
      latency: `${latency}ms`,
    });
  }
}
