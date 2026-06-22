import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8").split("\n").reduce((a, l) => {
  const [k, ...r] = l.split("="); if (k) a[k.trim()] = r.join("=").trim(); return a;
}, {});

const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check impressions
const { data: imps } = await supa.from("impressions").select("*").order("created_at", { ascending: false }).limit(5);
console.log("Recent impressions:");
for (const i of imps || []) {
  console.log(`  ad=${i.ad_id?.substring(0,8)}... duration=${i.duration_ms}ms earned=${i.earned_usdc} cents ($${(i.earned_usdc/100).toFixed(4)})`);
}

// Check user balance
const { data: users } = await supa.from("users").select("email,pending_usdc,total_earned_usdc");
console.log("\nUser balances:");
for (const u of users || []) {
  console.log(`  ${u.email}: pending=${u.pending_usdc} total=${u.total_earned_usdc}`);
}

// Math: at $5 CPM (500 cents), 70% = 350 cents per 1000 impressions
// Per 5s impression: (500 * 0.7 * 5000) / 1000000 = 1.75 cents
console.log("\nMath check:");
console.log("  CPM: 500 cents ($5.00)");
console.log("  Dev share: 70%");
console.log("  Per 5s impression: (500 * 0.7 * 5000) / 1000000 = " + ((500 * 0.7 * 5000) / 1000000) + " cents");
console.log("  Per 1000 impressions (200 x 5s): " + (1.75 * 200) + " cents = $" + (1.75 * 200 / 100).toFixed(2));
