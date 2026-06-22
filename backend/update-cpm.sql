-- ============================================================
-- Fix: cpm_usdc_cents = advertiser CPM (what they pay per 1000)
-- Developer earns 70%, platform keeps 30%
-- Example: $5 CPM = 500 cents
--   Developer earns: 500 * 0.7 = 350 cents per 1000 impressions
--   Platform keeps:   500 * 0.3 = 150 cents per 1000 impressions
-- ============================================================

-- Update seed ads with realistic advertiser CPM values (in USDC cents)
UPDATE ads SET cpm_usdc_cents = 500 WHERE sponsor_name = 'Vercel';     -- $5 CPM
UPDATE ads SET cpm_usdc_cents = 400 WHERE sponsor_name = 'Supabase';   -- $4 CPM
UPDATE ads SET cpm_usdc_cents = 300 WHERE sponsor_name = 'Warp';       -- $3 CPM
UPDATE ads SET cpm_usdc_cents = 450 WHERE sponsor_name = 'CodeRabbit'; -- $4.5 CPM
UPDATE ads SET cpm_usdc_cents = 350 WHERE sponsor_name = 'Neon';       -- $3.5 CPM
