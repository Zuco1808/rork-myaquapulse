import { supabase } from '@/lib/supabase';

export const getReadings = async () => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, water_meters(serial_number, locations(name, address))')
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const getReadingsByMeter = async (meterId: string) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*')
    .eq('meter_id', meterId)
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const createReading = async (reading: {
  meter_id: string;
  value: number;
  read_by: string;
  read_method?: string;
  image_url?: string;
  notes?: string;
}) => {
  // Dohvati prethodno ocitanje za izracun potrošnje
  const { data: lastReading } = await supabase
    .from('meter_readings')
    .select('value')
    .eq('meter_id', reading.meter_id)
    .eq('status', 'verified')
    .order('reading_date', { ascending: false })
    .limit(1)
    .single();

  const previousValue = lastReading?.value ?? null;
  const consumption = previousValue !== null
    ? reading.value - previousValue
    : null;

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      ...reading,
      previous_value: previousValue,
      consumption: consumption,
      reading_date: new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateReadingStatus = async (
  id: string,
  status: 'verified' | 'rejected',
  notes?: string
) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .update({ status, notes })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};
