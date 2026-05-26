-- ============================================================
-- 20260527_pricing_tables.sql
-- Pricing module: user_groups, pricing_periods,
--                 pricing_packages, pricing_tiers
-- ============================================================

/* ── user_groups ─────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS user_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id  UUID        NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'household'
              CHECK (type IN (
                'residential','commercial','industrial','public',
                'agriculture','household','business','livestock','other'
              )),
  description TEXT,
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_groups_utility_id_idx ON user_groups(utility_id);

/* ── pricing_periods ─────────────────────────────────── */
CREATE TABLE IF NOT EXISTS pricing_periods (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id  UUID        NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_periods_utility_id_idx  ON pricing_periods(utility_id);
CREATE INDEX IF NOT EXISTS pricing_periods_is_active_idx   ON pricing_periods(is_active) WHERE is_active = true;

/* ── pricing_packages ────────────────────────────────── */
-- period_ids and user_group_ids stored as UUID arrays for simplicity
CREATE TABLE IF NOT EXISTS pricing_packages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id     UUID        NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  description    TEXT,
  is_default     BOOLEAN     NOT NULL DEFAULT false,
  period_ids     UUID[]      NOT NULL DEFAULT '{}',
  user_group_ids UUID[]      NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_packages_utility_id_idx ON pricing_packages(utility_id);

/* ── pricing_tiers ───────────────────────────────────── */
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID           NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
  min_consumption NUMERIC(12,3)  NOT NULL DEFAULT 0,
  max_consumption NUMERIC(12,3),                    -- NULL = unlimited
  price_per_unit  NUMERIC(12,4)  NOT NULL,
  description     TEXT,
  sort_order      INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_tiers_package_id_idx ON pricing_tiers(package_id);

/* ── Row Level Security ──────────────────────────────── */
ALTER TABLE user_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_periods   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers     ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read pricing data
CREATE POLICY "user_groups_read"      ON user_groups      FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_periods_read"  ON pricing_periods  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_packages_read" ON pricing_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_tiers_read"    ON pricing_tiers    FOR SELECT TO authenticated USING (true);

-- Only super_admin, utility_admin, finance can manage
CREATE POLICY "user_groups_manage" ON user_groups
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  );

CREATE POLICY "pricing_periods_manage" ON pricing_periods
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  );

CREATE POLICY "pricing_packages_manage" ON pricing_packages
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin' OR
    (my_role() IN ('utility_admin', 'finance') AND utility_id = my_utility_id())
  );

CREATE POLICY "pricing_tiers_manage" ON pricing_tiers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pricing_packages pp
      WHERE pp.id = pricing_tiers.package_id
        AND (
          my_role() = 'super_admin' OR
          (my_role() IN ('utility_admin', 'finance') AND pp.utility_id = my_utility_id())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pricing_packages pp
      WHERE pp.id = pricing_tiers.package_id
        AND (
          my_role() = 'super_admin' OR
          (my_role() IN ('utility_admin', 'finance') AND pp.utility_id = my_utility_id())
        )
    )
  );
