import { db } from './supabase';
const DEFAULTS = { fee_rate: 0.005, referral_share: 0.2, min_order_usd: 10, max_leverage: 10, min_withdraw_usd: 20, withdrawal_fee_usd: 0.5 };
// All rates live in the `settings` table, so you change them without redeploying.
export async function getSettings() {
  const { data } = await db.from('settings').select('key,value');
  const s = { ...DEFAULTS };
  for (const r of data || []) s[r.key] = Number(r.value);
  return s;
}
