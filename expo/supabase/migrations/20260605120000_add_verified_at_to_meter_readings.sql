-- Bug fix: add verified_at column to meter_readings.
-- The API code uses verified_at to distinguish 'rejected' (is_verified=false + verified_at set)
-- from 'pending' (is_verified=false + verified_at null). Without this column every
-- non-verified reading was permanently stuck as 'pending'.
ALTER TABLE public.meter_readings
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
