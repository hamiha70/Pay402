/**
 * Tests for CAIP (Chain Agnostic Improvement Proposals) utilities
 * 
 * Validates X-402 V2 compliance for:
 * - CAIP-2: Blockchain ID Specification
 * - CAIP-10: Account ID Specification
 * - CAIP-19: Asset Type and Asset ID Specification
 */

import { describe, it, expect } from 'vitest';
import {
  parseCAIP2,
  parseCAIP10,
  parseCAIP19,
  generateCAIP2,
  generateCAIP10,
  generateCAIP19,
  extractSuiValues,
} from './caip';

describe('CAIP-2: Blockchain ID Specification', () => {
  it('should parse valid Sui mainnet ID', () => {
    const result = parseCAIP2('sui:mainnet');
    expect(result.namespace).toBe('sui');
    expect(result.reference).toBe('mainnet');
    expect(result.raw).toBe('sui:mainnet');
  });

  it('should parse valid Sui testnet ID', () => {
    const result = parseCAIP2('sui:testnet');
    expect(result.namespace).toBe('sui');
    expect(result.reference).toBe('testnet');
  });

  it('should parse valid EVM chain ID (Arc)', () => {
    const result = parseCAIP2('eip155:42170');
    expect(result.namespace).toBe('eip155');
    expect(result.reference).toBe('42170');
  });

  it('should throw on invalid format (missing colon)', () => {
    expect(() => parseCAIP2('sui-mainnet')).toThrow('Invalid CAIP-2');
  });

  it('should throw on invalid format (too many parts)', () => {
    expect(() => parseCAIP2('sui:mainnet:extra')).toThrow('Invalid CAIP-2');
  });

  it('should generate valid CAIP-2 ID', () => {
    const result = generateCAIP2('sui', 'mainnet');
    expect(result).toBe('sui:mainnet');
  });
});

describe('CAIP-10: Account ID Specification', () => {
  it('should parse valid Sui account ID', () => {
    const result = parseCAIP10('sui:mainnet:0x1234567890abcdef');
    expect(result.chainId).toBe('sui:mainnet');
    expect(result.address).toBe('0x1234567890abcdef');
    expect(result.raw).toBe('sui:mainnet:0x1234567890abcdef');
  });

  it('should parse valid EVM account ID', () => {
    const result = parseCAIP10('eip155:1:0xabcdef1234567890');
    expect(result.chainId).toBe('eip155:1');
    expect(result.address).toBe('0xabcdef1234567890');
  });

  it('should throw on invalid format (missing parts)', () => {
    expect(() => parseCAIP10('sui:mainnet')).toThrow('Invalid CAIP-10');
  });

  it('should throw on invalid format (too many parts)', () => {
    expect(() => parseCAIP10('sui:mainnet:0x123:extra')).toThrow('Invalid CAIP-10');
  });

  it('should generate valid CAIP-10 ID', () => {
    const result = generateCAIP10('sui:mainnet', '0x1234');
    expect(result).toBe('sui:mainnet:0x1234');
  });
});

describe('CAIP-19: Asset Type and Asset ID Specification', () => {
  it('should parse valid Sui USDC asset type', () => {
    const result = parseCAIP19('sui:mainnet/coin:0x2::usdc::USDC');
    expect(result.chainId).toBe('sui:mainnet');
    expect(result.namespace).toBe('coin');
    expect(result.reference).toBe('0x2::usdc::USDC');
    expect(result.raw).toBe('sui:mainnet/coin:0x2::usdc::USDC');
  });

  it('should parse valid EVM ERC-20 asset type', () => {
    const result = parseCAIP19('eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
    expect(result.chainId).toBe('eip155:1');
    expect(result.namespace).toBe('erc20');
    expect(result.reference).toBe('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  });

  it('should throw on invalid format (missing slash)', () => {
    expect(() => parseCAIP19('sui:mainnet:coin:0x2::usdc::USDC')).toThrow('Invalid CAIP-19');
  });

  it('should throw on invalid format (missing colon in asset part)', () => {
    expect(() => parseCAIP19('sui:mainnet/coin')).toThrow('Invalid CAIP-19');
  });

  it('should generate valid CAIP-19 asset type', () => {
    const result = generateCAIP19('sui:mainnet', 'coin', '0x2::usdc::USDC');
    expect(result).toBe('sui:mainnet/coin:0x2::usdc::USDC');
  });
});

describe('extractSuiValues: Sui-specific helper', () => {
  it('should extract Sui values from valid CAIP fields', () => {
    const result = extractSuiValues({
      network: 'sui:testnet',
      assetType: 'sui:testnet/coin:0x2::usdc::USDC',
      payTo: 'sui:testnet:0xmerchant123',
    });

    expect(result.network).toBe('testnet');
    expect(result.coinType).toBe('0x2::usdc::USDC');
    expect(result.merchantAddress).toBe('0xmerchant123');
  });

  it('should throw if network is not Sui', () => {
    expect(() =>
      extractSuiValues({
        network: 'eip155:1',
        assetType: 'eip155:1/erc20:0xUSDC',
        payTo: 'eip155:1:0xmerchant',
      })
    ).toThrow('Expected Sui network, got: eip155');
  });

  it('should throw if asset chainId does not match network', () => {
    expect(() =>
      extractSuiValues({
        network: 'sui:mainnet',
        assetType: 'sui:testnet/coin:0x2::usdc::USDC', // Mismatch!
        payTo: 'sui:mainnet:0xmerchant',
      })
    ).toThrow("Asset chain ID (sui:testnet) doesn't match network (sui:mainnet)");
  });

  it('should throw if account chainId does not match network', () => {
    expect(() =>
      extractSuiValues({
        network: 'sui:mainnet',
        assetType: 'sui:mainnet/coin:0x2::usdc::USDC',
        payTo: 'sui:testnet:0xmerchant', // Mismatch!
      })
    ).toThrow("Account chain ID (sui:testnet) doesn't match network (sui:mainnet)");
  });
});

describe('X-402 V2 Invoice Compatibility', () => {
  it('should handle full X-402 V2 invoice with CAIP fields', () => {
    const invoice = {
      network: 'sui:testnet',
      assetType: 'sui:testnet/coin:0x2::usdc::USDC',
      payTo: 'sui:testnet:0xmerchant123',
      paymentId: 'pmt_abc123',
      description: 'Premium API access',
      amount: '100000',
      resource: '/api/premium-data',
    };

    const extracted = extractSuiValues({
      network: invoice.network,
      assetType: invoice.assetType,
      payTo: invoice.payTo,
    });

    expect(extracted.network).toBe('testnet');
    expect(extracted.coinType).toBe('0x2::usdc::USDC');
    expect(extracted.merchantAddress).toBe('0xmerchant123');
  });

  it('should support Arc by Circle (for future cross-chain)', () => {
    const arcInvoice = {
      network: 'eip155:42170', // Arc by Circle
      assetType: 'eip155:42170/erc20:0xUSDCAddress',
      payTo: 'eip155:42170:0xmerchant',
    };

    const parsed = {
      network: parseCAIP2(arcInvoice.network),
      asset: parseCAIP19(arcInvoice.assetType),
      account: parseCAIP10(arcInvoice.payTo),
    };

    expect(parsed.network.namespace).toBe('eip155');
    expect(parsed.network.reference).toBe('42170');
    expect(parsed.asset.namespace).toBe('erc20');
    expect(parsed.account.address).toBe('0xmerchant');
  });
});
