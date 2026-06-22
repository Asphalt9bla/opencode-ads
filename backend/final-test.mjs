import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env", "utf8").split("\n").reduce((a, l) => {
  const [k, ...r] = l.split("="); if (k) a[k.trim()] = r.join("=").trim(); return a;
}, {});

const BASE = "http://localhost:3001";
const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path, token) {
  const res = await fetch(BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

console.log("=== FINAL TEST ===\n");

// 1. Health
console.log("1. Health:", JSON.stringify(await get("/health", null)));

// 2. Debug formula
console.log("2. Debug:", JSON.stringify(await get("/api/debug", null)));

// 3. Login
const login = await post("/api/auth/login", { email: "test@opencode-ads.com" }, null);
const token = login.user?.token;
console.log("3. Login:", login.message, "| Token:", token?.substring(0, 8) + "...");

// 4. Get ad
const ad = await get("/api/ads/next", token);
console.log("4. Ad:", ad.sponsor, "-", ad.title, "(CPM:", ad.cpm, "cents = $" + (ad.cpm/100).toFixed(2) + ")");

// 5. Log impression
const imp = await post("/api/impressions", {
  adId: ad.id,
  sessionId: "final_test",
  durationMs: 5000,
  timestamp: Date.now(),
}, token);
console.log("5. Impression:", JSON.stringify(imp));

// 6. Check earnings
const earnings = await get("/api/earnings", token);
console.log("6. Earnings: $" + earnings.balance.pendingUsd + " USDC pending");

// 7. Check DB directly
const { data: imps } = await supa.from("impressions").select("*").eq("session_id", "final_test");
console.log("7. DB record:", imps?.length ? "earned_usdc=" + imps[0].earned_usdc + " cents" : "NOT FOUND");

console.log("\n=== DONE ===");
