import { getSettings } from '@/lib/settings';
export async function GET() {
  const s = await getSettings();
  return Response.json({
    feeRate: s.fee_rate, referralShare: s.referral_share, minOrderUsd: s.min_order_usd, maxLeverage: s.max_leverage,
    minWithdrawUsd: s.min_withdraw_usd, withdrawalFeeUsd: s.withdrawal_fee_usd,
    treasury: process.env.TREASURY_ADDRESS, usdcMint: process.env.USDC_MINT,
  });
}
