import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface EarningsData {
  balance: {
    pendingUsdc: number
    totalEarnedUsdc: number
    pendingUsd: string
    totalEarnedUsd: string
  }
  stats: {
    totalImpressions: number
    todayImpressions: number
  }
  wallet: string | null
}

export default async function Home() {
  // Fetch leaderboard (public)
  const { data: leaderboard } = await supabase
    .from("users")
    .select("id, email, total_earned_usdc")
    .order("total_earned_usdc", { ascending: false })
    .limit(10)

  const maskedLeaderboard = leaderboard?.map((u, i) => ({
    rank: i + 1,
    email: u.email.replace(/(.{3}).+(@.+)/, "$1***$2"),
    totalEarnedUsd: (u.total_earned_usdc / 100).toFixed(2),
  })) || []

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: 40, borderBottom: "1px solid #eee", paddingBottom: 20 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>💰 opencode-ads</h1>
        <p style={{ color: "#666", fontSize: 18 }}>
          Get paid in USDC while your AI thinks. No subscriptions. No middlemen.
        </p>
      </header>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>1️⃣</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Install the plugin</h3>
            <p style={{ color: "#666", fontSize: 14 }}>
              Add opencode-ads to your OpenCode config. One line.
            </p>
          </div>
          <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>2️⃣</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Code normally</h3>
            <p style={{ color: "#666", fontSize: 14 }}>
              Use OpenCode as usual. Sponsor messages appear during wait states.
            </p>
          </div>
          <div style={{ padding: 20, background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>3️⃣</div>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>Earn USDC</h3>
            <p style={{ color: "#666", fontSize: 14 }}>
              Get paid per impression. Withdraw to your Solana wallet anytime.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, marginBottom: 16 }}>Features</h2>
        <ul style={{ lineHeight: 2 }}>
          <li>🔓 <strong>Open source</strong> — fully auditable, no hidden tracking</li>
          <li>💸 <strong>USDC payouts</strong> — direct to your Solana wallet, no banking needed</li>
          <li>🌍 <strong>Global</strong> — works in every country, no restrictions</li>
          <li>⚡ <strong>Zero friction</strong> — no ads while you code, only during AI wait time</li>
          <li>🔒 <strong>Privacy-first</strong> — we don&apos;t read your code, files, or prompts</li>
          <li>📊 <strong>Transparent</strong> — see exactly what you earn, per impression</li>
        </ul>
      </section>

      {maskedLeaderboard.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16 }}>🏆 Leaderboard</h2>
          <table style={{ width: 100%, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Rank</th>
                <th style={{ textAlign: "left", padding: 8 }}>User</th>
                <th style={{ textAlign: "right", padding: 8 }}>Earned</th>
              </tr>
            </thead>
            <tbody>
              {maskedLeaderboard.map((entry) => (
                <tr key={entry.rank} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{entry.rank}</td>
                  <td style={{ padding: 8 }}>{entry.email}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>${entry.totalEarnedUsd} USDC</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={{ marginBottom: 40, padding: 24, background: "#111", color: "#fff", borderRadius: 12 }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>Get Started</h2>
        <pre style={{ background: "#222", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 14 }}>
{`# 1. Sign up at opencode-ads.com
# 2. Get your API token
# 3. Add to your opencode.json:

{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-ads"]
}

# 4. Create ~/.config/opencode-ads/auth.json:
{
  "token": "your-token-here"
}

# 5. Use OpenCode normally. Earn USDC.`;
        }</pre>
      </section>

      <footer style={{ borderTop: "1px solid #eee", paddingTop: 20, color: "#999", fontSize: 14 }}>
        <p>Built by a bread & tea dev, for bread & tea devs. 🍞☕</p>
        <p>
          <a href="https://github.com/kingus/opencode-ads" style={{ color: "#666" }}>
            GitHub
          </a>
          {" · "}
          <a href="/privacy" style={{ color: "#666" }}>Privacy</a>
          {" · "}
          <a href="/terms" style={{ color: "#666" }}>Terms</a>
        </p>
      </footer>
    </main>
  )
}
