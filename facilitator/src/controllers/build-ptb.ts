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
      logger.error('No coins found', { buyerAddress, coinType: invoice.coinType });
      res.status(400).json({
        error: 'No coins found for buyer',
        buyerAddress,
        coinType: invoice.coinType,
        hint: 'Please fund this address first. For testing, use the /fund endpoint.',
      });
      return;
    }
    
    // Calculate total balance
    const totalBalance = coins.objects.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
    if (totalBalance < totalRequired) {
      logger.error('Insufficient balance', { 
        required: totalRequired.toString(),
        available: totalBalance.toString(),
        buyerAddress
      });
      res.status(400).json({
        error: 'Insufficient balance',
        required: totalRequired.toString(),
        available: totalBalance.toString(),
        buyerAddress,
        hint: `Need ${totalRequired.toString()} but only have ${totalBalance.toString()}`,
      });
      return;
    }
    
    // Check for gas coin availability (critical check)
    const MIN_GAS_BUDGET = 10000000n; // 0.01 SUI
    const hasMultipleCoins = coins.objects.length > 1;
    const hasSufficientGas = hasMultipleCoins || totalBalance > (totalRequired + MIN_GAS_BUDGET);
    
    if (!hasSufficientGas) {
      logger.warn('Potential gas selection issue', {
        coinCount: coins.objects.length,
        totalBalance: totalBalance.toString(),
        totalRequired: totalRequired.toString(),
        message: 'Single coin may cause gas selection failure'
      });
    }
    
    // Build PTB
    const tx = new Transaction();
    
    // Set sender (buyer)
    tx.setSender(buyerAddress);
    
    // Find suitable coin (for now, use first coin with sufficient balance)
    // TODO: Implement coin merging for production
    const suitableCoin = coins.objects.find(coin => BigInt(coin.balance) >= totalRequired);
    
    if (!suitableCoin) {
      logger.error('No single coin with sufficient balance', {
        required: totalRequired.toString(),
        available: totalBalance.toString(),
        coinCount: coins.objects.length
      });
      res.status(400).json({
        error: 'No single coin with sufficient balance',
        required: totalRequired.toString(),
        available: totalBalance.toString(),
        coinCount: coins.objects.length,
        hint: 'Coin merging not yet implemented. Need a single coin with enough balance for payment + gas.',
      });
      return;
    }
    
    // Convert payment ID (nonce) to bytes
    const paymentIdBytes = Array.from(Buffer.from(invoice.nonce, 'utf-8'));
    
    // Call settle_payment<T> Move function
    // This will:
    // 1. Split merchant amount from buyer's coin
    // 2. Split facilitator fee from buyer's coin  
    // 3. Transfer both amounts atomically
    // 4. Emit ReceiptEmitted event
    tx.moveCall({
      target: `${config.packageId}::payment::settle_payment`,
      typeArguments: [invoice.coinType],
      arguments: [
        tx.object(suitableCoin.objectId),          // &mut Coin<T> (buyer's USDC)
        tx.pure.u64(amountBigInt),                 // amount: u64
        tx.pure.address(invoice.merchantRecipient), // merchant: address
        tx.pure.u64(feeBigInt),                    // facilitator_fee: u64
        tx.pure.vector('u8', paymentIdBytes),      // payment_id: vector<u8>
        tx.object(CLOCK_OBJECT_ID),                // clock: &Clock
      ],
    });
    
    // Set gas budget (buyer pays for now, TODO: implement gas sponsorship)
    // Using modest budget since buyer needs separate coin for gas
    tx.setGasBudget(10000000); // 0.01 SUI (plenty for simple PTB)
    
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
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    logger.error('=== BUILD PTB REQUEST FAILED ===', err, { 
      body: req.body 
    });
    
    // Provide helpful error messages for common issues
    let userFriendlyError = 'Failed to build PTB';
    let hint = undefined;
    
    if (errorMessage.includes('insufficient SUI balance') || 
        errorMessage.includes('gas selection')) {
      userFriendlyError = 'Gas coin selection failed';
      hint = 'KNOWN ISSUE: The buyer\'s coin is locked for payment, leaving no coins for gas. ' +
             'Gas sponsorship (facilitator pays gas) is the solution - coming soon! ' +
             'See docs/testing/GAS_COIN_ISSUE.md for details.';
    } else if (errorMessage.includes('Invalid coin type')) {
      userFriendlyError = 'Invalid coin type in invoice';
      hint = 'The coin type specified in the invoice may not exist on this network.';
    }
    
    res.status(500).json({
      error: userFriendlyError,
      details: errorMessage,
      hint,
    });
  }
}
