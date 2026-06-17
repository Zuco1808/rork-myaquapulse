import { supabase } from '@/lib/supabase';

export const TIER_LABELS: Record<string, string> = {
  basic: 'Osnovni', standard: 'Standard', premium: 'Premium',
};

/** Stopa provizije po paketu (spec §5.3): 20% Basic/Standard, 15% Premium. */
export const commissionRate = (tier: string): number => (tier === 'premium' ? 0.15 : 0.20);

export interface UtilityCommission {
  utilityId: string;
  utilityName: string;
  tier: string;
  subscriptionFee: number;
  rate: number;
  commission: number;
}

export interface DistributorCommission {
  distributorId: string;
  distributorName: string;
  utilities: UtilityCommission[];
  totalSubscription: number;
  totalCommission: number;
}

/**
 * Mjesečne provizije po distributeru. RLS ograničava skup vodovoda
 * (super_admin sve, distributor_admin svoje). Agregira se po distributeru.
 */
export const getCommissions = async (): Promise<DistributorCommission[]> => {
  const { data, error } = await supabase
    .from('water_utilities')
    .select('id, name, package_tier, subscription_fee, distributor_id, is_active, distributors:distributor_id ( name )')
    .eq('is_active', true);
  if (error) throw error;

  const byDist = new Map<string, DistributorCommission>();
  for (const u of (data ?? []) as any[]) {
    const distId = u.distributor_id ?? 'none';
    const distName = u.distributors?.name ?? 'Bez distributera';
    const tier = u.package_tier ?? 'basic';
    const fee = Number(u.subscription_fee) || 0;
    const rate = commissionRate(tier);
    const commission = Math.round(fee * rate * 100) / 100;

    if (!byDist.has(distId)) {
      byDist.set(distId, {
        distributorId: distId, distributorName: distName,
        utilities: [], totalSubscription: 0, totalCommission: 0,
      });
    }
    const d = byDist.get(distId)!;
    d.utilities.push({
      utilityId: u.id, utilityName: u.name, tier, subscriptionFee: fee, rate, commission,
    });
    d.totalSubscription += fee;
    d.totalCommission += commission;
  }

  return [...byDist.values()]
    .map((d) => ({
      ...d,
      totalSubscription: Math.round(d.totalSubscription * 100) / 100,
      totalCommission: Math.round(d.totalCommission * 100) / 100,
    }))
    .sort((a, b) => b.totalCommission - a.totalCommission);
};
