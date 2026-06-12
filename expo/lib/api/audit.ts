import { supabase } from '@/lib/supabase';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  id: string;
  user_id: string | null;
  userName: string | null;
  utility_id: string | null;
  entity: string;
  entity_id: string | null;
  action: AuditAction;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  createdAt: number;
  /** Polja koja su se promijenila (za UPDATE), bez tehničkih kolona. */
  changes: { field: string; from: any; to: any }[];
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  invoices:         'Račun',
  payments:         'Uplata',
  meter_readings:   'Očitanje',
  tasks:            'Zadatak',
  task_materials:   'Materijal naloga',
  task_services:    'Usluga naloga',
  materials:        'Artikal',
  pricing_packages: 'Cjenovni paket',
  pricing_tiers:    'Tarifni razred',
  pricing_periods:  'Cjenovni period',
  user_groups:      'Grupa korisnika',
  connections:      'Priključak',
};

const IGNORED_FIELDS = new Set(['updated_at', 'created_at']);

const diffChanges = (
  oldV: Record<string, any> | null,
  newV: Record<string, any> | null,
): { field: string; from: any; to: any }[] => {
  if (!oldV || !newV) return [];
  const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  const out: { field: string; from: any; to: any }[] = [];
  for (const k of keys) {
    if (IGNORED_FIELDS.has(k)) continue;
    if (JSON.stringify(oldV[k]) !== JSON.stringify(newV[k])) {
      out.push({ field: k, from: oldV[k], to: newV[k] });
    }
  }
  return out;
};

const mapEntry = (r: any): AuditEntry => ({
  id: r.id,
  user_id: r.user_id,
  userName: r.profiles?.full_name ?? null,
  utility_id: r.utility_id,
  entity: r.entity_name,
  entity_id: r.entity_id,
  action: r.action,
  oldValue: r.old_value,
  newValue: r.new_value,
  createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  changes: r.action === 'UPDATE' ? diffChanges(r.old_value, r.new_value) : [],
});

export const getAuditLog = async (opts?: {
  limit?: number;
  offset?: number;
  entity?: string;
}): Promise<AuditEntry[]> => {
  const limit  = opts?.limit  ?? 50;
  const offset = opts?.offset ?? 0;
  let q = supabase
    .from('audit_log')
    .select('*, profiles:user_id ( full_name )')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (opts?.entity && opts.entity !== 'all') q = q.eq('entity_name', opts.entity);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapEntry);
};
