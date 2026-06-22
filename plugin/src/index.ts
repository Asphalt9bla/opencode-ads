// @ts-nocheck
import type { Plugin } from "@opencode-ai/plugin"

const BACKEND_URL = "https://opencode-ads-production.up.railway.app"

export const OpencodeAds = async ({ client }) => {
  let currentSessionId = null
  let thinkingStartTime = null
  let currentAd = null

  const getAuthPath = () => {
    const home = process.env.HOME || process.env.USERPROFILE || ""
    return home + "/.config/opencode-ads/auth.json"
  }

  async function getToken() {
    try {
      const file = Bun.file(getAuthPath())
      const data = await file.json()
      return data.token || null
    } catch {
      return null
    }
  }

  async function fetchAd() {
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

  async function sendImpression(adId, sessionId, durationMs) {
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
    } catch {}
  }

  async function showToast(title, message, variant) {
    try {
      await client.tui.showToast({ title, message, variant, duration: 3000 })
    } catch {}
  }

  return {
    event: async ({ event }) => {
      if (event.type === "session.created" || event.type === "session.updated") {
        currentSessionId = event.properties?.info?.id || null
      }

      if (event.type === "session.status") {
        if (event.properties?.status?.type === "busy") {
          thinkingStartTime = Date.now()
          currentAd = await fetchAd()
          if (currentAd) {
            await showToast(`💰 ${currentAd.sponsor}`, `${currentAd.title} — ${currentAd.description}`, "info")
          }
        }

        if (event.properties?.status?.type === "idle" && thinkingStartTime && currentAd) {
          const duration = Date.now() - thinkingStartTime
          if (duration >= 3000) {
            await sendImpression(currentAd.id, currentSessionId || "unknown", duration)
            const earnedUsd = (currentAd.cpm * 0.7) / 100000
            await showToast("💰 Earned", `+$${earnedUsd.toFixed(4)} USDC`, "success")
          }
          thinkingStartTime = null
          currentAd = null
        }
      }

      if (event.type === "session.idle" && thinkingStartTime && currentAd) {
        const duration = Date.now() - thinkingStartTime
        if (duration >= 3000) {
          await sendImpression(currentAd.id, currentSessionId || "unknown", duration)
          const earnedUsd = (currentAd.cpm * 0.7) / 100000
          await showToast("💰 Earned", `+$${earnedUsd.toFixed(4)} USDC`, "success")
        }
        thinkingStartTime = null
        currentAd = null
      }
    },
  }
}
