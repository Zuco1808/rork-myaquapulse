import { supabase } from '@/lib/supabase';
import { Distributor } from '@/types/user';

export const getDistributors = async (): Promise<Distributor[]> => {
  const { data, error } = await supabase
    .from('distributors')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const getDistributorById = async (id: string): Promise<Distributor> => {
  const { data, error } = await supabase
    .from('distributors')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const getDistributorUtilities = async (distributorId: string) => {
  const { data, error } = await supabase
    .from('water_utilities')
    .select('*')
    .eq('distributor_id', distributorId)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const getUnassignedUtilities = async () => {
  const { data, error } = await supabase
    .from('water_utilities')
    .select('*')
    .is('distributor_id', null)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const createDistributor = async (distributor: {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
}): Promise<Distributor> => {
  const { data, error } = await supabase
    .from('distributors')
    .insert({ ...distributor, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateDistributor = async (
  id: string,
  updates: Partial<{
    name: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    is_active: boolean;
  }>,
): Promise<Distributor> => {
  const { data, error } = await supabase
    .from('distributors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const assignUtilityToDistributor = async (
  utilityId: string,
  distributorId: string | null,
) => {
  const { data, error } = await supabase
    .from('water_utilities')
    .update({ distributor_id: distributorId })
    .eq('id', utilityId)
    .select()
    .single();
  if (error) throw error;
  return data;
};
