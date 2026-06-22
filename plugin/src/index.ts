import type { Plugin } from "@opencode-ai/plugin"

// ============================================================
// opencode-ads — Get paid while your AI thinks
// ============================================================
// This plugin hooks into OpenCode session events to detect
// "thinking" states and display sponsor messages to the user.
// Users earn USDC for each verified impression.
// ============================================================

const BACKEND_URL = "https://opencode-ads-api.onrender.com"
// For local dev: const BACKEND_URL = "http://localhost:3001"

interface Ad {
  id: string
  title: string
  description: string
  sponsor: string
  url: string
  cpm: number // earnings per 1000 impressions in USDC cents
}

interface Impression {
  adId: string
  sessionId: string
  durationMs: number
  timestamp: number
}

export const OpencodeAds: Plugin = async ({ client, project, directory }) => {
  // Track current session state
  let currentSessionId: string | null = null
  let thinkingStartTime: number | null = null
  let currentAd: Ad | null = null
  let impressions: Impression[] = []
  let userToken: string | null = null

  // ---- Helpers ----

  async function getToken(): Promise<string | null> {
    if (userToken) return userToken
    try {
      // Try to read token from config
      const configPath = `${process.env.HOME || process.env.USERPROFILE}/.config/opencode-ads/auth.json`
      const file = Bun.file(configPath)
      const data = await file.json()
      userToken = data.token
      return userToken
    } catch {
      return null
    }
  }

  async function fetchAd(): Promise<Ad | null> {
    const token = await getToken()
    try {
      const res = await fetch(`${BACKEND_URL}/api/ads/next`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  async function sendImpression(impression: Impression): Promise<void> {
    const token = await getToken()
    try {
      await fetch(`${BACKEND_URL}/api/impressions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(impression),
      })
    } catch {
      // Silently fail — don't disrupt the user's workflow
    }
  }

  async function sendBatchImpressions(batch: Impression[]): Promise<void> {
    const token = await getToken()
    try {
      await fetch(`${BACKEND_URL}/api/impressions/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ impressions: batch }),
      })
    } catch {
      // Silently fail
    }
  }

  function formatAdMessage(ad: Ad): string {
    return `💰 ${ad.sponsor}: ${ad.title} — ${ad.description}`
  }

  // ---- Event Handlers ----

  return {
    // Hook into session status changes
    event: async ({ event }) => {
      // Session started / updated
      if (event.type === "session.created" || event.type === "session.updated") {
        currentSessionId = event.properties?.sessionID || null
      }

      // Session is thinking — AI is processing
      if (event.type === "session.status") {
        const status = event.properties?.status

        if (status === "thinking" || status === "running") {
          // AI started thinking — fetch and show an ad
          thinkingStartTime = Date.now()
          currentAd = await fetchAd()

          if (currentAd) {
            // Show sponsor message as a toast notification
            await client.tui.toast.show({
              title: `💰 ${currentAd.sponsor}`,
              message: `${currentAd.title} — ${currentAd.description}`,
              variant: "info",
            })

            // Also try to append to the prompt area
            try {
              await client.tui.prompt.append({
                text: `\n\x1b[90m${formatAdMessage(currentAd)}\x1b[0m\n`,
              })
            } catch {
              // TUI might not support this — toast is enough
            }
          }
        }

        // Session idle — AI finished thinking
        if (status === "idle" && thinkingStartTime && currentAd) {
          const duration = Date.now() - thinkingStartTime

          // Only count impressions longer than 3 seconds (viewability threshold)
          if (duration >= 3000) {
            const impression: Impression = {
              adId: currentAd.id,
              sessionId: currentSessionId || "unknown",
              durationMs: duration,
              timestamp: Date.now(),
            }
            impressions.push(impression)

            // Send immediately for now (batch later for optimization)
            await sendImpression(impression)

            // Show earnings toast
            const earned = (currentAd.cpm / 1000) * (duration / 1000) / 100
            await client.tui.toast.show({
              title: "💰 Earned",
              message: `+$${earned.toFixed(4)} USDC this session`,
              variant: "success",
            })
          }

          thinkingStartTime = null
          currentAd = null
        }

        // Session error — reset state
        if (status === "error") {
          thinkingStartTime = null
          currentAd = null
        }
      }

      // Session deleted — flush remaining impressions
      if (event.type === "session.deleted") {
        if (impressions.length > 0) {
          await sendBatchImpressions(impressions)
          impressions = []
        }
      }
    },

    // Also hook into message streaming for more granular tracking
    "message.part.updated": async (input, output) => {
      // When a new message part is being streamed, the AI is actively responding
      // This is a good time to show a sponsor if we're in a thinking state
      if (thinkingStartTime && currentAd) {
        // AI is streaming — the thinking state is ending
        // The impression will be finalized in session.status idle event
      }
    },

    // Shell env — inject nothing, we're clean
    "shell.env": async (input, output) => {
      // No env injection — we don't touch user's environment
    },
  }
}
