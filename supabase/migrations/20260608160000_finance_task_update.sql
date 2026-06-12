-- ============================================================
-- 20260608160000_finance_task_update.sql
-- Finance smije ažurirati (i dodijeliti radniku) taskove unutar svoje utility.
-- Ranije je finance imao samo INSERT + SELECT na tasks, pa nije mogao
-- dodijeliti task radniku ni mijenjati status.
-- ============================================================

DROP POLICY IF EXISTS tasks_finance_update ON tasks;
CREATE POLICY tasks_finance_update ON tasks
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'finance' AND utility_id = my_utility_id()
  )
  WITH CHECK (
    my_role() = 'finance' AND utility_id = my_utility_id()
  );
