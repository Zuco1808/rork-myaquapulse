-- ─────────────────────────────────────────────────────────────────────────────
-- 20260529_auto_notifications.sql
-- PostgreSQL triggers that automatically insert rows into `notifications`
-- when key business events occur.
--
-- Covered events:
--   1. New invoice (status = 'pending') → notify the connection's owner
--   2. Invoice marked paid               → notify the connection's owner
--   3. Meter reading verified            → notify the reading's submitter
--   4. Meter reading rejected            → notify the reading's submitter
--   5. Task assigned to a worker        → notify the worker
--
-- The Supabase Realtime subscription on the client picks these rows up
-- instantly. Expo push notifications are delivered separately via the
-- client-side `sendNotification()` API call for admin-sent messages.
-- For trigger-generated notifications, Realtime handles in-app delivery;
-- push for offline devices can be wired up via a pg_net Edge Function later.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: insert a single notification row safely ──────────────────────────
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id             UUID,
  p_utility_id          UUID,
  p_title               TEXT,
  p_message             TEXT,
  p_type                TEXT,
  p_related_entity_id   UUID    DEFAULT NULL,
  p_related_entity_type TEXT    DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Guard: only insert if user exists and is active
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND is_active = true
  ) THEN
    INSERT INTO notifications (
      user_id, utility_id, title, message, type,
      is_read, related_entity_id, related_entity_type
    ) VALUES (
      p_user_id, p_utility_id, p_title, p_message, p_type,
      false, p_related_entity_id, p_related_entity_type
    );
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER 1: New invoice → notify end user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_invoice_new_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID;
  v_amount     NUMERIC;
  v_due_date   TEXT;
BEGIN
  -- Only trigger on INSERT or when status changes to 'pending' from draft
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
  OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status = 'draft')
  THEN
    -- Find the owner of the connection
    SELECT c.user_id INTO v_user_id
    FROM   connections c
    WHERE  c.id = NEW.connection_id;

    IF v_user_id IS NULL THEN RETURN NEW; END IF;

    v_amount   := COALESCE(NEW.amount_bam, 0);
    v_due_date := COALESCE(TO_CHAR(NEW.due_date, 'DD.MM.YYYY'), '—');

    PERFORM insert_notification(
      p_user_id             := v_user_id,
      p_utility_id          := NEW.utility_id,
      p_title               := 'Novi račun',
      p_message             := FORMAT(
        'Dobili ste novi račun u iznosu %s KM. Rok plaćanja: %s.',
        ROUND(v_amount, 2)::TEXT, v_due_date
      ),
      p_type                := 'info',
      p_related_entity_id   := NEW.id,
      p_related_entity_type := 'bill'
    );
  END IF;

  -- Notify when invoice is paid (status → 'paid')
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    SELECT c.user_id INTO v_user_id
    FROM   connections c
    WHERE  c.id = NEW.connection_id;

    IF v_user_id IS NOT NULL THEN
      PERFORM insert_notification(
        p_user_id             := v_user_id,
        p_utility_id          := NEW.utility_id,
        p_title               := 'Uplata potvrđena',
        p_message             := FORMAT(
          'Vaša uplata od %s KM je uspješno evidentirana.',
          ROUND(COALESCE(NEW.amount_bam, 0), 2)::TEXT
        ),
        p_type                := 'success',
        p_related_entity_id   := NEW.id,
        p_related_entity_type := 'bill'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_notify ON invoices;
CREATE TRIGGER trg_invoice_notify
  AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION trg_invoice_new_notify();

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Trigger 2 (reading verified/rejected) is defined in the NEXT migration:
--       20260530_fix_reading_trigger.sql
--
-- The original implementation here referenced a non-existent `status` column
-- on meter_readings (which uses is_verified BOOLEAN instead). That migration
-- drops the broken trigger and recreates it using is_verified correctly.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER 3: Task assigned to worker → notify the worker
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_task_assigned_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fire when assigned_to is newly set (INSERT or UPDATE where it changes)
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to = OLD.assigned_to THEN RETURN NEW; END IF;

  PERFORM insert_notification(
    p_user_id             := NEW.assigned_to,
    p_utility_id          := NEW.utility_id,
    p_title               := 'Novi zadatak dodijeljen',
    p_message             := FORMAT(
      'Zadatak "%s" vam je dodijeljen.',
      LEFT(NEW.title, 80)
    ),
    p_type                := 'info',
    p_related_entity_id   := NEW.id,
    p_related_entity_type := 'task'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assign_notify ON tasks;
CREATE TRIGGER trg_task_assign_notify
  AFTER INSERT OR UPDATE OF assigned_to ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_assigned_notify();

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER 4: Task completed → notify the creator / utility_admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_task_completed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.status <> 'done' OR OLD.status = 'done' THEN RETURN NEW; END IF;
  IF NEW.created_by IS NULL THEN RETURN NEW; END IF;

  -- Notify the task creator (usually utility_admin)
  PERFORM insert_notification(
    p_user_id             := NEW.created_by,
    p_utility_id          := NEW.utility_id,
    p_title               := 'Zadatak završen',
    p_message             := FORMAT(
      'Zadatak "%s" je označen kao završen.',
      LEFT(NEW.title, 80)
    ),
    p_type                := 'success',
    p_related_entity_id   := NEW.id,
    p_related_entity_type := 'task'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_done_notify ON tasks;
CREATE TRIGGER trg_task_done_notify
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_completed_notify();
