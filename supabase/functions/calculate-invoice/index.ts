/**
 * calculate-invoice Edge Function
 *
 * Automatski kalkuliše fakturu za priključak na osnovu dva očitanja
 * i cjenovnog modela (tiered pricing).
 *
 * POST body:
 *  {
 *    connection_id:   string   (required)
 *    reading_from_id: string   (required)
 *    reading_to_id:   string   (required)
 *    due_date?:       string   (ISO date, npr. '2026-07-15')
 *  }
 *
 * Response: { invoice: Invoice }
 *
 * Dozvoljene uloge: super_admin, utility_admin, finance
 *
 * Logika:
 *  1. Učitaj oba očitanja → consumption_m3 = to.value - from.value
 *  2. Učitaj connections → user_group (type string) + utility_id
 *  3. Pronađi user_groups red koji odgovara (utility_id + type)
 *  4. Pronađi pricing_package koji sadrži taj user_group UUID
 *  5. Pronađi pricing_period koji se preklapa s periodom fakture
 *  6. Učitaj pricing_tiers → tiered kalkulacija
 *  7. Kreiraj invoices red sa status='draft'
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ── constants ────────────────────────────────────────────────────────────── */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = new Set(['super_admin', 'utility_admin', 'finance']);

/* ── helpers ──────────────────────────────────────────────────────────────── */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface Tier {
  min_consumption: number;
  max_consumption: number | null;
  price_per_unit:  number;
}

/**
 * Kalkuliše ukupan iznos prema tier-pricing modelu.
 * Tiers moraju biti sortirani po min_consumption ASC.
 *
 * Primjer: consumption=12, tiers=[{0,5,0.80},{5,10,1.20},{10,null,1.60}]
 *   → 5×0.80 + 5×1.20 + 2×1.60 = 4.00 + 6.00 + 3.20 = 13.20 BAM
 */
function calcTiered(consumption: number, tiers: Tier[]): number {
  let total = 0;
  for (const tier of tiers) {
    if (consumption <= tier.min_consumption) break;
    const tierEnd = tier.max_consumption ?? Infinity;
    const inTier  = Math.min(consumption, tierEnd) - tier.min_consumption;
    total += inTier * tier.price_per_unit;
    if (consumption <= tierEnd) break;
  }
  // Round to 2 decimal places (BAM currency)
  return Math.round(total * 100) / 100;
}

/* ── main handler ─────────────────────────────────────────────────────────── */

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    /* ── 1. Auth ── */
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401);

    /* ── 2. Load caller profile ── */
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role, utility_id, is_active')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile)   return json({ error: 'Profile not found' }, 403);
    if (!callerProfile.is_active)       return json({ error: 'Account deactivated' }, 403);
    if (!ALLOWED_ROLES.has(callerProfile.role)) {
      return json({ error: 'Insufficient permissions' }, 403);
    }

    /* ── 3. Parse body ── */
    const body = await req.json() as {
      connection_id:   string;
      reading_from_id: string;
      reading_to_id:   string;
      due_date?:       string;
    };
    const { connection_id, reading_from_id, reading_to_id, due_date } = body;

    if (!connection_id || !reading_from_id || !reading_to_id) {
      return json({ error: 'connection_id, reading_from_id and reading_to_id are required' }, 400);
    }
    if (reading_from_id === reading_to_id) {
      return json({ error: 'reading_from_id and reading_to_id must be different' }, 400);
    }

    /* ── 4. Load both readings ── */
    const { data: readings, error: readingsErr } = await adminClient
      .from('meter_readings')
      .select('id, connection_id, reading_value, reading_date, is_verified')
      .in('id', [reading_from_id, reading_to_id]);

    if (readingsErr) return json({ error: readingsErr.message }, 500);

    const fromReading = readings?.find((r: any) => r.id === reading_from_id);
    const toReading   = readings?.find((r: any) => r.id === reading_to_id);

    if (!fromReading) return json({ error: 'Reading "from" not found' }, 404);
    if (!toReading)   return json({ error: 'Reading "to" not found' }, 404);

    // Both readings must belong to the specified connection
    if (fromReading.connection_id !== connection_id) {
      return json({ error: 'reading_from does not belong to specified connection' }, 400);
    }
    if (toReading.connection_id !== connection_id) {
      return json({ error: 'reading_to does not belong to specified connection' }, 400);
    }

    // "from" must not be chronologically after "to" (isti datum je dozvoljen —
    // npr. inicijalno i korektivno očitanje istog dana; ispravnost vrijednosti
    // pokriva provjera potrošnje ispod)
    const dateFrom = new Date(fromReading.reading_date);
    const dateTo   = new Date(toReading.reading_date);
    if (dateFrom > dateTo) {
      return json({ error: 'reading_from must precede reading_to chronologically' }, 400);
    }

    const consumption = Number(toReading.reading_value) - Number(fromReading.reading_value);
    if (consumption < 0) {
      return json({
        error: `Negative consumption (${consumption} m³) — verify reading values`,
      }, 400);
    }

    /* ── 5. Load connection ── */
    const { data: connection, error: connErr } = await adminClient
      .from('connections')
      .select('id, utility_id, user_group')
      .eq('id', connection_id)
      .single();

    if (connErr || !connection) return json({ error: 'Connection not found' }, 404);

    // Tenant scope: utility_admin can only invoice within their own utility
    if (
      callerProfile.role === 'utility_admin' &&
      connection.utility_id !== callerProfile.utility_id
    ) {
      return json({ error: 'Access denied: connection belongs to another utility' }, 403);
    }

    // finance is also scoped to their utility
    if (
      callerProfile.role === 'finance' &&
      connection.utility_id !== callerProfile.utility_id
    ) {
      return json({ error: 'Access denied: connection belongs to another utility' }, 403);
    }

    const utilityId       = connection.utility_id as string;
    const connectionGroup = connection.user_group  as string | null;

    if (!connectionGroup) {
      return json({ error: 'Connection has no user_group — cannot determine pricing' }, 422);
    }

    /* ── 6. Find user_group by type ── */
    const { data: userGroups, error: ugErr } = await adminClient
      .from('user_groups')
      .select('id, type, name')
      .eq('utility_id', utilityId)
      .eq('type', connectionGroup)
      .limit(1);

    if (ugErr) return json({ error: ugErr.message }, 500);

    const userGroup = userGroups?.[0];
    if (!userGroup) {
      return json({
        error: `No user_group found for type '${connectionGroup}' in utility ${utilityId}`,
      }, 422);
    }

    /* ── 7. Find pricing package(s) for this user_group ── */
    // Supabase array operator: contains (user_group_ids @> ARRAY[userGroup.id])
    const { data: packages, error: pkgErr } = await adminClient
      .from('pricing_packages')
      .select('id, name, period_ids, user_group_ids')
      .eq('utility_id', utilityId)
      .contains('user_group_ids', [userGroup.id]);

    if (pkgErr) return json({ error: pkgErr.message }, 500);
    if (!packages || packages.length === 0) {
      return json({
        error: `No pricing package covers user_group '${userGroup.name}' (${connectionGroup})`,
      }, 422);
    }

    /* ── 8. Select best pricing period ── */
    // Billing period = reading dates
    const periodFromStr = fromReading.reading_date as string; // 'YYYY-MM-DD'
    const periodToStr   = toReading.reading_date   as string;

    // Collect all period IDs referenced by candidate packages
    const allPeriodIds = [
      ...new Set(packages.flatMap((p: any) => (p.period_ids ?? []) as string[])),
    ];

    let selectedPackage: any = null;
    let selectedPeriod:  any = null;

    if (allPeriodIds.length > 0) {
      const { data: periods, error: perErr } = await adminClient
        .from('pricing_periods')
        .select('id, start_date, end_date, is_active')
        .in('id', allPeriodIds)
        .eq('utility_id', utilityId);

      if (perErr) return json({ error: perErr.message }, 500);

      if (periods && periods.length > 0) {
        // Periods that overlap with [periodFrom, periodTo]
        const overlapping = periods.filter(
          (p: any) => p.start_date <= periodToStr && p.end_date >= periodFromStr,
        );

        // Priority: overlapping+active → overlapping → any active
        const best =
          overlapping.find((p: any) => p.is_active) ??
          overlapping[0] ??
          periods.find((p: any) => p.is_active) ??
          periods[0];

        if (best) {
          selectedPeriod = best;
          // Package that contains this period
          selectedPackage = packages.find((pkg: any) =>
            ((pkg.period_ids ?? []) as string[]).includes(best.id),
          );
        }
      }
    }

    // Fallback: first available package (no matching period found)
    if (!selectedPackage) {
      selectedPackage = packages[0];
    }

    /* ── 9. Load pricing tiers ── */
    const { data: tiers, error: tiersErr } = await adminClient
      .from('pricing_tiers')
      .select('min_consumption, max_consumption, price_per_unit, sort_order')
      .eq('package_id', selectedPackage.id)
      .order('min_consumption', { ascending: true });

    if (tiersErr) return json({ error: tiersErr.message }, 500);
    if (!tiers || tiers.length === 0) {
      return json({
        error: `Pricing package '${selectedPackage.name}' has no tiers defined`,
      }, 422);
    }

    /* ── 10. Tiered calculation ── */
    const roundedConsumption = Math.round(consumption * 1000) / 1000; // 3 decimals (litres precision)
    const amountBam = calcTiered(roundedConsumption, tiers as Tier[]);

    /* ── 11. Insert invoice ── */
    const invoiceRow = {
      connection_id:   connection_id,
      utility_id:      utilityId,
      reading_from_id: reading_from_id,
      reading_to_id:   reading_to_id,
      period_from:     periodFromStr,
      period_to:       periodToStr,
      consumption_m3:  roundedConsumption,
      amount_bam:      amountBam,
      status:          'draft',
      due_date:        due_date ?? null,
      created_by:      caller.id,
    };

    const { data: invoice, error: insertErr } = await adminClient
      .from('invoices')
      .insert(invoiceRow)
      .select('*, connections(meter_serial, address)')
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    console.info(
      `[calculate-invoice] Invoice created: ${invoice.id} | ` +
      `connection=${connection_id} | consumption=${roundedConsumption} m³ | ` +
      `amount=${amountBam} BAM | package=${selectedPackage.name}`,
    );

    return json({ invoice });

  } catch (err: any) {
    console.error('[calculate-invoice] Unexpected error:', err);
    return json({ error: err?.message ?? 'Internal server error' }, 500);
  }
});
