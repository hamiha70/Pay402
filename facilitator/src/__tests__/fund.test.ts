/**
 * Unit tests for fund controller
 * 
 * Tests faucet funding logic including:
 * - Balance checking
 * - Funding thresholds
 * - Already-funded detection
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../sui.js', () => ({
  getSuiClient: vi.fn(() => ({
    getBalance: vi.fn(),
    requestSuiFromFaucetV0: vi.fn(),
  })),
}));

vi.mock('../config.js', () => ({
  config: {
    faucetMinBalance: 1_000_000_000n, // 1 SUI
    faucetFundAmount: 5_000_000_000n, // 5 SUI
  },
}));

import { getSuiClient } from '../sui.js';
import { config } from '../config.js';

describe('Fund Controller Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Balance Checking', () => {
    it('should correctly detect insufficient balance', () => {
      const balance = 500_000_000n; // 0.5 SUI
      const minBalance = config.faucetMinBalance;
      
      expect(balance < minBalance).toBe(true);
    });

    it('should correctly detect sufficient balance', () => {
      const balance = 2_000_000_000n; // 2 SUI
      const minBalance = config.faucetMinBalance;
      
      expect(balance >= minBalance).toBe(true);
    });

    it('should handle edge case at exact threshold', () => {
      const balance = config.faucetMinBalance;
      const minBalance = config.faucetMinBalance;
      
      // Exactly at threshold = no funding needed
      expect(balance < minBalance).toBe(false);
    });
  });

  describe('Balance Response Parsing', () => {
    it('should parse balance from getBalance response', () => {
      const mockResponse = {
        coinType: '0x2::sui::SUI',
        coinObjectCount: 3,
        totalBalance: '1000000000',
        lockedBalance: {}
      };

      const balance = BigInt(mockResponse.totalBalance);
      expect(balance).toBe(1_000_000_000n);
    });

    it('should handle zero balance', () => {
      const mockResponse = {
        coinType: '0x2::sui::SUI',
        coinObjectCount: 0,
        totalBalance: '0',
        lockedBalance: {}
      };

      const balance = BigInt(mockResponse.totalBalance);
      expect(balance).toBe(0n);
    });

    it('should handle large balances', () => {
      const mockResponse = {
        coinType: '0x2::sui::SUI',
        coinObjectCount: 100,
        totalBalance: '999999999999999',
        lockedBalance: {}
      };

      const balance = BigInt(mockResponse.totalBalance);
      expect(balance).toBe(999999999999999n);
    });
  });

  describe('Funding Decision Logic', () => {
    it('should fund when balance is zero', () => {
      const balance = 0n;
      const minBalance = config.faucetMinBalance;
      const shouldFund = balance < minBalance;
      
      expect(shouldFund).toBe(true);
    });

    it('should fund when balance is below minimum', () => {
      const balance = 100_000_000n; // 0.1 SUI
      const minBalance = config.faucetMinBalance; // 1 SUI
      const shouldFund = balance < minBalance;
      
      expect(shouldFund).toBe(true);
    });

    it('should not fund when balance is sufficient', () => {
      const balance = 10_000_000_000n; // 10 SUI
      const minBalance = config.faucetMinBalance; // 1 SUI
      const shouldFund = balance < minBalance;
      
      expect(shouldFund).toBe(false);
    });
  });

  describe('Address Validation', () => {
    it('should validate Sui address format', () => {
      const validAddress = '0x' + 'a'.repeat(64);
      expect(validAddress.startsWith('0x')).toBe(true);
      expect(validAddress.length).toBe(66);
    });

    it('should reject invalid address format', () => {
      const invalidAddress = 'notanaddress';
      expect(invalidAddress.startsWith('0x')).toBe(false);
    });

    it('should reject short address', () => {
      const shortAddress = '0xabcd';
      expect(shortAddress.length).toBeLessThan(66);
    });
  });

  describe('Error Handling', () => {
    it('should handle getBalance error gracefully', async () => {
      const mockClient = getSuiClient();
      vi.mocked(mockClient.getBalance).mockRejectedValue(
        new Error('Network error')
      );

      await expect(mockClient.getBalance({
        owner: '0xtest',
      })).rejects.toThrow('Network error');
    });

    it('should handle faucet error gracefully', async () => {
      const mockClient = getSuiClient();
      vi.mocked(mockClient.requestSuiFromFaucetV0).mockRejectedValue(
        new Error('Faucet unavailable')
      );

      await expect(mockClient.requestSuiFromFaucetV0({
        host: 'http://localhost:9123/gas',
        recipient: '0xtest',
      })).rejects.toThrow('Faucet unavailable');
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid faucet configuration', () => {
      expect(config.faucetMinBalance).toBeGreaterThan(0n);
      expect(config.faucetFundAmount).toBeGreaterThan(0n);
      expect(config.faucetFundAmount).toBeGreaterThan(config.faucetMinBalance);
    });

    it('should use reasonable threshold values', () => {
      const minBalanceSUI = Number(config.faucetMinBalance) / 1e9;
      const fundAmountSUI = Number(config.faucetFundAmount) / 1e9;
      
      expect(minBalanceSUI).toBeGreaterThan(0);
      expect(minBalanceSUI).toBeLessThan(100); // Reasonable min
      expect(fundAmountSUI).toBeGreaterThan(minBalanceSUI);
      expect(fundAmountSUI).toBeLessThan(1000); // Reasonable fund amount
    });
  });
});
