import { supabase } from '@/lib/supabase';

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const updateUser = async (id: string, updates: Partial<{
  name: string;
  phone: string;
  address: string;
  avatar: string;
  role: string;
  is_active: boolean;
  can_read_meters: boolean;
  can_report_issues: boolean;
  can_manage_tasks: boolean;
  can_edit_readings: boolean;
  can_send_notifications: boolean;
  can_view_all_data: boolean;
  can_manage_users: boolean;
  can_manage_companies: boolean;
  can_manage_billing: boolean;
  can_backup_data: boolean;
}>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const inviteUser = async (email: string, role: string, name: string) => {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, name }
  });

  if (error) throw error;
  return data;
};
