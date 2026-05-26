-- ============================================================
-- 20260601_locations_table.sql
-- Service locations / zones within a water utility network.
-- A "location" is a geographic zone (e.g. city district, settlement)
-- that groups multiple water meter connections.
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id  UUID        NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  address     TEXT,
  city        TEXT,
  postal_code TEXT,
  country     TEXT        NOT NULL DEFAULT 'BA',
  type        TEXT        CHECK (type IN (
                'city','municipality','settlement','street','building','other'
              )),
  parent_id   UUID        REFERENCES locations(id) ON DELETE SET NULL,
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_utility_id_idx ON locations(utility_id);
CREATE INDEX IF NOT EXISTS locations_parent_id_idx  ON locations(parent_id)
  WHERE parent_id IS NOT NULL;

-- ── Trigger: auto-update updated_at ──────────────────────
CREATE OR REPLACE FUNCTION trg_locations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION trg_locations_updated_at();

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the same utility can read locations
CREATE POLICY "locations_read" ON locations
  FOR SELECT TO authenticated
  USING (
    my_role() = 'super_admin'
    OR utility_id = my_utility_id()
  );

-- Only super_admin and utility_admin can manage locations
CREATE POLICY "locations_manage" ON locations
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin'
    OR (my_role() = 'utility_admin' AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin'
    OR (my_role() = 'utility_admin' AND utility_id = my_utility_id())
  );
