import { supabase } from '@/lib/supabase';
import { Location } from '@/types/user';

/* ── mapper ──────────────────────────────────────────────── */
const mapLocation = (r: any): Location => ({
  id:           r.id,
  name:         r.name,
  address:      r.address    ?? '',
  city:         r.city       ?? '',
  postalCode:   r.postal_code ?? '',
  country:      r.country    ?? 'BA',
  companyId:    r.utility_id,
  type:         r.type       ?? undefined,
  parentId:     r.parent_id  ?? undefined,
  coordinates:  (r.latitude != null && r.longitude != null)
    ? { latitude: Number(r.latitude), longitude: Number(r.longitude) }
    : undefined,
  // Computed counts — not stored in DB; returned as null by default
  buildingCount: r.building_count ?? undefined,
  meterCount:    r.meter_count    ?? undefined,
  userCount:     r.user_count     ?? undefined,
  createdAt:     new Date(r.created_at).getTime(),
  updatedAt:     r.updated_at ? new Date(r.updated_at).getTime() : undefined,
});

/* ── queries ─────────────────────────────────────────────── */

export const getLocations = async (utilityId?: string): Promise<Location[]> => {
  let q = supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (utilityId) q = q.eq('utility_id', utilityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapLocation);
};

export const getLocationById = async (id: string): Promise<Location> => {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapLocation(data);
};

/* ── mutations ───────────────────────────────────────────── */

export const createLocation = async (params: {
  name:         string;
  address?:     string;
  city?:        string;
  postal_code?: string;
  country?:     string;
  type?:        string;
  /** Alias accepted for backward-compat; maps to utility_id */
  company_id?:  string;
  utility_id?:  string;
  parent_id?:   string;
  latitude?:    number;
  longitude?:   number;
}): Promise<Location> => {
  const { company_id, ...rest } = params;
  const row = {
    ...rest,
    // accept either field name; utility_id takes precedence
    utility_id: rest.utility_id ?? company_id,
  };

  const { data, error } = await supabase
    .from('locations')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapLocation(data);
};

export const updateLocation = async (
  id: string,
  updates: Partial<{
    name:        string;
    address:     string;
    city:        string;
    postal_code: string;
    country:     string;
    type:        string;
    parent_id:   string;
    latitude:    number;
    longitude:   number;
    is_active:   boolean;
  }>,
): Promise<Location> => {
  const { data, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapLocation(data);
};

export const deleteLocation = async (id: string): Promise<void> => {
  // Soft-delete: set is_active=false
  const { error } = await supabase
    .from('locations')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
};
