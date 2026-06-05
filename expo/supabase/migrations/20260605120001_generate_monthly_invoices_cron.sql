-- Monthly invoice auto-generation via pg_cron.
-- Runs at 01:00 on the 1st of every month and creates draft invoices for
-- every active connection that has a verified reading in the previous month.
-- Invoices are created with amount_bam = 0 (draft); finance staff reviews and
-- triggers the calculate-invoice Edge Function before sending.

-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Core function ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_year INT, p_month INT)
RETURNS TABLE(conn_id UUID, result TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec      RECORD;
  r_to     RECORD;
  r_from   RECORD;
  p_from   DATE;
  p_to     DATE;
  v_consum NUMERIC;
BEGIN
  p_from := MAKE_DATE(p_year, p_month, 1);
  p_to   := (p_from + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  FOR rec IN
    SELECT c.id, c.utility_id
    FROM   connections c
    WHERE  c.is_active = TRUE
  LOOP
    -- Skip if draft/pending invoice already exists for this period
    IF EXISTS (
      SELECT 1 FROM invoices i
      WHERE  i.connection_id = rec.id AND i.period_from = p_from
    ) THEN
      conn_id := rec.id; result := 'exists'; RETURN NEXT; CONTINUE;
    END IF;

    -- Latest verified reading within the billing period
    SELECT * INTO r_to
    FROM   meter_readings mr
    WHERE  mr.connection_id = rec.id
      AND  mr.reading_date BETWEEN p_from AND p_to
      AND  mr.is_verified = TRUE
    ORDER  BY mr.reading_date DESC
    LIMIT  1;

    IF r_to IS NULL THEN
      conn_id := rec.id; result := 'no_reading'; RETURN NEXT; CONTINUE;
    END IF;

    -- Latest verified reading before the billing period (for consumption delta)
    SELECT * INTO r_from
    FROM   meter_readings mr
    WHERE  mr.connection_id = rec.id
      AND  mr.reading_date < p_from
      AND  mr.is_verified = TRUE
    ORDER  BY mr.reading_date DESC
    LIMIT  1;

    v_consum := GREATEST(0,
      r_to.reading_value - COALESCE(r_from.reading_value, 0)
    );

    INSERT INTO invoices (
      connection_id, utility_id,
      reading_from_id, reading_to_id,
      period_from, period_to,
      consumption_m3, amount_bam,
      status, due_date
    ) VALUES (
      rec.id, rec.utility_id,
      r_from.id,   -- NULL when no prior reading exists (nullable FK)
      r_to.id,
      p_from, p_to,
      v_consum, 0,
      'draft',
      (p_to + INTERVAL '30 days')::DATE
    );

    conn_id := rec.id; result := 'created'; RETURN NEXT;
  END LOOP;
END;
$$;

-- 3. Schedule: 01:00 on the 1st of each month --------------------------------
-- Deletes any existing schedule with the same name first (idempotent re-run).
SELECT cron.unschedule('generate-monthly-invoices') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-monthly-invoices'
);

SELECT cron.schedule(
  'generate-monthly-invoices',
  '0 1 1 * *',
  $$
    SELECT generate_monthly_invoices(
      EXTRACT(YEAR  FROM (CURRENT_DATE - INTERVAL '1 month'))::INT,
      EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::INT
    )
  $$
);
