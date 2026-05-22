import { supabase } from '@/lib/supabase';

const mapReading = (r: any) => ({
  id: r.id,
  connection_id: r.connection_id,
  utility_id: r.utility_id,
  worker_id: r.worker_id,
  meterId: r.connection_id,
  value: r.reading_value,
  readingDate: new Date(r.reading_date).getTime(),
  readBy: r.worker_id,
  readMethod: r.reading_type,
  imageUrl: r.photo_url,
  status: (r.is_verified ? 'verified' : 'pending') as 'pending' | 'verified' | 'rejected',
  notes: r.note,
  meterSerialNumber: r.connections?.meter_serial,
  createdAt: new Date(r.created_at).getTime(),
});

export const getReadings = async () => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, connections(meter_serial, address)')
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReading);
};

export const getReadingsByConnection = async (connectionId: string) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, connections(meter_serial, address)')
    .eq('connection_id', connectionId)
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReading);
};

export const createReading = async (reading: {
  connection_id: string;
  utility_id: string;
  reading_value: number;
  reading_type?: string;
  photo_url?: string;
  ocr_raw_text?: string;
  note?: string;
}) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      ...reading,
      reading_date: new Date().toISOString().split('T')[0],
      is_verified: false,
    })
    .select()
    .single();

  if (error) throw error;
  return mapReading(data);
};

export const verifyReading = async (id: string, verified: boolean) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .update({ is_verified: verified })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapReading(data);
};