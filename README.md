# Soledge

Telegram mini app for leveraged SOL trading on Drift (SOL-PERP). Next.js on Vercel, Supabase for data.

**Status: first draft. It has not been installed, compiled or run, and it has never touched Drift.** Read "Known gaps" before putting real money through it.

## Setup

1. **Install:** `npm install`, then `npm run dev`. Check that the versions npm picks (especially `@drift-labs/sdk`) match the calls in `lib/drift.js`.
2. **Supabase:** create a project, run `supabase/schema.sql` in the SQL editor. Copy the project URL and the *service role* key into `.env`. Never expose that key to the browser.
3. **Environment:** copy `.env.example` to `.env.local` and fill it in. On Vercel, add the same values as environment variables. For Supabase, use the pooled (transaction) connection if you ever add direct Postgres access.
4. **Telegram:** create the bot with @BotFather (`@SoledgeAppBot`), then create a Mini App for it and point its URL at your Vercel domain. Set `MINIAPP_SHORT_NAME` to the short name you chose, so referral links open correctly. Put your Telegram user id in `ADMIN_TG_IDS`.
5. **Wallets:**
   - *Treasury* (receives fees): a fresh wallet, ideally hardware or multisig. Put only its public address in `TREASURY_ADDRESS`. Create its USDC token account by sending it a small amount of USDC once. Keep a little SOL in it.
   - *Payout* (pays referrers): a separate hot wallet. Its secret key (base58) goes in `PAYOUT_SECRET_KEY` as an encrypted Vercel variable. Fund it with SOL for fees and a small USDC float.
6. **RPC:** use a dedicated provider (Helius, QuickNode, etc.) for `RPC_URL` and `NEXT_PUBLIC_RPC_URL`.
7. **WalletConnect:** create a project id at WalletConnect and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` so users with any wallet can connect, including mobile wallets.

## Changing rates

Everything adjustable lives in the `settings` table: `fee_rate` (0.005 = 0.5%), `referral_share` (0.20), `min_order_usd` (10), `max_leverage` (10), `min_withdraw_usd` (20), `withdrawal_fee_usd` (0.50). Edit a row in Supabase and it applies to new trades immediately.

## How it works

- Identity: every API call carries Telegram's signed launch data, verified on the server (`lib/telegram.js`).
- Stop loss is optional. Without one, the Trade screen warns that the whole margin can be lost.
- Trade: the browser builds one transaction with the fee transfer to your treasury, a collateral deposit and the Drift order. The user signs it. The server then re-reads the transaction from the chain, confirms the fee arrived, and only then records the trade and the referral earning.
- Referrals: single level. The referrer earns `referral_share` of each fee, accrued in `referral_earnings`.
- Withdrawals: the user requests the full balance (minimum $20, minus the $0.50 withdrawal fee). You approve it in Profile > Revenue (admins only). The payout wallet sends USDC and the real gas cost is stored, so "withdrawal fees (net of gas)" is exact.

## Test plan

1. Run everything on devnet (change the Drift `env`, the USDC mint and the RPC).
2. Trade: market and limit, long and short, with and without take profit.
3. Check the fee shows up in the treasury and the trade in Supabase.
4. Referral: second Telegram account joins via a link, trades, referrer balance rises by 20% of the fee.
5. Withdrawal: reach $20, request, approve, confirm the USDC arrives and the gas cost is recorded.
6. Only then a $10 trade on mainnet.

## Security design

- **The server builds every trade.** `/api/trade/prepare` fetches the oracle price, computes the position size and the fee, builds the transaction (fee transfer, deposit, Drift order) and stores what it contains. The browser can only sign it.
- **Recording checks the chain.** `/api/trade/record` reloads the landed transaction and requires that every instruction the server built is in it, in order, signed by the user's linked wallet. Wallet-added safety instructions are allowed. Size and fee come from the stored intent. Each intent works once and expires after 15 minutes.
- **Terms and regions.** Users must accept the terms before trading (`terms_accepted_at`). `middleware.js` blocks countries listed in `BLOCKED_COUNTRIES`.

## Known gaps (fix before launch)

1. **Not run yet.** I could not install packages here, so nothing has been compiled or tested. I checked the Drift method names against the official SDK docs (`getDepositInstruction`, `getInitializeUserInstructions`, `getPlacePerpOrderIx`), but parameter details, `convertToSpotPrecision`, trigger-order fields and the position fields (`quoteEntryAmount`) still need a devnet test.
2. **Server-side Drift calls** open a websocket per request. If that is slow or flaky on Vercel, cache market data or move trade building to a small long-running service.
3. **Take profit and stop loss** need an open position. If a limit entry has not filled, the user sets them later from Positions.
4. **Payout retries:** if a payout times out, the request goes back to pending. Check the explorer before approving again, or you could pay twice.
5. **Liquidation price on the Trade screen is a rough estimate,** not Drift's number.
6. **Telegram's in-app browser** has no wallet extensions. Test WalletConnect and mobile wallet deep links early.
7. **Legal:** have a lawyer review the terms and fee rules, and confirm the blocked-country list.
8. **Admin:** only Telegram ids in `ADMIN_TG_IDS` see the Revenue panel. Keep that list short.
