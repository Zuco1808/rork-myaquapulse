import { supabase } from '@/lib/supabase';

const mapBill = (b: any) => ({
  id: b.id,
  userId: b.user_id,
  meterId: b.meter_id,
  locationId: b.location_id,
  amount: b.amount,
  currency: b.currency || 'BAM',
  periodFrom: new Date(b.period_from).getTime(),
  periodTo: new Date(b.period_to).getTime(),
  dueDate: new Date(b.due_date).getTime(),
  issueDate: b.issue_date ? new Date(b.issue_date).getTime() : null,
  paidDate: b.paid_date ? new Date(b.paid_date).getTime() : null,
  status: b.status,
  consumption: b.consumption,
  notes: b.notes,
  userName: b.profiles?.name || '',
  userEmail: b.profiles?.email || '',
  meterSerial: b.water_meters?.serial_number || '',
  locationName: b.locations?.name || '',
  createdAt: new Date(b.created_at).getTime(),
});

export const getBills = async () => {
  const { data, error } = await supabase
    .from('bills')
    .select('*, profiles(name, email), water_meters(serial_number), locations(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapBill);
};

export const getBillsByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('bills')
    .select('*, profiles(name, email), water_meters(serial_number), locations(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapBill);
};

export const getBillById = async (id: string) => {
  const { data, error } = await supabase
    .from('bills')
    .select('*, profiles(name, email), water_meters(serial_number), locations(name)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapBill(data);
};

export const createBill = async (bill: {
  user_id: string;
  meter_id: string;
  location_id?: string;
  amount: number;
  currency?: string;
  period_from: string;
  period_to: string;
  due_date: string;
  consumption?: number;
  notes?: string;
}) => {
  const { data, error } = await supabase
    .from('bills')
    .insert({ ...bill, status: 'draft' })
    .select()
    .single();

  if (error) throw error;
  return mapBill(data);
};

export const updateBillStatus = async (
  id: string,
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled',
  paidDate?: string
) => {
  const updates: any = { status };
  if (paidDate) updates.paid_date = paidDate;

  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapBill(data);
};
