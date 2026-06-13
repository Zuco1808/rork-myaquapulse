-- ============================================================
-- 20260612110000_task_assign_notify_and_invoice_reminders.sql
-- 1) Notifikacija radniku kad mu se dodijeli zadatak
-- 2) Dnevni podsjetnici za neplaćene račune (pg_cron):
--    - 3 dana prije roka: podsjetnik korisniku
--    - nakon roka: status sent → overdue + obavijest korisniku
-- ============================================================

/* ── 1. Notifikacija pri dodjeli zadatka ─────────────── */
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- okida samo kad se assigned_to postavi/promijeni na ne-NULL
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;
  -- self-assign (radnik sam preuzeo) ne treba notifikaciju
  IF NEW.assigned_to = auth.uid() THEN RETURN NEW; END IF;

  PERFORM insert_notification(
    p_user_id             := NEW.assigned_to,
    p_utility_id          := NEW.utility_id,
    p_title               := 'Novi zadatak',
    p_message             := FORMAT('Dodijeljen vam je zadatak: %s', NEW.title),
    p_type                := 'info',
    p_related_entity_id   := NEW.id,
    p_related_entity_type := 'task'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON tasks;
CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

/* ── 2. Podsjetnici za neplaćene račune ──────────────── */
CREATE OR REPLACE FUNCTION process_invoice_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  -- a) Podsjetnik 3 dana prije roka (okida tačno jednom — na taj dan)
  FOR r IN
    SELECT i.id, i.utility_id, i.invoice_number, i.amount_bam, i.due_date, c.user_id
    FROM invoices i
    JOIN connections c ON c.id = i.connection_id
    WHERE i.status = 'sent'
      AND i.due_date = CURRENT_DATE + 3
      AND c.user_id IS NOT NULL
  LOOP
    PERFORM insert_notification(
      p_user_id             := r.user_id,
      p_utility_id          := r.utility_id,
      p_title               := 'Podsjetnik: račun uskoro dospijeva',
      p_message             := FORMAT('Račun %s na iznos %s BAM dospijeva %s.',
                                 COALESCE(r.invoice_number, '—'),
                                 ROUND(r.amount_bam, 2)::TEXT,
                                 TO_CHAR(r.due_date, 'DD.MM.YYYY')),
      p_type                := 'info',
      p_related_entity_id   := r.id,
      p_related_entity_type := 'invoice'
    );
  END LOOP;

  -- b) Prekoračeni: sent → overdue + obavijest (okida jednom, na prelazu)
  FOR r IN
    UPDATE invoices i
       SET status = 'overdue', updated_at = now()
      FROM connections c
     WHERE c.id = i.connection_id
       AND i.status = 'sent'
       AND i.due_date < CURRENT_DATE
    RETURNING i.id, i.utility_id, i.invoice_number, i.amount_bam, c.user_id
  LOOP
    IF r.user_id IS NOT NULL THEN
      PERFORM insert_notification(
        p_user_id             := r.user_id,
        p_utility_id          := r.utility_id,
        p_title               := 'Račun je dospio',
        p_message             := FORMAT('Račun %s na iznos %s BAM je prekoračio rok plaćanja.',
                                   COALESCE(r.invoice_number, '—'),
                                   ROUND(r.amount_bam, 2)::TEXT),
        p_type                := 'warning',
        p_related_entity_id   := r.id,
        p_related_entity_type := 'invoice'
      );
    END IF;
  END LOOP;
END;
$$;

-- pg_cron: svaki dan u 06:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('invoice-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL; -- job još ne postoji
END;
$$;

SELECT cron.schedule('invoice-reminders', '0 6 * * *', $$SELECT process_invoice_reminders()$$);
