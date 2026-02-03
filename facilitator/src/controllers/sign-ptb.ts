import { Request, Response } from 'express';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from '../config.js';

interface SignPTBRequest {
  ptbBytes: number[];  // Array of bytes
}

/**
 * POST /sign-ptb
 * Development endpoint: Sign PTB with facilitator key
 * 
 * WARNING: Only for testing! In production, buyer signs with their own key.
 * This simulates buyer signing by using facilitator's key.
 */
export async function signPTBController(req: Request, res: Response): Promise<void> {
  try {
    const { ptbBytes } = req.body as SignPTBRequest;
    
    if (!ptbBytes || !Array.isArray(ptbBytes)) {
      res.status(400).json({
        error: 'Missing or invalid ptbBytes',
        required: 'ptbBytes: number[]',
      });
      return;
    }
    
    // Convert to Uint8Array
    const txBytes = new Uint8Array(ptbBytes);
    
    // Sign with facilitator key (for testing)
    const keypair = Ed25519Keypair.fromSecretKey(config.facilitatorPrivateKey);
    const signature = await keypair.signTransaction(txBytes);
    
    res.json({
      signature: signature.signature,
      publicKey: keypair.getPublicKey().toBase64(),
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Failed to sign PTB',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
