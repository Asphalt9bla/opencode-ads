import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env", "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check tables exist
const tables = ["users", "ads", "impressions", "payouts"];
for (const t of tables) {
  const { data, error } = await supa.from(t).select("*").limit(1);
  if (error) {
    console.log(`❌ ${t}: ${error.message}`);
  } else {
    console.log(`✅ ${t}: OK (${data.length} rows)`);
  }
}

// Check ads
const { data: ads } = await supa.from("ads").select("*");
console.log(`\n📢 Ads: ${ads?.length || 0}`);
for (const ad of ads || []) {
  console.log(`  - ${ad.sponsor_name}: ${ad.title} (CPM: ${ad.cpm_usdc_cents} cents)`);
}

// Check users
const { data: users } = await supa.from("users").select("id, email, token, pending_usdc, total_earned_usdc");
console.log(`\n👤 Users: ${users?.length || 0}`);
for (const u of users || []) {
  console.log(`  - ${u.email}: token=${u.token}, pending=${u.pending_usdc}, total=${u.total_earned_usdc}`);
}

// Check impressions
const { data: imps } = await supa.from("impressions").select("*");
console.log(`\n👁️ Impressions: ${imps?.length || 0}`);
for (const i of imps || []) {
  console.log(`  - ad=${i.ad_id}, duration=${i.duration_ms}ms, earned=${i.earned_usdc}`);
}
