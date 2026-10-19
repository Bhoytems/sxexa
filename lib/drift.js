// Browser-side Drift helpers. Opening and closing are built on the SERVER (see lib/driftServer.js),
// so the browser only signs. This file reads the position and places take-profit / stop-loss orders.
// Method names follow the official Drift SDK docs; re-check them against the installed version.
import { DriftClient, OrderType, PositionDirection, OrderTriggerCondition } from '@drift-labs/sdk';
import { Transaction } from '@solana/web3.js';

const SOL_PERP = 0;
let cached;

export async function getDrift(connection, wallet) {
  const key = wallet.publicKey.toBase58();
  if (cached?.key === key) return cached.client;
  const client = new DriftClient({ connection, wallet, env: process.env.NEXT_PUBLIC_DRIFT_ENV || 'mainnet-beta', accountSubscription: { type: 'websocket' } });
  await client.subscribe();
  cached = { key, client };
  return client;
}

// Signs and sends a transaction that the server built, then waits for confirmation.
export async function sendPrepared(connection, wallet, txBase64) {
  const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
  const signature = await wallet.sendTransaction(tx, connection);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}

export async function readPosition(connection, wallet) {
  const client = await getDrift(connection, wallet);
  const pos = client.getUser().getPerpPosition(SOL_PERP);
  if (!pos || pos.baseAssetAmount.isZero()) return null;
  const sizeSol = pos.baseAssetAmount.toNumber() / 1e9;
  const entry = Math.abs(pos.quoteEntryAmount.toNumber() / 1e6 / sizeSol);
  return { long: sizeSol > 0, sizeSol: Math.abs(sizeSol), entry };
}

// Reduce-only trigger orders. Drift needs an open position first, so this returns a message
// (instead of throwing) when there is none yet, for example a limit entry that has not filled.
export async function placeProtection({ connection, wallet, long, tp, sl }) {
  if (!tp && !sl) return null;
  try {
    const client = await getDrift(connection, wallet);
    const pos = client.getUser().getPerpPosition(SOL_PERP);
    if (!pos || pos.baseAssetAmount.isZero()) return 'Order placed. Set take profit and stop loss from Positions once it fills.';
    const opp = long ? PositionDirection.SHORT : PositionDirection.LONG;
    const trig = (p, cond) => client.getPlacePerpOrderIx({
      orderType: OrderType.TRIGGER_MARKET, marketIndex: SOL_PERP, direction: opp, baseAssetAmount: pos.baseAssetAmount.abs(),
      triggerPrice: client.convertToPricePrecision(p), triggerCondition: cond, reduceOnly: true,
    });
    const ixs = [];
    if (sl) ixs.push(await trig(sl, long ? OrderTriggerCondition.BELOW : OrderTriggerCondition.ABOVE));
    if (tp) ixs.push(await trig(tp, long ? OrderTriggerCondition.ABOVE : OrderTriggerCondition.BELOW));
    const tx = new Transaction().add(...ixs);
    const signature = await wallet.sendTransaction(tx, connection);
    await connection.confirmTransaction(signature, 'confirmed');
    return null;
  } catch (e) {
    return 'Trade done, but take profit / stop loss could not be set. Try again from Positions.';
  }
}
