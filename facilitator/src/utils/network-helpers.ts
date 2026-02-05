/**
 * Network Helper Functions
 * 
 * Provides network-aware utilities for:
 * - CLI commands
 * - Explorer URLs
 * - Faucet information
 * - Timeouts
 */

import { getNetworkConfig, type NetworkConfig } from '../config/networks.js';

/**
 * Get the appropriate CLI command to query a transaction
 * 
 * @example
 * // Localnet: "sui client tx-block <digest>"
 * // Testnet: "sui client tx-block --network testnet <digest>"
 */
export function getCliCommand(digest: string, network?: string): string {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  if (config.name === 'Localnet') {
    return `lsui client tx-block ${digest}`;
  }
  
  return `sui client tx-block --network ${config.name.toLowerCase()} ${digest}`;
}

/**
 * Get explorer URL for a transaction (if available)
 * Returns null for networks without explorers (like localnet)
 */
export function getExplorerUrl(digest: string, network?: string): string | null {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  if (config.name === 'Localnet') {
    return null; // No explorer for localnet
  }
  
  if (config.name === 'Testnet') {
    return `https://testnet.suivision.xyz/txblock/${digest}`;
  }
  
  // Mainnet
  return `https://suivision.xyz/txblock/${digest}`;
}

/**
 * Faucet information for the current network
 */
export interface FaucetInfo {
  url: string | null;
  type: 'embedded' | 'circle' | null;
  instructions: string;
  shouldOpenInNewTab: boolean;
  requiresManualAction: boolean;
}

export function getFaucetInfo(network?: string): FaucetInfo {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  if (config.name === 'Localnet') {
    return {
      url: config.faucetUrl || 'http://127.0.0.1:9123/gas',
      type: 'embedded',
      instructions: 'Automatic faucet via local RPC. Run: sui client faucet',
      shouldOpenInNewTab: false,
      requiresManualAction: false,
    };
  }
  
  if (config.name === 'Testnet' && config.circleUSDCFaucet) {
    return {
      url: config.circleUSDCFaucet,
      type: 'circle',
      instructions: 'Opens Circle faucet in new tab. You will receive 20 USDC. Limit: once per address per 2 hours.',
      shouldOpenInNewTab: true,
      requiresManualAction: true,
    };
  }
  
  return {
    url: null,
    type: null,
    instructions: 'No faucet available for this network',
    shouldOpenInNewTab: false,
    requiresManualAction: false,
  };
}

/**
 * Get network-aware timeout for operations
 * Localnet is fast (~50ms), testnet is slower (~1.5s)
 */
export function getOperationTimeout(
  operation: 'optimistic' | 'pessimistic',
  network?: string
): number {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  if (config.name === 'Localnet') {
    return operation === 'optimistic' ? 100 : 500; // ms
  }
  
  if (config.name === 'Testnet') {
    return operation === 'optimistic' ? 2000 : 5000; // ms
  }
  
  // Mainnet (conservative)
  return operation === 'optimistic' ? 3000 : 10000; // ms
}

/**
 * Get expected confirmation time for the network
 * Used for polling/retry logic
 */
export function getConfirmationTime(network?: string): number {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  if (config.name === 'Localnet') {
    return 50; // ms - nearly instant
  }
  
  if (config.name === 'Testnet') {
    return 1500; // ms - ~1.5 seconds
  }
  
  // Mainnet
  return 2000; // ms - ~2 seconds
}

/**
 * Format a transaction result for display
 * Shows appropriate information based on network
 */
export interface TransactionDisplay {
  digest: string;
  cliCommand: string | null;
  explorerUrl: string | null;
  network: string;
}

export function formatTransactionResult(digest: string, network?: string): TransactionDisplay {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  
  return {
    digest,
    cliCommand: config.name === 'Localnet' ? getCliCommand(digest, network) : null,
    explorerUrl: getExplorerUrl(digest, network),
    network: config.name,
  };
}

/**
 * Check if a network is a test network (localnet or testnet)
 */
export function isTestNetwork(network?: string): boolean {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  return config.name === 'Localnet' || config.name === 'Testnet';
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network?: string): string {
  const config = network ? { ...getNetworkConfig(), name: network } : getNetworkConfig();
  return config.name;
}
