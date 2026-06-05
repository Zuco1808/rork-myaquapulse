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

export interface ReadingsOpts {
  limit?: number;
  offset?: number;
  search?: string;
  status?: 'pending' | 'verified' | 'rejected';
}

const applyReadingFilters = (q: any, opts?: ReadingsOpts) => {
  if (opts?.search) q = q.ilike('connections.meter_serial', `%${opts.search}%`);
  if (opts?.status === 'verified') q = q.eq('is_verified', true);
  else if (opts?.status === 'rejected') q = q.eq('is_verified', false).not('verified_at', 'is', null);
  else if (opts?.status === 'pending') q = q.eq('is_verified', false).is('verified_at', null);
  return q;
};

export const getReadings = async (opts?: ReadingsOpts) => {
  const limit  = opts?.limit  ?? 40;
  const offset = opts?.offset ?? 0;
  const sel = opts?.search
    ? '*, connections!inner(meter_serial, address)'
    : '*, connections(meter_serial, address)';
  let q = supabase
    .from('meter_readings')
    .select(sel)
    .order('reading_date', { ascending: false })
    .range(offset, offset + limit - 1);

  q = applyReadingFilters(q, opts);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapReading);
};

export const getReadingsByConnection = async (connectionId: string, opts?: ReadingsOpts) => {
  const limit  = opts?.limit  ?? 40;
  const offset = opts?.offset ?? 0;
  const sel = opts?.search
    ? '*, connections!inner(meter_serial, address)'
    : '*, connections(meter_serial, address)';
  let q = supabase
    .from('meter_readings')
    .select(sel)
    .eq('connection_id', connectionId)
    .order('reading_date', { ascending: false })
    .range(offset, offset + limit - 1);

  q = applyReadingFilters(q, opts);
  const { data, error } = await q;
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

export const getReadingsByUser = async (userId: string, opts?: ReadingsOpts) => {
  const limit  = opts?.limit  ?? 40;
  const offset = opts?.offset ?? 0;

  const { data: conns, error: connsError } = await supabase
    .from('connections')
    .select('id')
    .eq('user_id', userId);

  if (connsError) throw connsError;
  if (!conns || conns.length === 0) return [];

  const ids = conns.map((c: any) => c.id);
  const sel = opts?.search
    ? '*, connections!inner(meter_serial, address)'
    : '*, connections(meter_serial, address)';
  let q = supabase
    .from('meter_readings')
    .select(sel)
    .in('connection_id', ids)
    .order('reading_date', { ascending: false })
    .range(offset, offset + limit - 1);

  q = applyReadingFilters(q, opts);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapReading);
};

export const getReadingById = async (id: string) => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('*, connections(meter_serial, address)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return {
    ...mapReading(data),
    meterLocationAddress: (data as any).connections?.address ?? null,
    meterLocationName: null as string | null,
    previousValue: null as number | null,
    consumption: null as number | null,
    readByName: null as string | null,
  };
};

export const updateReading = async (
  id: string,
  updates: { value?: number; notes?: string },
) => {
  const patch: Record<string, unknown> = {};
  if (updates.value !== undefined) patch.reading_value = updates.value;
  if (updates.notes !== undefined) patch.note = updates.notes;
  const { data, error } = await supabase
    .from('meter_readings')
    .update(patch)
    .eq('id', id)
    .select('*, connections(meter_serial, address)')
    .single();
  if (error) throw error;
  return mapReading(data);
};

export const updateReadingStatus = async (
  id: string,
  status: 'verified' | 'rejected',
  notes?: string,
) => {
  const patch: Record<string, unknown> = {
    is_verified: status === 'verified',
    verified_at: new Date().toISOString(),
  };
  if (notes !== undefined) patch.note = notes;
  const { data, error } = await supabase
    .from('meter_readings')
    .update(patch)
    .eq('id', id)
    .select('*, connections(meter_serial, address)')
    .single();
  if (error) throw error;
  return mapReading(data);
};

export const getReadingsByMeter = getReadingsByConnection;

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