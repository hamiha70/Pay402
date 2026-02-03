import { Request, Response } from 'express';
import { getSuiClient } from '../sui.js';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from '../config.js';

interface FundRequest {
  address: string;
  sessionId: string;
}

// In-memory store for idempotency (in production, use Redis or DB)
const fundedSessions = new Set<string>();

/**
 * Fund a buyer's wallet with test USDC
 * This is a demo faucet for the hackathon
 */
export async function fundController(req: Request, res: Response) {
  try {
    const { address, sessionId } = req.body as FundRequest;

    // Validation
    if (!address || !sessionId) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['address', 'sessionId'],
      });
      return;
    }

    // Idempotency check
    if (fundedSessions.has(sessionId)) {
      res.json({
        funded: false,
        alreadyFunded: true,
        message: 'This session already received funding',
        sessionId,
      });
      return;
    }

    const client = getSuiClient();

    // Check current balance
    const balance = await client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI', // Using SUI for testing
    });

    const currentBalance = balance.totalBalance ? parseInt(balance.totalBalance) : 0;

    // If already funded, return early
    if (currentBalance > 0) {
      res.json({
        funded: false,
        alreadyFunded: true,
        balance: currentBalance / 1_000_000_000, // Convert to SUI
        message: 'Wallet already has funds',
      });
      return;
    }

    // Fund the wallet with enough for payment + gas
    const FUND_AMOUNT = 10_000_000_000; // 10 SUI (plenty for payment + gas)

    const keypair = Ed25519Keypair.fromSecretKey(config.facilitatorPrivateKey!);

    const tx = new Transaction();
    
    // Split coin from facilitator's gas
    const [coin] = tx.splitCoins(tx.gas, [FUND_AMOUNT]);
    
    // Transfer to recipient
    tx.transferObjects([coin], address);

    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
    });

    // Mark session as funded
    fundedSessions.add(sessionId);

    // Get new balance
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for tx to settle
    const newBalance = await client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
    
    res.json({
      funded: true,
      amount: FUND_AMOUNT / 1_000_000_000, // Convert to SUI
      txDigest: digest,
      balance: (newBalance.totalBalance ? parseInt(newBalance.totalBalance) : 0) / 1_000_000_000,
      message: 'Wallet funded successfully',
    });

  } catch (error) {
    console.error('Fund error:', error);
    res.status(500).json({
      error: 'Failed to fund wallet',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
