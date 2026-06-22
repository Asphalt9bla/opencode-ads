import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(join(__dirname, "../.env"), "utf8");
  for (const line of envFile.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const app = new Hono();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PORT = parseInt(process.env.PORT || "3001");

app.use("*", cors());

// Admin client bypasses RLS — used for all backend operations
const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Auth middleware — validates token, attaches user to context
async function auth(c, next) {
  const h = c.req.header("Authorization");
  if (!h?.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = h.slice(7);
  const { data, error } = await supa.from("users").select("*").eq("token", token).single();
  if (error || !data) return c.json({ error: "Invalid token" }, 401);
  c.user = data;
  await next();
}

// ===== ROUTES =====

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "opencode-ads", version: "0.2.0" });
});

// Debug: test the earnings formula
app.get("/api/debug", (c) => {
  const cpm = 1000; // $10 CPM in cents
  const earned = Math.floor((cpm * 0.7) / 100); // tenths of a cent
  return c.json({
    cpm,
    cpmUsd: (cpm / 100).toFixed(2),
    earnedTenths: earned,
    earnedUsd: (earned / 1000).toFixed(4),
    per1000ImpressionsUsd: ((earned / 1000) * 1000).toFixed(2),
    formula: `floor((${cpm} * 0.7) / 100) = ${earned} tenths-of-a-cent`,
    note: "Each impression earns 70% of CPM / 1000. $10 CPM = $0.007 per impression",
  });
});

// Signup
app.post("/api/auth/signup", async (c) => {
  const { email, solanaWallet } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);
  const token = crypto.randomUUID();
  const { data, error } = await supa.from("users").insert({ email, solana_wallet: solanaWallet || null, token }).select("id,email,token").single();
  if (error) {
    if (error.code === "23505") return c.json({ error: "Email already registered" }, 409);
    return c.json({ error: error.message }, 500);
  }
  return c.json({ message: "Account created", user: data }, 201);
});

// Login
app.post("/api/auth/login", async (c) => {
  const { email } = await c.req.json();
  const { data, error } = await supa.from("users").select("id,email,token,solana_wallet").eq("email", email).single();
  if (error || !data) return c.json({ error: "User not found" }, 404);
  return c.json({ message: "Logged in", user: data });
});

// Get next ad
app.get("/api/ads/next", auth, async (c) => {
  const { data: ads } = await supa.from("ads").select("*").eq("active", true).limit(10);
  if (!ads?.length) return c.json({ error: "No ads" }, 404);
  const ad = ads[Math.floor(Math.random() * ads.length)];
  return c.json({ id: ad.id, title: ad.title, description: ad.description, sponsor: ad.sponsor_name, url: ad.url, cpm: ad.cpm_usdc_cents });
});

// Log impression
app.post("/api/impressions", auth, async (c) => {
  const body = await c.req.json();
  const { adId, sessionId, durationMs, timestamp } = body;

  if (!adId || !sessionId || !durationMs || durationMs < 3000) {
    return c.json({ error: "Invalid data", got: { adId, sessionId, durationMs } }, 400);
  }

  // Get ad CPM
  const { data: ad } = await supa.from("ads").select("cpm_usdc_cents").eq("id", adId).single();
  const cpm = ad?.cpm_usdc_cents || 500;

  // Calculate earnings in "tenths of a cent" (1 cent = 10 units)
  // Formula: floor((cpm_cents * 0.7) / 100)
  // Example: $10 CPM (1000 cents) → (1000 * 0.7) / 100 = 7 tenths-of-a-cent = $0.007
  // At payout: earned / 10 = cents, cents / 100 = dollars
  const earned = Math.floor((cpm * 0.7) / 100);

  console.log(`IMPRESSION: cpm=${cpm} (${ad?.sponsor_name || 'unknown'}) earned=${earned} tenths-of-a-cent ($${(earned/1000).toFixed(4)} USDC)`);

  // Insert impression
  const { error: impError } = await supa.from("impressions").insert({
    user_id: c.user.id,
    ad_id: adId,
    session_id: sessionId,
    duration_ms: durationMs,
    earned_usdc: earned,
    created_at: new Date(timestamp || Date.now()).toISOString(),
  });

  if (impError) {
    console.error("Insert error:", impError);
    return c.json({ error: "Failed to log impression", details: impError.message }, 500);
  }

  // Update user balance
  await supa.rpc("increment_pending_balance", {
    p_user_id: c.user.id,
    p_amount: earned,
  });

  return c.json({
    success: true,
    earned,
    earnedUsd: (earned / 1000).toFixed(4),
    message: `Earned $${(earned / 1000).toFixed(4)} USDC`,
  });
});

// Get earnings
app.get("/api/earnings", auth, async (c) => {
  const { data } = await supa.from("users").select("pending_usdc,total_earned_usdc,solana_wallet").eq("id", c.user.id).single();
  const { count: total } = await supa.from("impressions").select("*", { count: "exact", head: true }).eq("user_id", c.user.id);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: todayCount } = await supa.from("impressions").select("*", { count: "exact", head: true }).eq("user_id", c.user.id).gte("created_at", today.toISOString());

  return c.json({
    balance: {
      pendingUsdc: data?.pending_usdc || 0,
      totalEarnedUsdc: data?.total_earned_usdc || 0,
      pendingUsd: ((data?.pending_usdc || 0) / 1000).toFixed(4),
      totalEarnedUsd: ((data?.total_earned_usdc || 0) / 1000).toFixed(4),
    },
    stats: { totalImpressions: total || 0, todayImpressions: todayCount || 0 },
    wallet: data?.solana_wallet,
  });
});

// Request payout
app.post("/api/payouts/request", auth, async (c) => {
  const { amountUsdc, walletAddress } = await c.req.json();
  if (!amountUsdc || amountUsdc < 200) return c.json({ error: "Min $2 USDC" }, 400);
  if (!walletAddress || walletAddress.length < 32) return c.json({ error: "Invalid wallet" }, 400);
  if ((c.user.pending_usdc || 0) < amountUsdc) return c.json({ error: "Insufficient balance" }, 400);
  const { data, error } = await supa.from("payouts").insert({ user_id: c.user.id, amount_usdc: amountUsdc, wallet_address: walletAddress, status: "pending" }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  await supa.rpc("decrement_pending_balance", { p_user_id: c.user.id, p_amount: amountUsdc });
  return c.json({ success: true, payout: data, message: "Payout requested" });
});

// Payout history
app.get("/api/payouts/history", auth, async (c) => {
  const { data } = await supa.from("payouts").select("*").eq("user_id", c.user.id).order("created_at", { ascending: false }).limit(20);
  return c.json({ payouts: data });
});

// Leaderboard
app.get("/api/leaderboard", async (c) => {
  const { data } = await supa.from("users").select("email,total_earned_usdc").order("total_earned_usdc", { ascending: false }).limit(20);
  return c.json({ leaderboard: data.map((u, i) => ({ rank: i + 1, email: u.email.replace(/(.{3}).+(@.+)/, "$1***$2"), totalEarnedUsd: (u.total_earned_usdc / 100).toFixed(2) })) });
});

// ===== START =====
console.log(`opencode-ads v0.2.0 on :${PORT}`);
console.log(`Formula: earned = floor((cpm * 0.7) / 100) tenths-of-a-cent`);
console.log(`Example: $10 CPM → floor((1000 * 0.7) / 100) = 7 tenths = $0.007 per impression`);

const { serve } = await import("@hono/node-server");
serve({ fetch: app.fetch, port: PORT });
