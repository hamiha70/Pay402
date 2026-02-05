import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCliCommand,
  getExplorerUrl,
  getFaucetInfo,
  getOperationTimeout,
  getConfirmationTime,
  formatTransactionResult,
  isTestNetwork,
  getNetworkDisplayName,
} from '../network-helpers';

describe('Network Helper Functions', () => {
  const originalEnv = process.env.SUI_NETWORK;
  const testDigest = 'BExBCkYxGsK9Rv5NrH8QYp1ZVcQG8A3EbRrB99puecJR';
  
  afterEach(() => {
    process.env.SUI_NETWORK = originalEnv;
  });
  
  describe('getCliCommand', () => {
    it('should return lsui command for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const cmd = getCliCommand(testDigest);
      expect(cmd).toBe(`lsui client tx-block ${testDigest}`);
      expect(cmd).toContain('lsui');
    });
    
    it('should return tsui command for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const cmd = getCliCommand(testDigest);
      expect(cmd).toBe(`tsui client tx-block ${testDigest}`);
      expect(cmd).toContain('tsui');
      expect(cmd).not.toContain('--network'); // tsui is pre-configured
    });
  });
  
  describe('getExplorerUrl', () => {
    it('should return null for localnet (no explorer)', () => {
      process.env.SUI_NETWORK = 'localnet';
      const url = getExplorerUrl(testDigest);
      expect(url).toBeNull();
    });
    
    it('should return testnet suivision URL for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const url = getExplorerUrl(testDigest);
      expect(url).toBe(`https://testnet.suivision.xyz/txblock/${testDigest}`);
      expect(url).toContain('testnet.suivision');
    });
    
    it('should include the transaction digest', () => {
      process.env.SUI_NETWORK = 'testnet';
      const url = getExplorerUrl(testDigest);
      expect(url).toContain(testDigest);
    });
  });
  
  describe('getFaucetInfo', () => {
    it('should return embedded faucet info for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const info = getFaucetInfo();
      
      expect(info.type).toBe('embedded');
      expect(info.shouldOpenInNewTab).toBe(false);
      expect(info.requiresManualAction).toBe(false);
      expect(info.url).toContain('127.0.0.1');
    });
    
    it('should return Circle faucet info for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const info = getFaucetInfo();
      
      expect(info.type).toBe('circle');
      expect(info.shouldOpenInNewTab).toBe(true);
      expect(info.requiresManualAction).toBe(true);
      expect(info.url).toContain('circle');
      expect(info.instructions).toContain('20 USDC');
    });
  });
  
  describe('getOperationTimeout', () => {
    it('should return faster timeouts for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const optimistic = getOperationTimeout('optimistic');
      const pessimistic = getOperationTimeout('pessimistic');
      
      expect(optimistic).toBeLessThan(200);
      expect(pessimistic).toBeLessThan(1000);
      expect(pessimistic).toBeGreaterThan(optimistic);
    });
    
    it('should return slower timeouts for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const optimistic = getOperationTimeout('optimistic');
      const pessimistic = getOperationTimeout('pessimistic');
      
      expect(optimistic).toBeGreaterThanOrEqual(2000);
      expect(pessimistic).toBeGreaterThanOrEqual(5000);
      expect(pessimistic).toBeGreaterThan(optimistic);
    });
    
    it('should have testnet timeouts at least 10x slower than localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const localhostOptimistic = getOperationTimeout('optimistic');
      
      process.env.SUI_NETWORK = 'testnet';
      const testnetOptimistic = getOperationTimeout('optimistic');
      
      expect(testnetOptimistic).toBeGreaterThanOrEqual(localhostOptimistic * 10);
    });
  });
  
  describe('getConfirmationTime', () => {
    it('should return fast confirmation for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const time = getConfirmationTime();
      expect(time).toBeLessThan(100);
    });
    
    it('should return slower confirmation for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const time = getConfirmationTime();
      expect(time).toBeGreaterThanOrEqual(1000);
    });
  });
  
  describe('formatTransactionResult', () => {
    it('should include CLI command for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const result = formatTransactionResult(testDigest);
      
      expect(result.digest).toBe(testDigest);
      expect(result.cliCommand).toContain('lsui');
      expect(result.cliCommand).toContain(testDigest);
      expect(result.explorerUrl).toBeNull();
      expect(result.network).toBe('Localnet');
    });
    
    it('should include explorer URL for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const result = formatTransactionResult(testDigest);
      
      expect(result.digest).toBe(testDigest);
      expect(result.cliCommand).toBeNull();
      expect(result.explorerUrl).toContain('suivision');
      expect(result.explorerUrl).toContain(testDigest);
      expect(result.network).toBe('Testnet');
    });
  });
  
  describe('isTestNetwork', () => {
    it('should return true for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      expect(isTestNetwork()).toBe(true);
    });
    
    it('should return true for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      expect(isTestNetwork()).toBe(true);
    });
  });
  
  describe('getNetworkDisplayName', () => {
    it('should return "Localnet" for localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      expect(getNetworkDisplayName()).toBe('Localnet');
    });
    
    it('should return "Testnet" for testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      expect(getNetworkDisplayName()).toBe('Testnet');
    });
  });
});
