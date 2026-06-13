-- ============================================================
-- 20260613100000_audit_log.sql
-- Audit log (spec §4 / §7.1): evidencija svih izmjena poslovnih entiteta —
-- ko (user_id), šta (entity + old/new JSON), kada. Generički trigger zakačen
-- na poslovno-kritične tabele. Zapisi su nepromjenjivi (nema UPDATE/DELETE
-- politika — niko ih ne može mijenjati kroz API).
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  utility_id  UUID,
  entity_name TEXT        NOT NULL,
  entity_id   TEXT,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_utility_time_idx ON audit_log (utility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx       ON audit_log (entity_name, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Čitanje: super_admin sve; utility_admin/finance svoj vodovod.
-- Nema INSERT/UPDATE/DELETE politika — upis ide isključivo kroz SECURITY
-- DEFINER trigger, izmjena/brisanje kroz API nije moguće.
CREATE POLICY "audit_log_read" ON audit_log
  FOR SELECT TO authenticated
  USING (
    my_role() = 'super_admin'
    OR (my_role() IN ('utility_admin','finance') AND utility_id = my_utility_id())
  );

/* ── Generički audit trigger ─────────────────────────── */
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old     JSONB;
  v_new     JSONB;
  v_utility UUID;
  v_id      TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    -- preskoči no-op izmjene (samo updated_at i sl. razlike svejedno bilježimo,
    -- ali identične redove ne)
    IF v_old = v_new THEN RETURN NEW; END IF;
  ELSE
    v_old := to_jsonb(OLD);
  END IF;

  v_utility := COALESCE((v_new ->> 'utility_id')::UUID, (v_old ->> 'utility_id')::UUID);
  v_id      := COALESCE(v_new ->> 'id', v_old ->> 'id');

  INSERT INTO audit_log (user_id, utility_id, entity_name, entity_id, action, old_value, new_value)
  VALUES (auth.uid(), v_utility, TG_TABLE_NAME, v_id, TG_OP, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

/* ── Zakači na poslovno-kritične tabele ──────────────── */
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'invoices', 'payments', 'meter_readings', 'tasks',
    'task_materials', 'task_services', 'materials',
    'pricing_packages', 'pricing_tiers', 'pricing_periods',
    'user_groups', 'connections'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION audit_trigger()', t);
  END LOOP;
END;
$$;
