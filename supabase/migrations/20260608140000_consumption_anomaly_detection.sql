-- ============================================================
-- 20260608140000_consumption_anomaly_detection.sql
-- Detekcija anomalija potrošnje (spec §8.3 — nagli skok / curenje).
--
-- Heuristika (bez ML-a): kad je potrošnja novog očitanja znatno iznad
-- istorijskog prosjeka priključka, auto-kreira task visokog prioriteta
-- (task_type='inspection'). Taskovi visokog prioriteta se prikazuju na
-- Alarmi ekranu → radnik/menadžment dobija akcijski alarm.
--
-- Parametri: anomalija ako potrošnja > GREATEST(MIN_ABS, prosjek * FACTOR)
--   FACTOR  = 3.0   (300% prosjeka)
--   MIN_ABS = 10    (m³ — sprječava lažne pozitive na malim baznim vrijednostima)
-- Potreban je bazni uzorak od bar 2 istorijske delte.
-- ============================================================

CREATE OR REPLACE FUNCTION detect_consumption_anomaly()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_value  NUMERIC;
  v_consumption NUMERIC;
  v_avg         NUMERIC;
  v_count       INT;
  v_factor      NUMERIC := 3.0;
  v_min_abs     NUMERIC := 10.0;
BEGIN
  -- 1. Prethodno (hronološki) očitanje za priključak
  SELECT reading_value INTO v_prev_value
  FROM meter_readings
  WHERE connection_id = NEW.connection_id
    AND id <> NEW.id
    AND (reading_date < NEW.reading_date
         OR (reading_date = NEW.reading_date AND created_at < NEW.created_at))
  ORDER BY reading_date DESC, created_at DESC
  LIMIT 1;

  IF v_prev_value IS NULL THEN RETURN NEW; END IF;

  v_consumption := NEW.reading_value - v_prev_value;
  IF v_consumption <= 0 THEN RETURN NEW; END IF;

  -- 2. Prosjek istorijskih (pozitivnih) delti, bez ovog novog očitanja
  WITH ordered AS (
    SELECT reading_value,
           LAG(reading_value) OVER (ORDER BY reading_date, created_at) AS prev_val
    FROM meter_readings
    WHERE connection_id = NEW.connection_id
      AND id <> NEW.id
  )
  SELECT AVG(reading_value - prev_val), COUNT(*)
  INTO v_avg, v_count
  FROM ordered
  WHERE prev_val IS NOT NULL AND reading_value - prev_val > 0;

  IF v_count < 2 OR v_avg IS NULL OR v_avg <= 0 THEN RETURN NEW; END IF;

  -- 3. Anomalija?
  IF v_consumption > GREATEST(v_min_abs, v_avg * v_factor) THEN
    -- Ne dupliciraj otvoreni alarm za isti priključak
    IF NOT EXISTS (
      SELECT 1 FROM tasks
      WHERE connection_id = NEW.connection_id
        AND task_type = 'inspection'
        AND status IN ('open', 'in_progress')
        AND title LIKE 'Mogući kvar%'
    ) THEN
      INSERT INTO tasks (utility_id, connection_id, title, description, task_type, priority, status)
      VALUES (
        NEW.utility_id,
        NEW.connection_id,
        'Mogući kvar: nagli skok potrošnje',
        format(
          'Potrošnja %s m³ je znatno iznad prosjeka priključka (%s m³). Provjeriti moguće curenje ili kvar na vodomjeru.',
          round(v_consumption, 2), round(v_avg, 2)
        ),
        'inspection',
        'high',
        'open'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_anomaly ON meter_readings;
CREATE TRIGGER trg_detect_anomaly
  AFTER INSERT ON meter_readings
  FOR EACH ROW EXECUTE FUNCTION detect_consumption_anomaly();
