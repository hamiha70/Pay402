/**
 * CAIP (Chain Agnostic Improvement Proposals) Utilities
 * 
 * Implements parsing for X-402 V2 compliance:
 * - CAIP-2: Blockchain ID Specification
 * - CAIP-10: Account ID Specification  
 * - CAIP-19: Asset Type and Asset ID Specification
 * 
 * @see https://chainagnostic.org/
 */

/**
 * Parse CAIP-2 Network ID
 * Format: namespace:reference
 * Example: "sui:mainnet" → { namespace: "sui", reference: "mainnet" }
 */
export interface CAIP2NetworkId {
  namespace: string;  // "sui", "eip155", "solana"
  reference: string;  // "mainnet", "testnet", "1", etc.
  raw: string;        // Original string
}

export function parseCAIP2(networkId: string): CAIP2NetworkId {
  const parts = networkId.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid CAIP-2 network ID: ${networkId}. Expected format: namespace:reference`);
  }
  
  return {
    namespace: parts[0],
    reference: parts[1],
    raw: networkId,
  };
}

/**
 * Parse CAIP-10 Account ID
 * Format: chain_id:account_address
 * Example: "sui:mainnet:0x1234..." → { chainId: "sui:mainnet", address: "0x1234..." }
 */
export interface CAIP10AccountId {
  chainId: string;    // "sui:mainnet"
  address: string;    // "0x1234..."
  raw: string;        // Original string
}

export function parseCAIP10(accountId: string): CAIP10AccountId {
  const parts = accountId.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid CAIP-10 account ID: ${accountId}. Expected format: chain_id:account_address`);
  }
  
  return {
    chainId: `${parts[0]}:${parts[1]}`,
    address: parts[2],
    raw: accountId,
  };
}

/**
 * Parse CAIP-19 Asset Type
 * Format: chain_id/asset_namespace:asset_reference
 * Example: "sui:mainnet/coin:0x2::usdc::USDC" → { chainId: "sui:mainnet", namespace: "coin", reference: "0x2::usdc::USDC" }
 */
export interface CAIP19AssetType {
  chainId: string;       // "sui:mainnet"
  namespace: string;     // "coin", "erc20", "slip44"
  reference: string;     // "0x2::usdc::USDC", "0xA0b86991...", etc.
  raw: string;           // Original string
}

export function parseCAIP19(assetType: string): CAIP19AssetType {
  // Split by first '/' to separate chain_id from asset_namespace:asset_reference
  const slashIndex = assetType.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(`Invalid CAIP-19 asset type: ${assetType}. Expected format: chain_id/asset_namespace:asset_reference`);
  }
  
  const chainId = assetType.substring(0, slashIndex);
  const assetPart = assetType.substring(slashIndex + 1);
  
  // Split asset part by first ':' to separate namespace from reference
  const colonIndex = assetPart.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid CAIP-19 asset type: ${assetType}. Expected format: chain_id/asset_namespace:asset_reference`);
  }
  
  const namespace = assetPart.substring(0, colonIndex);
  const reference = assetPart.substring(colonIndex + 1);
  
  return {
    chainId,
    namespace,
    reference,
    raw: assetType,
  };
}

/**
 * Generate CAIP-2 Network ID
 */
export function generateCAIP2(namespace: string, reference: string): string {
  return `${namespace}:${reference}`;
}

/**
 * Generate CAIP-10 Account ID
 */
export function generateCAIP10(chainId: string, address: string): string {
  return `${chainId}:${address}`;
}

/**
 * Generate CAIP-19 Asset Type
 */
export function generateCAIP19(chainId: string, namespace: string, reference: string): string {
  return `${chainId}/${namespace}:${reference}`;
}

/**
 * Helper: Extract Sui-specific values from CAIP fields
 */
export function extractSuiValues(invoice: {
  network: string;
  assetType: string;
  payTo: string;
}) {
  const network = parseCAIP2(invoice.network);
  const asset = parseCAIP19(invoice.assetType);
  const account = parseCAIP10(invoice.payTo);
  
  // Validate all are Sui
  if (network.namespace !== 'sui') {
    throw new Error(`Expected Sui network, got: ${network.namespace}`);
  }
  
  if (asset.chainId !== invoice.network) {
    throw new Error(`Asset chain ID (${asset.chainId}) doesn't match network (${invoice.network})`);
  }
  
  if (account.chainId !== invoice.network) {
    throw new Error(`Account chain ID (${account.chainId}) doesn't match network (${invoice.network})`);
  }
  
  return {
    network: network.reference,      // "mainnet", "testnet", "devnet"
    coinType: asset.reference,       // "0x2::usdc::USDC"
    merchantAddress: account.address, // "0x1234..."
  };
}
