# Privacy Manifest

## TL;DR

We don't read your code. We don't steal your keys. We only count how long your AI thinks.

## What We Track

1. **Impressions** — When you see a sponsor message and for how long
2. **Earnings** — How much USDC you've earned
3. **Account** — Your email and Solana wallet address

## What We Don't Track

- Your code, files, or project contents
- Your prompts or AI responses
- Your environment variables
- Your API keys or credentials
- Your terminal history
- Your keystrokes

## How It Works

The plugin only hooks into `session.status` events from OpenCode. This tells us:
- When the AI starts thinking
- When the AI finishes thinking
- How long the thinking state lasted

That's it. We never access your files, your code, or your prompts.

## Third-Party Services

- **Supabase** — Database (PostgreSQL, US-East region)
- **Solana** — USDC payouts (public blockchain, no personal data stored)
- **Railway/Render** — API hosting

## Your Rights

- Delete your account anytime (all data removed)
- Export your data anytime
- Opt out anytime (just remove the plugin)

## Contact

privacy@opencode-ads.com
