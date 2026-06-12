import { supabase } from '@/lib/supabase';

export interface TaskMaterial {
  id: string;
  task_id: string;
  material_id: string | null;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TaskService {
  id: string;
  task_id: string;
  material_id: string | null;
  description: string;
  isExternal: boolean;
  provider: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

const mapMaterial = (m: any): TaskMaterial => ({
  id: m.id,
  task_id: m.task_id,
  material_id: m.material_id,
  name: m.name,
  unit: m.unit,
  quantity: Number(m.quantity),
  unitPrice: Number(m.unit_price),
  total: Number(m.quantity) * Number(m.unit_price),
});

const mapService = (s: any): TaskService => ({
  id: s.id,
  task_id: s.task_id,
  material_id: s.material_id ?? null,
  description: s.description,
  isExternal: !!s.is_external,
  provider: s.provider,
  quantity: Number(s.quantity),
  unit: s.unit,
  unitPrice: Number(s.unit_price),
  total: Number(s.quantity) * Number(s.unit_price),
});

/* ── Materijali ───────────────────────────────────── */
export const getTaskMaterials = async (taskId: string): Promise<TaskMaterial[]> => {
  const { data, error } = await supabase
    .from('task_materials')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapMaterial);
};

/** Radnik šalje samo material_id + količinu; server snapshot-uje cijenu iz kataloga. */
export const addTaskMaterial = async (input: {
  task_id: string;
  material_id: string;
  quantity: number;
}): Promise<TaskMaterial> => {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('task_materials')
    .insert({
      task_id:     input.task_id,
      material_id: input.material_id,
      quantity:    input.quantity,
      created_by:  auth?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapMaterial(data);
};

export const deleteTaskMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('task_materials').delete().eq('id', id);
  if (error) throw error;
};

/* ── Usluge / rad ─────────────────────────────────── */
export const getTaskServices = async (taskId: string): Promise<TaskService[]> => {
  const { data, error } = await supabase
    .from('task_services')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapService);
};

export const addTaskService = async (input: {
  task_id: string;
  description: string;
  is_external: boolean;
  quantity: number;
  unit?: string;
  provider?: string;
  unit_price?: number;
  /** Usluga iz kataloga — server snapshot-uje naziv/jedinicu/satnicu. */
  material_id?: string;
}): Promise<TaskService> => {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('task_services')
    .insert({
      task_id:     input.task_id,
      material_id: input.material_id ?? null,
      description: input.description,
      is_external: input.is_external,
      quantity:    input.quantity,
      unit:        input.unit ?? 'h',
      provider:    input.provider ?? null,
      unit_price:  input.unit_price ?? 0,
      created_by:  auth?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapService(data);
};

/** Admin/finance ažuriraju cijenu (i ostalo) na usluzi. */
export const updateTaskService = async (
  id: string,
  updates: Partial<{ unit_price: number; quantity: number; description: string; provider: string }>,
): Promise<TaskService> => {
  const { data, error } = await supabase
    .from('task_services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapService(data);
};

export const deleteTaskService = async (id: string): Promise<void> => {
  const { error } = await supabase.from('task_services').delete().eq('id', id);
  if (error) throw error;
};
