-- ─────────────────────────────────────────────────────────────────────────────
-- 20260530_fix_reading_trigger.sql
--
-- BUG FIX: meter_readings has no `status` column — it uses `is_verified BOOLEAN`.
--
-- The previous trigger (20260529_auto_notifications.sql) referenced:
--   • NEW.status / OLD.status  → column does not exist → trigger never fires
--   • AFTER UPDATE OF status   → column does not exist → trigger is a no-op
--   • NEW.submitted_by         → column does not exist → would cause runtime error
--
-- This migration drops the broken trigger/function and replaces them with a
-- version that correctly monitors `is_verified` transitions.
--
-- Logic:
--   FALSE → TRUE  : reading verified   → success notification to worker
--   TRUE  → FALSE : reading un-verified / rejected → warning notification to worker
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the broken objects
DROP TRIGGER  IF EXISTS trg_reading_notify          ON meter_readings;
DROP FUNCTION IF EXISTS trg_reading_status_notify();

-- 2. Recreate with correct column references
CREATE OR REPLACE FUNCTION trg_reading_verified_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only runs on UPDATE
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  -- Skip if is_verified did not actually change
  IF NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified THEN RETURN NEW; END IF;

  -- Who submitted / measured this reading?
  v_user_id := NEW.worker_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.is_verified = TRUE THEN
    -- Verified ✓
    PERFORM insert_notification(
      p_user_id             := v_user_id,
      p_utility_id          := NEW.utility_id,
      p_title               := 'Očitanje potvrđeno',
      p_message             := FORMAT(
        'Vaše očitanje od %s m³ je potvrđeno.',
        ROUND(NEW.reading_value::NUMERIC, 3)::TEXT
      ),
      p_type                := 'success',
      p_related_entity_id   := NEW.id,
      p_related_entity_type := 'reading'
    );
  ELSE
    -- Explicitly un-verified → treated as rejected
    PERFORM insert_notification(
      p_user_id             := v_user_id,
      p_utility_id          := NEW.utility_id,
      p_title               := 'Očitanje odbijeno',
      p_message             := FORMAT(
        'Vaše očitanje od %s m³ je odbijeno. Kontaktirajte administratora.',
        ROUND(NEW.reading_value::NUMERIC, 3)::TEXT
      ),
      p_type                := 'warning',
      p_related_entity_id   := NEW.id,
      p_related_entity_type := 'reading'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Register trigger on the correct column
CREATE TRIGGER trg_reading_notify
  AFTER UPDATE OF is_verified ON meter_readings
  FOR EACH ROW EXECUTE FUNCTION trg_reading_verified_notify();
