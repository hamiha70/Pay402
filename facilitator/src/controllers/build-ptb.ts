import { Request, Response } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from '../sui.js';
import { config, CLOCK_OBJECT_ID } from '../config.js';
import { logger } from '../utils/logger.js';
import { jwtVerify } from 'jose';

interface BuildPTBRequest {
  buyerAddress: string;
  invoiceJWT: string;
}

interface InvoicePayload {
  resource: string;
  amount: string;
  merchantRecipient: string;
  facilitatorFee: string;
  facilitatorRecipient: string;
  coinType: string;
  nonce: string;
  iat: number;
  exp: number;
  expiry: number;
}

/**
 * POST /build-ptb
 * Build unsigned PTB for client-side verification and signing
 */
export async function buildPTBController(req: Request, res: Response): Promise<void> {
  logger.info('=== BUILD PTB REQUEST START ===');
  logger.debug('Request body', req.body);
  
  try {
    const { buyerAddress, invoiceJWT } = req.body as BuildPTBRequest;
    logger.info('Parsed request', { buyerAddress, jwtLength: invoiceJWT?.length });
    
    // Validate required fields
    if (!buyerAddress || !invoiceJWT) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['buyerAddress', 'invoiceJWT'],
      });
      return;
    }
    
    // Decode and validate JWT (basic validation - merchant signature verified client-side)
    let invoice: InvoicePayload;
    try {
      logger.debug('Decoding JWT...');
      // Decode without verification (merchant's public key verification happens client-side)
      const decoded = JSON.parse(
        Buffer.from(invoiceJWT.split('.')[1], 'base64').toString()
      );
      invoice = decoded as InvoicePayload;
      logger.info('JWT decoded successfully', { invoice });
    } catch (err) {
      logger.error('JWT decode failed', err);
      res.status(400).json({
        error: 'Invalid invoice JWT',
        details: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    
    // Check expiry
    if (invoice.exp && Date.now() > invoice.exp * 1000) {
      res.status(400).json({
        error: 'Invoice expired',
        expiredAt: new Date(invoice.exp * 1000).toISOString(),
      });
      return;
    }
    
    // Validate amounts
    const amountBigInt = BigInt(invoice.amount);
    const feeBigInt = BigInt(invoice.facilitatorFee || config.facilitatorFee);
    const totalRequired = amountBigInt + feeBigInt;
    logger.info('Amounts calculated', { 
      amount: invoice.amount, 
      fee: invoice.facilitatorFee,
      total: totalRequired.toString() 
    });
    
    const client = getSuiClient();
    logger.debug('Fetching coins', { buyerAddress, coinType: invoice.coinType });
    
    // Get buyer's USDC coins
    const coins = await client.listCoins({
      owner: buyerAddress,
      coinType: invoice.coinType,
    });
    logger.info('Coins fetched', { 
      count: coins.objects?.length || 0,
      coinsResponse: coins 
    });
    
    if (!coins.objects || coins.objects.length === 0) {
      res.status(400).json({
        error: 'No coins found for buyer',
        buyerAddress,
        coinType: invoice.coinType,
      });
      return;
    }
    
    // Calculate total balance
    const totalBalance = coins.objects.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
    if (totalBalance < totalRequired) {
      res.status(400).json({
        error: 'Insufficient balance',
        required: totalRequired.toString(),
        available: totalBalance.toString(),
        buyerAddress,
      });
      return;
    }
    
    // Build PTB
    const tx = new Transaction();
    
    // Set sender (buyer)
    tx.setSender(buyerAddress);
    
    // Use gas coin as the source (buyer pays with SUI)
    // Split the required amounts from gas coin
    const [merchantCoin, feeCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(amountBigInt),
      tx.pure.u64(feeBigInt),
    ]);
    
    // Transfer to merchant
    tx.transferObjects([merchantCoin], invoice.merchantRecipient);
    
    // Transfer fee to facilitator
    tx.transferObjects([feeCoin], invoice.facilitatorRecipient);
    
    // Call settle_payment on Move contract to emit receipt event
    tx.moveCall({
      target: `${config.packageId}::payment::settle_payment`,
      arguments: [
        tx.pure.string(invoice.nonce),
        tx.pure.u64(invoice.amount),
        tx.pure.address(invoice.merchantRecipient),
        tx.pure.u64(invoice.facilitatorFee),
        tx.pure.address(invoice.facilitatorRecipient),
        tx.pure.string(invoiceJWT), // Invoice hash (JWT itself)
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    
    // Set gas budget (facilitator will sponsor)
    tx.setGasBudget(100000000);
    
    // Serialize PTB to bytes
    const ptbBytes = await tx.build({ client });
    
    // Return unsigned PTB bytes for client-side verification
    logger.info('PTB built successfully', { ptbBytesLength: ptbBytes.length });
    logger.info('=== BUILD PTB REQUEST SUCCESS ===');
    
    res.json({
      ptbBytes: Array.from(ptbBytes),
      invoice: {
        resource: invoice.resource,
        amount: invoice.amount,
        merchant: invoice.merchantRecipient,
        facilitatorFee: invoice.facilitatorFee,
        facilitator: invoice.facilitatorRecipient,
        invoiceId: invoice.nonce,
      },
    });
    
  } catch (err) {
    logger.error('=== BUILD PTB REQUEST FAILED ===', err, { 
      body: req.body 
    });
    res.status(500).json({
      error: 'Failed to build PTB',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
