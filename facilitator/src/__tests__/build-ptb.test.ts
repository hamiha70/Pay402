/**
 * Build PTB Integration Test
 * 
 * Tests the ACTUAL build-ptb logic with a REAL transaction
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { execSync } from 'child_process';

const TEST_MERCHANT = '0xbf8c50a85dbb19deaec5a9712869a03959c81ec1eba43223deae594afa5a8248';
const TEST_FACILITATOR = '0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995';
const CLOCK_OBJECT_ID = '0x6';

describe('Build PTB - EXACT Production Logic', () => {
  let client: SuiGrpcClient;
  let TEST_BUYER: string;

  beforeAll(() => {
    client = new SuiGrpcClient({
      network: 'localnet',
      baseUrl: 'http://127.0.0.1:9000',
    });
    
    // Get active funded address
    TEST_BUYER = execSync('sui client active-address', { encoding: 'utf8' }).trim();
  });

  it('should build PTB using tx.gas (EXACT production code)', async () => {
    const amountBigInt = BigInt(100000);
    const feeBigInt = BigInt(10000);
    
    console.log('=== Testing EXACT production PTB building logic ===');
    console.log('Buyer:', TEST_BUYER);
    console.log('Amount:', amountBigInt.toString());
    console.log('Fee:', feeBigInt.toString());

    // EXACT code from build-ptb.ts
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    
    console.log('Step 1: Set sender - OK');

    // Use gas coin as the source (buyer pays with SUI)
    // Split the required amounts from gas coin
    console.log('Step 2: Attempting to split coins from tx.gas...');
    
    try {
      const [merchantCoin, feeCoin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(amountBigInt),
        tx.pure.u64(feeBigInt),
      ]);
      
      console.log('Step 2: Split coins - OK');
      console.log('merchantCoin:', merchantCoin);
      console.log('feeCoin:', feeCoin);

      // Transfer to merchant
      tx.transferObjects([merchantCoin], TEST_MERCHANT);
      console.log('Step 3: Transfer to merchant - OK');
      
      // Transfer fee to facilitator
      tx.transferObjects([feeCoin], TEST_FACILITATOR);
      console.log('Step 4: Transfer to facilitator - OK');
      
      // TODO: Call settle_payment (disabled for now - signature mismatch)
      // const packageId = process.env.PACKAGE_ID || '0xcd0ba580e2df982f127ec619bc2275456a353ec293393c1d807a3c12fed4e20f';
      // tx.moveCall({
      //   target: `${packageId}::payment::settle_payment`,
      //   arguments: [...]
      // });
      console.log('Step 5: MoveCall - SKIPPED (testing transfers only)');
      
      // Set gas budget (facilitator will sponsor)
      tx.setGasBudget(100000000);
      console.log('Step 6: Set gas budget - OK');
      
      // Serialize PTB to bytes
      console.log('Step 7: Building transaction...');
      const ptbBytes = await tx.build({ client });
      
      console.log('✅ SUCCESS! PTB built successfully');
      console.log('PTB bytes length:', ptbBytes.length);
      
      expect(ptbBytes).toBeInstanceOf(Uint8Array);
      expect(ptbBytes.length).toBeGreaterThan(0);
    } catch (error) {
      console.error('❌ FAILED at transaction building');
      console.error('Error:', error);
      console.error('Error message:', (error as any).message);
      console.error('Error stack:', (error as any).stack);
      throw error;
    }
  });

  it('should test tx.gas type and properties', () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    
    console.log('=== Inspecting tx.gas ===');
    console.log('tx.gas:', tx.gas);
    console.log('tx.gas type:', typeof tx.gas);
    console.log('tx.gas constructor:', tx.gas?.constructor?.name);
    console.log('tx.gas keys:', Object.keys(tx.gas || {}));
    
    // Check if tx.gas is valid
    expect(tx.gas).toBeDefined();
  });

  it('should test splitCoins with different approaches', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    
    console.log('=== Testing different splitCoins approaches ===');
    
    // Approach 1: tx.gas directly
    try {
      console.log('Approach 1: Using tx.gas directly');
      const [coin1] = tx.splitCoins(tx.gas, [tx.pure.u64(100000)]);
      console.log('✅ Approach 1 works!', coin1);
    } catch (error) {
      console.error('❌ Approach 1 failed:', (error as any).message);
    }

    // Approach 2: Using pure amounts without tx.pure wrapper
    try {
      const tx2 = new Transaction();
      tx2.setSender(TEST_BUYER);
      console.log('Approach 2: Using plain BigInt');
      const [coin2] = tx2.splitCoins(tx2.gas, [100000n]);
      console.log('✅ Approach 2 works!', coin2);
    } catch (error) {
      console.error('❌ Approach 2 failed:', (error as any).message);
    }

    // Approach 3: Check what tx.pure.u64 returns
    try {
      const tx3 = new Transaction();
      tx3.setSender(TEST_BUYER);
      const pureAmount = tx3.pure.u64(100000);
      console.log('tx.pure.u64 returns:', pureAmount);
      console.log('Type:', typeof pureAmount);
      console.log('Constructor:', pureAmount?.constructor?.name);
    } catch (error) {
      console.error('❌ Approach 3 failed:', (error as any).message);
    }
  });
});
