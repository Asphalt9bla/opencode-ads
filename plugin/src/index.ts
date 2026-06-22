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
  cpm: number
}

export const OpencodeAds: Plugin = async ({ client }) => {
  let currentSessionId: string | null = null
  let thinkingStartTime: number | null = null
  let currentAd: Ad | null = null

  const getAuthPath = () => {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return home + "/.config/opencode-ads/auth.json"
  }

  async function getToken(): Promise<string | null> {
    try {
      const file = Bun.file(getAuthPath())
      const data = await file.json()
      return data.token || null
    } catch {
      return null
    }
  }

  async function fetchAd(): Promise<Ad | null> {
    const token = await getToken()
    if (!token) return null
    try {
      const res = await fetch(`${BACKEND_URL}/api/ads/next`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  async function sendImpression(adId: string, sessionId: string, durationMs: number): Promise<void> {
    const token = await getToken()
    if (!token) return
    try {
      await fetch(`${BACKEND_URL}/api/impressions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adId, sessionId, durationMs, timestamp: Date.now() }),
      })
    } catch {
      // Silently fail
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created" || event.type === "session.updated") {
        currentSessionId = event.properties?.sessionID || null
      }

      if (event.type === "session.status") {
        const status = event.properties?.status

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

        if (status === "idle" && thinkingStartTime && currentAd) {
          const duration = Date.now() - thinkingStartTime

          if (duration >= 3000) {
            await sendImpression(currentAd.id, currentSessionId || "unknown", duration)

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
