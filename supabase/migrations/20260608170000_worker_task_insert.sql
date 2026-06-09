-- ============================================================
-- 20260608170000_worker_task_insert.sql
-- Radnik smije kreirati task (prijava kvara / servisni problem) unutar svoje
-- utility. Ranije radnik nije imao INSERT politiku pa "Prijava kvara" nije
-- mogla kreirati task (RLS odbija insert).
-- ============================================================

DROP POLICY IF EXISTS tasks_worker_insert ON tasks;
CREATE POLICY tasks_worker_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role() = 'worker' AND utility_id = my_utility_id()
  );
