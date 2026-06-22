-- Fix: earned_usdc now stores "tenths of a cent" for finer granularity
-- 1 cent = 10 units
-- $0.007 (70% of 1 cent) = 7 units
-- At payout: divide by 10 to get cents, then by 100 to get dollars

ALTER TABLE impressions ALTER COLUMN earned_usdc TYPE INTEGER;
ALTER TABLE users ALTER COLUMN pending_usdc TYPE INTEGER;
ALTER TABLE users ALTER COLUMN total_earned_usdc TYPE INTEGER;
ALTER TABLE payouts ALTER COLUMN amount_usdc TYPE INTEGER;

-- Update seed ads to use realistic CPM (in cents)
-- $10 CPM = 1000 cents
UPDATE ads SET cpm_usdc_cents = 1000 WHERE sponsor_name = 'Vercel';
UPDATE ads SET cpm_usdc_cents = 800 WHERE sponsor_name = 'Supabase';
UPDATE ads SET cpm_usdc_cents = 600 WHERE sponsor_name = 'Warp';
UPDATE ads SET cpm_usdc_cents = 900 WHERE sponsor_name = 'CodeRabbit';
UPDATE ads SET cpm_usdc_cents = 700 WHERE sponsor_name = 'Neon';
