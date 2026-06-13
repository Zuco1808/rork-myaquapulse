-- ============================================================
-- 20260612100000_invoice_numbering.sql
-- Sekvencijalni broj računa po vodovodu i godini (npr. 2026-00001).
-- Broj se dodjeljuje kad faktura napusti draft (izdavanje) — draftovi i
-- otkazane fakture ne troše brojeve. Brojač je zaključan po redu
-- (FOR UPDATE preko UPSERT-a) pa nema duplikata pod konkurencijom.
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Jedinstvenost po vodovodu
CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_per_utility_idx
  ON public.invoices (utility_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_counters (
  utility_id UUID NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  year       INT  NOT NULL,
  last_value INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (utility_id, year)
);

ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
-- Brojačem upravlja isključivo SECURITY DEFINER funkcija; direktan pristup samo čitanje za osoblje
CREATE POLICY "invoice_counters_read" ON invoice_counters
  FOR SELECT TO authenticated
  USING (my_role() = 'super_admin' OR utility_id = my_utility_id());

CREATE OR REPLACE FUNCTION next_invoice_number(p_utility UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next INT;
BEGIN
  INSERT INTO invoice_counters (utility_id, year, last_value)
  VALUES (p_utility, v_year, 1)
  ON CONFLICT (utility_id, year)
  DO UPDATE SET last_value = invoice_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN v_year::TEXT || '-' || LPAD(v_next::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Dodijeli broj kad faktura postane "izdana" (nije draft/cancelled) a još ga nema
  IF NEW.invoice_number IS NULL
     AND NEW.status IS NOT NULL
     AND NEW.status NOT IN ('draft', 'cancelled') THEN
    NEW.invoice_number := next_invoice_number(NEW.utility_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON invoices;
CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION assign_invoice_number();
