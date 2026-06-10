import { supabase } from '@/lib/supabase';

export interface Material {
  id: string;
  utility_id: string;
  code: string | null;
  name: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  is_active: boolean;
  createdAt: number;
}

export const MATERIAL_UNITS = ['kom', 'm', 'm2', 'm3', 'kg', 'l', 'h', 'kompl'] as const;

const mapMaterial = (m: any): Material => ({
  id: m.id,
  utility_id: m.utility_id,
  code: m.code ?? null,
  name: m.name,
  unit: m.unit ?? 'kom',
  purchasePrice: m.purchase_price != null ? Number(m.purchase_price) : 0,
  salePrice: m.sale_price != null ? Number(m.sale_price) : 0,
  is_active: m.is_active ?? true,
  createdAt: m.created_at ? new Date(m.created_at).getTime() : 0,
});

/** Aktivni artikli iz kataloga za utility. */
export const getMaterials = async (utilityId: string, includeInactive = false): Promise<Material[]> => {
  let q = supabase
    .from('materials')
    .select('*')
    .eq('utility_id', utilityId)
    .order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapMaterial);
};

export const createMaterial = async (input: {
  utility_id: string;
  name: string;
  unit: string;
  code?: string;
  purchase_price?: number;
  sale_price?: number;
}): Promise<Material> => {
  const { data, error } = await supabase
    .from('materials')
    .insert({
      utility_id:     input.utility_id,
      name:           input.name,
      unit:           input.unit,
      code:           input.code ?? null,
      purchase_price: input.purchase_price ?? 0,
      sale_price:     input.sale_price ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapMaterial(data);
};

export const updateMaterial = async (
  id: string,
  updates: Partial<{ name: string; unit: string; code: string; purchase_price: number; sale_price: number; is_active: boolean }>,
): Promise<Material> => {
  const { data, error } = await supabase
    .from('materials')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapMaterial(data);
};

/** Soft-delete: deaktivira artikal (čuva historijske stavke naloga). */
export const deactivateMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('materials')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};
