import type { Plugin } from "@opencode-ai/plugin"

// ============================================================
// opencode-ads — Get paid while your AI thinks
// ============================================================

const BACKEND_URL = "https://opencode-ads-production.up.railway.app"

interface Ad {
  id: string
  title: string
  description: string
  sponsor: string
  url: string
  cpm: number // advertiser CPM in USDC cents
}

export const OpencodeAds: Plugin = async ({ client }) => {
  let currentSessionId: string | null = null
  let thinkingStartTime: number | null = null
  let currentAd: Ad | null = null
  let userToken: string | null = null

  // Read token from config file
  async function getToken(): Promise<string | null> {
    if (userToken) return userToken
    try {
      const home = process.env.HOME || process.env.USERPROFILE || ""
      const configPath = `${home}/.config/opencode-ads/auth.json`
      const file = await Bun.file(configPath).json()
      userToken = file.token
      return userToken
    } catch {
      return null
    }
  }

  // Fetch next ad from backend
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

  // Send impression to backend
  async function sendImpression(adId: string, sessionId: string, durationMs: number): Promise<void> {
    const token = await getToken()
    try {
      await fetch(`${BACKEND_URL}/api/impressions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          adId,
          sessionId,
          durationMs,
          timestamp: Date.now(),
        }),
      })
    } catch {
      // Silently fail — don't disrupt the user's workflow
    }
  }

  return {
    event: async ({ event }) => {
      // Track session
      if (event.type === "session.created" || event.type === "session.updated") {
        currentSessionId = event.properties?.sessionID || null
      }

      if (event.type === "session.status") {
        const status = event.properties?.status

        // AI started thinking — fetch and show ad
        if (status === "thinking" || status === "running") {
          thinkingStartTime = Date.now()
          currentAd = await fetchAd()

          if (currentAd) {
            await client.tui.toast.show({
              title: `💰 ${currentAd.sponsor}`,
              message: `${currentAd.title} — ${currentAd.description}`,
              variant: "info",
            })
          }
        }

        // AI finished thinking — log impression
        if (status === "idle" && thinkingStartTime && currentAd) {
          const duration = Date.now() - thinkingStartTime

          if (duration >= 3000) {
            await sendImpression(
              currentAd.id,
              currentSessionId || "unknown",
              duration
            )

            // Show earnings (70% of CPM / 1000 per impression)
            const earnedUsd = (currentAd.cpm * 0.7) / 100000
            await client.tui.toast.show({
              title: "💰 Earned",
              message: `+$${earnedUsd.toFixed(4)} USDC`,
              variant: "success",
            })
          }

          thinkingStartTime = null
          currentAd = null
        }

        if (status === "error") {
          thinkingStartTime = null
          currentAd = null
        }
      }
    },
  }
}
