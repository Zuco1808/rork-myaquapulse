-- ============================================================
-- 20260608110000_reading_value_validation.sql
-- Server-side validacija: novo očitanje ne smije biti manje od
-- prethodnog (kumulativna brojila). Spec §5.2.
--
-- Brani na razini baze (i radnici i krajnji korisnici unose očitanja),
-- pa client-side provjera nije dovoljna.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_reading_not_lower()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev NUMERIC;
BEGIN
  -- Na UPDATE: ako se reading_value ne mijenja, preskoči
  IF TG_OP = 'UPDATE' AND NEW.reading_value IS NOT DISTINCT FROM OLD.reading_value THEN
    RETURN NEW;
  END IF;

  -- Pronađi posljednje (hronološki) očitanje za isti priključak, osim ovog reda
  SELECT reading_value INTO v_prev
  FROM meter_readings
  WHERE connection_id = NEW.connection_id
    AND id <> NEW.id
    AND (
      reading_date < NEW.reading_date
      OR (reading_date = NEW.reading_date AND created_at < NEW.created_at)
    )
  ORDER BY reading_date DESC, created_at DESC
  LIMIT 1;

  IF v_prev IS NOT NULL AND NEW.reading_value < v_prev THEN
    RAISE EXCEPTION
      'Novo očitanje (%) ne smije biti manje od prethodnog (%).',
      NEW.reading_value, v_prev
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reading_value ON meter_readings;
CREATE TRIGGER trg_validate_reading_value
  BEFORE INSERT OR UPDATE OF reading_value ON meter_readings
  FOR EACH ROW EXECUTE FUNCTION validate_reading_not_lower();
