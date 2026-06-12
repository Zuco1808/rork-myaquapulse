import { supabase } from '@/lib/supabase';

export type BillPeriodFilter = 'all' | 'this_month' | 'last_3' | 'this_year';

function periodToGte(f: BillPeriodFilter): string | null {
  const now = new Date();
  if (f === 'this_month') return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  if (f === 'last_3') { const d = new Date(now); d.setMonth(d.getMonth()-3); return d.toISOString().split('T')[0]; }
  if (f === 'this_year') return `${now.getFullYear()}-01-01`;
  return null;
}

const mapInvoice = (b: any) => ({
  id: b.id,
  connection_id: b.connection_id,
  utility_id: b.utility_id,
  reading_from_id: b.reading_from_id,
  reading_to_id: b.reading_to_id,
  period_from: b.period_from,
  period_to: b.period_to,
  consumption_m3: b.consumption_m3,
  amount: b.amount_bam,
  currency: 'BAM',
  status: b.status,
  due_date: b.due_date,
  paid_at: b.paid_at,
  created_by: b.created_by,
  periodFrom: new Date(b.period_from).getTime(),
  periodTo: new Date(b.period_to).getTime(),
  dueDate: b.due_date ? new Date(b.due_date).getTime() : null,
  paidDate: b.paid_at ? new Date(b.paid_at).getTime() : null,
  meterSerial: b.connections?.meter_serial || '',
  address: b.connections?.address || '',
  createdAt: new Date(b.created_at).getTime(),
});

export interface BillsOpts {
  limit?: number;
  offset?: number;
  status?: string;
  periodFilter?: BillPeriodFilter;
}

export const getBills = async (opts?: BillsOpts) => {
  const limit  = opts?.limit  ?? 30;
  const offset = opts?.offset ?? 0;
  let q = supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const gte = opts?.periodFilter ? periodToGte(opts.periodFilter) : null;
  if (gte) q = q.gte('period_from', gte);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapInvoice);
};

export const getBillsByConnection = async (connectionId: string, opts?: BillsOpts) => {
  const limit  = opts?.limit  ?? 30;
  const offset = opts?.offset ?? 0;
  let q = supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const gte = opts?.periodFilter ? periodToGte(opts.periodFilter) : null;
  if (gte) q = q.gte('period_from', gte);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapInvoice);
};

export const getBillById = async (id: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, connections(meter_serial, address), water_utilities(name, city)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...mapInvoice(data),
    utilityName: (data as any).water_utilities?.name ?? null,
    utilityCity: (data as any).water_utilities?.city ?? null,
  };
};

export const createBill = async (bill: {
  connection_id: string;
  utility_id: string;
  period_from: string;
  period_to: string;
  amount_bam: number;
  consumption_m3?: number;
  due_date?: string;
  reading_from_id?: string;
  reading_to_id?: string;
}) => {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...bill, status: 'draft' })
    .select()
    .single();

  if (error) throw error;
  return mapInvoice(data);
};

export const updateBillStatus = async (
  id: string,
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  paid_at?: string
) => {
  const updates: any = { status };
  if (paid_at) updates.paid_at = paid_at;

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapInvoice(data);
};

export const bulkUpdateBillStatus = async (
  ids: string[],
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  paid_at?: string
) => {
  const updates: any = { status };
  if (paid_at) updates.paid_at = paid_at;

  const { error } = await supabase
    .from('invoices')
    .update(updates)
    .in('id', ids);

  if (error) throw error;
};

/**
 * Poziva calculate-invoice Edge Function koja automatski:
 *  1. Kalkuliše potrošnju (to.value - from.value)
 *  2. Pronalazi odgovarajući cjenovni paket (user_group → package → tiers)
 *  3. Primjenjuje tiered pricing
 *  4. Kreira fakturu sa status='draft'
 *
 * Vraća kreiran invoice mapiran na lokalnu strukturu.
 */
export const calculateInvoice = async (params: {
  connection_id:   string;
  reading_from_id: string;
  reading_to_id:   string;
  due_date?:       string; // ISO date string, npr. '2026-07-15'
}) => {
  const { data, error } = await supabase.functions.invoke<{ invoice: any }>('calculate-invoice', {
    body: params,
  });
  if (error) throw error;
  if (!data?.invoice) throw new Error('No invoice returned from calculate-invoice');
  return mapInvoice(data.invoice);
};

/**
 * Kreira draft fakturu iz servisnog naloga (korisnik snosi troškove).
 * Iznos = material_cost + labor_cost. Veže fakturu na task i označava nalog
 * fakturisanim. Vraća kreiranu fakturu.
 */
export const createInvoiceFromTask = async (task: {
  id: string;
  utility_id: string;
  connection_id?: string | null;
  material_cost?: number;
  labor_cost?: number;
}) => {
  if (!task.connection_id) {
    throw new Error('Nalog nema priključak — nije moguće fakturisati korisniku.');
  }
  const amount = Math.round(((task.material_cost ?? 0) + (task.labor_cost ?? 0)) * 100) / 100;
  if (amount <= 0) {
    throw new Error('Ukupan trošak naloga je 0 — nema šta fakturisati.');
  }
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      connection_id: task.connection_id,
      utility_id:    task.utility_id,
      period_from:   today,
      period_to:     today,
      amount_bam:    amount,
      status:        'draft',
      task_id:       task.id,
    })
    .select()
    .single();
  if (error) throw error;

  // Označi nalog fakturisanim
  await supabase.from('tasks').update({ invoiced_at: new Date().toISOString() }).eq('id', task.id);

  return mapInvoice(data);
};

/**
 * Šalje fakturu e-mailom krajnjem korisniku preko send-invoice-email Edge
 * Function (Resend). Postavlja status na 'sent' ako je bio draft/pending.
 * Vraća e-mail na koji je poslano.
 */
export const sendInvoiceEmail = async (params: {
  invoice_id: string;
  recipient_email?: string;
}): Promise<{ sent: boolean; email: string }> => {
  const { data, error } = await supabase.functions.invoke<{ sent: boolean; email: string; error?: string }>(
    'send-invoice-email',
    { body: params },
  );
  if (error) {
    // Edge Function vraća poruku u tijelu — pokušaj je izvući
    const ctx = (error as any)?.context;
    let msg = error.message;
    try { const body = await ctx?.json?.(); if (body?.error) msg = body.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (!data?.sent) throw new Error((data as any)?.error || 'Slanje e-maila nije uspjelo.');
  return { sent: data.sent, email: data.email };
};

/* ── Tiered pricing helper ─────────────────────────────── */
function applyTiers(tiers: any[], consumption: number): number {
  if (!tiers.length || consumption <= 0) return 0;
  const sorted = [...tiers].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  let total = 0;
  let remaining = consumption;
  for (const t of sorted) {
    if (remaining <= 0) break;
    const inTier = Math.min(remaining, (t.max_consumption ?? Infinity) - t.min_consumption);
    if (inTier > 0) { total += inTier * (t.price_per_unit ?? 0); remaining -= inTier; }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Recalculates amount_bam for an existing draft invoice using the utility's
 * tiered pricing packages. Falls back to 0 if no pricing is configured.
 */
export const recalculateDraftInvoice = async (invoiceId: string) => {
  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .select('*, connections(user_group, utility_id)')
    .eq('id', invoiceId)
    .single();
  if (invErr) throw invErr;

  const consumption = Number(inv.consumption_m3 ?? 0);
  const userGroup   = (inv as any).connections?.user_group ?? 'residential';
  const utilityId   = inv.utility_id;

  // 1. Find user_group record matching connection's user_group type
  const { data: ugRows } = await supabase
    .from('user_groups')
    .select('id')
    .eq('utility_id', utilityId)
    .eq('type', userGroup)
    .limit(1);

  // 2. Find pricing package — by user_group or default
  let tiers: any[] = [];
  const ugId = ugRows?.[0]?.id;
  const pkgQuery = supabase
    .from('pricing_packages')
    .select('id, pricing_tiers(*)')
    .eq('utility_id', utilityId);

  const { data: pkgs } = ugId
    ? await pkgQuery.contains('user_group_ids', [ugId]).limit(1)
    : await pkgQuery.eq('is_default', true).limit(1);

  if (pkgs?.length) {
    tiers = (pkgs[0] as any).pricing_tiers ?? [];
  } else {
    // Last resort: default package
    const { data: defaults } = await supabase
      .from('pricing_packages')
      .select('id, pricing_tiers(*)')
      .eq('utility_id', utilityId)
      .eq('is_default', true)
      .limit(1);
    tiers = (defaults?.[0] as any)?.pricing_tiers ?? [];
  }

  const amount = applyTiers(tiers, consumption);

  const { data, error } = await supabase
    .from('invoices')
    .update({ amount_bam: amount })
    .eq('id', invoiceId)
    .select('*, connections(meter_serial, address)')
    .single();
  if (error) throw error;
  return mapInvoice(data);
};

export const getInvoicesByUser = async (userId: string, opts?: BillsOpts) => {
  const limit  = opts?.limit  ?? 30;
  const offset = opts?.offset ?? 0;

  const { data: conns, error: connsError } = await supabase
    .from('connections')
    .select('id')
    .eq('user_id', userId);

  if (connsError) throw connsError;
  if (!conns || conns.length === 0) return [];

  const ids = conns.map((c: any) => c.id);

  let q = supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .in('connection_id', ids)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const gte = opts?.periodFilter ? periodToGte(opts.periodFilter) : null;
  if (gte) q = q.gte('period_from', gte);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapInvoice);
};