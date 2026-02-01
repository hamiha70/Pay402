import { useState, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import type { BalanceInfo, FundingResult } from '../types/auth';

const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL || 'http://localhost:3001';

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

      // Try to get USDC balance (might not exist yet)
      let usdcBalance = 0;
      try {
        const usdc = await suiClient.getBalance({
          owner: address,
          coinType: '0x2::sui::SUI', // TODO: Replace with actual USDC coin type
        });
        usdcBalance = parseInt(usdc.totalBalance) / 1_000_000; // 6 decimals
      } catch (e) {
        console.log('No USDC balance yet');
      }

      const info: BalanceInfo = {
        address,
        sui: parseInt(suiBalance.totalBalance) / 1_000_000_000, // 9 decimals
        usdc: usdcBalance,
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

  // Fund wallet via facilitator
  const fundWallet = useCallback(async () => {
    if (!address) {
      throw new Error('No address provided');
    }

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

  return {
    balanceInfo,
    fundingResult,
    loading,
    checkBalance,
    fundWallet,
  };
}
