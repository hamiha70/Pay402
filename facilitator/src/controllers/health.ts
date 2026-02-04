import { Request, Response } from 'express';
import { getSuiClient, getFacilitatorAddress } from '../sui.js';
import { config } from '../config.js';

/**
 * GET /health
 * Health check endpoint with gas monitoring
 * 
 * Returns:
 * - Network connectivity status
 * - Facilitator gas balance
 * - Warning if gas is low
 * - Error if out of gas
 */
export async function healthController(req: Request, res: Response): Promise<void> {
  try {
    const client = getSuiClient();
    const facilitatorAddress = getFacilitatorAddress();
    
    // Check if we can connect to SUI network
    const gasPrice = await client.getReferenceGasPrice();
    
    // Check facilitator's SUI balance (for gas)
    const balance = await client.getBalance({
      owner: facilitatorAddress,
      coinType: '0x2::sui::SUI',
    });
    
    const gasMIST = balance.balance.balance ? parseInt(balance.balance.balance) : 0;
    const gasSUI = gasMIST / 1_000_000_000;
    
    // Gas thresholds
    const MIN_GAS_SUI = 0.1;  // Critical: service will fail
    const LOW_GAS_SUI = 1.0;  // Warning: should refill soon
    
    const gasAvailable = gasSUI >= MIN_GAS_SUI;
    const gasLow = gasSUI < LOW_GAS_SUI && gasSUI >= MIN_GAS_SUI;
    
    const warnings: string[] = [];
    
    if (gasLow) {
      warnings.push(`Low gas: ${gasSUI.toFixed(4)} SUI remaining (threshold: ${LOW_GAS_SUI} SUI)`);
      warnings.push(`Recommended action: sui client faucet --address ${facilitatorAddress}`);
    }
    
    if (!gasAvailable) {
      // Critical: out of gas
      res.status(503).json({
        status: 'degraded',
        network: config.suiNetwork,
        facilitator: facilitatorAddress,
        gasPrice: gasPrice.toString(),
        gasBalance: `${gasSUI.toFixed(4)} SUI`,
        gasAvailable: false,
        error: 'Facilitator out of gas - service unavailable',
        instructions: {
          manual: `sui client faucet --address ${facilitatorAddress}`,
          support: 'Contact hackathon team if issue persists',
        },
        timestamp: Date.now(),
      });
      return;
    }
    
    // Healthy
    res.json({
      status: 'ok',
      network: config.suiNetwork,
      facilitator: facilitatorAddress,
      gasPrice: gasPrice.toString(),
      gasBalance: `${gasSUI.toFixed(4)} SUI`,
      gasAvailable: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });
  }
}
