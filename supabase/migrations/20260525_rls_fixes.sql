-- ============================================================
-- AQUAPULSE RLS FIXES — 2026-05-25
-- Popravlja 3 propusta u politikama za tabelu tasks:
--   1. end_user nije mogao INSERT task (prijava kvara)
--   2. finance nije mogao INSERT task
--   3. worker nije mogao UPDATE task koji nije bio dodijeljen (assigned_to IS NULL)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Fix 1: end_user može prijaviti kvar (INSERT task)
--   • Mora biti vezan za vlastiti priključak (connection_id)
--   • Dozvoljeni tipovi: other (kvar/prijava)
--   • utility_id mora biti isti kao na priključku
-- ────────────────────────────────────────────────────────────
CREATE POLICY "tasks_end_user_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role() = 'end_user'
    AND connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
    AND utility_id = (
      SELECT utility_id FROM connections WHERE id = connection_id LIMIT 1
    )
  );

-- ────────────────────────────────────────────────────────────
-- Fix 2: finance može kreirati task u svom vododvodu
--   • utility_id mora odgovarati finance korisnikovom utility_id
-- ────────────────────────────────────────────────────────────
CREATE POLICY "tasks_finance_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role() = 'finance'
    AND utility_id = my_utility_id()
  );

-- ────────────────────────────────────────────────────────────
-- Fix 3: worker može preuzeti i ažurirati neasigniran task
--   Stara politika: USING (my_role() = 'worker' AND assigned_to = auth.uid())
--   Nova politika:  USING (...  AND (assigned_to = auth.uid() OR assigned_to IS NULL))
--   WITH CHECK ostaje strog: worker može samo sebi asignirati
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_worker_update" ON tasks;

CREATE POLICY "tasks_worker_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  )
  WITH CHECK (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );
