import { supabase } from '@/lib/supabase';

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

export const getBills = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapInvoice);
};

export const getBillsByConnection = async (connectionId: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapInvoice);
};

export const getBillById = async (id: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, connections(meter_serial, address)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapInvoice(data);
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