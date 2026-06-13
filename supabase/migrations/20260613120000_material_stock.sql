-- ============================================================
-- 20260613120000_material_stock.sql
-- Zalihe materijala: stanje po artiklu + minimalna zaliha (prag upozorenja).
-- Kad se materijal utroši na nalogu (task_materials), zaliha se automatski
-- umanjuje; brisanje/izmjena stavke vraća/koriguje stanje. Usluge (h) se ne
-- prate kao zaliha.
-- ============================================================

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock      NUMERIC(12,3) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION adjust_material_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.material_id IS NOT NULL THEN
      UPDATE materials SET stock_quantity = stock_quantity - NEW.quantity,
             updated_at = now() WHERE id = NEW.material_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.material_id IS NOT NULL THEN
      UPDATE materials SET stock_quantity = stock_quantity + OLD.quantity,
             updated_at = now() WHERE id = OLD.material_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- vrati staro, oduzmi novo (pokriva i promjenu artikla i količine)
    IF OLD.material_id IS NOT NULL THEN
      UPDATE materials SET stock_quantity = stock_quantity + OLD.quantity WHERE id = OLD.material_id;
    END IF;
    IF NEW.material_id IS NOT NULL THEN
      UPDATE materials SET stock_quantity = stock_quantity - NEW.quantity, updated_at = now() WHERE id = NEW.material_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_material_stock ON task_materials;
CREATE TRIGGER trg_adjust_material_stock
  AFTER INSERT OR UPDATE OR DELETE ON task_materials
  FOR EACH ROW EXECUTE FUNCTION adjust_material_stock();
