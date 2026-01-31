import { describe, it, expect, beforeAll } from 'vitest';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// Test configuration
const USE_TESTNET = true; // Set to false to test local network (requires running sui-test-validator)

describe('SUI Client Tests', () => {
  let client: SuiGrpcClient;
  let testKeypair: Ed25519Keypair;
  let testAddress: string;

  beforeAll(async () => {
    // Initialize client
    if (USE_TESTNET) {
      client = new SuiGrpcClient({
        network: 'testnet',
        baseUrl: 'https://fullnode.testnet.sui.io:443',
      });
    } else {
      client = new SuiGrpcClient({
        network: 'localnet',
        baseUrl: 'http://127.0.0.1:9000',
      });
    }

    // Generate test keypair
    testKeypair = new Ed25519Keypair();
    testAddress = testKeypair.getPublicKey().toSuiAddress();

    console.log('Test configuration:');
    console.log('  Network:', USE_TESTNET ? 'testnet' : 'localnet');
    console.log('  Test address:', testAddress);
  });

  it('should connect to SUI network', async () => {
    const response = await client.getReferenceGasPrice();
    expect(response).toBeDefined();
    
    // Response is { referenceGasPrice: '1000' }
    const gasPrice = Number(response.referenceGasPrice);
    expect(gasPrice).toBeGreaterThan(0);
    console.log('  Gas price:', gasPrice, 'MIST');
  });

  it('should list coins for an address (may be empty)', async () => {
    const coins = await client.listCoins({
      owner: testAddress,
      coinType: '0x2::sui::SUI',
    });

    expect(coins).toBeDefined();
    expect(coins.objects).toBeInstanceOf(Array);
    console.log('  Address has', coins.objects.length, 'SUI coins');
    
    if (coins.objects.length === 0 && USE_TESTNET) {
      console.log('  ℹ️  No coins found - get testnet SUI from faucet first');
    }
  });

  it('should get balance for an address', async () => {
    const balance = await client.getBalance({
      owner: testAddress,
      coinType: '0x2::sui::SUI',
    });

    expect(balance).toBeDefined();
    console.log('  Balance response:', balance);
    
    // Check what properties exist
    if ('totalBalance' in balance) {
      console.log('  Balance:', balance.totalBalance, 'MIST');
    } else {
      console.log('  Balance structure:', Object.keys(balance));
    }
    
    if (USE_TESTNET) {
      console.log('  ℹ️  Zero or no balance - fund address from faucet for full tests');
    }
  });

  it('should create a transaction object', async () => {
    const tx = new Transaction();
    const merchantAddress = new Ed25519Keypair().getPublicKey().toSuiAddress();
    
    // Create a simple transaction (won't execute without coins)
    const [coin] = tx.splitCoins(tx.gas, [100]);
    tx.transferObjects([coin], merchantAddress);

    expect(tx).toBeDefined();
    console.log('  Transaction object created successfully');
  });
});

describe('Move Contract Tests', () => {
  it('should remind to run Move tests', async () => {
    console.log('');
    console.log('📝 Remember to run Move contract tests:');
    console.log('   cd ../move/payment && sui move test');
    console.log('');
    expect(true).toBe(true);
  });
});

