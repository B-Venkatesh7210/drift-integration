'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useDriftStore } from '@/lib/store';
import { initializeDriftClient } from '@/lib/drift';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function WalletInput() {
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setClient, setUsers } = useDriftStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(walletAddress.trim());
      } catch (err) {
        throw new Error('Invalid wallet address format');
      }

      const driftClient = await initializeDriftClient(publicKey, true);
      setClient(driftClient);

      try {
        const userAccounts = await driftClient.getUserAccountsForAuthority(publicKey);
        
        if (!userAccounts || userAccounts.length === 0) {
          throw new Error('No Drift Protocol accounts found for this wallet');
        }

        // Transform user accounts data with proper BN handling
        const transformedAccounts = userAccounts.map(account => {
          if (!account) return null;

          try {
            const totalDeposits = account.totalDeposits ? parseFloat(account.totalDeposits.toString()) / 1e6 : 0;
            const totalWithdraws = account.totalWithdraws ? parseFloat(account.totalWithdraws.toString()) / 1e6 : 0;
            const settledPnl = account.settledPerpPnl ? parseFloat(account.settledPerpPnl.toString()) / 1e6 : 0;
            
            // Calculate total collateral including deposits, withdraws, and settled PnL
            const totalCollateral = totalDeposits - totalWithdraws + settledPnl;

            // Transform perp positions
            const perpPositions = account.perpPositions.map(pos => ({
              marketIndex: pos.marketIndex,
              baseAssetAmount: pos.baseAssetAmount.toString(),
              quoteAssetAmount: pos.quoteAssetAmount.toString(),
              quoteEntryAmount: pos.quoteEntryAmount.toString(),
              quoteBreakEvenAmount: pos.quoteBreakEvenAmount.toString(),
              settledPnl: pos.settledPnl.toString(),
              openOrders: pos.openOrders,
              lpShares: pos.lpShares.toString(),
              openBids: pos.openBids.toString(),
              openAsks: pos.openAsks.toString(),
            }));

            return {
              authority: account.authority.toString(),
              subAccountId: account.subAccountId,
              name: account.name ? String.fromCharCode(...account.name.filter(n => n !== 0)) : `Account ${account.subAccountId}`,
              equity: totalCollateral,
              totalCollateral: totalCollateral,
              openOrders: account.openOrders,
              openPositions: account.perpPositions?.filter(pos => !pos.baseAssetAmount.isZero()).length || 0,
              status: account.status,
              hasOpenOrder: account.hasOpenOrder,
              isMarginTradingEnabled: account.isMarginTradingEnabled,
              perpPositions,
            };
          } catch (err) {
            console.error('Error transforming account:', err);
            return null;
          }
        }).filter((account): account is NonNullable<typeof account> => account !== null);

        if (transformedAccounts.length === 0) {
          throw new Error('Failed to process account data');
        }
        
        setUsers(transformedAccounts);
        setWalletAddress(''); // Clear input after successful fetch
      } catch (err) {
        throw new Error('Error fetching account data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Enter wallet address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'View'}
        </Button>
      </form>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-sm text-muted-foreground">
        Try this test wallet: <code className="px-2 py-1 bg-muted rounded">arbJEWqPDYfgTFf3CdACQpZrk56tB6z7hPFc6K9KLUi</code>
      </div>
    </div>
  );
}