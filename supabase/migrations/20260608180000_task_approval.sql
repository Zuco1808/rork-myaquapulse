-- ============================================================
-- 20260608180000_task_approval.sql
-- Workflow odobravanja zadataka:
--   - Zadatke koje kreira RADNIK treba odobriti admin vodovoda ili finance.
--   - Zadaci koje kreira osoblje (admin/finance/super_admin) i sistemski
--     (anomalije, created_by NULL) su automatski odobreni.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true;

-- BEFORE INSERT: radnikov zadatak (created_by postoji + uloga worker) → na odobravanje
CREATE OR REPLACE FUNCTION set_task_approval_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND my_role() = 'worker' THEN
    NEW.approved := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_task_approval ON tasks;
CREATE TRIGGER trg_set_task_approval
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_approval_on_insert();

-- Indeks za pregled zadataka na odobravanju po utility
CREATE INDEX IF NOT EXISTS tasks_pending_approval_idx
  ON public.tasks (utility_id)
  WHERE approved = false;
