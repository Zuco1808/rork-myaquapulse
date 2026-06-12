-- ============================================================
-- 20260610100000_materials_catalog.sql
-- Katalog artikala (materijala) za radne naloge (spec §5.2).
-- Admin/finance uređuju; svi članovi utility-ja čitaju (radnik bira pri unosu).
-- Cijene se u UI-ju skrivaju od radnika (kolone su čitljive, prikaz se gasi).
-- ============================================================

CREATE TABLE IF NOT EXISTS materials (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  utility_id     UUID         NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  code           TEXT,
  name           TEXT         NOT NULL,
  unit           TEXT         NOT NULL DEFAULT 'kom',  -- kom, m, m3, kg, h, kompl...
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS materials_utility_idx ON materials(utility_id) WHERE is_active = true;

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Čitanje: svi članovi utility-ja (radnik treba katalog), super_admin sve
CREATE POLICY "materials_read" ON materials
  FOR SELECT TO authenticated
  USING (my_role() = 'super_admin' OR utility_id = my_utility_id());

-- Upravljanje: super_admin / utility_admin / finance unutar svoje utility
CREATE POLICY "materials_manage" ON materials
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin'
    OR (my_role() IN ('utility_admin','finance') AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin'
    OR (my_role() IN ('utility_admin','finance') AND utility_id = my_utility_id())
  );
