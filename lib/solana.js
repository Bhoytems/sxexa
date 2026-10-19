import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
export const connection = () => new Connection(process.env.RPC_URL, 'confirmed');
export const USDC = () => new PublicKey(process.env.USDC_MINT);
export const treasuryAta = () => getAssociatedTokenAddressSync(USDC(), new PublicKey(process.env.TREASURY_ADDRESS));
