import { supabase } from '@/lib/supabase';
import { UserGroup, UserGroupType } from '@/types/user';
import { PricingPackage } from '@/components/pricing/PackageCard';
import { PricingPeriod } from '@/components/pricing/PeriodCard';
import { PricingTier } from '@/components/pricing/PricingTierCard';

/* ── date helpers ─────────────────────────────────────── */
/** "DD.MM.YYYY" → "YYYY-MM-DD" for DB storage */
const toDBDate = (ddmmyyyy: string): string => {
  const parts = ddmmyyyy.split('.');
  if (parts.length !== 3) return ddmmyyyy;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
};

/** "YYYY-MM-DD" → "DD.MM.YYYY" for display */
const fromDBDate = (iso: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
};

/* ══════════════════════════════════════════════════════
   USER GROUPS
══════════════════════════════════════════════════════ */
export const getUserGroups = async (utilityId?: string): Promise<UserGroup[]> => {
  let q = supabase.from('user_groups').select('*').order('name');
  if (utilityId) q = q.eq('utility_id', utilityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id:          r.id,
    name:        r.name,
    type:        r.type as UserGroupType,
    description: r.description ?? undefined,
    isDefault:   r.is_default,
  }));
};

export const createUserGroup = async (params: {
  utility_id: string;
  name:        string;
  type:        UserGroupType;
  description?: string;
  is_default?:  boolean;
}): Promise<UserGroup> => {
  const { data, error } = await supabase
    .from('user_groups')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return {
    id:          data.id,
    name:        data.name,
    type:        data.type as UserGroupType,
    description: data.description ?? undefined,
    isDefault:   data.is_default,
  };
};

export const updateUserGroup = async (
  id: string,
  params: Partial<{
    name:        string;
    type:        UserGroupType;
    description: string;
    is_default:  boolean;
  }>,
): Promise<UserGroup> => {
  const { data, error } = await supabase
    .from('user_groups')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id:          data.id,
    name:        data.name,
    type:        data.type as UserGroupType,
    description: data.description ?? undefined,
    isDefault:   data.is_default,
  };
};

export const deleteUserGroup = async (id: string): Promise<void> => {
  const { error } = await supabase.from('user_groups').delete().eq('id', id);
  if (error) throw error;
};

/* ══════════════════════════════════════════════════════
   PRICING PERIODS
══════════════════════════════════════════════════════ */
export const getPricingPeriods = async (utilityId?: string): Promise<PricingPeriod[]> => {
  let q = supabase.from('pricing_periods').select('*').order('start_date');
  if (utilityId) q = q.eq('utility_id', utilityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id:          r.id,
    name:        r.name,
    startDate:   fromDBDate(r.start_date),
    endDate:     fromDBDate(r.end_date),
    description: r.description ?? '',
    isActive:    r.is_active,
  }));
};

export const createPricingPeriod = async (params: {
  utility_id:  string;
  name:        string;
  startDate:   string;  // DD.MM.YYYY
  endDate:     string;  // DD.MM.YYYY
  description?: string;
  isActive?:    boolean;
}): Promise<PricingPeriod> => {
  const { data, error } = await supabase
    .from('pricing_periods')
    .insert({
      utility_id:  params.utility_id,
      name:        params.name,
      start_date:  toDBDate(params.startDate),
      end_date:    toDBDate(params.endDate),
      description: params.description ?? null,
      is_active:   params.isActive ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id:          data.id,
    name:        data.name,
    startDate:   fromDBDate(data.start_date),
    endDate:     fromDBDate(data.end_date),
    description: data.description ?? '',
    isActive:    data.is_active,
  };
};

export const updatePricingPeriod = async (
  id: string,
  params: Partial<{
    name:        string;
    startDate:   string;
    endDate:     string;
    description: string;
    isActive:    boolean;
  }>,
): Promise<PricingPeriod> => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name        !== undefined) updates.name        = params.name;
  if (params.startDate   !== undefined) updates.start_date  = toDBDate(params.startDate);
  if (params.endDate     !== undefined) updates.end_date    = toDBDate(params.endDate);
  if (params.description !== undefined) updates.description = params.description;
  if (params.isActive    !== undefined) updates.is_active   = params.isActive;

  const { data, error } = await supabase
    .from('pricing_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id:          data.id,
    name:        data.name,
    startDate:   fromDBDate(data.start_date),
    endDate:     fromDBDate(data.end_date),
    description: data.description ?? '',
    isActive:    data.is_active,
  };
};

export const deletePricingPeriod = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_periods').delete().eq('id', id);
  if (error) throw error;
};

/* ══════════════════════════════════════════════════════
   PRICING PACKAGES
══════════════════════════════════════════════════════ */
export const getPricingPackages = async (utilityId?: string): Promise<PricingPackage[]> => {
  let q = supabase.from('pricing_packages').select('*').order('name');
  if (utilityId) q = q.eq('utility_id', utilityId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id:           r.id,
    name:         r.name,
    description:  r.description ?? '',
    isDefault:    r.is_default,
    periodIds:    r.period_ids    ?? [],
    userGroupIds: r.user_group_ids ?? [],
  }));
};

export const createPricingPackage = async (params: {
  utility_id:      string;
  name:            string;
  description?:    string;
  is_default?:     boolean;
  period_ids?:     string[];
  user_group_ids?: string[];
}): Promise<PricingPackage> => {
  const { data, error } = await supabase
    .from('pricing_packages')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return {
    id:           data.id,
    name:         data.name,
    description:  data.description ?? '',
    isDefault:    data.is_default,
    periodIds:    data.period_ids    ?? [],
    userGroupIds: data.user_group_ids ?? [],
  };
};

export const updatePricingPackage = async (
  id: string,
  params: Partial<{
    name:            string;
    description:     string;
    is_default:      boolean;
    period_ids:      string[];
    user_group_ids:  string[];
  }>,
): Promise<PricingPackage> => {
  const { data, error } = await supabase
    .from('pricing_packages')
    .update({ ...params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id:           data.id,
    name:         data.name,
    description:  data.description ?? '',
    isDefault:    data.is_default,
    periodIds:    data.period_ids    ?? [],
    userGroupIds: data.user_group_ids ?? [],
  };
};

export const deletePricingPackage = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_packages').delete().eq('id', id);
  if (error) throw error;
};

/* ══════════════════════════════════════════════════════
   PRICING TIERS
══════════════════════════════════════════════════════ */
export const getPricingTiers = async (packageId: string): Promise<PricingTier[]> => {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('package_id', packageId)
    .order('sort_order')
    .order('min_consumption');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id:             r.id,
    minConsumption: Number(r.min_consumption),
    maxConsumption: r.max_consumption != null ? Number(r.max_consumption) : null,
    pricePerUnit:   Number(r.price_per_unit),
    description:    r.description ?? '',
  }));
};

export const createPricingTier = async (params: {
  package_id:       string;
  min_consumption:  number;
  max_consumption?: number | null;
  price_per_unit:   number;
  description?:     string;
  sort_order?:      number;
}): Promise<PricingTier> => {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return {
    id:             data.id,
    minConsumption: Number(data.min_consumption),
    maxConsumption: data.max_consumption != null ? Number(data.max_consumption) : null,
    pricePerUnit:   Number(data.price_per_unit),
    description:    data.description ?? '',
  };
};

export const updatePricingTier = async (
  id: string,
  params: Partial<{
    min_consumption: number;
    max_consumption: number | null;
    price_per_unit:  number;
    description:     string;
    sort_order:      number;
  }>,
): Promise<PricingTier> => {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .update(params)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return {
    id:             data.id,
    minConsumption: Number(data.min_consumption),
    maxConsumption: data.max_consumption != null ? Number(data.max_consumption) : null,
    pricePerUnit:   Number(data.price_per_unit),
    description:    data.description ?? '',
  };
};

export const deletePricingTier = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_tiers').delete().eq('id', id);
  if (error) throw error;
};
