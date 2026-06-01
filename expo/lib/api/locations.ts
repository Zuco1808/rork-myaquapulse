import { supabase } from '@/lib/supabase';

export interface LocationWithStats {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  companyId: string;
  type?: string;
  parentId?: string;
  buildingCount: number;
  meterCount: number;
  userCount: number;
  createdAt: number;
}

// Returns all locations enriched with derived counts:
// meterCount (water_meters at the location), userCount (distinct meter owners),
// buildingCount (child locations whose parent_id points here).
export const getLocationsWithStats = async (): Promise<LocationWithStats[]> => {
  const [locationsRes, metersRes] = await Promise.all([
    supabase.from('locations').select('*').order('name'),
    supabase.from('water_meters').select('id, location_id, user_id'),
  ]);

  if (locationsRes.error) throw locationsRes.error;
  if (metersRes.error) throw metersRes.error;

  const locations = (locationsRes.data || []) as any[];
  const meters = (metersRes.data || []) as any[];

  const childCountByParent = new Map<string, number>();
  locations.forEach((loc) => {
    if (loc.parent_id) {
      childCountByParent.set(loc.parent_id, (childCountByParent.get(loc.parent_id) || 0) + 1);
    }
  });

  const meterCountByLocation = new Map<string, number>();
  const usersByLocation = new Map<string, Set<string>>();
  meters.forEach((m) => {
    if (!m.location_id) return;
    meterCountByLocation.set(m.location_id, (meterCountByLocation.get(m.location_id) || 0) + 1);
    if (m.user_id) {
      const set = usersByLocation.get(m.location_id) || new Set<string>();
      set.add(m.user_id);
      usersByLocation.set(m.location_id, set);
    }
  });

  return locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address ?? '',
    city: loc.city ?? '',
    postalCode: loc.postal_code ?? '',
    companyId: loc.company_id ?? '',
    type: loc.type ?? undefined,
    parentId: loc.parent_id ?? undefined,
    buildingCount: childCountByParent.get(loc.id) || 0,
    meterCount: meterCountByLocation.get(loc.id) || 0,
    userCount: usersByLocation.get(loc.id)?.size || 0,
    createdAt: loc.created_at ? new Date(loc.created_at).getTime() : Date.now(),
  }));
};

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
