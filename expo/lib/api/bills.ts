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