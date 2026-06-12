-- ============================================================
-- 20260608120000_meter_images_bucket.sql
-- Storage bucket za fotografije brojila (foto očitanja, spec §5.2).
-- Public read, authenticated upload (5MB limit, slike).
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meter-images',
  'meter-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Javno čitanje (bucket je public, ali eksplicitna policy za sigurnost)
DROP POLICY IF EXISTS "meter_images_read" ON storage.objects;
CREATE POLICY "meter_images_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'meter-images');

-- Upload: bilo koji autentifikovani korisnik (radnici, end-useri koji predaju očitanje)
DROP POLICY IF EXISTS "meter_images_insert" ON storage.objects;
CREATE POLICY "meter_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meter-images');

-- Brisanje: samo super_admin / utility_admin / finance
DROP POLICY IF EXISTS "meter_images_delete" ON storage.objects;
CREATE POLICY "meter_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'meter-images'
    AND my_role() IN ('super_admin','utility_admin','finance')
  );
