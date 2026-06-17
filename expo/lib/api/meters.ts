import { supabase } from '@/lib/supabase';

const mapConnection = (c: any) => ({
  id: c.id,
  utility_id: c.utility_id,
  user_id: c.user_id,
  serialNumber: c.meter_serial,
  address: c.address,
  meter_type: c.meter_type,
  user_group: c.user_group,
  is_active: c.is_active,
  location_id: c.location_id ?? null,
  locationName: c.locations?.name ?? null,
  isShared: !!c.is_shared,
  latitude: c.latitude != null ? Number(c.latitude) : null,
  longitude: c.longitude != null ? Number(c.longitude) : null,
  userId: c.user_id,
  userName: c.profiles?.full_name || '',
  userEmail: c.profiles?.email || '',
  createdAt: new Date(c.created_at).getTime(),
  updatedAt: new Date(c.updated_at).getTime(),
});

export const getMeters = async (opts?: { limit?: number; offset?: number }) => {
  const limit  = opts?.limit  ?? 50;
  const offset = opts?.offset ?? 0;
  const { data, error } = await supabase
    .from('connections')
    .select('*, profiles(full_name, email), locations(name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(mapConnection);
};

export const getMeterById = async (id: string) => {
  const { data, error } = await supabase
    .from('connections')
    .select('*, profiles(full_name, email), locations(name)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapConnection(data);
};

export const getMetersByUser = async (userId: string, opts?: { limit?: number; offset?: number }) => {
  const limit  = opts?.limit  ?? 50;
  const offset = opts?.offset ?? 0;
  const { data, error } = await supabase
    .from('connections')
    .select('*, profiles(full_name, email), locations(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(mapConnection);
};

export const createMeter = async (meter: {
  utility_id: string;
  user_id: string;
  address: string;
  meter_serial: string;
  meter_type?: string;
  user_group?: string;
  location_id?: string | null;
  is_shared?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}) => {
  const { data, error } = await supabase
    .from('connections')
    .insert(meter)
    .select()
    .single();

  if (error) throw error;
  return mapConnection(data);
};

export const updateMeter = async (id: string, updates: Partial<{
  address: string;
  meter_serial: string;
  meter_type: string;
  user_group: string;
  is_active: boolean;
  user_id: string;
  location_id: string | null;
  is_shared: boolean;
  latitude: number | null;
  longitude: number | null;
}>) => {
  const { data, error } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapConnection(data);
};

/** Brojila vezana za lokaciju (zgradu) — zajednička i individualna. */
export const getMetersByLocation = async (locationId: string) => {
  const { data, error } = await supabase
    .from('connections')
    .select('*, profiles(full_name, email), locations(name)')
    .eq('location_id', locationId)
    .order('is_shared', { ascending: false })
    .order('meter_serial');
  if (error) throw error;
  return (data || []).map(mapConnection);
};