import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { connection, USDC } from './solana';

// Sends USDC from the payout (hot) wallet. Returns the real on-chain cost so the ledger can book it.
export async function payUsdc(toWallet, usd) {
  const conn = connection();
  const payer = Keypair.fromSecretKey(bs58.decode(process.env.PAYOUT_SECRET_KEY));
  const mint = USDC();
  const to = new PublicKey(toWallet);
  const fromAta = getAssociatedTokenAddressSync(mint, payer.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, to);
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, toAta, to, mint),
    createTransferCheckedInstruction(fromAta, mint, toAta, payer.publicKey, Math.round(usd * 1e6), 6)
  );
  const signature = await sendAndConfirmTransaction(conn, tx, [payer], { commitment: 'confirmed' });
  const t = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  const gasLamports = t.meta.preBalances[0] - t.meta.postBalances[0]; // fee + rent for a new account, if any
  return { signature, gasLamports };
}
