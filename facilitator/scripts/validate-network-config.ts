#!/usr/bin/env tsx
/**
 * Network Configuration Validation Script
 * 
 * Validates that network configuration is properly set up for the target environment.
 * Run this before deploying to testnet to catch configuration errors early.
 * 
 * Usage:
 *   npm run validate-network          # Validates current NETWORK env
 *   NETWORK=testnet npm run validate-network
 */

import { getNetworkConfig } from '../src/config/networks.js';
import {
  getCliCommand,
  getExplorerUrl,
  getFaucetInfo,
  getOperationTimeout,
  formatTransactionResult,
} from '../src/utils/network-helpers.js';

function main() {
  console.log('🔍 Validating Network Configuration\n');
  console.log('═'.repeat(60));
  
  try {
    // Get and display config
    const config = getNetworkConfig();
    console.log(`\n✅ Network: ${config.name}`);
    console.log(`   RPC URL: ${config.rpcUrl}`);
    console.log(`   Payment Coin: ${config.paymentCoin.symbol} (${config.paymentCoin.decimals} decimals)`);
    console.log(`   Gas Coin: ${config.gasCoin.symbol} (${config.gasCoin.decimals} decimals)`);
    
    // Validate critical fields
    console.log(`\n🔐 Security Settings:`);
    console.log(`   Block SUI Payments: ${config.blockSuiPayments ? '✅ ENABLED' : '⚠️  DISABLED'}`);
    
    if (config.name === 'Testnet' && !config.blockSuiPayments) {
      console.error(`\n❌ CRITICAL: blockSuiPayments should be TRUE on testnet!`);
      console.error(`   This prevents draining the facilitator's gas fund.`);
      process.exit(1);
    }
    
    // Funding strategy
    console.log(`\n💰 Funding Strategy: ${config.facilitatorFundingStrategy}`);
    if (config.faucetCommand) {
      console.log(`   Faucet Command: ${config.faucetCommand}`);
    }
    if (config.circleUSDCFaucet) {
      console.log(`   Circle Faucet: ${config.circleUSDCFaucet}`);
    }
    
    // Test helper functions
    console.log(`\n🛠️  Helper Functions:`);
    const testDigest = 'TestDigest123';
    console.log(`   CLI Command: ${getCliCommand(testDigest)}`);
    
    const explorerUrl = getExplorerUrl(testDigest);
    console.log(`   Explorer URL: ${explorerUrl || 'N/A (localnet)'}`);
    
    const faucetInfo = getFaucetInfo();
    console.log(`   Faucet Type: ${faucetInfo.type || 'none'}`);
    
    const optimisticTimeout = getOperationTimeout('optimistic');
    const pessimisticTimeout = getOperationTimeout('pessimistic');
    console.log(`   Optimistic Timeout: ${optimisticTimeout}ms`);
    console.log(`   Pessimistic Timeout: ${pessimisticTimeout}ms`);
    
    // Test transaction formatting
    const txDisplay = formatTransactionResult(testDigest);
    console.log(`\n📊 Transaction Display:`);
    console.log(`   Network: ${txDisplay.network}`);
    console.log(`   Shows CLI: ${txDisplay.cliCommand ? 'Yes' : 'No'}`);
    console.log(`   Shows Explorer: ${txDisplay.explorerUrl ? 'Yes' : 'No'}`);
    
    // Warnings for testnet
    if (config.name === 'Testnet') {
      console.log(`\n⚠️  Testnet Checklist:`);
      console.log(`   [ ] Deploy Move contracts and set PACKAGE_ID`);
      console.log(`   [ ] Set USDC_TYPE to Circle USDC address`);
      console.log(`   [ ] Fund facilitator wallet with SUI for gas`);
      console.log(`   [ ] Test with small amounts first`);
      console.log(`   [ ] Monitor SUI balance (alert if < 10 SUI)`);
    }
    
    console.log(`\n✅ Network configuration is valid!`);
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error(`\n❌ Network configuration validation FAILED:\n`);
    console.error(error instanceof Error ? error.message : String(error));
    console.log('\n💡 Hint: Check that NETWORK environment variable is set correctly');
    console.log('   Valid options: localnet, testnet');
    process.exit(1);
  }
}

main();
