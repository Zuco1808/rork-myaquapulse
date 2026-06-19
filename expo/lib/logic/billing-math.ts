/**
 * Čiste poslovne funkcije (bez RN/Supabase zavisnosti) — jedini izvor istine
 * za obračune; pokrivene unit testovima.
 */

export interface PricingTier {
  min_consumption: number;
  max_consumption: number | null; // null = neograničeno
  price_per_unit: number | null;
  sort_order?: number;
}

/** Tiered (blokovski) obračun: potrošnja × cijena po razredima. Vrati BAM (2 dec.). */
export function applyTiers(tiers: PricingTier[], consumption: number): number {
  if (!tiers.length || consumption <= 0) return 0;
  const sorted = [...tiers].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  let total = 0;
  let remaining = consumption;
  for (const t of sorted) {
    if (remaining <= 0) break;
    const cap = (t.max_consumption ?? Infinity) - t.min_consumption;
    const inTier = Math.min(remaining, cap);
    if (inTier > 0) {
      total += inTier * (t.price_per_unit ?? 0);
      remaining -= inTier;
    }
  }
  return Math.round(total * 100) / 100;
}

export interface VatBreakdown {
  net: number;
  vat: number;
  rate: number;
}

/** Izvlači osnovicu i PDV iz BRUTO iznosa (PDV uključen). */
export function vatBreakdown(gross: number, rate: number): VatBreakdown {
  const g = Number(gross) || 0;
  const r = Number(rate) || 0;
  const net = r > 0 ? g / (1 + r / 100) : g;
  return { net, vat: g - net, rate: r };
}

/** Stopa distributerske provizije (spec §5.3): 20% Basic/Standard, 15% Premium. */
export function commissionRate(tier: string): number {
  return tier === 'premium' ? 0.15 : 0.20;
}

/**
 * Detekcija neusklađenosti zajedničkog (kontrolnog) brojila i sume individualnih.
 * Tolerancija: max(1 m³, 5% zajedničkog) — normalni mrežni gubici.
 */
export function consumptionMismatch(
  sharedTotal: number,
  individualTotal: number,
): { diff: number; tolerance: number; mismatch: boolean } {
  const diff = sharedTotal - individualTotal;
  const tolerance = Math.max(1, sharedTotal * 0.05);
  return { diff, tolerance, mismatch: Math.abs(diff) > tolerance };
}
