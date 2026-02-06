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

    // Fund the wallet based on network
    const FUND_AMOUNT = 50_000_000; // 50 USDC (6 decimals)
    
    let result;
    
    if (config.network.name === 'localnet') {
      // ════════════════════════════════════════════════════════════
      // LOCALNET: Mint MockUSDC
      // ════════════════════════════════════════════════════════════
      const MOCK_USDC_PACKAGE = config.mockUsdcPackage;
      const TREASURY_CAP = config.mockUsdcTreasuryCap;

      // Use treasury owner keypair (the address that deployed MockUSDC)
      const keypair = Ed25519Keypair.fromSecretKey(config.treasuryOwnerPrivateKey!);

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
      result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
      });
      
    } else {
      // ════════════════════════════════════════════════════════════
      // TESTNET: Transfer real USDC from Treasury/Deployer address
      // ════════════════════════════════════════════════════════════
      
      // Treasury address (hardcoded for testnet - this is the "internal faucet")
      const TREASURY_ADDRESS = '0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995';
      
      // Check Treasury USDC balance
      const treasuryBalance = await client.getBalance({
        owner: TREASURY_ADDRESS,
        coinType: config.paymentCoinType, // Real Circle USDC on testnet
      });
      
      const treasuryUSDC = treasuryBalance.balance.balance ? parseInt(treasuryBalance.balance.balance) : 0;
      
      if (treasuryUSDC < FUND_AMOUNT) {
        res.status(503).json({
          error: 'Treasury has insufficient USDC',
          message: 'The internal Treasury needs to be funded with USDC for test buyer funding.',
          treasury: TREASURY_ADDRESS,
          balance: treasuryUSDC / 1_000_000,
          required: FUND_AMOUNT / 1_000_000,
          instructions: {
            circleFaucet: `https://faucet.circle.com - fund address: ${TREASURY_ADDRESS}`,
            note: 'Treasury acts as internal faucet for test addresses on testnet',
          },
        });
        return;
      }
      
      // Get a USDC coin from Treasury to split and transfer
      const treasuryCoins = await client.getCoins({
        owner: TREASURY_ADDRESS,
        coinType: config.paymentCoinType,
      });
      
      if (!treasuryCoins.data || treasuryCoins.data.length === 0) {
        res.status(503).json({
          error: 'No USDC coins in Treasury',
          message: 'Treasury has balance but no spendable coin objects',
        });
        return;
      }
      
      const treasuryCoin = treasuryCoins.data[0];
      
      // Check if Treasury private key is configured
      if (!config.treasuryOwnerPrivateKey) {
        res.status(503).json({
          error: 'Treasury private key not configured',
          message: 'TREASURY_OWNER_PRIVATE_KEY must be set in .env for testnet test funding',
          treasury: TREASURY_ADDRESS,
          instructions: {
            setup: 'Add TREASURY_OWNER_PRIVATE_KEY=suiprivkey1q... to facilitator/.env',
            export: 'Get key via: sui keytool export --key-identity ' + TREASURY_ADDRESS,
          },
        });
        return;
      }
      
      // Use Treasury keypair to sign the transfer
      const treasuryKeypair = Ed25519Keypair.fromSecretKey(config.treasuryOwnerPrivateKey);
      
      const tx = new Transaction();
      
      // Split FUND_AMOUNT from Treasury's USDC coin
      const [splitCoin] = tx.splitCoins(tx.object(treasuryCoin.coinObjectId), [tx.pure.u64(FUND_AMOUNT)]);
      
      // Transfer split coin to buyer
      tx.transferObjects([splitCoin], tx.pure.address(address));
      
      // Execute transaction (Treasury signs and pays gas)
      result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: treasuryKeypair,
      });
    }

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
