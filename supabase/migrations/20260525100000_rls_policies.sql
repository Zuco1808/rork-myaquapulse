-- ============================================================
-- AQUAPULSE RLS POLICIES
-- Hijerarhija: super_admin > distributor_admin > utility_admin
--              > finance > worker > end_user
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.
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

DROP POLICY IF EXISTS "profiles_own_select"               ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all"          ON profiles;
DROP POLICY IF EXISTS "profiles_distributor_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_utility_admin_select"     ON profiles;
DROP POLICY IF EXISTS "profiles_utility_admin_update"     ON profiles;
DROP POLICY IF EXISTS "profiles_own_update"               ON profiles;

CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_super_admin_all" ON profiles
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "profiles_distributor_admin_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND distributor_id = my_distributor_id()
  );

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
    AND id != auth.uid()
  );

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- distributors
-- ============================================================
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "distributors_super_admin_all"          ON distributors;
DROP POLICY IF EXISTS "distributors_distributor_admin_select" ON distributors;
DROP POLICY IF EXISTS "distributors_utility_admin_select"     ON distributors;

CREATE POLICY "distributors_super_admin_all" ON distributors
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "distributors_distributor_admin_select" ON distributors
  FOR SELECT TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND id = my_distributor_id()
  );

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

DROP POLICY IF EXISTS "utilities_super_admin_all"        ON water_utilities;
DROP POLICY IF EXISTS "utilities_distributor_admin_all"  ON water_utilities;
DROP POLICY IF EXISTS "utilities_utility_admin_select"   ON water_utilities;
DROP POLICY IF EXISTS "utilities_utility_admin_update"   ON water_utilities;
DROP POLICY IF EXISTS "utilities_end_user_select"        ON water_utilities;

CREATE POLICY "utilities_super_admin_all" ON water_utilities
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "utilities_distributor_admin_all" ON water_utilities
  FOR ALL TO authenticated
  USING (
    my_role() = 'distributor_admin'
    AND distributor_id = my_distributor_id()
  );

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

CREATE POLICY "utilities_end_user_select" ON water_utilities
  FOR SELECT TO authenticated
  USING (is_active = true AND my_role() = 'end_user');

-- ============================================================
-- connections
-- ============================================================
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_super_admin_all"    ON connections;
DROP POLICY IF EXISTS "connections_utility_staff_all"  ON connections;
DROP POLICY IF EXISTS "connections_end_user_select"    ON connections;

CREATE POLICY "connections_super_admin_all" ON connections
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "connections_utility_staff_all" ON connections
  FOR ALL TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance', 'worker')
    AND utility_id = my_utility_id()
  );

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

DROP POLICY IF EXISTS "readings_super_admin_all"          ON meter_readings;
DROP POLICY IF EXISTS "readings_utility_staff_select"     ON meter_readings;
DROP POLICY IF EXISTS "readings_utility_admin_insert"     ON meter_readings;
DROP POLICY IF EXISTS "readings_utility_admin_update"     ON meter_readings;
DROP POLICY IF EXISTS "readings_end_user_select"          ON meter_readings;
DROP POLICY IF EXISTS "readings_end_user_insert"          ON meter_readings;

CREATE POLICY "readings_super_admin_all" ON meter_readings
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

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

CREATE POLICY "readings_end_user_select" ON meter_readings
  FOR SELECT TO authenticated
  USING (
    my_role() = 'end_user'
    AND connection_id IN (
      SELECT id FROM connections WHERE user_id = auth.uid()
    )
  );

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

DROP POLICY IF EXISTS "invoices_super_admin_all"       ON invoices;
DROP POLICY IF EXISTS "invoices_utility_finance_all"   ON invoices;
DROP POLICY IF EXISTS "invoices_worker_select"         ON invoices;
DROP POLICY IF EXISTS "invoices_end_user_select"       ON invoices;

CREATE POLICY "invoices_super_admin_all" ON invoices
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "invoices_utility_finance_all" ON invoices
  FOR ALL TO authenticated
  USING (
    my_role() IN ('utility_admin', 'finance')
    AND utility_id = my_utility_id()
  );

CREATE POLICY "invoices_worker_select" ON invoices
  FOR SELECT TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
  );

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

DROP POLICY IF EXISTS "tasks_super_admin_all"    ON tasks;
DROP POLICY IF EXISTS "tasks_utility_admin_all"  ON tasks;
DROP POLICY IF EXISTS "tasks_finance_select"     ON tasks;
DROP POLICY IF EXISTS "tasks_worker_select"      ON tasks;
DROP POLICY IF EXISTS "tasks_worker_update"      ON tasks;

CREATE POLICY "tasks_super_admin_all" ON tasks
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "tasks_utility_admin_all" ON tasks
  FOR ALL TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

CREATE POLICY "tasks_finance_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    my_role() = 'finance'
    AND utility_id = my_utility_id()
  );

CREATE POLICY "tasks_worker_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    my_role() = 'worker'
    AND utility_id = my_utility_id()
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

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

DROP POLICY IF EXISTS "notifications_super_admin_all"    ON notifications;
DROP POLICY IF EXISTS "notifications_utility_admin_all"  ON notifications;
DROP POLICY IF EXISTS "notifications_own_select"         ON notifications;
DROP POLICY IF EXISTS "notifications_own_update"         ON notifications;

CREATE POLICY "notifications_super_admin_all" ON notifications
  FOR ALL TO authenticated
  USING (my_role() = 'super_admin');

CREATE POLICY "notifications_utility_admin_all" ON notifications
  FOR ALL TO authenticated
  USING (
    my_role() = 'utility_admin'
    AND utility_id = my_utility_id()
  );

CREATE POLICY "notifications_own_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
