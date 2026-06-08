-- ─────────────────────────────────────────────────────────────────────────────
-- 20260603_fix_notifications_schema.sql
--
-- Popravlja shemu notifications tabele koja je kreirana sa starom strukturom:
--   • Kolona 'body' → 'message'
--   • CHECK constraint sa ('alert','billing') → ('info','warning','error','success')
--   • Dodaje kolone: related_entity_id, related_entity_type, created_by
--   • Dodaje push_token na profiles (migracija 20260528 nije bila primijenjena)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. notifications: body → message ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'body'
  ) THEN
    ALTER TABLE notifications RENAME COLUMN body TO message;
    RAISE NOTICE 'notifications.body renamed to message';
  ELSE
    RAISE NOTICE 'notifications.message already exists — skip rename';
  END IF;
END $$;

-- ── 2. notifications: dodaj missing kolone ────────────────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS related_entity_id   UUID,
  ADD COLUMN IF NOT EXISTS related_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ── 3. notifications: ispravi type CHECK constraint ───────────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'warning', 'error', 'success'));

-- Indeksi
CREATE INDEX IF NOT EXISTS notifications_user_id_idx     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx  ON notifications(created_at DESC);

-- ── 4. profiles: dodaj push_token (migracija 20260528 preskočena) ─────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles (push_token)
  WHERE push_token IS NOT NULL;

-- ── 5. profiles: email_notifications_enabled (safety check) ───────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
