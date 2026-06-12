import { supabase } from '@/lib/supabase';

export type PaymentMethod = 'bank_transfer' | 'cash' | 'e_banking' | 'card' | 'other';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bankovni transfer',
  cash:          'Gotovina',
  e_banking:     'E-bankarstvo',
  card:          'Kartica',
  other:         'Ostalo',
};

export interface Payment {
  id: string;
  invoice_id: string;
  utility_id: string;
  amount: number;
  method: PaymentMethod;
  reference_number: string | null;
  payment_date: string;
  note: string | null;
  created_by: string | null;
  createdAt: number;
  paymentDate: number;
}

const mapPayment = (p: any): Payment => ({
  id: p.id,
  invoice_id: p.invoice_id,
  utility_id: p.utility_id,
  amount: Number(p.amount_bam),
  method: p.payment_method,
  reference_number: p.reference_number,
  payment_date: p.payment_date,
  note: p.note,
  created_by: p.created_by,
  createdAt: p.created_at ? new Date(p.created_at).getTime() : 0,
  paymentDate: p.payment_date ? new Date(p.payment_date).getTime() : 0,
});

/** Sve uplate za jednu fakturu (najnovije prvo). */
export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPayment);
};

/** Ukupno uplaćeno na fakturu. */
export const getTotalPaid = async (invoiceId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('payments')
    .select('amount_bam')
    .eq('invoice_id', invoiceId);
  if (error) throw error;
  return (data || []).reduce((sum, r: any) => sum + Number(r.amount_bam), 0);
};

/**
 * Evidentira novu uplatu. DB trigger automatski ažurira invoice.status
 * (paid kad suma uplata ≥ iznos fakture, inače sent).
 */
export const createPayment = async (input: {
  invoice_id: string;
  utility_id: string;
  amount: number;
  method: PaymentMethod;
  reference_number?: string;
  payment_date?: string; // ISO date 'YYYY-MM-DD'
  note?: string;
}): Promise<Payment> => {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id:       input.invoice_id,
      utility_id:       input.utility_id,
      amount_bam:       input.amount,
      payment_method:   input.method,
      reference_number: input.reference_number ?? null,
      payment_date:     input.payment_date ?? new Date().toISOString().split('T')[0],
      note:             input.note ?? null,
      created_by:       auth?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPayment(data);
};

/** Briše uplatu. Trigger vraća invoice status na 'sent' ako više nije pokriven. */
export const deletePayment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
};
