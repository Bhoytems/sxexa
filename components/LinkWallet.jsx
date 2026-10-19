'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';
import { api } from '@/lib/api';

// Connect any wallet, then prove ownership by signing a message. Payouts only go to a proven wallet.
export default function LinkWallet({ me, reloadMe, toast }) {
  const { publicKey, signMessage } = useWallet();
  const address = publicKey?.toBase58();
  const linked = me.wallet && me.wallet === address;
  async function link() {
    try {
      const message = `Soledge link ${me.id} ${Date.now()}`;
      const sig = await signMessage(new TextEncoder().encode(message));
      await api('/api/wallet', { wallet: address, message, signature: bs58.encode(sig) });
      await reloadMe();
      toast('Wallet linked');
    } catch (e) { toast(e.message); }
  }
  return (
    <div className="c" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <WalletMultiButton />
      {address && !linked && <button className="sec" onClick={link}>Link this wallet to my account</button>}
      {linked && <div className="m g">Linked: {address.slice(0, 4)}…{address.slice(-4)}</div>}
    </div>
  );
}
