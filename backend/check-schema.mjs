import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8").split("\n").reduce((a, l) => {
  const [k, ...r] = l.split("="); if (k) a[k.trim()] = r.join("=").trim(); return a;
}, {});

const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check column type
const { data: colInfo } = await supa
  .from("impressions")
  .select("earned_usdc")
  .limit(1);
console.log("Sample row:", colInfo);

// Check existing values
const { data: imps } = await supa.from("impressions").select("earned_usdc, session_id").order("created_at", { ascending: false }).limit(5);
console.log("\nExisting impressions:");
for (const i of imps || []) {
  console.log(`  session=${i.session_id} earned_usdc=${i.earned_usdc} type=${typeof i.earned_usdc}`);
}

// Test: insert with value 1 directly
const { data: user } = await supa.from("users").select("id").limit(1).single();
if (user) {
  // Insert with earned_usdc = 1
  const { error: err1 } = await supa.from("impressions").insert({
    user_id: user.id,
    ad_id: "7ba56188-350e-4885-b01d-384e10c3da80",
    session_id: "test_one_cent",
    duration_ms: 5000,
    earned_usdc: 1,
    created_at: new Date().toISOString(),
  });
  console.log("\nInsert 1 cent:", err1 ? "ERROR: " + err1.message : "OK");

  // Check what was stored
  const { data: stored } = await supa.from("impressions").select("earned_usdc").eq("session_id", "test_one_cent").single();
  console.log("Stored value:", stored?.earned_usdc, "type:", typeof stored?.earned_usdc);

  // Now test the formula in JS
  const cpm = 500;
  const durationMs = 5000;
  const earned = Math.floor((cpm * 0.7 * durationMs) / 1000000);
  console.log("\nJS formula result:", earned, "type:", typeof earned);

  // Insert with the formula result
  const { error: err2 } = await supa.from("impressions").insert({
    user_id: user.id,
    ad_id: "7ba56188-350e-4885-b01d-384e10c3da80",
    session_id: "test_formula",
    duration_ms: 5000,
    earned_usdc: earned,
    created_at: new Date().toISOString(),
  });
  console.log("Insert formula result:", err2 ? "ERROR: " + err2.message : "OK");

  const { data: stored2 } = await supa.from("impressions").select("earned_usdc").eq("session_id", "test_formula").single();
  console.log("Stored value:", stored2?.earned_usdc, "type:", typeof stored2?.earned_usdc);
}
