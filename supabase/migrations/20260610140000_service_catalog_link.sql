-- ============================================================
-- 20260610140000_service_catalog_link.sql
-- Usluge iz kataloga (satnica): task_services.material_id → materials.
-- Kad radnik izabere uslugu iz kataloga, server snapshot-uje naziv,
-- jedinicu i prodajnu cijenu (satnicu) — isto kao kod materijala.
-- Time interne usluge dobijaju cijenu bez da radnik vidi/šalje iznose.
-- ============================================================

ALTER TABLE public.task_services
  ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION fill_task_service_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name TEXT; v_unit TEXT; v_price NUMERIC;
BEGIN
  IF NEW.material_id IS NOT NULL THEN
    SELECT name, unit, sale_price INTO v_name, v_unit, v_price
    FROM materials WHERE id = NEW.material_id;
    IF v_name IS NOT NULL THEN
      -- Opis: naziv iz kataloga (zadrži dodatni opis ako je radnik upisao)
      IF NEW.description IS NULL OR NEW.description = '' THEN
        NEW.description := v_name;
      END IF;
      NEW.unit       := COALESCE(v_unit, NEW.unit);
      NEW.unit_price := COALESCE(v_price, 0);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_service_snapshot ON task_services;
CREATE TRIGGER trg_fill_service_snapshot
  BEFORE INSERT ON task_services
  FOR EACH ROW EXECUTE FUNCTION fill_task_service_snapshot();
