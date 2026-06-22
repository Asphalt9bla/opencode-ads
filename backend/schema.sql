-- ============================================================
-- opencode-ads database schema (v2 — with proper RLS)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tables
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  solana_wallet TEXT,
  pending_usdc INTEGER DEFAULT 0, -- in cents (100 = $1 USDC)
  total_earned_usdc INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ads table (sponsor messages)
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  cpm_usdc_cents INTEGER DEFAULT 10, -- earnings per 1000 impressions (in USDC cents)
  active BOOLEAN DEFAULT true,
  daily_cap INTEGER DEFAULT 1000,
  total_cap INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impressions table
CREATE TABLE IF NOT EXISTS impressions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE SET NULL,
  session_id TEXT,
  duration_ms INTEGER NOT NULL,
  earned_usdc INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad serves
CREATE TABLE IF NOT EXISTS ad_serves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_usdc INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_impressions_user_id ON impressions(user_id);
CREATE INDEX IF NOT EXISTS idx_impressions_created_at ON impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(active);

-- ============================================================
-- RPC functions
-- ============================================================

CREATE OR REPLACE FUNCTION increment_pending_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    pending_usdc = pending_usdc + p_amount,
    total_earned_usdc = total_earned_usdc + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_pending_balance(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    pending_usdc = GREATEST(pending_usdc - p_amount, 0),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_serves ENABLE ROW LEVEL SECURITY;

-- Users: can only read/write their own data (identified by token)
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (token = current_setting('app.current_token', true));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (token = current_setting('app.current_token', true));

-- Impressions: users can only see their own
CREATE POLICY "Users can read own impressions" ON impressions
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE token = current_setting('app.current_token', true))
  );

CREATE POLICY "Users can insert own impressions" ON impressions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE token = current_setting('app.current_token', true))
  );

-- Payouts: users can only see their own
CREATE POLICY "Users can read own payouts" ON payouts
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE token = current_setting('app.current_token', true))
  );

CREATE POLICY "Users can insert own payouts" ON payouts
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE token = current_setting('app.current_token', true))
  );

-- Ads: anyone can read active ads (needed for the plugin to fetch ads)
CREATE POLICY "Anyone can read active ads" ON ads
  FOR SELECT USING (active = true);

-- Ad serves: users can only insert their own
CREATE POLICY "Users can insert own ad_serves" ON ad_serves
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM users WHERE token = current_setting('app.current_token', true))
  );

-- ============================================================
-- Seed data: sample ads
-- ============================================================

INSERT INTO ads (title, description, sponsor_name, url, cpm_usdc_cents) VALUES
  ('Ship faster with Vercel', 'Deploy your Next.js app in seconds', 'Vercel', 'https://vercel.com', 15),
  ('Open-source AI infrastructure', 'Build, scale, and deploy AI apps', 'Supabase', 'https://supabase.com', 12),
  ('The terminal for the 21st century', 'A fast, modern terminal emulator', 'Warp', 'https://warp.dev', 10),
  ('AI-powered code reviews', 'Automated code review for your team', 'CodeRabbit', 'https://coderabbit.ai', 14),
  ('Serverless Postgres', 'Start free, scale to millions', 'Neon', 'https://neon.tech', 11)
ON CONFLICT DO NOTHING;
