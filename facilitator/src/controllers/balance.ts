import { Request, Response } from 'express';
import { getSuiClient } from '../sui.js';
import { DEFAULT_PAYMENT_COIN_TYPE } from '../config.js';

interface CheckBalanceRequest {
  address: string;
  network: string;
  coinType?: string;
}

interface CoinInfo {
  coinObjectId: string;
  balance: string;
}

/**
 * POST /check-balance
 * Check if buyer has sufficient coins and discover coin objects
 */
export async function checkBalanceController(req: Request, res: Response): Promise<void> {
  try {
    const { address, network, coinType } = req.body as CheckBalanceRequest;
    
    // Validate required fields
    if (!address) {
      res.status(400).json({ error: 'Missing required field: address' });
      return;
    }
    
    if (!network) {
      res.status(400).json({ error: 'Missing required field: network' });
      return;
    }
    
    // Default to USDC for payments (SUI is for gas only!)
    const requestedCoinType = coinType || DEFAULT_PAYMENT_COIN_TYPE;
    
    const client = getSuiClient();
    
    // Get all coin objects owned by address
    const coins = await client.listCoins({
      owner: address,
      coinType: requestedCoinType,
    });
    
    // Calculate total balance
    const totalBalance = coins.objects.reduce(
      (sum: bigint, coin) => sum + BigInt(coin.balance),
      0n
    );
    
    // Return coin information
    const coinInfos: CoinInfo[] = coins.objects.map(coin => ({
      coinObjectId: coin.objectId,
      balance: coin.balance,
    }));
    
    res.json({
      balance: totalBalance.toString(),
      coinType: requestedCoinType,
      coins: coinInfos,
      coinCount: coins.objects.length,
    });
    
  } catch (error) {
    console.error('Balance check failed:', error);
    res.status(500).json({
      error: 'Failed to check balance',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
