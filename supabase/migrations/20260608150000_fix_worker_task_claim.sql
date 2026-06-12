-- ============================================================
-- 20260608150000_fix_worker_task_claim.sql
-- BUG FIX: radnik nije mogao započeti NEDODIJELJEN task.
--
-- Stara worker UPDATE politika je tražila assigned_to = auth.uid() u USING,
-- pa radnik nikad nije mogao self-assignati nedodijeljen task (chicken-and-egg):
-- vidi ga (SELECT dozvoljava assigned_to IS NULL) ali UPDATE ne pogađa nijedan
-- red → "Cannot coerce the result to a single JSON object".
--
-- Nova politika: radnik smije ažurirati svoj ILI nedodijeljen task (USING),
-- ali nakon izmjene task mora biti dodijeljen baš njemu (WITH CHECK) — što
-- odgovara self-assign toku pri "Počni zadatak".
-- ============================================================

DROP POLICY IF EXISTS tasks_worker_update        ON tasks;
DROP POLICY IF EXISTS worker_updates_assigned_tasks ON tasks;

CREATE POLICY tasks_worker_update ON tasks
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND assigned_to = auth.uid()
  );
