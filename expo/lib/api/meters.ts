import { supabase } from '@/lib/supabase';

const mapMeter = (m: any) => ({
  id: m.id,
  serialNumber: m.serial_number,
  type: m.type,
  status: m.status,
  installDate: new Date(m.install_date).getTime(),
  locationId: m.location_id,
  userId: m.user_id,
  notes: m.notes,
  locationName: m.locations?.name || '',
  address: m.locations?.address || '',
  userName: m.profiles?.name || '',
  lastReading: m.last_reading || null,
  createdAt: new Date(m.created_at).getTime(),
});

export const getMeters = async () => {
  const { data, error } = await supabase
    .from('water_meters')
    .select('*, locations(name, address, city), profiles(name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapMeter);
};

export const getMeterById = async (id: string) => {
  const { data, error } = await supabase
    .from('water_meters')
    .select('*, locations(name, address, city), profiles(name, email)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapMeter(data);
};

export const getMetersByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('water_meters')
    .select('*, locations(name, address, city)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapMeter);
};

export const createMeter = async (meter: {
  serial_number: string;
  type: string;
  location_id: string;
  user_id: string;
  install_date?: string;
  notes?: string;
}) => {
  const { data, error } = await supabase
    .from('water_meters')
    .insert(meter)
    .select()
    .single();

  if (error) throw error;
  return mapMeter(data);
};

export const updateMeter = async (id: string, updates: Partial<{
  serial_number: string;
  type: string;
  status: string;
  location_id: string;
  user_id: string;
  notes: string;
}>) => {
  const { data, error } = await supabase
    .from('water_meters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapMeter(data);
};

export const deleteMeter = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('water_meters')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
