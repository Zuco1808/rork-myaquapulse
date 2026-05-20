import { supabase } from '@/lib/supabase';

const mapReading = (r: any) => ({
  id: r.id,
  meterId: r.meter_id,
  value: r.value,
  readingDate: new Date(r.reading_date).getTime(),
  readBy: r.read_by,
  readMethod: r.read_method,
  imageUrl: r.image_url,
  status: r.status,
  consumption: r.consumption,
  previousValue: r.previous_value,
  notes: r.notes,
  meterSerialNumber: r.water_meters?.serial_number,
  locationName: r.water_meters?.locations?.name,
  createdAt: new Date(r.created_at).getTime(),
});

export const getReadings = async () => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, water_meters(serial_number, locations(name, address))')
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReading);
};

export const getReadingsByMeter = async (meterId: string) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*')
    .eq('meter_id', meterId)
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReading);
};

export const createReading = async (reading: {
  meter_id: string;
  value: number;
  read_by: string;
  read_method?: string;
  image_url?: string;
  notes?: string;
}) => {
  const { data: lastReading } = await supabase
    .from('meter_readings')
    .select('value')
    .eq('meter_id', reading.meter_id)
    .eq('status', 'verified')
    .order('reading_date', { ascending: false })
    .limit(1)
    .single();

  const previousValue = lastReading?.value ?? null;
  const consumption = previousValue !== null ? reading.value - previousValue : null;

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      ...reading,
      previous_value: previousValue,
      consumption,
      reading_date: new Date().toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return mapReading(data);
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
  return mapReading(data);
};
