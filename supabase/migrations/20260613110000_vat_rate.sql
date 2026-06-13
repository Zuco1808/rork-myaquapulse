-- ============================================================
-- 20260613110000_vat_rate.sql
-- PDV stopa po vodovodu (konfigurabilna) + snapshot na fakturi.
-- amount_bam se tretira kao BRUTO (PDV uključen); osnovica i PDV se
-- izvlače iz bruta po snimljenoj stopi (ispravna matematika, ne 85/15).
-- ============================================================

ALTER TABLE public.water_utilities
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 17;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2);

-- Snapshot stope vodovoda na fakturu pri kreiranju (sve putanje: Edge fn,
-- ručni unos, iz naloga, cron)
CREATE OR REPLACE FUNCTION snapshot_invoice_vat_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.vat_rate IS NULL THEN
    SELECT vat_rate INTO NEW.vat_rate FROM water_utilities WHERE id = NEW.utility_id;
    NEW.vat_rate := COALESCE(NEW.vat_rate, 17);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_invoice_vat ON invoices;
CREATE TRIGGER trg_snapshot_invoice_vat
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION snapshot_invoice_vat_rate();

-- Postojeće fakture: popuni snapshot iz vodovoda
UPDATE public.invoices i
   SET vat_rate = COALESCE(wu.vat_rate, 17)
  FROM water_utilities wu
 WHERE wu.id = i.utility_id AND i.vat_rate IS NULL;
