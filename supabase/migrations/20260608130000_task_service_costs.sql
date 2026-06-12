-- ============================================================
-- 20260608130000_task_service_costs.sql
-- Servisni nalozi: troškovi materijala i rada na tasks (spec §5.2 Održavanje).
-- Omogućava izvještaje o troškovima održavanja po razdoblju.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost    NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Indeks za izvještaje o troškovima održavanja (završeni nalozi po utility)
CREATE INDEX IF NOT EXISTS tasks_utility_completed_idx
  ON public.tasks (utility_id, completed_at)
  WHERE status = 'done';
