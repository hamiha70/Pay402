/**
 * Minimal Sponsored Transaction Test
 * 
 * Purpose: Isolate and test the basic sponsored transaction pattern
 * without any Move contract complexity.
 * 
 * Test: Buyer splits their SUI coin and sends part to merchant,
 * with facilitator sponsoring the gas.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from '../sui.js';
import { config } from '../config.js';

describe('Minimal Sponsored Transaction Test', () => {
  // ═══════════════════════════════════════════════════════════
  // CRITICAL: NO GLOBAL BUYER STATE - TRUE TEST ISOLATION
  // Each test creates its own dedicated buyer to avoid coin conflicts
  // ═══════════════════════════════════════════════════════════
  let facilitatorKeypair: Ed25519Keypair;
  let merchantAddress: string;
  let facilitatorAddress: string;
  
  const client = getSuiClient();
  
  // Helper: Create and fund a dedicated buyer for a test
  async function createAndFundBuyer(): Promise<{ keypair: Ed25519Keypair; address: string }> {
    const keypair = new Ed25519Keypair();
    const address = keypair.getPublicKey().toSuiAddress();
    
    console.log('👤 Created dedicated buyer:', address.substring(0, 20) + '...');
    
    // Fund buyer with SUI from facilitator
    const fundTx = new Transaction();
    const [coin] = fundTx.splitCoins(fundTx.gas, [100000000]); // 0.1 SUI
    fundTx.transferObjects([coin], address);
    
    const fundResult = await client.signAndExecuteTransaction({
      signer: facilitatorKeypair,
      transaction: fundTx,
    });
    
    if (fundResult.$kind === 'FailedTransaction') {
      throw new Error('Failed to fund buyer: ' + JSON.stringify(fundResult.FailedTransaction));
    }
    
    console.log('🏦 Buyer funded with 0.1 SUI');
    
    // Wait for transaction to settle (reduced from 2s with sequential execution)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { keypair, address };
  }
  
  beforeAll(async () => {
    // Initialize ONLY shared infrastructure
    facilitatorKeypair = Ed25519Keypair.fromSecretKey(config.facilitatorPrivateKey);
    facilitatorAddress = facilitatorKeypair.getPublicKey().toSuiAddress();
    merchantAddress = facilitatorAddress; // Use facilitator as merchant for simplicity
    
    console.log('═══════════════════════════════════════════════');
    console.log('🔑 Minimal Sponsored TX Test Setup');
    console.log('═══════════════════════════════════════════════');
    console.log('  Facilitator:', facilitatorAddress.substring(0, 20) + '...');
    console.log('  Merchant:', merchantAddress.substring(0, 20) + '...');
    console.log('  ⚠️  Each test creates its own buyer (ISOLATION)');
    console.log('═══════════════════════════════════════════════\n');
  });
  
  // Sequential execution eliminates need for between-test waits
  // (Keeping minimal 500ms for safety)
  afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  it('should execute a simple sponsored SUI transfer', async () => {
    // Create dedicated buyer for THIS test
    const { keypair: buyerKeypair, address: buyerAddress } = await createAndFundBuyer();
    
    // Step 1: Get buyer's SUI coins
    const buyerCoins = await client.listCoins({
      owner: buyerAddress,
      coinType: '0x2::sui::SUI',
    });
    
    expect(buyerCoins.objects.length).toBeGreaterThan(0);
    console.log('Buyer has', buyerCoins.objects.length, 'SUI coins');
    console.log('First coin:', buyerCoins.objects[0].objectId, 'balance:', buyerCoins.objects[0].balance);
    
    // Step 2: Build transaction (facilitator builds it with gas sponsorship)
    const tx = new Transaction();
    
    // Split 1000 MIST from buyer's coin and send to merchant
    const [coin] = tx.splitCoins(tx.object(buyerCoins.objects[0].objectId), [1000]);
    tx.transferObjects([coin], merchantAddress);
    
    // Set sender (buyer)
    tx.setSender(buyerAddress);
    
    // Step 3: Add gas sponsorship (facilitator)
    const facilitatorCoins = await client.listCoins({
      owner: facilitatorAddress,
      coinType: '0x2::sui::SUI',
    });
    
    expect(facilitatorCoins.objects.length).toBeGreaterThan(0);
    console.log('Facilitator has', facilitatorCoins.objects.length, 'SUI coins');
    
    tx.setGasOwner(facilitatorAddress);
    tx.setGasPayment([{
      objectId: facilitatorCoins.objects[0].objectId,
      version: facilitatorCoins.objects[0].version,
      digest: facilitatorCoins.objects[0].digest,
    }]);
    tx.setGasBudget(10000000); // 0.01 SUI
    
    // Step 4: Build complete transaction bytes
    console.log('Building transaction with gas sponsorship...');
    const txBytes = await tx.build({ client });
    
    console.log('Transaction bytes length:', txBytes.length);
    console.log('Transaction bytes (first 50):', Buffer.from(txBytes).toString('base64').substring(0, 50));
    
    // Step 5: Buyer signs the transaction
    console.log('Buyer signing transaction...');
    const buyerSig = await buyerKeypair.signTransaction(txBytes);
    console.log('Buyer signature:', buyerSig.signature.substring(0, 20) + '...');
    console.log('Buyer signature length:', buyerSig.signature.length);
    
    // Step 6: Facilitator signs the SAME transaction
    console.log('Facilitator signing transaction...');
    const facilitatorSig = await facilitatorKeypair.signTransaction(txBytes);
    console.log('Facilitator signature:', facilitatorSig.signature.substring(0, 20) + '...');
    console.log('Facilitator signature length:', facilitatorSig.signature.length);
    
    // Step 7: Submit with both signatures
    console.log('Submitting transaction with dual signatures...');
    const signatures = [buyerSig.signature, facilitatorSig.signature];
    
    console.log('Signatures array:', signatures.map(s => s.substring(0, 20) + '...'));
    
    const result = await client.executeTransaction({
      transaction: txBytes,
      signatures: signatures,
    });
    
    console.log('Transaction result:', result);
    
    // Verify success
    expect(result.$kind).toBe('Transaction');
    if (result.$kind === 'Transaction') {
      console.log('✅ Transaction succeeded!');
      console.log('Digest:', result.Transaction.digest);
      expect(result.Transaction.digest).toBeDefined();
    } else {
      console.error('❌ Transaction failed:', result.FailedTransaction);
      throw new Error('Transaction failed: ' + JSON.stringify(result.FailedTransaction));
    }
  });
  
  it('should fail if only buyer signs (no sponsor signature)', async () => {
    // Create dedicated buyer for THIS test
    const { keypair: buyerKeypair, address: buyerAddress } = await createAndFundBuyer();
    
    const buyerCoins = await client.listCoins({
      owner: buyerAddress,
      coinType: '0x2::sui::SUI',
    });
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.object(buyerCoins.objects[0].objectId), [1000]);
    tx.transferObjects([coin], merchantAddress);
    tx.setSender(buyerAddress);
    
    // Let Sui SDK select an available gas coin (avoids coin conflicts between tests)
    tx.setGasOwner(facilitatorAddress);
    tx.setGasBudget(10000000);
    
    const txBytes = await tx.build({ client });
    const buyerSig = await buyerKeypair.signTransaction(txBytes);
    
    // Try to submit with ONLY buyer signature (should fail)
    await expect(
      client.executeTransaction({
        transaction: txBytes,
        signatures: [buyerSig.signature], // Missing facilitator signature
      })
    ).rejects.toThrow();
  });
  
  it('should fail if only facilitator signs (no buyer signature)', async () => {
    // Create dedicated buyer for THIS test
    const { keypair: buyerKeypair, address: buyerAddress } = await createAndFundBuyer();
    
    const buyerCoins = await client.listCoins({
      owner: buyerAddress,
      coinType: '0x2::sui::SUI',
    });
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.object(buyerCoins.objects[0].objectId), [1000]);
    tx.transferObjects([coin], merchantAddress);
    tx.setSender(buyerAddress);
    
    // Let Sui SDK select an available gas coin (avoids coin conflicts between tests)
    tx.setGasOwner(facilitatorAddress);
    tx.setGasBudget(10000000);
    
    const txBytes = await tx.build({ client });
    const facilitatorSig = await facilitatorKeypair.signTransaction(txBytes);
    
    // Try to submit with ONLY facilitator signature (should fail)
    await expect(
      client.executeTransaction({
        transaction: txBytes,
        signatures: [facilitatorSig.signature], // Missing buyer signature
      })
    ).rejects.toThrow();
  });
  
  it('should work with signatures in reverse order', async () => {
    // Create dedicated buyer for THIS test
    const { keypair: buyerKeypair, address: buyerAddress } = await createAndFundBuyer();
    
    const buyerCoins = await client.listCoins({
      owner: buyerAddress,
      coinType: '0x2::sui::SUI',
    });
    
    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.object(buyerCoins.objects[0].objectId), [1000]);
    tx.transferObjects([coin], merchantAddress);
    tx.setSender(buyerAddress);
    
    // Let Sui SDK select an available gas coin (avoids coin conflicts between tests)
    tx.setGasOwner(facilitatorAddress);
    tx.setGasBudget(10000000);
    
    const txBytes = await tx.build({ client });
    const buyerSig = await buyerKeypair.signTransaction(txBytes);
    const facilitatorSig = await facilitatorKeypair.signTransaction(txBytes);
    
    // Submit with REVERSE order (facilitator first, buyer second)
    const signatures = [facilitatorSig.signature, buyerSig.signature];
    
    const result = await client.executeTransaction({
      transaction: txBytes,
      signatures: signatures,
    });
    
    expect(result.$kind).toBe('Transaction');
    console.log('✅ Reverse order also works! Digest:', result.$kind === 'Transaction' ? result.Transaction.digest : null);
  });
});
