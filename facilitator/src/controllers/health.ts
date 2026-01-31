import { Request, Response } from 'express';
import { getSuiClient, getFacilitatorAddress } from '../sui.js';
import { config } from '../config.js';

/**
 * GET /health
 * Simple health check endpoint
 */
export async function healthController(req: Request, res: Response): Promise<void> {
  try {
    const client = getSuiClient();
    
    // Check if we can connect to SUI network and get reference gas price
    const gasPrice = await client.getReferenceGasPrice();
    
    res.json({
      status: 'ok',
      network: config.suiNetwork,
      facilitator: getFacilitatorAddress(),
      gasPrice: gasPrice.toString(),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
