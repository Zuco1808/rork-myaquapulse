-- ============================================================
-- 20260608100000_payments.sql
-- Payments module: evidencija uplata po fakturi (spec §7.1 payment)
--   - Podržava djelomične uplate (partial payments)
--   - Trigger automatski ažurira invoice.status / paid_at
-- ============================================================

/* ── payments ────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS payments (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  utility_id       UUID         NOT NULL REFERENCES water_utilities(id) ON DELETE CASCADE,
  amount_bam       NUMERIC(12,2) NOT NULL CHECK (amount_bam > 0),
  payment_method   TEXT         NOT NULL DEFAULT 'bank_transfer'
                   CHECK (payment_method IN (
                     'bank_transfer','cash','e_banking','card','other'
                   )),
  reference_number TEXT,
  payment_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
  note             TEXT,
  created_by       UUID         REFERENCES profiles(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS payments_utility_id_idx ON payments(utility_id);

/* ── Trigger: sinkronizuj invoice status sa sumom uplata ── */
CREATE OR REPLACE FUNCTION sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid NUMERIC(12,2);
  v_amount_due NUMERIC(12,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount_bam), 0) INTO v_total_paid
  FROM payments WHERE invoice_id = v_invoice_id;

  SELECT amount_bam INTO v_amount_due
  FROM invoices WHERE id = v_invoice_id;

  IF v_total_paid >= v_amount_due AND v_amount_due > 0 THEN
    -- Potpuno plaćeno
    UPDATE invoices
       SET status  = 'paid',
           paid_at = COALESCE(paid_at, now()),
           updated_at = now()
     WHERE id = v_invoice_id;
  ELSE
    -- Djelomično ili poništena uplata → vrati na 'sent' (ako nije draft/cancelled)
    UPDATE invoices
       SET status  = CASE
                       WHEN status IN ('draft','cancelled') THEN status
                       ELSE 'sent'
                     END,
           paid_at = NULL,
           updated_at = now()
     WHERE id = v_invoice_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment ON payments;
CREATE TRIGGER trg_sync_invoice_payment
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment_status();

/* ── Row Level Security ──────────────────────────────── */
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Čitanje: super_admin sve; utility osoblje svoj tenant;
--          end_user uplate na vlastite fakture
CREATE POLICY "payments_read" ON payments
  FOR SELECT TO authenticated
  USING (
    my_role() = 'super_admin'
    OR utility_id = my_utility_id()
    OR EXISTS (
      SELECT 1 FROM invoices i
      JOIN connections c ON c.id = i.connection_id
      WHERE i.id = payments.invoice_id
        AND c.user_id = auth.uid()
    )
  );

-- Upravljanje: samo super_admin, utility_admin, finance unutar tenanta
CREATE POLICY "payments_manage" ON payments
  FOR ALL TO authenticated
  USING (
    my_role() = 'super_admin'
    OR (my_role() IN ('utility_admin','finance') AND utility_id = my_utility_id())
  )
  WITH CHECK (
    my_role() = 'super_admin'
    OR (my_role() IN ('utility_admin','finance') AND utility_id = my_utility_id())
  );
