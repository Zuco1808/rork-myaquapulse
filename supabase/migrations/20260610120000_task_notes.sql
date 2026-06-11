-- ============================================================
-- 20260610120000_task_notes.sql
-- Napomena na radnom nalogu — dodatne informacije koje radnik/osoblje
-- unosi tokom izvođenja (ulazi u PDF nalog).
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS notes TEXT;
