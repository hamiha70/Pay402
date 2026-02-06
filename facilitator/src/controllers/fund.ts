import { Request, Response } from 'express';
import { getSuiClient } from '../sui.js';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from '../config.js';
import { execSync } from 'child_process';

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
    // Localnet: 50 USDC (abundant MockUSDC)
    // Testnet: 1 USDC (real USDC is precious - tests only need ~0.1 USDC per payment)
    const FUND_AMOUNT = config.network.name === 'localnet' ? 50_000_000 : 1_000_000; // 50 or 1 USDC (6 decimals)
    
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
      
      // Use Treasury keypair to transfer USDC
      const treasuryKeypair = Ed25519Keypair.fromSecretKey(config.treasuryOwnerPrivateKey);
      
      const tx = new Transaction();
      
      // Use tx.splitCoins with tx.gas for the USDC coin
      // We need to get a USDC coin object - use the first available one
      // Since grpcClient has limited APIs, we'll use a simple transfer approach
      
      // Get all coins for the Treasury address and find USDC
      try {
        // Query Treasury's USDC coins via CLI (correct syntax: no --address flag)
        const coinListCmd = `sui client objects ${TREASURY_ADDRESS} --json 2>/dev/null`;
        const coinListOutput = execSync(coinListCmd, { encoding: 'utf8' });
        const allObjects = JSON.parse(coinListOutput);
        
        // Find first USDC coin (check both type field and content.type)
        const usdcCoin = allObjects.find((obj: any) => {
          const objType = obj.data?.type || obj.data?.content?.type || '';
          return objType.toLowerCase().includes('usdc');
        });
        
        if (!usdcCoin) {
          res.status(503).json({
            error: 'No USDC coins found in Treasury',
            message: 'Treasury has USDC balance but no queryable coin objects',
            treasury: TREASURY_ADDRESS,
            allObjectsFound: allObjects.length,
            hint: 'Check if Treasury USDC balance is fragmented into multiple small coins',
          });
          return;
        }
        
        const treasuryCoinId = usdcCoin.data.objectId;
        
        // Split FUND_AMOUNT from Treasury's USDC coin and transfer to buyer
        const [splitCoin] = tx.splitCoins(tx.object(treasuryCoinId), [tx.pure.u64(FUND_AMOUNT)]);
        tx.transferObjects([splitCoin], tx.pure.address(address));
        
        // Execute transaction (Treasury signs and pays gas)
        result = await client.signAndExecuteTransaction({
          transaction: tx,
          signer: treasuryKeypair,
        });
        
      } catch (cliError) {
        res.status(500).json({
          error: 'Failed to query Treasury coins',
          details: cliError instanceof Error ? cliError.message : String(cliError),
        });
        return;
      }
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
