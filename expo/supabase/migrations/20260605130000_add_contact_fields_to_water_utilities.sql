-- Add contact/profile fields missing from water_utilities.
-- companies/profile screen needs these to store and display utility contact info.
ALTER TABLE public.water_utilities
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT,
  ADD COLUMN IF NOT EXISTS support_email TEXT,
  ADD COLUMN IF NOT EXISTS postal_code   TEXT,
  ADD COLUMN IF NOT EXISTS country       TEXT DEFAULT 'Bosnia and Herzegovina';
