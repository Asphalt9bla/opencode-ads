# opencode-ads

**Get paid in USDC while your AI thinks.**

An OpenCode plugin that shows sponsor messages during AI wait states and pays you in USDC on Solana. No subscriptions. No middlemen. No banking restrictions. Works globally.

## Why?

Most devs in the world can't afford $20/month AI subscriptions. Kickbacks.ai tried to solve this but:
- ❌ Stripe-only payouts (blocks India, Morocco, Vietnam, Nigeria, etc.)
- ❌ Unsigned auto-updater (security risk — "RCE by design")
- ❌ Closed source (nobody can audit it)
- ❌ Only supports Claude Code

**opencode-ads** fixes all of this:
- ✅ USDC/Solana payouts — works in every country
- ✅ Open source (Apache-2.0) — fully auditable
- ✅ VS Code Marketplace updates only — no custom auto-updater
- ✅ Supports OpenCode, Kilo Code, Cursor, and more
- ✅ 70% rev share to developers (Kickbacks gives 50%)

## How It Works

1. Install the OpenCode plugin
2. Use OpenCode normally
3. While the AI is "thinking", a sponsor message appears
4. You earn ~$0.01-$0.015 per impression
5. Withdraw USDC to your Solana wallet anytime

## Architecture

```
┌───────────────────────┐     ┌────────────────────┐     ┌────────────────┐
│   OpenCode Plugin     │────▶│   Backend API      │────▶│   Supabase DB  │
│   (TypeScript)        │     │   (Bun + Hono)     │     │   (PostgreSQL) │
│                       │     │                    │     │                │
│ - session.status      │     │ - /api/ads/next    │     │ - users        │
│ - tui.toast.show      │     │ - /api/impressions │     │ - ads          │
│ - @opencode-ai/plugin │     │ - /api/payouts     │     │ - impressions  │
└───────────────────────┘     └────────┬───────────┘     │ - payouts      │
                                       │                 └────────────────┘
                                       ▼
                            ┌──────────────────┐
                            │  Solana/USDC     │
                            │  Payouts         │
                            │                  │
                            │ - Near-zero fees │
                            │ - Global         │
                            │ - Permissionless │
                            └──────────────────┘
```

## Project Structure

```
opencode-ads/
├── plugin/              # OpenCode plugin (TypeScript)
│   ├── src/
│   │   └── index.ts     # Main plugin entry
│   ├── package.json
│   └── tsconfig.json
├── backend/             # API server (Bun + Hono)
│   ├── src/
│   │   ├── index.ts     # API routes
│   │   └── payouts.ts   # Solana/USDC payouts
│   ├── schema.sql       # Database schema
│   └── package.json
├── web/                 # Landing page + dashboard (Next.js)
│   ├── src/app/
│   │   └── page.tsx     # Landing page
│   └── package.json
├── SECURITY.md
├── PRIVACY.md
└── README.md
```

## Setup

### 1. Database (Supabase)

1. Create a free Supabase project
2. Run `backend/schema.sql` in the SQL editor
3. Copy your URL and anon key

### 2. Backend

```bash
cd backend
bun install

# Create .env
echo "SUPABASE_URL=your-url" > .env
echo "SUPABASE_ANON_KEY=your-key" >> .env
echo "SOLANA_RPC_URL=https://api.mainnet-beta.solana.com" >> .env
echo "SOLANA_PLATFORM_SECRET_KEY=your-base58-secret" >> .env
echo "PORT=3001" >> .env

bun run dev
```

### 3. Plugin (for users)

Users add to their `opencode.json`:
```json
{
  "plugin": ["opencode-ads"]
}
```

And create `~/.config/opencode-ads/auth.json`:
```json
{
  "token": "their-token-from-signup"
}
```

### 4. Web Dashboard

```bash
cd web
bun install

# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=your-url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key" >> .env.local

bun run dev
```

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login, get token |
| GET | `/api/ads/next` | Yes | Get next ad to show |
| POST | `/api/impressions` | Yes | Log single impression |
| POST | `/api/impressions/batch` | Yes | Log multiple impressions |
| GET | `/api/earnings` | Yes | Get balance + stats |
| POST | `/api/payouts/request` | Yes | Request USDC payout |
| GET | `/api/payouts/history` | Yes | Payout history |
| GET | `/api/leaderboard` | No | Top earners |
| GET | `/health` | No | Health check |

## Earnings Model

- **CPM:** $8-$15 per 1000 impressions (set per advertiser)
- **Developer share:** 70% of ad revenue
- **Minimum payout:** $2 USDC
- **Viewability threshold:** 3 seconds minimum per impression
- **Payout method:** USDC on Solana (6 decimals, near-zero fees)

### Example Earnings

At $10 CPM, 4 hours/day, ~20 prompts/hour:
- ~80 impressions/day
- ~$0.56/day (70% of $0.80)
- ~$16.80/month

Not a wage replacement — but it covers your AI subscription.

## Security & Privacy

- 🔓 **Open source** — client code is fully auditable
- 🔒 **No code access** — plugin never reads your files, prompts, or env vars
- 🔑 **Token auth** — stored in OS keychain, never transmitted in URLs
- 📊 **Transparent tracking** — all impression data is visible to the user
- 🚫 **No injection** — uses official OpenCode plugin API only

See [SECURITY.md](./SECURITY.md) and [PRIVACY.md](./PRIVACY.md) for details.

## Roadmap

- [x] Plugin architecture
- [x] Backend API
- [x] Database schema
- [x] USDC payout integration
- [ ] Web dashboard (login, earnings, payout request)
- [ ] VS Code extension version
- [ ] Kilo Code adapter
- [ ] Advertiser portal
- [ ] Fraud detection (server-side impression verification)
- [ ] Performance-based ads (CPA/CPC)

## License

Apache-2.0

## Credits

Built by a dev who eats bread & tea for breakfast. For devs who do the same. 🍞☕
