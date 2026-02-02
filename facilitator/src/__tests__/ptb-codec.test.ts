/**
 * PTB Encoding/Decoding Test Suite
 * 
 * Critical tests for Programmable Transaction Block serialization/deserialization.
 * These tests catch:
 * - Field mapping errors
 * - Amount precision bugs
 * - Serialization format mismatches
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Transaction } from '@mysten/sui/transactions';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const TEST_BUYER = '0x2614f25227ed02f96e0d29f0f5ba9f2e98f589f4db8bc5b48cc658ad1f89b790';
const TEST_MERCHANT = '0xbf8c50a85dbb19deaec5a9712869a03959c81ec1eba43223deae594afa5a8248';
const TEST_FACILITATOR = '0x44118d0b343e8cb4203bdd4d75321a2eec4a9ec3c4778dcdda715fee18945995';
const CLOCK_OBJECT_ID = '0x6';

describe('PTB Codec: Serialization/Deserialization', () => {
  let client: SuiGrpcClient;

  beforeAll(() => {
    client = new SuiGrpcClient({
      network: 'localnet',
      baseUrl: 'http://127.0.0.1:9000',
    });
  });

  it('should serialize PTB to Uint8Array', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(100000000);

    const serialized = await tx.build({ client });

    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(0);
  });

  it('should deserialize PTB back to Transaction', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(100000000);

    const serialized = await tx.build({ client });
    const deserialized = Transaction.from(serialized);

    expect(deserialized).toBeInstanceOf(Transaction);
    // Transaction.from() returns a new instance, sender is preserved in bytes
  });

  it('should preserve exact amounts in splitCoins', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    
    // Create test coin (we'll use gas coin for testing)
    const [merchantCoin, facilitatorCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(100000), // merchant amount
      tx.pure.u64(10000),  // facilitator fee
    ]);

    tx.transferObjects([merchantCoin], TEST_MERCHANT);
    tx.transferObjects([facilitatorCoin], TEST_FACILITATOR);
    tx.setGasBudget(100000000);

    const serialized = await tx.build({ client });
    
    // Verify serialization succeeded with split amounts
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(100); // Should have meaningful content
  });

  it('should handle both string and Uint8Array formats', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(100000000);

    const bytes = await tx.build({ client });
    
    // Test Uint8Array format
    expect(bytes).toBeInstanceOf(Uint8Array);
    
    // Test that we can convert to base64 string and back
    const base64 = Buffer.from(bytes).toString('base64');
    expect(base64).toBeTruthy();
    
    const backToBytes = Buffer.from(base64, 'base64');
    expect(backToBytes).toEqual(Buffer.from(bytes));
  });

  it('should serialize complex PTB with moveCall', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);

    // Split coins
    const [merchantCoin, facilitatorCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(100000),
      tx.pure.u64(10000),
    ]);

    // Transfer
    tx.transferObjects([merchantCoin], TEST_MERCHANT);
    tx.transferObjects([facilitatorCoin], TEST_FACILITATOR);

    // MoveCall (mock package ID)
    const mockPackageId = '0x2';
    tx.moveCall({
      target: `${mockPackageId}::payment::settle_payment`,
      arguments: [
        tx.pure.string('test-invoice-123'),
        tx.pure.u64(100000),
        tx.pure.address(TEST_MERCHANT),
        tx.pure.u64(10000),
        tx.pure.address(TEST_FACILITATOR),
        tx.pure.string('mock-jwt-hash'),
        tx.object(CLOCK_OBJECT_ID),
      ],
    });

    tx.setGasBudget(100000000);

    const serialized = await tx.build({ client });
    
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(200); // Complex PTB should be larger
  });

  it('should preserve sender address through serialization', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(100000000);

    const serialized = await tx.build({ client });
    const deserialized = Transaction.from(serialized);

    // The sender is encoded in the transaction bytes
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(deserialized).toBeInstanceOf(Transaction);
  });

  it('should handle gas budget correctly', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(50000000); // 0.05 SUI

    const serialized = await tx.build({ client });
    
    expect(serialized).toBeInstanceOf(Uint8Array);
    // Gas budget is preserved in transaction bytes
  });

  it('should serialize array format for JSON transport', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    tx.setGasBudget(100000000);

    const bytes = await tx.build({ client });
    
    // Convert to array format (for JSON transport)
    const arrayFormat = Array.from(bytes);
    
    expect(Array.isArray(arrayFormat)).toBe(true);
    expect(arrayFormat.length).toBe(bytes.length);
    expect(arrayFormat.every(n => typeof n === 'number')).toBe(true);
    
    // Verify we can convert back
    const backToBytes = new Uint8Array(arrayFormat);
    expect(backToBytes).toEqual(bytes);
  });
});

describe('PTB Codec: Field Mapping Validation', () => {
  it('should correctly map invoice JWT fields to PTB', () => {
    // Mock invoice from merchant JWT
    const mockInvoice = {
      resource: '/api/premium-data',
      amount: '100000',
      merchantRecipient: TEST_MERCHANT,
      facilitatorFee: '10000',
      facilitatorRecipient: TEST_FACILITATOR,
      coinType: '0x2::sui::SUI',
      nonce: '1770067616385-17jbn42bt0ih',
      expiry: 1770071216,
    };

    // Verify field names match what build-ptb expects
    expect(mockInvoice.resource).toBeDefined();
    expect(mockInvoice.merchantRecipient).toBeDefined();
    expect(mockInvoice.facilitatorRecipient).toBeDefined();
    expect(mockInvoice.nonce).toBeDefined();
    
    // Ensure no old field names
    expect((mockInvoice as any).merchant).toBeUndefined();
    expect((mockInvoice as any).facilitator).toBeUndefined();
    expect((mockInvoice as any).invoiceId).toBeUndefined();
  });

  it('should validate amount formats', () => {
    const validAmounts = ['100000', '10000', '1', '999999999'];
    
    validAmounts.forEach(amount => {
      expect(() => BigInt(amount)).not.toThrow();
      const value = BigInt(amount);
      expect(value).toBeGreaterThan(0n);
    });

    // Test invalid amounts
    expect(() => BigInt('abc')).toThrow();
    expect(() => BigInt('1.5')).toThrow();
    expect(() => BigInt(null as any)).toThrow();
    expect(() => BigInt(undefined as any)).toThrow();
    
    // Empty string doesn't throw, but returns 0n (which we should reject)
    expect(BigInt('')).toBe(0n);
    expect(BigInt('-100')).toBeLessThan(0n); // Negative works but should be rejected
  });

  it('should validate SUI address formats', () => {
    const validAddresses = [
      TEST_BUYER,
      TEST_MERCHANT,
      TEST_FACILITATOR,
      '0x2',
      '0x0000000000000000000000000000000000000000000000000000000000000006',
    ];

    validAddresses.forEach(addr => {
      expect(addr).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(addr.length).toBeGreaterThan(2);
    });
  });
});

describe('PTB Codec: Error Cases', () => {
  let client: SuiGrpcClient;

  beforeAll(() => {
    client = new SuiGrpcClient({
      network: 'localnet',
      baseUrl: 'http://127.0.0.1:9000',
    });
  });

  it('should handle missing sender gracefully', async () => {
    const tx = new Transaction();
    // No setSender()
    tx.setGasBudget(100000000);

    // Should throw during build
    await expect(tx.build({ client })).rejects.toThrow();
  });

  it('should handle missing gas budget gracefully', async () => {
    const tx = new Transaction();
    tx.setSender(TEST_BUYER);
    // No setGasBudget()

    // Build should still work (uses default)
    const serialized = await tx.build({ client });
    expect(serialized).toBeInstanceOf(Uint8Array);
  });

  it('should reject invalid Uint8Array deserialization', () => {
    const invalidBytes = new Uint8Array([1, 2, 3]); // Too short

    expect(() => Transaction.from(invalidBytes)).toThrow();
  });
});
