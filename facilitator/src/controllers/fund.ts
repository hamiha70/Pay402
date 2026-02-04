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
 * Fund a buyer's wallet with test USDC (MockUSDC on localnet)
 * This is a demo faucet for the hackathon
 * 
 * CRITICAL: On localnet, mints MockUSDC. On testnet, would use Circle faucet.
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

    // Check current balance (use payment coin type)
    const balance = await client.getBalance({
      owner: address,
      coinType: config.paymentCoinType, // MockUSDC on localnet
    });

    const currentBalance = balance.balance.balance ? parseInt(balance.balance.balance) : 0;

    // If already funded, return early
    const decimals = config.network.paymentCoin.decimals;
    if (currentBalance > 0) {
      res.json({
        funded: false,
        alreadyFunded: true,
        balance: currentBalance / Math.pow(10, decimals),
        message: 'Wallet already has funds',
      });
      return;
    }

    // Fund the wallet with MockUSDC (50 USDC for testing)
    const FUND_AMOUNT = 50_000_000; // 50 USDC (6 decimals)
    
    // MockUSDC constants (localnet only)
    const MOCK_USDC_PACKAGE = '0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b';
    const TREASURY_CAP = '0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11';

    const keypair = Ed25519Keypair.fromSecretKey(config.facilitatorPrivateKey!);

    const tx = new Transaction();
    
    // Call MockUSDC::mint function
    tx.moveCall({
      target: `${MOCK_USDC_PACKAGE}::mock_usdc::mint`,
      arguments: [
        tx.object(TREASURY_CAP),
        tx.pure.u64(FUND_AMOUNT),
        tx.pure.address(address),
      ],
    });

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
      coinType: config.paymentCoinType,
    });

    const digest = result.$kind === 'Transaction' ? result.Transaction.digest : null;
    
    res.json({
      funded: true,
      amount: FUND_AMOUNT / Math.pow(10, decimals),
      txDigest: digest,
      balance: (newBalance.balance.balance ? parseInt(newBalance.balance.balance) : 0) / Math.pow(10, decimals),
      message: 'Wallet funded successfully with MockUSDC',
    });

  } catch (error) {
    console.error('Fund error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if error is due to insufficient facilitator gas
    if (errorMessage.includes('insufficient') && errorMessage.includes('gas')) {
      res.status(503).json({
        error: 'Service Temporarily Unavailable',
        code: 'FACILITATOR_OUT_OF_GAS',
        details: 'Facilitator has insufficient SUI for gas. Please try again later or contact support.',
        instructions: {
          manual: 'Run: sui client faucet --address ' + config.facilitatorAddress,
          support: 'If issue persists, please contact the hackathon team.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Generic error response
    res.status(500).json({
      error: 'Failed to fund wallet',
      details: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
