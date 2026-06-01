import { supabase } from '@/lib/supabase';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  assignedToName: string;
  createdBy: string | null;
  locationId: string | null;
  locationName: string;
  address: string;
  meterId: string | null;
  meterSerialNumber: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

// Disambiguate the assigned_to FK because tasks has two relationships to profiles
// (assigned_to and created_by).
const TASK_SELECT =
  '*, locations(name, address), water_meters(serial_number), assignee:profiles!tasks_assigned_to_fkey(name)';

const mapTask = (t: any): Task => ({
  id: t.id,
  title: t.title,
  description: t.description ?? '',
  status: t.status,
  priority: t.priority,
  assignedTo: t.assigned_to ?? null,
  assignedToName: t.assignee?.name ?? '',
  createdBy: t.created_by ?? null,
  locationId: t.location_id ?? null,
  locationName: t.locations?.name ?? '',
  address: t.locations?.address ?? '',
  meterId: t.meter_id ?? null,
  meterSerialNumber: t.water_meters?.serial_number ?? '',
  dueDate: t.due_date ?? null,
  completedAt: t.completed_at ?? null,
  createdAt: t.created_at,
});

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTask);
};

export const getTasksByUser = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTask);
};

export const getTaskById = async (id: string): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .single();

  if (error) throw error;
  return mapTask(data);
};

export const updateTaskStatus = async (
  id: string,
  status: TaskStatus,
): Promise<Task> => {
  const patch: Record<string, unknown> = { status };
  if (status === 'completed') {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(TASK_SELECT)
    .single();

  if (error) throw error;
  return mapTask(data);
};
