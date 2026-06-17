-- ============================================================
-- 20260617100000_connection_location.sql
-- Veže vodomjer (connection) na lokaciju iz hijerarhije (zgrada/ulica/naselje)
-- i uvodi oznaku zajedničkog (kontrolnog) brojila zgrade (spec §3).
--   - location_id: pripadnost lokaciji (najčešće zgradi)
--   - is_shared:   zajedničko/kontrolno brojilo (npr. za cijelu zgradu) nasuprot
--                  individualnim brojilima (stanovi/poslovni prostori)
-- Omogućava detekciju neusklađenosti: stanje zajedničkog vs suma individualnih.
-- ============================================================

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_shared   BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS connections_location_idx ON public.connections(location_id);
