-- ─────────────────────────────────────────────────────────────────────────────
-- 20260528_push_tokens.sql
-- Adds push_token column to profiles table for Expo Push Notifications.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

-- Index for quick lookup when sending bulk push notifications
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles (push_token)
  WHERE push_token IS NOT NULL;

-- Users can update their own push token
-- (RLS already allows users to update their own profile row)
-- No additional policy needed.
