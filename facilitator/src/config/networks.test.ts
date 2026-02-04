import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  networks, 
  getNetworkConfig, 
  validatePaymentCoin, 
  formatAmount 
} from './networks.js';

describe('Network Configuration', () => {
  const originalEnv = process.env.SUI_NETWORK;

  afterEach(() => {
    process.env.SUI_NETWORK = originalEnv;
  });

  describe('networks', () => {
    it('should have localnet configuration', () => {
      expect(networks.localnet).toBeDefined();
      expect(networks.localnet.name).toBe('Localnet');
      expect(networks.localnet.rpcUrl).toBe('http://127.0.0.1:9000');
      expect(networks.localnet.paymentCoin.symbol).toBe('USDC');
      expect(networks.localnet.paymentCoin.decimals).toBe(6);
      expect(networks.localnet.gasCoin.type).toBe('0x2::sui::SUI');
      expect(networks.localnet.blockSuiPayments).toBe(false);
      expect(networks.localnet.facilitatorFundingStrategy).toBe('embedded-faucet');
    });

    it('should have testnet configuration', () => {
      expect(networks.testnet).toBeDefined();
      expect(networks.testnet.name).toBe('Testnet');
      expect(networks.testnet.rpcUrl).toBe('https://fullnode.testnet.sui.io:443');
      expect(networks.testnet.paymentCoin.symbol).toBe('USDC');
      expect(networks.testnet.paymentCoin.decimals).toBe(6);
      expect(networks.testnet.gasCoin.type).toBe('0x2::sui::SUI');
      expect(networks.testnet.blockSuiPayments).toBe(true);
      expect(networks.testnet.facilitatorFundingStrategy).toBe('manual');
      expect(networks.testnet.limits).toBeDefined();
    });

    it('should have MockUSDC coin type on localnet', () => {
      expect(networks.localnet.paymentCoin.type).toContain('mock_usdc::MOCK_USDC');
      expect(networks.localnet.paymentCoin.name).toBe('Mock USDC (Localnet)');
    });
  });

  describe('getNetworkConfig', () => {
    it('should default to localnet when SUI_NETWORK is not set', () => {
      delete process.env.SUI_NETWORK;
      const config = getNetworkConfig();
      expect(config.name).toBe('Localnet');
      expect(config.rpcUrl).toBe('http://127.0.0.1:9000');
    });

    it('should return localnet config when SUI_NETWORK=localnet', () => {
      process.env.SUI_NETWORK = 'localnet';
      const config = getNetworkConfig();
      expect(config.name).toBe('Localnet');
      expect(config.blockSuiPayments).toBe(false);
    });

    it('should return testnet config when SUI_NETWORK=testnet', () => {
      process.env.SUI_NETWORK = 'testnet';
      const config = getNetworkConfig();
      expect(config.name).toBe('Testnet');
      expect(config.blockSuiPayments).toBe(true);
    });

    it('should throw error for unknown network', () => {
      process.env.SUI_NETWORK = 'invalid-network';
      expect(() => getNetworkConfig()).toThrow(/Unknown network/);
      expect(() => getNetworkConfig()).toThrow(/invalid-network/);
    });
  });

  describe('validatePaymentCoin', () => {
    beforeEach(() => {
      process.env.SUI_NETWORK = 'localnet';
    });

    it('should allow MockUSDC payments on localnet', () => {
      const mockUsdcType = networks.localnet.paymentCoin.type;
      expect(() => validatePaymentCoin(mockUsdcType, 'localnet')).not.toThrow();
    });

    it('should reject SUI payments on localnet (use MockUSDC instead)', () => {
      const suiType = '0x2::sui::SUI';
      // localnet blockSuiPayments=false BUT still validates payment coin type
      expect(() => validatePaymentCoin(suiType, 'localnet')).toThrow(/Invalid payment coin/);
    });

    it('should block SUI payments on testnet', () => {
      const suiType = '0x2::sui::SUI';
      expect(() => validatePaymentCoin(suiType, 'testnet')).toThrow(/BLOCKED/);
      expect(() => validatePaymentCoin(suiType, 'testnet')).toThrow(/Cannot use SUI for payments/);
      expect(() => validatePaymentCoin(suiType, 'testnet')).toThrow(/draining gas fund/);
    });

    it('should allow USDC payments on testnet', () => {
      const usdcType = networks.testnet.paymentCoin.type;
      expect(() => validatePaymentCoin(usdcType, 'testnet')).not.toThrow();
    });

    it('should reject invalid coin types', () => {
      const invalidType = '0x123::fake::FAKE';
      expect(() => validatePaymentCoin(invalidType, 'localnet')).toThrow(/Invalid payment coin/);
      expect(() => validatePaymentCoin(invalidType, 'testnet')).toThrow(/Invalid payment coin/);
    });

    it('should use current network config when network param not provided', () => {
      process.env.SUI_NETWORK = 'testnet';
      const suiType = '0x2::sui::SUI';
      expect(() => validatePaymentCoin(suiType)).toThrow(/BLOCKED/);
    });

    it('should provide helpful error messages with expected vs actual', () => {
      const invalidType = '0x123::fake::FAKE';
      try {
        validatePaymentCoin(invalidType, 'localnet');
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Expected:');
        expect(message).toContain('Got:');
        expect(message).toContain(invalidType);
      }
    });
  });

  describe('formatAmount', () => {
    beforeEach(() => {
      process.env.SUI_NETWORK = 'localnet';
    });

    it('should format USDC amounts with 2 decimals', () => {
      const mockUsdcType = networks.localnet.paymentCoin.type;
      expect(formatAmount(1000000, mockUsdcType)).toBe('1.00 USDC');
      expect(formatAmount(10500000, mockUsdcType)).toBe('10.50 USDC');
      expect(formatAmount(500000, mockUsdcType)).toBe('0.50 USDC');
    });

    it('should format SUI amounts with 4 decimals', () => {
      const suiType = '0x2::sui::SUI';
      expect(formatAmount(1000000000, suiType)).toBe('1.0000 SUI');
      expect(formatAmount(1500000000, suiType)).toBe('1.5000 SUI');
      expect(formatAmount(10000000, suiType)).toBe('0.0100 SUI');
    });

    it('should handle string amounts', () => {
      const mockUsdcType = networks.localnet.paymentCoin.type;
      expect(formatAmount('1000000', mockUsdcType)).toBe('1.00 USDC');
    });

    it('should handle zero amounts', () => {
      const mockUsdcType = networks.localnet.paymentCoin.type;
      expect(formatAmount(0, mockUsdcType)).toBe('0.00 USDC');
    });

    it('should handle large amounts', () => {
      const mockUsdcType = networks.localnet.paymentCoin.type;
      expect(formatAmount(1000000000000, mockUsdcType)).toBe('1000000.00 USDC');
    });
  });

  describe('Network-specific features', () => {
    it('should have faucet command for localnet', () => {
      expect(networks.localnet.faucetCommand).toBe('sui client faucet');
    });

    it('should NOT have faucet command for testnet', () => {
      expect(networks.testnet.faucetCommand).toBeUndefined();
    });

    it('should have Circle USDC faucet URL for testnet', () => {
      expect(networks.testnet.circleUSDCFaucet).toBe('https://faucet.circle.com');
    });

    it('should have testnet limits defined', () => {
      expect(networks.testnet.limits?.maxSUIBalance).toBe('100 SUI');
      expect(networks.testnet.limits?.usdcFaucetLimit).toBe('20 USDC per 2 hours');
    });
  });

  describe('Critical security checks', () => {
    it('CRITICAL: testnet MUST block SUI payments', () => {
      expect(networks.testnet.blockSuiPayments).toBe(true);
    });

    it('CRITICAL: testnet MUST use manual funding', () => {
      expect(networks.testnet.facilitatorFundingStrategy).toBe('manual');
    });

    it('CRITICAL: localnet MUST use MockUSDC', () => {
      expect(networks.localnet.paymentCoin.type).toContain('mock_usdc');
    });

    it('CRITICAL: gas coin is always SUI on both networks', () => {
      expect(networks.localnet.gasCoin.type).toBe('0x2::sui::SUI');
      expect(networks.testnet.gasCoin.type).toBe('0x2::sui::SUI');
    });
  });
});
