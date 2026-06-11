-- ============================================================
-- 20260610110000_task_line_items.sql
-- Stavke radnog naloga: utrošeni materijal + usluge/rad (spec §5.2).
--   - task_materials: artikal iz kataloga + količina (cijena se snapshot-uje
--     server-side iz materials.sale_price → radnik ne vidi/ne šalje cijenu)
--   - task_services: opis, interno/eksterno, sati, izvođač
--   - triggeri auto-računaju tasks.material_cost / labor_cost iz stavki
-- ============================================================

CREATE TABLE IF NOT EXISTS task_materials (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  material_id UUID          REFERENCES materials(id) ON DELETE SET NULL,
  name        TEXT          NOT NULL DEFAULT '',  -- snapshot naziva
  unit        TEXT          NOT NULL DEFAULT 'kom',
  quantity    NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,   -- snapshot prodajne cijene
  created_by  UUID          REFERENCES profiles(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_materials_task_idx ON task_materials(task_id);

CREATE TABLE IF NOT EXISTS task_services (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  description TEXT          NOT NULL,
  is_external BOOLEAN       NOT NULL DEFAULT false,
  provider    TEXT,                                -- izvođač (za eksterne)
  quantity    NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),  -- sati/jedinice
  unit        TEXT          NOT NULL DEFAULT 'h',
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by  UUID          REFERENCES profiles(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_services_task_idx ON task_services(task_id);

/* ── Snapshot cijene/naziva iz kataloga (radnik šalje samo material_id+qty) ── */
CREATE OR REPLACE FUNCTION fill_task_material_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.material_id IS NOT NULL THEN
    SELECT name, unit, sale_price
      INTO NEW.name, NEW.unit, NEW.unit_price
      FROM materials WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_fill_material_snapshot ON task_materials;
CREATE TRIGGER trg_fill_material_snapshot
  BEFORE INSERT ON task_materials
  FOR EACH ROW EXECUTE FUNCTION fill_task_material_snapshot();

/* ── Auto-suma tasks.material_cost / labor_cost ── */
CREATE OR REPLACE FUNCTION recompute_task_costs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_task UUID;
BEGIN
  v_task := COALESCE(NEW.task_id, OLD.task_id);
  UPDATE tasks SET
    material_cost = COALESCE((SELECT SUM(quantity * unit_price) FROM task_materials WHERE task_id = v_task), 0),
    labor_cost    = COALESCE((SELECT SUM(quantity * unit_price) FROM task_services  WHERE task_id = v_task), 0),
    updated_at    = now()
  WHERE id = v_task;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_costs_materials ON task_materials;
CREATE TRIGGER trg_recompute_costs_materials
  AFTER INSERT OR UPDATE OR DELETE ON task_materials
  FOR EACH ROW EXECUTE FUNCTION recompute_task_costs();

DROP TRIGGER IF EXISTS trg_recompute_costs_services ON task_services;
CREATE TRIGGER trg_recompute_costs_services
  AFTER INSERT OR UPDATE OR DELETE ON task_services
  FOR EACH ROW EXECUTE FUNCTION recompute_task_costs();

/* ── RLS ── */
ALTER TABLE task_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_services  ENABLE ROW LEVEL SECURITY;

-- Pristup stavkama prati pristup roditeljskom nalogu
CREATE POLICY "task_materials_rw" ON task_materials
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_materials.task_id AND (
      my_role() = 'super_admin'
      OR (t.utility_id = my_utility_id() AND my_role() IN ('utility_admin','finance'))
      OR (my_role() = 'worker' AND t.utility_id = my_utility_id()
          AND (t.assigned_to = auth.uid() OR t.assigned_to IS NULL))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_materials.task_id AND (
      my_role() = 'super_admin'
      OR (t.utility_id = my_utility_id() AND my_role() IN ('utility_admin','finance'))
      OR (my_role() = 'worker' AND t.utility_id = my_utility_id()
          AND (t.assigned_to = auth.uid() OR t.assigned_to IS NULL))
    )
  ));

CREATE POLICY "task_services_rw" ON task_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_services.task_id AND (
      my_role() = 'super_admin'
      OR (t.utility_id = my_utility_id() AND my_role() IN ('utility_admin','finance'))
      OR (my_role() = 'worker' AND t.utility_id = my_utility_id()
          AND (t.assigned_to = auth.uid() OR t.assigned_to IS NULL))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_services.task_id AND (
      my_role() = 'super_admin'
      OR (t.utility_id = my_utility_id() AND my_role() IN ('utility_admin','finance'))
      OR (my_role() = 'worker' AND t.utility_id = my_utility_id()
          AND (t.assigned_to = auth.uid() OR t.assigned_to IS NULL))
    )
  ));
