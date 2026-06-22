import { Hono } from "hono"
import { cors } from "hono/cors"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

// ============================================================
// opencode-ads backend v0.2.0
// ============================================================

const app = new Hono()

// ---- Environment ----
const SUPABASE_URL = process.env.SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
const PORT = parseInt(process.env.PORT || "3001")

// ---- CORS ----
app.use("*", cors())

// ---- Supabase clients ----
// Admin client: bypasses RLS (for admin operations like balance updates)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
// Anon client: respects RLS (for user-facing operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---- Auth middleware ----
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  const token = authHeader.slice(7)

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, solana_wallet, total_earned_usdc, pending_usdc, token")
    .eq("token", token)
    .single()

  if (error || !data) {
    return c.json({ error: "Invalid token" }, 401)
  }

  c.set("user", data)
  c.set("token", token)
  await next()
}

// ---- Validation schemas ----
const impressionSchema = z.object({
  adId: z.string(),
  sessionId: z.string(),
  durationMs: z.number().min(3000),
  timestamp: z.number(),
})

const batchImpressionSchema = z.object({
  impressions: z.array(impressionSchema),
})

const signupSchema = z.object({
  email: z.string().email(),
  solanaWallet: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
})

const payoutSchema = z.object({
  amountUsdc: z.number().positive(),
  walletAddress: z.string().min(32),
})

// ---- Routes ----

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "opencode-ads",
    version: "0.2.0",
    supabase: SUPABASE_URL ? "configured" : "MISSING",
  })
})

// Auth: signup
app.post("/api/auth/signup", async (c) => {
  const body = await c.req.json()
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.issues }, 400)

  const { email, solanaWallet } = parsed.data
  const token = crypto.randomUUID()

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      solana_wallet: solanaWallet || null,
      token,
      total_earned_usdc: 0,
      pending_usdc: 0,
    })
    .select("id, email, token")
    .single()

  if (error) {
    if (error.code === "23505") {
      return c.json({ error: "Email already registered" }, 409)
    }
    console.error("Signup error:", error)
    return c.json({ error: "Server error", message: error.message }, 500)
  }

  return c.json({ message: "Account created", user: data }, 201)
})

// Auth: login
app.post("/api/auth/login", async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400)

  const { email } = parsed.data

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, token, solana_wallet")
    .eq("email", email)
    .single()

  if (error || !data) {
    return c.json({ error: "User not found. Sign up first." }, 404)
  }

  return c.json({ message: "Logged in", user: data })
})

// Get next ad (auth required)
app.get("/api/ads/next", authMiddleware, async (c) => {
  const { data: ads, error } = await supabaseAdmin
    .from("ads")
    .select("*")
    .eq("active", true)
    .limit(10)

  if (error || !ads || ads.length === 0) {
    return c.json({ error: "No ads available" }, 404)
  }

  const ad = ads[Math.floor(Math.random() * ads.length)]

  return c.json({
    id: ad.id,
    title: ad.title,
    description: ad.description,
    sponsor: ad.sponsor_name,
    url: ad.url,
    cpm: ad.cpm_usdc_cents,
  })
})

// Log single impression
app.post("/api/impressions", authMiddleware, async (c) => {
  const user = c.get("user")
  const body = await c.req.json()
  const parsed = impressionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid impression data" }, 400)

  const { adId, sessionId, durationMs, timestamp } = parsed.data

  // Get ad CPM
  const { data: ad } = await supabaseAdmin
    .from("ads")
    .select("cpm_usdc_cents")
    .eq("id", adId)
    .single()

  const cpm = ad?.cpm_usdc_cents || 10
  const earnedUsdc = Math.floor((cpm / 100000) * (durationMs / 1000))

  // Log impression
  const { error: impError } = await supabaseAdmin.from("impressions").insert({
    user_id: user.id,
    ad_id: adId,
    session_id: sessionId,
    duration_ms: durationMs,
    earned_usdc: earnedUsdc,
    created_at: new Date(timestamp).toISOString(),
  })

  if (impError) {
    console.error("Failed to log impression:", impError)
    return c.json({ error: "Failed to log impression" }, 500)
  }

  // Update balance using admin client (bypasses RLS)
  await supabaseAdmin.rpc("increment_pending_balance", {
    p_user_id: user.id,
    p_amount: earnedUsdc,
  })

  return c.json({
    success: true,
    earned: earnedUsdc,
    earnedUsd: (earnedUsdc / 100).toFixed(4),
  })
})

// Batch impressions
app.post("/api/impressions/batch", authMiddleware, async (c) => {
  const user = c.get("user")
  const body = await c.req.json()
  const parsed = batchImpressionSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid batch data" }, 400)

  let totalEarned = 0
  const rows = []

  for (const imp of parsed.data.impressions) {
    const { data: ad } = await supabaseAdmin
      .from("ads")
      .select("cpm_usdc_cents")
      .eq("id", imp.adId)
      .single()

    const cpm = ad?.cpm_usdc_cents || 10
    const earned = Math.floor((cpm / 100000) * (imp.durationMs / 1000))
    totalEarned += earned

    rows.push({
      user_id: user.id,
      ad_id: imp.adId,
      session_id: imp.sessionId,
      duration_ms: imp.durationMs,
      earned_usdc: earned,
      created_at: new Date(imp.timestamp).toISOString(),
    })
  }

  await supabaseAdmin.from("impressions").insert(rows)
  await supabaseAdmin.rpc("increment_pending_balance", {
    p_user_id: user.id,
    p_amount: totalEarned,
  })

  return c.json({ success: true, count: rows.length, totalEarned })
})

// Get earnings
app.get("/api/earnings", authMiddleware, async (c) => {
  const user = c.get("user")

  const { data } = await supabaseAdmin
    .from("users")
    .select("pending_usdc, total_earned_usdc, solana_wallet")
    .eq("id", user.id)
    .single()

  const { count: totalImpressions } = await supabaseAdmin
    .from("impressions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: todayImpressions } = await supabaseAdmin
    .from("impressions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", today.toISOString())

  return c.json({
    balance: {
      pendingUsdc: data?.pending_usdc || 0,
      totalEarnedUsdc: data?.total_earned_usdc || 0,
      pendingUsd: ((data?.pending_usdc || 0) / 100).toFixed(4),
      totalEarnedUsd: ((data?.total_earned_usdc || 0) / 100).toFixed(4),
    },
    stats: {
      totalImpressions: totalImpressions || 0,
      todayImpressions: todayImpressions || 0,
    },
    wallet: data?.solana_wallet,
  })
})

// Request payout
app.post("/api/payouts/request", authMiddleware, async (c) => {
  const user = c.get("user")
  const body = await c.req.json()
  const parsed = payoutSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "Invalid payout request" }, 400)

  const { amountUsdc, walletAddress } = parsed.data

  if (amountUsdc < 200) {
    return c.json({ error: "Minimum payout is $2 USDC (200 cents)" }, 400)
  }

  if ((user.pending_usdc || 0) < amountUsdc) {
    return c.json({ error: "Insufficient balance" }, 400)
  }

  const { data: payout, error } = await supabaseAdmin
    .from("payouts")
    .insert({
      user_id: user.id,
      amount_usdc: amountUsdc,
      wallet_address: walletAddress,
      status: "pending",
    })
    .select()
    .single()

  if (error) return c.json({ error: "Failed to create payout" }, 500)

  await supabaseAdmin.rpc("decrement_pending_balance", {
    p_user_id: user.id,
    p_amount: amountUsdc,
  })

  return c.json({
    success: true,
    payout,
    message: "Payout requested. USDC will be sent within 24 hours.",
  })
})

// Payout history
app.get("/api/payouts/history", authMiddleware, async (c) => {
  const user = c.get("user")

  const { data, error } = await supabaseAdmin
    .from("payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) return c.json({ error: "Failed to fetch payouts" }, 500)
  return c.json({ payouts: data })
})

// Leaderboard (public)
app.get("/api/leaderboard", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, total_earned_usdc")
    .order("total_earned_usdc", { ascending: false })
    .limit(20)

  if (error) return c.json({ error: "Failed to fetch leaderboard" }, 500)

  return c.json({
    leaderboard: data.map((u, i) => ({
      rank: i + 1,
      email: u.email.replace(/(.{3}).+(@.+)/, "$1***$2"),
      totalEarnedUsd: (u.total_earned_usdc / 100).toFixed(2),
    })),
  })
})

// ---- Start ----
console.log(`opencode-ads backend v0.2.0 running on port ${PORT}`)
console.log(`Supabase: ${SUPABASE_URL}`)
export default { port: PORT, fetch: app.fetch }
