import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(".env", "utf8").split("\n").reduce((a, l) => {
  const [k, ...r] = l.split("="); if (k) a[k.trim()] = r.join("=").trim(); return a;
}, {});

// Get token from DB
const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: user } = await supa.from("users").select("token").eq("email", "test@opencode-ads.com").single();
const TOKEN = user.token;

// Log impression
const res = await fetch("http://localhost:3001/api/impressions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({
    adId: "7ba56188-350e-4885-b01d-384e10c3da80",
    sessionId: "debug_test_2",
    durationMs: 5000,
    timestamp: Date.now(),
  }),
});
const data = await res.json();
console.log("API response:", JSON.stringify(data, null, 2));

// Check what was stored
const { data: imps } = await supa.from("impressions").select("*").eq("session_id", "debug_test_2");
console.log("\nStored in DB:", JSON.stringify(imps, null, 2));
