import { supabase } from '@/lib/supabase';

const mapCompany = (c: any) => ({
  id: c.id,
  name: c.name,
  address: c.address,
  city: c.city,
  postalCode: c.postal_code || c.postalCode || '',
  country: c.country || 'Bosnia and Herzegovina',
  phone: c.phone,
  email: c.email,
  website: c.website || '',
  logo: c.logo || '',
  supportEmail: c.support_email || '',
  usersCount: c.users_count ?? undefined,
  locationsCount: c.locations_count ?? undefined,
  metersCount: c.meters_count ?? undefined,
  isActive: c.is_active ?? true,
  createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
  updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : undefined,
});

export const getCompanies = async () => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapCompany);
};

export const getCompanyById = async (id: string) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapCompany(data);
};

export const updateCompany = async (
  id: string,
  updates: Partial<{
    name: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    support_email: string;
  }>
) => {
  const { data, error } = await supabase
    .from('companies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapCompany(data);
};
