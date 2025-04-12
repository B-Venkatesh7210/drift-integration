'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';

require('@solana/wallet-adapter-react-ui/styles.css');

const WalletProviderComponent = ({ children }: { children: React.ReactNode }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({ 
        network,
        appName: "Drift Protocol Dashboard",
        appDescription: "View and manage Drift Protocol subaccounts",
        appUrl: "https://drift.trade",
        appIcon: "https://drift.trade/favicon.ico",
        rpcUrl: endpoint,
        rpcPreference: "preflight",
        hostname: typeof window !== 'undefined' ? window.location.hostname : "localhost"
      }), 
      new SolflareWalletAdapter()
    ],
    [network, endpoint]
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
};

export const Providers = dynamic(() => Promise.resolve(WalletProviderComponent), {
  ssr: false,
});