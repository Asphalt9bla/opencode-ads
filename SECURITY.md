# Security Manifest

## What This Plugin Does NOT Do

- ❌ Read your source code
- ❌ Read your files
- ❌ Read your environment variables (.env, .ssh, .aws, etc.)
- ❌ Steal API keys or tokens
- ❌ Inject code into other extensions
- ❌ Modify any files on your system
- ❌ Install unsigned updates
- ❌ Phone home with personal data

## What This Plugin DOES Do

- ✅ Hooks into OpenCode's official plugin API (`session.status` events)
- ✅ Shows sponsor messages via OpenCode's official toast API (`tui.toast.show`)
- ✅ Tracks impression duration (how long the "thinking" state lasted)
- ✅ Sends anonymized impression data to our backend
- ✅ Stores your auth token in `~/.config/opencode-ads/auth.json`

## Data We Collect

|        Data         |          Why           |     Where stored      |
|---------------------|------------------------|-----------------------|
| Email               | Account identification | Supabase (encrypted)  |
| Session ID          | Impression tracking    | Supabase (anonymized) |
| Impression duration | Earnings calculation   | Supabase              |
| Ad ID               | Revenue attribution    | Supabase              |
| Solana wallet       | Payout destination     | Supabase              |

## Data We NEVER Collect

- Source code
- File contents
- Environment variables
- API keys
- Prompts or AI responses
- Keystrokes
- Terminal history

## Update Policy

- All updates go through the official OpenCode plugin system
- No custom auto-updater
- No unsigned code execution
- Open source — anyone can audit every release

## Reporting Security Issues

Open an issue on GitHub or email security@opencode-ads.com
