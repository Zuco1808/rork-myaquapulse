-- ============================================================
-- 20260613130000_subscription_commission.sql
-- Komercijalni model (spec §5.3): paket + mjesečna pretplata po vodovodu;
-- distributerska provizija (20% Basic/Standard, 15% Premium).
-- ============================================================

ALTER TABLE public.water_utilities
  ADD COLUMN IF NOT EXISTS package_tier      TEXT NOT NULL DEFAULT 'basic'
    CHECK (package_tier IN ('basic','standard','premium')),
  ADD COLUMN IF NOT EXISTS subscription_fee  NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Stopa provizije po paketu (spec default)
CREATE OR REPLACE FUNCTION commission_rate(p_tier TEXT)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_tier WHEN 'premium' THEN 0.15 ELSE 0.20 END;
$$;
