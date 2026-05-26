-- ============================================================
-- NOTIFICATIONS TABLE
-- Tabela za in-app notifikacije korisnika
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  utility_id          UUID        REFERENCES water_utilities(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,
  message             TEXT        NOT NULL,
  type                TEXT        NOT NULL DEFAULT 'info'
                                  CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read             BOOLEAN     NOT NULL DEFAULT false,
  related_entity_id   UUID,
  related_entity_type TEXT        CHECK (
                                    related_entity_type IN (
                                      'meter', 'reading', 'bill', 'task', 'connection'
                                    )
                                  ),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indeksi za brzo dohvatanje po korisniku
CREATE INDEX IF NOT EXISTS notifications_user_id_idx      ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx  ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx   ON notifications(created_at DESC);

-- RLS je definisan u 20260525_rls_policies.sql
