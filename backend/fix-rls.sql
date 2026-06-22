-- ============================================================
-- Fix RLS policies — simplified for service_role backend
-- The backend uses service_role key which bypasses RLS entirely.
-- These policies are for direct client access (future use).
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can read own impressions" ON impressions;
DROP POLICY IF EXISTS "Users can insert own impressions" ON impressions;
DROP POLICY IF EXISTS "Users can read own payouts" ON payouts;
DROP POLICY IF EXISTS "Users can insert own payouts" ON payouts;
DROP POLICY IF EXISTS "Anyone can read active ads" ON ads;
DROP POLICY IF EXISTS "Users can insert own ad_serves" ON ad_serves;

-- Simple policies: allow all for now (backend uses service_role)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on impressions" ON impressions FOR ALL USING (true);
CREATE POLICY "Allow all on payouts" ON payouts FOR ALL USING (true);
CREATE POLICY "Allow all on ads" ON ads FOR ALL USING (true);
CREATE POLICY "Allow all on ad_serves" ON ad_serves FOR ALL USING (true);
