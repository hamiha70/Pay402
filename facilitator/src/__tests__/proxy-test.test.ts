/**
 * Proxy Test - Verify localnet_proxy works for E2E testing
 * 
 * Tests basic RPC connectivity through proxy vs direct.
 * The proxy is primarily for load balancing/retry, not caching state changes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SuiGrpcClient } from '@mysten/sui/grpc';

// Get RPC URL based on active sui client environment
function getRpcUrl(): string {
  try {
    const { execSync } = require('child_process');
    const envOutput = execSync('sui client active-env', { encoding: 'utf8' }).trim();
    
    if (envOutput === 'localnet_proxy') {
      return 'http://127.0.0.1:44340'; // Proxy
    } else if (envOutput === 'local') {
      return 'http://127.0.0.1:9000'; // Direct
    }
  } catch (error) {
    console.warn('Could not detect active environment, using default');
  }
  
  return 'http://127.0.0.1:9000';
}

describe('Proxy Connectivity Test', () => {
  let client: SuiGrpcClient;
  let testAddress: string;

  beforeAll(async () => {
    const url = getRpcUrl();
    client = new SuiGrpcClient({ url });

    try {
      const { execSync } = require('child_process');
      testAddress = execSync('sui client active-address', { encoding: 'utf8' }).trim();
      
      console.log('\nTest configuration:');
      console.log('  RPC URL:', url);
      console.log('  Test address:', testAddress);
    } catch (error) {
      throw new Error('Failed to get active address. Is sui client configured?');
    }
  });

  it('should connect to RPC endpoint', async () => {
    // Just verify we can make a basic RPC call
    const balance = await client.getBalance({ owner: testAddress });
    expect(balance).toBeDefined();
    expect(balance.totalBalance).toBeDefined();
    console.log(`✅ RPC connected - Balance: ${balance.totalBalance} MIST`);
  });

  it('should query balance consistently', async () => {
    const balance1 = await client.getBalance({ owner: testAddress });
    const balance2 = await client.getBalance({ owner: testAddress });
    
    expect(balance1.totalBalance).toBe(balance2.totalBalance);
    console.log(`✅ Consecutive queries consistent`);
  });

  it('should handle parallel requests', async () => {
    const balances = await Promise.all([
      client.getBalance({ owner: testAddress }),
      client.getBalance({ owner: testAddress }),
      client.getBalance({ owner: testAddress }),
    ]);
    
    const balance = balances[0].totalBalance;
    expect(balances[1].totalBalance).toBe(balance);
    expect(balances[2].totalBalance).toBe(balance);
    console.log(`✅ Parallel queries consistent`);
  });

  it('should respond quickly', async () => {
    const start = Date.now();
    await client.getBalance({ owner: testAddress });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(1000);
    console.log(`✅ Response time: ${elapsed}ms`);
  });
});
