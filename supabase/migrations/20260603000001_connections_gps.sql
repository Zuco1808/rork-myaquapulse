-- Add GPS coordinates to connections (water meter installations)
ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
