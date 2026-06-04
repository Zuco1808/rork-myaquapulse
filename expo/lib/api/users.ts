import { supabase } from '@/lib/supabase';
import { Profile, UserRole, getPermissions } from '@/types/user';

const mapProfile = (p: any): Profile => ({
  id: p.id,
  full_name: p.full_name,
  email: p.email,
  phone: p.phone,
  avatar_url: p.avatar_url,
  role: p.role as UserRole,
  distributor_id: p.distributor_id,
  utility_id: p.utility_id,
  is_active: p.is_active,
  created_at: p.created_at,
  updated_at: p.updated_at,
  permissions: getPermissions(p.role as UserRole),
});

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  if (error) throw error;
  return (data || []).map(mapProfile);
};

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapProfile(data);
};

export const getUsersByUtility = async (utilityId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('utility_id', utilityId)
    .order('full_name');

  if (error) throw error;
  return (data || []).map(mapProfile);
};

export const updateUser = async (id: string, updates: Partial<{
  full_name: string;
  phone: string;
  avatar_url: string;
  role: string;
  is_active: boolean;
  utility_id: string;
  distributor_id: string;
}>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapProfile(data);
};

export const createUser = async (params: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  utility_id?: string;
  is_active?: boolean;
}) => {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: params,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.user as Profile;
};

export const updateUserFull = async (params: {
  target_id: string;
  full_name?: string;
  phone?: string;
  role?: UserRole;
  utility_id?: string;
  is_active?: boolean;
  password?: string;
}) => {
  const { data, error } = await supabase.functions.invoke('update-user', {
    body: params,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.user as Profile | null;
};

export const inviteUser = async (
  email: string,
  role: UserRole,
  full_name: string,
  utility_id?: string,
  distributor_id?: string
) => {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, full_name, utility_id, distributor_id }
  });

  if (error) throw error;
  return data;
};