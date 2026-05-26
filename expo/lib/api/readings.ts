import { supabase } from '@/lib/supabase';

// is_verified=true → verified, is_verified=false + verified_at set → rejected,
// is_verified=false + verified_at null → pending (never reviewed)
const deriveStatus = (r: any): 'pending' | 'verified' | 'rejected' => {
  if (r.is_verified) return 'verified';
  if (r.verified_at != null) return 'rejected'; // was reviewed but set back to false
  return 'pending';
};

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
  status: deriveStatus(r),
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

export const getReadingsByUser = async (userId: string) => {
  const { data: conns, error: connsError } = await supabase
    .from('connections')
    .select('id')
    .eq('user_id', userId);

  if (connsError) throw connsError;
  if (!conns || conns.length === 0) return [];

  const ids = conns.map((c: any) => c.id);

  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, connections(meter_serial, address)')
    .in('connection_id', ids)
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapReading);
};

export const verifyReading = async (id: string, verified: boolean) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .update({
      is_verified: verified,
      // stamp verified_at so we can distinguish rejected (false+stamp) from pending (false+no stamp)
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapReading(data);
};