'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useDriftStore } from '@/lib/store';
import { initializeDriftClient } from '@/lib/drift';
import { BarChart, Activity, Wallet, ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { WalletInput } from '@/components/wallet-input';
import { TradingForm } from '@/components/trading-form';
import { DepositWithdrawForm } from '@/components/deposit-withdraw-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

const MARKET_NAMES: { [key: number]: string } = {
  0: 'SOL-PERP',
  1: 'BTC-PERP',
  2: 'ETH-PERP',
  // Add more market indices as needed
};

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { client, setClient, users, setUsers } = useDriftStore();
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [accountStats, setAccountStats] = useState({
    totalCollateral: 0,
    openPositions: 0,
    pnl: 0,
  });

  useEffect(() => {
    if (connected && publicKey) {
      const setupDrift = async () => {
        try {
          setLoading(true);
          const driftClient = await initializeDriftClient(publicKey, false);
          setClient(driftClient);

          const userAccounts = await driftClient.getUserAccountsForAuthority(publicKey);
          
          if (!userAccounts || userAccounts.length === 0) {
            throw new Error('No accounts found');
          }

          // Transform user accounts data
          const transformedAccounts = userAccounts.map(account => {
            const totalDeposits = account.totalDeposits ? parseFloat(account.totalDeposits.toString()) / 1e6 : 0;
            const totalWithdraws = account.totalWithdraws ? parseFloat(account.totalWithdraws.toString()) / 1e6 : 0;
            const settledPnl = account.settledPerpPnl ? parseFloat(account.settledPerpPnl.toString()) / 1e6 : 0;
            
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
          });

          setUsers(transformedAccounts);

          // Calculate total stats
          const stats = transformedAccounts.reduce((acc, account) => ({
            totalCollateral: acc.totalCollateral + account.totalCollateral,
            openPositions: acc.openPositions + account.openPositions,
            pnl: acc.pnl + (account.equity - account.totalCollateral),
          }), { totalCollateral: 0, openPositions: 0, pnl: 0 });

          setAccountStats(stats);
        } catch (error) {
          console.error('Error initializing Drift:', error);
        } finally {
          setLoading(false);
        }
      };

      setupDrift();
    }
  }, [connected, publicKey, setClient, setUsers]);

  const formatBN = (value: string, decimals: number = 6): string => {
    try {
      const number = parseFloat(value) / Math.pow(10, decimals);
      return number.toFixed(decimals);
    } catch (e) {
      return '0';
    }
  };

  const isViewOnlyWallet = (authority: string): boolean => {
    return publicKey ? authority !== publicKey.toString() : true;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <h1 className="text-xl font-bold">Drift Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Wallet className="h-16 w-16 mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-4">
              Connect your wallet to get started
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Connect your Solana wallet to view your Drift Protocol subaccounts, positions, and trading history
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">View Other Wallet</h2>
              <WalletInput />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Collateral</h3>
                      <BarChart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">${accountStats.totalCollateral.toFixed(2)}</p>
                  </Card>
                  <Card className="p-6 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">Open Positions</h3>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold">{accountStats.openPositions}</p>
                  </Card>
                  <Card className="p-6 flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">Total PnL</h3>
                      <BarChart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className={`text-2xl font-bold ${accountStats.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {accountStats.pnl >= 0 ? '+' : ''}{accountStats.pnl.toFixed(2)}
                    </p>
                  </Card>
                </div>

                <Tabs defaultValue="subaccounts" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="subaccounts">Subaccounts</TabsTrigger>
                    <TabsTrigger value="perp-positions">Perp Positions</TabsTrigger>
                    <TabsTrigger value="trading">Trading</TabsTrigger>
                  </TabsList>

                  <TabsContent value="subaccounts" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Your Subaccounts</h2>
                    </div>
                    
                    {users.length > 0 ? (
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subaccount ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Total Collateral</TableHead>
                              <TableHead>Open Orders</TableHead>
                              <TableHead>Open Positions</TableHead>
                              <TableHead>Actions</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {user.subAccountId}
                                </TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>${user.totalCollateral.toFixed(2)}</TableCell>
                                <TableCell>{user.openOrders}</TableCell>
                                <TableCell>{user.openPositions}</TableCell>
                                <TableCell>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <ArrowUpDown className="h-4 w-4 mr-2" />
                                        Deposit/Withdraw
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Deposit or Withdraw USDC</DialogTitle>
                                      </DialogHeader>
                                      <DepositWithdrawForm 
                                        subAccountId={user.subAccountId} 
                                        isViewOnly={isViewOnlyWallet(user.authority)}
                                      />
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    user.isMarginTradingEnabled
                                      ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400'
                                  }`}>
                                    {user.isMarginTradingEnabled ? 'Active' : 'Limited'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    ) : (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No subaccounts found</p>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="perp-positions" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold">Perpetual Positions</h2>
                    </div>
                    
                    {users.length > 0 ? (
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Market</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Entry Amount</TableHead>
                              <TableHead>Break Even</TableHead>
                              <TableHead>Current Value</TableHead>
                              <TableHead>Settled PnL</TableHead>
                              <TableHead>Orders</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.flatMap(user => 
                              user.perpPositions
                                .filter(pos => pos.baseAssetAmount !== '0')
                                .map((position, posIndex) => (
                                  <TableRow key={`${user.subAccountId}-${posIndex}`}>
                                    <TableCell className="font-medium">
                                      {MARKET_NAMES[position.marketIndex] || `Market ${position.marketIndex}`}
                                    </TableCell>
                                    <TableCell>
                                      {formatBN(position.baseAssetAmount)}
                                    </TableCell>
                                    <TableCell>
                                      ${formatBN(position.quoteEntryAmount)}
                                    </TableCell>
                                    <TableCell>
                                      ${formatBN(position.quoteBreakEvenAmount)}
                                    </TableCell>
                                    <TableCell>
                                      ${formatBN(position.quoteAssetAmount)}
                                    </TableCell>
                                    <TableCell className={parseFloat(position.settledPnl) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                      ${formatBN(position.settledPnl)}
                                    </TableCell>
                                    <TableCell>
                                      {position.openOrders}
                                    </TableCell>
                                  </TableRow>
                                ))
                            )}
                          </TableBody>
                        </Table>
                      </Card>
                    ) : (
                      <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No positions found</p>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="trading">
                    <div className="flex justify-center">
                      <div className="w-full max-w-2xl">
                        <div className="flex justify-end mb-4">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="demo-mode">Demo Mode</Label>
                            <Switch
                              id="demo-mode"
                              checked={demoMode}
                              onCheckedChange={setDemoMode}
                            />
                          </div>
                        </div>
                        <TradingForm 
                          isViewOnly={users.length > 0 && isViewOnlyWallet(users[0].authority)} 
                          isDemo={demoMode}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}