import { useState, useCallback, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import type { BalanceInfo, FundingResult } from '../types/auth';

const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL || 'http://localhost:3001';

// Get network-specific payment coin type
function getPaymentCoinType(): string {
  // Check if we're on testnet or localnet
  const network = import.meta.env.VITE_SUI_NETWORK || 'localnet';
  
  if (network === 'testnet') {
    // Real Circle USDC on testnet
    return import.meta.env.VITE_USDC_TYPE || 
           '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
  }
  
  // MockUSDC on localnet (from deploy script or env)
  return import.meta.env.VITE_MOCK_USDC_TYPE || 
         '0x34f1b450e7815b8b95df68cb6bfd81bbaf42607acf1f345bcb4a2fc732ca648b::mock_usdc::MOCK_USDC';
}

/**
 * Hook for checking balance and funding wallets
 * Works with any auth provider (Enoki or keypair)
 */
export function useBalance(address: string | null) {
  const suiClient = useSuiClient();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [fundingResult, setFundingResult] = useState<FundingResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Check balance
  const checkBalance = useCallback(async () => {
    if (!address) {
      throw new Error('No address provided');
    }

    setBalanceInfo({ ...balanceInfo as any, loading: true });
    
    try {
      // Get SUI balance
      const suiBalance = await suiClient.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI',
      });

      // Get USDC/MockUSDC balance (payment coin)
      let usdcBalance = 0;
      try {
        const paymentCoinType = getPaymentCoinType();
        const usdc = await suiClient.getBalance({
          owner: address,
          coinType: paymentCoinType,
        });
        usdcBalance = parseInt(usdc.totalBalance) / 1_000_000; // 6 decimals
      } catch (e) {
        console.log('No USDC balance yet:', e);
      }

      const info: BalanceInfo = {
        address,
        sui: parseInt(suiBalance.totalBalance) / 1_000_000_000, // 9 decimals (for gas display)
        usdc: usdcBalance, // Payment coin (MockUSDC on localnet, USDC on testnet)
        loading: false,
      };

      setBalanceInfo(info);
      return info;
    } catch (error) {
      const errorInfo: BalanceInfo = {
        address,
        sui: 0,
        usdc: 0,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      };
      setBalanceInfo(errorInfo);
      throw error;
    }
  }, [address, suiClient]);

  // Fund wallet via facilitator (localnet) or Circle faucet (testnet)
  const fundWallet = useCallback(async () => {
    if (!address) {
      throw new Error('No address provided');
    }

    const network = import.meta.env.VITE_SUI_NETWORK || 'localnet';

    // TESTNET: Redirect to Circle USDC faucet (no API call)
    if (network === 'testnet') {
      console.log('[useBalance] Testnet detected - opening Circle USDC faucet');
      
      const faucetUrl = 'https://faucet.circle.com';
      
      // Copy address to clipboard
      try {
        await navigator.clipboard.writeText(address);
        console.log('✅ Address copied to clipboard:', address);
      } catch (e) {
        console.warn('⚠️ Failed to copy address:', e);
      }
      
      // Open Circle faucet in new tab
      window.open(faucetUrl, '_blank', 'noopener,noreferrer');
      
      // Return result indicating manual funding needed
      const fundingRes: FundingResult = {
        success: true,
        message: 'Circle faucet opened. Please request USDC for your address.',
        manualFunding: true,
        faucetUrl,
        address,
      };
      
      setFundingResult(fundingRes);
      return fundingRes;
    }

    // LOCALNET: Auto-fund via facilitator (existing behavior)
    setLoading(true);
    setFundingResult(null);

    try {
      const response = await fetch(`${FACILITATOR_URL}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          sessionId: `session_${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Funding failed');
      }

      const result = await response.json();
      
      const fundingRes: FundingResult = {
        success: true,
        txDigest: result.txDigest,
        amount: result.amount,
      };
      
      setFundingResult(fundingRes);

      // Refresh balance after 2 seconds
      setTimeout(() => checkBalance(), 2000);

      return fundingRes;
    } catch (error) {
      const errorRes: FundingResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      setFundingResult(errorRes);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [address, checkBalance]);

  // Auto-check balance when address changes
  useEffect(() => {
    if (address) {
      console.log('[useBalance] Auto-checking balance for:', address);
      checkBalance().catch(err => {
        console.warn('[useBalance] Auto-check failed:', err);
      });
    }
  }, [address, checkBalance]);

  return {
    balanceInfo,
    fundingResult,
    loading,
    checkBalance,
    fundWallet,
  };
}
