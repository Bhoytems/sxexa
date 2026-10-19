// The SERVER builds the trade transaction, so the position size and fee inside it are never client-supplied.
// Method names follow the official Drift SDK docs (DriftClient): getDepositInstruction, getInitializeUserInstructions
// (returns [PublicKey, ix]), getInitializeUserStatsIx, getPlacePerpOrderIx. Re-check them against the installed version.
import { DriftClient, OrderType, PositionDirection } from '@drift-labs/sdk';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { connection, USDC, treasuryAta } from './solana';
import { ixSigs } from './ixsig';

const SOL_PERP = 0;
const USDC_SPOT = 0;

async function withClient(userPk, fn) {
  const conn = connection();
  const no = async () => { throw new Error('server never signs'); };
  const wallet = { publicKey: userPk, signTransaction: no, signAllTransactions: no };
  const client = new DriftClient({ connection: conn, wallet, env: process.env.DRIFT_ENV || 'mainnet-beta', accountSubscription: { type: 'websocket' } });
  await client.subscribe();
  try { return await fn(client, conn); } finally { await client.unsubscribe().catch(() => {}); }
}

const oracle = (client) => client.getOracleDataForPerpMarket(SOL_PERP).price.toNumber() / 1e6;

function feeIx(userPk, feeUsd) {
  const mint = USDC();
  return createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, userPk), mint, treasuryAta(), userPk, Math.round(feeUsd * 1e6), 6);
}

async function finish(conn, userPk, ixs, positionUsd, feeUsd) {
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: userPk, recentBlockhash: blockhash }).add(...ixs);
  return { tx, positionUsd, feeUsd, ixSigs: ixSigs(tx.compileMessage()) };
}

export function buildOpen({ userPk, side, type, entry, marginUsd, leverage, feeRate }) {
  return withClient(userPk, async (client, conn) => {
    const long = side === 'long';
    const mark = oracle(client);
    const positionUsd = marginUsd * leverage;
    const feeUsd = positionUsd * feeRate;
    // "Market" = a limit order priced 0.5% through the oracle price, so it fills immediately.
    const price = type === 'limit' ? entry : mark * (long ? 1.005 : 0.995);
    const base = client.convertToPerpPrecision(positionUsd / (type === 'limit' ? entry : mark));

    const exists = !!(await conn.getAccountInfo(await client.getUserAccountPublicKey()));
    const ixs = [feeIx(userPk, feeUsd)];
    if (!exists) {
      ixs.push(await client.getInitializeUserStatsIx());
      ixs.push((await client.getInitializeUserInstructions(0, 'Soledge'))[1]);
    }
    const userAta = getAssociatedTokenAddressSync(USDC(), userPk);
    ixs.push(await client.getDepositInstruction(client.convertToSpotPrecision(USDC_SPOT, marginUsd), USDC_SPOT, userAta, 0, false, exists));
    ixs.push(await client.getPlacePerpOrderIx({
      orderType: OrderType.LIMIT, marketIndex: SOL_PERP, direction: long ? PositionDirection.LONG : PositionDirection.SHORT,
      baseAssetAmount: base, price: client.convertToPricePrecision(price),
    }));
    return finish(conn, userPk, ixs, positionUsd, feeUsd);
  });
}

export function buildClose({ userPk, feeRate }) {
  return withClient(userPk, async (client, conn) => {
    const pos = client.getUser().getPerpPosition(SOL_PERP);
    if (!pos || pos.baseAssetAmount.isZero()) throw new Error('No open position');
    const long = pos.baseAssetAmount.gtn(0);
    const mark = oracle(client);
    const positionUsd = Math.abs(pos.baseAssetAmount.toNumber() / 1e9) * mark;
    const feeUsd = positionUsd * feeRate;
    const ix = await client.getPlacePerpOrderIx({
      orderType: OrderType.LIMIT, marketIndex: SOL_PERP, direction: long ? PositionDirection.SHORT : PositionDirection.LONG,
      baseAssetAmount: pos.baseAssetAmount.abs(), price: client.convertToPricePrecision(mark * (long ? 0.995 : 1.005)), reduceOnly: true,
    });
    const r = await finish(conn, userPk, [feeIx(userPk, feeUsd), ix], positionUsd, feeUsd);
    return { ...r, side: long ? 'long' : 'short' };
  });
}
