import { Request, Response } from 'express';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient, getFacilitatorKeypair } from '../sui.js';
import { config, CLOCK_OBJECT_ID } from '../config.js';

interface SettlePaymentRequest {
  buyerAddress: string;
  amount: string;
  merchant: string;
  facilitatorFee: string;
  paymentId: string;
  coinType: string;
  network: string;
}

/**
 * POST /settle-payment
 * Construct PTB and submit payment settlement to SUI blockchain
 */
export async function settlePaymentController(req: Request, res: Response): Promise<void> {
  try {
    const {
      buyerAddress,
      amount,
      merchant,
      facilitatorFee,
      paymentId,
      coinType,
      network,
    } = req.body as SettlePaymentRequest;
    
    // Validate required fields
    if (!buyerAddress || !amount || !merchant || !paymentId || !coinType) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['buyerAddress', 'amount', 'merchant', 'paymentId', 'coinType'],
      });
      return;
    }
    
    // Validate amounts are valid numbers
    const amountBigInt = BigInt(amount);
    const feeBigInt = BigInt(facilitatorFee || config.facilitatorFee);
    const totalRequired = amountBigInt + feeBigInt;
    
    const client = getSuiClient();
    
    // 1. Get buyer's coin objects
    const coins = await client.listCoins({
      owner: buyerAddress,
      coinType,
    });
    
    if (coins.objects.length === 0) {
      res.status(402).json({
        error: 'No coins found',
        coinType,
      });
      return;
    }
    
    // 2. Find coin with sufficient balance
    const suitableCoin = coins.objects.find(
      (c) => BigInt(c.balance) >= totalRequired
    );
    
    if (!suitableCoin) {
      // Calculate total available
      const totalAvailable = coins.objects.reduce(
        (sum: bigint, coin) => sum + BigInt(coin.balance),
        0n
      );
      
      res.status(402).json({
        error: 'Insufficient balance',
        required: totalRequired.toString(),
        available: totalAvailable.toString(),
        coinType,
        // TODO: Implement coin merging for production
        note: 'Coin merging not implemented - need single coin with sufficient balance',
      });
      return;
    }
    
    // 3. Build PTB (Programmable Transaction Block)
    const tx = new Transaction();
    
    // Convert payment ID string to vector<u8>
    const paymentIdBytes = Array.from(Buffer.from(paymentId, 'utf-8'));
    
    // Call settle_payment<T> Move function
    tx.moveCall({
      target: `${config.packageId}::payment::settle_payment`,
      typeArguments: [coinType],
      arguments: [
        tx.object(suitableCoin.objectId),      // &mut Coin<T>
        tx.pure.u64(amount),                   // amount: u64
        tx.pure.address(merchant),             // merchant: address
        tx.pure.u64(feeBigInt.toString()),     // facilitator_fee: u64
        tx.pure.vector('u8', paymentIdBytes),  // payment_id: vector<u8>
        tx.object(CLOCK_OBJECT_ID),            // clock: &Clock
      ],
    });
    
    // 4. Sign and execute (facilitator sponsors gas)
    const facilitatorKeypair = getFacilitatorKeypair();
    
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: facilitatorKeypair,
      include: {
        effects: true,
        events: true,
        objectChanges: true,
      },
    });
    
    // 5. Check if transaction succeeded
    // Result can be either {$kind: "Transaction"} or {$kind: "FailedTransaction"}
    if (result.$kind === 'FailedTransaction') {
      res.status(500).json({
        error: 'Transaction failed',
        details: result.FailedTransaction,
      });
      return;
    }
    
    // 6. Return success
    res.json({
      success: true,
      transaction: result.Transaction,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Payment settlement failed:', error);
    res.status(500).json({
      error: 'Failed to settle payment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
