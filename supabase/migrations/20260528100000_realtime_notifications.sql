-- ─────────────────────────────────────────────────────────────────────────────
-- 20260528_realtime_notifications.sql
-- Enables Supabase Realtime (postgres_changes) for the notifications table.
-- This is required for the client-side subscribeRealtime() to receive INSERT
-- events without polling.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add notifications to the Realtime publication.
-- Safe to run multiple times — IF NOT ALREADY IN PUBLICATION guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname   = 'supabase_realtime'
    AND    tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
