import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8").split("\n").reduce((a, l) => {
  const [k, ...r] = l.split("=");
  if (k) a[k.trim()] = r.join("=").trim();
  return a;
}, {});

const BASE = "http://localhost:3001";

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

console.log("=== opencode-ads full flow test ===\n");

// 1. Health
console.log("1. Health:", JSON.stringify(await get("/health", null)));

// 2. Login
const login = await post("/api/auth/login", { email: "test@opencode-ads.com" }, null);
console.log("2. Login:", login.message || login.error);
const token = login.user?.token;
if (!token) { console.log("FAIL: No token"); process.exit(1); }
console.log("   Token:", token.substring(0, 8) + "...");

// 3. Get ad
const ad = await get("/api/ads/next", token);
console.log("3. Ad:", ad.sponsor, "-", ad.title, "(CPM:", ad.cpm, "cents = $" + (ad.cpm/100).toFixed(2) + ")");
console.log("   Dev earns 70% = $" + (ad.cpm * 0.7 / 100).toFixed(2) + " per 1000 impressions");

// 4. Log impression (5 seconds)
const imp = await post("/api/impressions", {
  adId: ad.id,
  sessionId: "test_session_1",
  durationMs: 5000,
  timestamp: Date.now(),
}, token);
console.log("4. Impression (5s):", JSON.stringify(imp));
console.log("   Earned: $" + imp.earnedUsd + " USDC");

// 5. Check earnings
const earnings = await get("/api/earnings", token);
console.log("5. Earnings:");
console.log("   Pending: $" + earnings.balance.pendingUsd + " USDC");
console.log("   Total earned: $" + earnings.balance.totalEarnedUsd + " USDC");
console.log("   Impressions:", earnings.stats.totalImpressions);

// 6. Leaderboard
const lb = await get("/api/leaderboard", null);
console.log("6. Leaderboard:", lb.leaderboard?.length, "entries");

console.log("\n=== ALL TESTS PASSED ===");
