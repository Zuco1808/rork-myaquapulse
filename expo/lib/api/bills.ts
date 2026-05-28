import { supabase } from '@/lib/supabase';

export type PricingPackageType = 'standard' | 'business';

export const PRICING_PACKAGES: Record<PricingPackageType, {
  name: string;
  tiers: { min: number; max: number; price: number; label: string }[];
}> = {
  standard: {
    name: 'Standardni paket',
    tiers: [
      { min: 0, max: 5, price: 1.20, label: 'Osnovna potrošnja' },
      { min: 5, max: 15, price: 1.80, label: 'Standardna potrošnja' },
      { min: 15, max: 30, price: 2.50, label: 'Povećana potrošnja' },
      { min: 30, max: Infinity, price: 3.80, label: 'Prekomjerna potrošnja' },
    ],
  },
  business: {
    name: 'Poslovni paket',
    tiers: [
      { min: 0, max: 10, price: 2.00, label: 'Osnovna poslovna potrošnja' },
      { min: 10, max: 50, price: 2.50, label: 'Standardna poslovna potrošnja' },
      { min: 50, max: Infinity, price: 3.00, label: 'Povećana poslovna potrošnja' },
    ],
  },
};

export interface BillBreakdownItem {
  label: string;
  consumption: number;
  pricePerUnit: number;
  amount: number;
}

export interface BillCalculation {
  total: number;
  breakdown: BillBreakdownItem[];
}

export const calculateBillAmount = (
  consumption: number,
  packageType: PricingPackageType = 'standard'
): BillCalculation => {
  const pkg = PRICING_PACKAGES[packageType];
  let remaining = consumption;
  let total = 0;
  const breakdown: BillBreakdownItem[] = [];

  for (const tier of pkg.tiers) {
    if (remaining <= 0) break;
    const tierRange = tier.max === Infinity ? remaining : tier.max - tier.min;
    const consumed = Math.min(remaining, tierRange);
    if (consumed > 0) {
      const amount = Math.round(consumed * tier.price * 100) / 100;
      breakdown.push({ label: tier.label, consumption: consumed, pricePerUnit: tier.price, amount });
      total += amount;
    }
    remaining -= consumed;
  }

  return { total: Math.round(total * 100) / 100, breakdown };
};

export const getReadingsForBilling = async () => {
  const { data, error } = await supabase
    .from('meter_readings')
    .select(`
      *,
      water_meters(
        id,
        serial_number,
        user_id,
        location_id,
        locations(name, address),
        profiles(name, email)
      )
    `)
    .eq('status', 'verified')
    .not('consumption', 'is', null)
    .gt('consumption', 0)
    .order('reading_date', { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    meterId: r.meter_id,
    meterSerial: r.water_meters?.serial_number || '',
    userId: r.water_meters?.user_id || '',
    locationId: r.water_meters?.location_id || null,
    userName: r.water_meters?.profiles?.name || '',
    userEmail: r.water_meters?.profiles?.email || '',
    locationName: r.water_meters?.locations?.name || '',
    locationAddress: r.water_meters?.locations?.address || '',
    value: r.value,
    previousValue: r.previous_value,
    consumption: r.consumption as number,
    readingDate: new Date(r.reading_date).getTime(),
    readMethod: r.read_method,
  }));
};

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

// Marks issued/draft bills past their due_date as overdue in Supabase.
// Returns the number of bills updated.
export const markOverdueBills = async (): Promise<number> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('bills')
    .update({ status: 'overdue' })
    .in('status', ['issued', 'draft'])
    .lt('due_date', now)
    .select('id');

  if (error) throw error;
  return (data || []).length;
};

export const getBills = async () => {
  await markOverdueBills().catch(() => {});

  const { data, error } = await supabase
    .from('bills')
    .select('*, profiles(name, email), water_meters(serial_number), locations(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapBill);
};

export const getBillsByUser = async (userId: string) => {
  await markOverdueBills().catch(() => {});

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

  const bill = mapBill(data);
  // Auto-mark this bill overdue if needed
  if ((bill.status === 'issued' || bill.status === 'draft') && bill.dueDate < Date.now()) {
    await supabase.from('bills').update({ status: 'overdue' }).eq('id', id).catch(() => {});
    return { ...bill, status: 'overdue' as const };
  }
  return bill;
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
