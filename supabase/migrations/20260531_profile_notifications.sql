-- ─────────────────────────────────────────────────────────────────────────────
-- 20260531_profile_notifications.sql
--
-- Adds email notification preference to the profiles table.
-- push_token column already exists (added in 20260528_push_tokens.sql).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.email_notifications_enabled IS
  'User preference — whether to receive email notifications. Defaults to true.';
