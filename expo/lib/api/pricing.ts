import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types (camelCase, used by the UI)
// ---------------------------------------------------------------------------
export interface PricingPeriodDto {
  id: string;
  name: string;
  description: string;
  startDate: string; // DD.MM.YYYY (UI format)
  endDate: string; // DD.MM.YYYY
  isActive: boolean;
  companyId: string | null;
}

export interface UserGroupDto {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  type: string;
  companyId: string | null;
}

export interface PricingTierDto {
  id: string;
  packageId: string;
  description: string;
  minConsumption: number;
  maxConsumption: number | null;
  pricePerUnit: number;
  sortOrder: number;
}

export interface PricingPackageDto {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  currency: string;
  isActive: boolean;
  companyId: string | null;
  periodIds: string[];
  userGroupIds: string[];
}

// ---------------------------------------------------------------------------
// Date helpers: DB stores ISO dates (YYYY-MM-DD); UI uses DD.MM.YYYY.
// ---------------------------------------------------------------------------
const isoToUiDate = (iso: string | null): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return '';
  return `${d}.${m}.${y}`;
};

export const uiToIsoDate = (ui: string): string | null => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(ui.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
};

// ===========================================================================
// Periods
// ===========================================================================
const mapPeriod = (p: any): PricingPeriodDto => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  startDate: isoToUiDate(p.start_date),
  endDate: isoToUiDate(p.end_date),
  isActive: p.is_active ?? false,
  companyId: p.company_id ?? null,
});

export const getPeriods = async (): Promise<PricingPeriodDto[]> => {
  const { data, error } = await supabase
    .from('pricing_periods')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapPeriod);
};

export const createPeriod = async (period: {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  companyId?: string | null;
}): Promise<PricingPeriodDto> => {
  const { data, error } = await supabase
    .from('pricing_periods')
    .insert({
      name: period.name,
      description: period.description ?? null,
      start_date: uiToIsoDate(period.startDate),
      end_date: uiToIsoDate(period.endDate),
      is_active: period.isActive ?? false,
      company_id: period.companyId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapPeriod(data);
};

export const updatePeriod = async (
  id: string,
  updates: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  },
): Promise<PricingPeriodDto> => {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.startDate !== undefined) patch.start_date = uiToIsoDate(updates.startDate);
  if (updates.endDate !== undefined) patch.end_date = uiToIsoDate(updates.endDate);
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('pricing_periods')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapPeriod(data);
};

export const deletePeriod = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_periods').delete().eq('id', id);
  if (error) throw error;
};

// ===========================================================================
// User groups
// ===========================================================================
const mapUserGroup = (g: any): UserGroupDto => ({
  id: g.id,
  name: g.name,
  description: g.description ?? '',
  isDefault: g.is_default ?? false,
  type: g.type ?? 'household',
  companyId: g.company_id ?? null,
});

export const getUserGroups = async (): Promise<UserGroupDto[]> => {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapUserGroup);
};

export const createUserGroup = async (group: {
  name: string;
  description?: string;
  type?: string;
  isDefault?: boolean;
  companyId?: string | null;
}): Promise<UserGroupDto> => {
  const { data, error } = await supabase
    .from('user_groups')
    .insert({
      name: group.name,
      description: group.description ?? null,
      type: group.type ?? 'household',
      is_default: group.isDefault ?? false,
      company_id: group.companyId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapUserGroup(data);
};

export const updateUserGroup = async (
  id: string,
  updates: {
    name?: string;
    description?: string;
    type?: string;
    isDefault?: boolean;
  },
): Promise<UserGroupDto> => {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.type !== undefined) patch.type = updates.type;
  if (updates.isDefault !== undefined) patch.is_default = updates.isDefault;

  const { data, error } = await supabase
    .from('user_groups')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapUserGroup(data);
};

export const deleteUserGroup = async (id: string): Promise<void> => {
  const { error } = await supabase.from('user_groups').delete().eq('id', id);
  if (error) throw error;
};

// ===========================================================================
// Tiers
// ===========================================================================
const mapTier = (t: any): PricingTierDto => ({
  id: t.id,
  packageId: t.package_id,
  description: t.description ?? '',
  minConsumption: Number(t.min_consumption ?? 0),
  maxConsumption: t.max_consumption === null || t.max_consumption === undefined
    ? null
    : Number(t.max_consumption),
  pricePerUnit: Number(t.price_per_unit ?? 0),
  sortOrder: t.sort_order ?? 0,
});

export const getTiersByPackage = async (
  packageId: string,
): Promise<PricingTierDto[]> => {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('package_id', packageId)
    .order('sort_order', { ascending: true })
    .order('min_consumption', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapTier);
};

export const createTier = async (tier: {
  packageId: string;
  description?: string;
  minConsumption: number;
  maxConsumption: number | null;
  pricePerUnit: number;
  sortOrder?: number;
}): Promise<PricingTierDto> => {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .insert({
      package_id: tier.packageId,
      description: tier.description ?? null,
      min_consumption: tier.minConsumption,
      max_consumption: tier.maxConsumption,
      price_per_unit: tier.pricePerUnit,
      sort_order: tier.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTier(data);
};

export const updateTier = async (
  id: string,
  updates: {
    description?: string;
    minConsumption?: number;
    maxConsumption?: number | null;
    pricePerUnit?: number;
    sortOrder?: number;
  },
): Promise<PricingTierDto> => {
  const patch: Record<string, unknown> = {};
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.minConsumption !== undefined) patch.min_consumption = updates.minConsumption;
  if (updates.maxConsumption !== undefined) patch.max_consumption = updates.maxConsumption;
  if (updates.pricePerUnit !== undefined) patch.price_per_unit = updates.pricePerUnit;
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;

  const { data, error } = await supabase
    .from('pricing_tiers')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTier(data);
};

export const deleteTier = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_tiers').delete().eq('id', id);
  if (error) throw error;
};

// ===========================================================================
// Packages (with period / user-group associations)
// ===========================================================================
const PACKAGE_SELECT =
  '*, package_periods(period_id), package_user_groups(user_group_id)';

const mapPackage = (p: any): PricingPackageDto => ({
  id: p.id,
  name: p.name,
  description: p.description ?? '',
  isDefault: p.is_default ?? false,
  currency: p.currency ?? 'BAM',
  isActive: p.is_active ?? true,
  companyId: p.company_id ?? null,
  periodIds: (p.package_periods || []).map((r: any) => r.period_id),
  userGroupIds: (p.package_user_groups || []).map((r: any) => r.user_group_id),
});

export const getPackages = async (): Promise<PricingPackageDto[]> => {
  const { data, error } = await supabase
    .from('pricing_packages')
    .select(PACKAGE_SELECT)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapPackage);
};

export const getPackageById = async (id: string): Promise<PricingPackageDto> => {
  const { data, error } = await supabase
    .from('pricing_packages')
    .select(PACKAGE_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapPackage(data);
};

const replaceAssociations = async (
  packageId: string,
  periodIds: string[],
  userGroupIds: string[],
): Promise<void> => {
  await supabase.from('package_periods').delete().eq('package_id', packageId);
  await supabase.from('package_user_groups').delete().eq('package_id', packageId);

  if (periodIds.length > 0) {
    const { error } = await supabase
      .from('package_periods')
      .insert(periodIds.map((period_id) => ({ package_id: packageId, period_id })));
    if (error) throw error;
  }
  if (userGroupIds.length > 0) {
    const { error } = await supabase
      .from('package_user_groups')
      .insert(
        userGroupIds.map((user_group_id) => ({ package_id: packageId, user_group_id })),
      );
    if (error) throw error;
  }
};

// Ensures only one default package exists by clearing the flag on all others.
const clearOtherDefaults = async (exceptId?: string): Promise<void> => {
  let query = supabase.from('pricing_packages').update({ is_default: false }).eq('is_default', true);
  if (exceptId) query = query.neq('id', exceptId);
  const { error } = await query;
  if (error) throw error;
};

export const createPackage = async (pkg: {
  name: string;
  description?: string;
  isDefault?: boolean;
  currency?: string;
  companyId?: string | null;
  periodIds?: string[];
  userGroupIds?: string[];
}): Promise<PricingPackageDto> => {
  if (pkg.isDefault) {
    await clearOtherDefaults();
  }

  const { data, error } = await supabase
    .from('pricing_packages')
    .insert({
      name: pkg.name,
      description: pkg.description ?? null,
      is_default: pkg.isDefault ?? false,
      currency: pkg.currency ?? 'BAM',
      company_id: pkg.companyId ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  await replaceAssociations(data.id, pkg.periodIds ?? [], pkg.userGroupIds ?? []);
  return getPackageById(data.id);
};

export const updatePackage = async (
  id: string,
  updates: {
    name?: string;
    description?: string;
    isDefault?: boolean;
    currency?: string;
    periodIds?: string[];
    userGroupIds?: string[];
  },
): Promise<PricingPackageDto> => {
  if (updates.isDefault) {
    await clearOtherDefaults(id);
  }

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.isDefault !== undefined) patch.is_default = updates.isDefault;
  if (updates.currency !== undefined) patch.currency = updates.currency;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from('pricing_packages')
      .update(patch)
      .eq('id', id);
    if (error) throw error;
  }

  if (updates.periodIds !== undefined || updates.userGroupIds !== undefined) {
    const current = await getPackageById(id);
    await replaceAssociations(
      id,
      updates.periodIds ?? current.periodIds,
      updates.userGroupIds ?? current.userGroupIds,
    );
  }

  return getPackageById(id);
};

export const deletePackage = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pricing_packages').delete().eq('id', id);
  if (error) throw error;
};
