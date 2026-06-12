-- ============================================================
-- 20260610130000_task_billing.sql
-- Fakturisanje radnog naloga korisniku (spec §5.2):
--   - customer_billable: korisnik snosi troškove naloga
--   - invoiced_at: kad je nalog fakturisan (sprječava dvostruko)
--   - invoices.task_id: veza fakture na servisni nalog
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS customer_billable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoiced_at       TIMESTAMPTZ;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoices_task_idx ON public.invoices(task_id) WHERE task_id IS NOT NULL;
