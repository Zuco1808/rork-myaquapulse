import { supabase } from '@/lib/supabase';

const mapCompany = (c: any) => ({
  id: c.id,
  name: c.name ?? '',
  address: c.address ?? '',
  city: c.city ?? '',
  postalCode: c.postal_code ?? '',
  country: c.country ?? 'Bosnia and Herzegovina',
  phone: c.phone ?? '',
  email: c.email ?? '',
  website: c.website ?? '',
  logo: c.logo_url ?? '',
  supportEmail: c.support_email ?? '',
  pib: c.pib ?? '',
  vatRate: c.vat_rate != null ? Number(c.vat_rate) : 17,
  isActive: c.is_active ?? true,
  createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
  updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : undefined,
});

export const getCompanies = async () => {
  const { data, error } = await supabase
    .from('water_utilities')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapCompany);
};

export const getCompanyById = async (id: string) => {
  const { data, error } = await supabase
    .from('water_utilities')
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
    vat_rate: number;
  }>
) => {
  // Map `logo` → `logo_url` (internal column name in water_utilities)
  const { logo, ...rest } = updates as any;
  const patch: Record<string, any> = { ...rest, updated_at: new Date().toISOString() };
  if (logo !== undefined) patch.logo_url = logo;

  const { data, error } = await supabase
    .from('water_utilities')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapCompany(data);
};
