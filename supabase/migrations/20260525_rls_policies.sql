-- ============================================================
-- AQUAPULSE RLS POLICIES
-- Hijerarhija: super_admin > distributor_admin > utility_admin
--              > finance > worker > end_user
-- ============================================================

-- Helper functions (SECURITY DEFINER izbjegava beskonačnu rekurziju na profiles)
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_utility_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT utility_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_distributor_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT distributor_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Svako vidi vlastiti profil
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- super_admin vidi i mijenja sve profile
CREATE POLICY "profiles_super_admin_all" ON profiles
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- distributor_admin vidi profile svog distributora
CREATE POLICY "profiles_distributor_admin_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND distributor_id = my_distributor_id()
  );

-- utility_admin vidi i mijenja profile svog vodovoda
CREATE POLICY "profiles_utility_admin_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

CREATE POLICY "profiles_utility_admin_update" ON profiles
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
    AND id != auth.uid() -- ne može sam sebe admin-override-ovati
  );

-- Svaki user može ažurirati vlastiti profil (ime, telefon)
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- distributors
-- ============================================================
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distributors_super_admin_all" ON distributors
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "distributors_distributor_admin_select" ON distributors
  FOR SELECT TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND id = my_distributor_id()
  );

-- utility_admin vidi distributora svog vodovoda
CREATE POLICY "distributors_utility_admin_select" ON distributors
  FOR SELECT TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND id = (SELECT distributor_id FROM water_utilities WHERE id = my_utility_id() LIMIT 1)
  );

-- ============================================================
-- water_utilities
-- ============================================================
ALTER TABLE water_utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilities_super_admin_all" ON water_utilities
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "utilities_distributor_admin_all" ON water_utilities
  FOR ALL TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND distributor_id = my_distributor_id()
  );

-- utility_admin vidi i uređuje vlastiti vodovod
CREATE POLICY "utilities_utility_admin_select" ON water_utilities
  FOR SELECT TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance', 'worker')
    AND id = my_utility_id()
  );

CREATE POLICY "utilities_utility_admin_update" ON water_utilities
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND id = my_utility_id()
  );

-- end_user vidi sve aktivne vodovode (za registraciju)
CREATE POLICY "utilities_end_user_select" ON water_utilities
  FOR SELECT TO authenticated
  USING (is_active = true AND my_role() = 'end_user');

-- ============================================================
-- connections
-- ============================================================
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connections_super_admin_all" ON connections
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- utility_admin, finance, worker vide i upravljaju priključcima svog vodovoda
CREATE POLICY "connections_utility_staff_all" ON connections
  FOR ALL TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance', 'worker')
    AND utility_id = my_utility_id()
  );

-- end_user vidi vlastite priključke
CREATE POLICY "connections_end_user_select" ON connections
  FOR SELECT TO authenticated
  USING (
    my_role() = 'end_user'
    AND user_id = auth.uid()
  );

-- ============================================================
-- meter_readings
-- ============================================================
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "readings_super_admin_all" ON meter_readings
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- utility staff vidi i upisuje očitavanja svog vodovoda
CREATE POLICY "readings_utility_staff_select" ON meter_readings
  FOR SELECT TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance', 'worker')
    AND utility_id = my_utility_id()
  );

CREATE POLICY "readings_utility_admin_insert" ON meter_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role() IN ('utility_admin', 'worker')
    AND utility_id = my_utility_id()
  );

CREATE POLICY "readings_utility_admin_update" ON meter_readings
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

-- end_user vidi očitavanja vlastitih priključaka
CREATE POLICY "readings_end_user_select" ON meter_readings
  FOR SELECT TO authenticated
  USING (
    my_role() = 'end_user'
    AND connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
  );

-- end_user može upisati vlastito očitavanje (self-reading)
CREATE POLICY "readings_end_user_insert" ON meter_readings
  FOR INSERT TO authenticated
  WITH CHECK (
    my_role() = 'end_user'
    AND connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- invoices
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_super_admin_all" ON invoices
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- utility_admin i finance upravljaju računima svog vodovoda
CREATE POLICY "invoices_utility_finance_all" ON invoices
  FOR ALL TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance')
    AND utility_id = my_utility_id()
  );

-- worker samo čita račune
CREATE POLICY "invoices_worker_select" ON invoices
  FOR SELECT TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
  );

-- end_user vidi vlastite račune
CREATE POLICY "invoices_end_user_select" ON invoices
  FOR SELECT TO authenticated
  USING (
    my_role() = 'end_user'
    AND connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- tasks
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_super_admin_all" ON tasks
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- utility_admin kreira, čita i dodjeljuje taskove
CREATE POLICY "tasks_utility_admin_all" ON tasks
  FOR ALL TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

-- finance čita taskove svog vodovoda
CREATE POLICY "tasks_finance_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    my_role() = 'finance'
    AND utility_id = my_utility_id()
  );

-- worker vidi taskove svog vodovoda (dodijeljene ili otvorene)
CREATE POLICY "tasks_worker_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

-- worker može ažurirati status vlastitog taska
CREATE POLICY "tasks_worker_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    my_role() = 'worker'
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    my_role() = 'worker'
    AND assigned_to = auth.uid()
  );

-- ============================================================
-- notifications
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_super_admin_all" ON notifications
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

-- utility_admin šalje i vidi notifikacije svog vodovoda
CREATE POLICY "notifications_utility_admin_all" ON notifications
  FOR ALL TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

-- Svaki user vidi vlastite notifikacije
CREATE POLICY "notifications_own_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- User može označiti vlastite notifikacije kao pročitane
CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
