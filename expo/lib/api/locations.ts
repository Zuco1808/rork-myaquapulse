import { supabase } from '@/lib/supabase';

export const getLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getLocationById = async (id: string) => {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createLocation = async (location: {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  company_id?: string;
  type?: string;
  parent_id?: string;
  latitude?: number;
  longitude?: number;
}) => {
  const { data, error } = await supabase
    .from('locations')
    .insert(location)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLocation = async (id: string, updates: Partial<{
  name: string;
  address: string;
  city: string;
  postal_code: string;
  type: string;
  parent_id: string;
  latitude: number;
  longitude: number;
}>) => {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteLocation = async (id: string) => {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
