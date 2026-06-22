# opencode-ads — User Setup Guide

## Install

1. **Sign up** at `https://opencode-ads-production.up.railway.app` (or the plugin will prompt you)

2. **Get your token** — the plugin will guide you through signup/login

3. **Create auth file:**
   ```bash
   mkdir -p ~/.config/opencode-ads
   echo '{"token": "your-token-here"}' > ~/.config/opencode-ads/auth.json
   ```

4. **Add to your `opencode.json`:**
   ```json
   {
     "plugin": ["opencode-ads"]
   }
   ```

5. **Use OpenCode normally** — sponsor messages appear during AI thinking time

## How It Works

- Every time your AI "thinks", you see a sponsor message
- You earn ~$0.007 per impression (70% of advertiser CPM)
- At $10 CPM: 80 impressions/day = ~$0.56/day = ~$17/month
- Withdraw USDC to your Solana wallet anytime (min $2)

## Earnings Example

| CPM | Per Impression | Per 1000 | Per Day (80 ads) | Per Month |
|-----|----------------|----------|-------------------|-----------|
| $3 | $0.0021 | $2.10 | $0.17 | $5.00 |
| $5 | $0.0035 | $3.50 | $0.28 | $8.40 |
| $10 | $0.0070 | $7.00 | $0.56 | $16.80 |
| $15 | $0.0105 | $10.50 | $0.84 | $25.20 |

## Payout

1. Set your Solana wallet in your profile
2. Request payout (minimum $2 USDC)
3. USDC sent within 24 hours

## Privacy

- We never read your code, files, or prompts
- We only track: session ID, ad shown, duration
- Open source: github.com/Asphalt9bla/opencode-ads
