import { Request, Response } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from '../sui.js';
import { config, CLOCK_OBJECT_ID } from '../config.js';
import { jwtVerify } from 'jose';

interface BuildPTBRequest {
  buyerAddress: string;
  invoiceJWT: string;
}

interface InvoicePayload {
  resourcePath: string;
  amount: string;
  merchant: string;
  merchantName: string;
  facilitatorFee: string;
  facilitator: string;
  coinType: string;
  invoiceId: string;
  iat: number;
  exp: number;
}

/**
 * POST /build-ptb
 * Build unsigned PTB for client-side verification and signing
 */
export async function buildPTBController(req: Request, res: Response): Promise<void> {
  try {
    const { buyerAddress, invoiceJWT } = req.body as BuildPTBRequest;
    
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
      // Decode without verification (merchant's public key verification happens client-side)
      const decoded = JSON.parse(
        Buffer.from(invoiceJWT.split('.')[1], 'base64').toString()
      );
      invoice = decoded as InvoicePayload;
    } catch (err) {
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
    
    const client = getSuiClient();
    
    // Get buyer's USDC coins
    const coins = await client.listCoins({
      owner: buyerAddress,
      coinType: invoice.coinType,
    });
    
    if (coins.data.length === 0) {
      res.status(400).json({
        error: 'No USDC coins found for buyer',
        buyerAddress,
        coinType: invoice.coinType,
      });
      return;
    }
    
    // Calculate total balance
    const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
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
    
    // Merge coins if needed
    const coinIds = coins.data.map(coin => coin.coinObjectId);
    const [primaryCoin] = tx.splitCoins(tx.object(coinIds[0]), []);
    
    if (coinIds.length > 1) {
      tx.mergeCoins(
        primaryCoin,
        coinIds.slice(1).map(id => tx.object(id))
      );
    }
    
    // Split coins for payment and fee
    const [merchantCoin, feeCoin] = tx.splitCoins(primaryCoin, [
      amountBigInt,
      feeBigInt,
    ]);
    
    // Transfer to merchant
    tx.transferObjects([merchantCoin], invoice.merchant);
    
    // Transfer fee to facilitator
    tx.transferObjects([feeCoin], invoice.facilitator);
    
    // Call settle_payment on Move contract to emit receipt event
    tx.moveCall({
      target: `${config.packageId}::payment::settle_payment`,
      arguments: [
        tx.pure.string(invoice.invoiceId),
        tx.pure.u64(invoice.amount),
        tx.pure.address(invoice.merchant),
        tx.pure.u64(invoice.facilitatorFee),
        tx.pure.address(invoice.facilitator),
        tx.pure.string(invoiceJWT), // Invoice hash (JWT itself)
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    
    // Set gas budget (facilitator will sponsor)
    tx.setGasBudget(100000000);
    
    // Serialize PTB to bytes
    const ptbBytes = await tx.build({ client });
    
    // Return unsigned PTB bytes for client-side verification
    res.json({
      ptbBytes: Array.from(ptbBytes),
      invoice: {
        resourcePath: invoice.resourcePath,
        amount: invoice.amount,
        merchant: invoice.merchant,
        merchantName: invoice.merchantName,
        facilitatorFee: invoice.facilitatorFee,
        facilitator: invoice.facilitator,
        invoiceId: invoice.invoiceId,
      },
    });
    
  } catch (err) {
    console.error('Build PTB error:', err);
    res.status(500).json({
      error: 'Failed to build PTB',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
