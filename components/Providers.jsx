'use client';
import { useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletConnectWalletAdapter } from '@walletconnect/solana-adapter';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Providers({ children }) {
  useEffect(() => { window.Telegram?.WebApp?.ready(); window.Telegram?.WebApp?.expand(); }, []);
  // Wallets that support the Wallet Standard (Phantom, Solflare, Backpack and others) are detected automatically.
  // WalletConnect covers the rest, including mobile wallets, which matters inside Telegram.
  const wallets = useMemo(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) return [];
    return [new WalletConnectWalletAdapter({
      network: WalletAdapterNetwork.Mainnet,
      options: { projectId, metadata: { name: 'Soledge', description: 'Trade SOL with leverage', url: window.location.origin, icons: [] } },
    })];
  }, []);
  return (
    <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
