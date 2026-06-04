import { supabase } from '@/lib/supabase';
import { Task } from '@/types/user';

type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
type TaskType  = 'reading' | 'worker' | 'inspection' | 'installation' | 'other';
type Priority  = 'low' | 'normal' | 'high' | 'urgent';

const mapTask = (t: any): Task => ({
  id:           t.id,
  utility_id:   t.utility_id,
  assigned_to:  t.assigned_to,
  created_by:   t.created_by,
  connection_id: t.connection_id,
  title:        t.title,
  description:  t.description,
  task_type:    t.task_type,
  priority:     t.priority,
  status:       t.status,
  due_date:     t.due_date,
  completed_at: t.completed_at,
  created_at:   t.created_at,
  updated_at:   t.updated_at,
  // joined data
  assigned_to_name: t.profiles?.full_name ?? null,
  connection_address: t.connections?.address ?? null,
  connection_serial:  t.connections?.meter_serial ?? null,
});

/* ── Queries ─────────────────────────────────────── */

export const getTasks = async (opts?: { limit?: number; offset?: number }): Promise<Task[]> => {
  const limit  = opts?.limit  ?? 40;
  const offset = opts?.offset ?? 0;
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      profiles:assigned_to ( full_name ),
      connections:connection_id ( address, meter_serial )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []).map(mapTask);
};

export const getMyTasks = async (workerId: string, utilityId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      profiles:assigned_to ( full_name ),
      connections:connection_id ( address, meter_serial )
    `)
    .eq('utility_id', utilityId)
    .or(`assigned_to.eq.${workerId},assigned_to.is.null`)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapTask);
};

/* ── Mutations ───────────────────────────────────── */

export const createTask = async (task: {
  utility_id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: Priority;
  assigned_to?: string;
  connection_id?: string;
  due_date?: string;
}): Promise<Task> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, status: 'open', created_by: user?.id })
    .select(`
      *,
      profiles:assigned_to ( full_name ),
      connections:connection_id ( address, meter_serial )
    `)
    .single();

  if (error) throw error;
  return mapTask(data);
};

export const updateTaskStatus = async (
  id: string,
  status: TaskStatus,
  note?: string,
  assignTo?: string,
): Promise<Task> => {
  const updates: Record<string, unknown> = { status };
  if (status === 'done')      updates.completed_at = new Date().toISOString();
  if (assignTo)               updates.assigned_to = assignTo;
  if (status === 'cancelled' && note) updates.description =
    (await getTaskById(id)).description + `\n\n[Razlog otkazivanja]: ${note}`;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      profiles:assigned_to ( full_name ),
      connections:connection_id ( address, meter_serial )
    `)
    .single();

  if (error) throw error;
  return mapTask(data);
};

export const getTaskById = async (id: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      profiles:assigned_to ( full_name ),
      connections:connection_id ( address, meter_serial )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapTask(data);
};

export const assignTask = async (id: string, workerId: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ assigned_to: workerId })
    .eq('id', id)
    .select(`*, profiles:assigned_to ( full_name ), connections:connection_id ( address, meter_serial )`)
    .single();

  if (error) throw error;
  return mapTask(data);
};
