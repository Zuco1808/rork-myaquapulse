import { supabase } from '@/lib/supabase';
import type { WaterAlert } from '@/types/location';

const ALERT_SELECT =
  '*, water_meters(serial_number, user_id, locations(name, address)), companies(name)';

const ALERT_SELECT_INNER =
  '*, water_meters!inner(serial_number, user_id, locations(name, address)), companies(name)';

const mapAlert = (a: any): WaterAlert => ({
  id: a.id,
  meterId: a.meter_id,
  companyId: a.company_id ?? undefined,
  companyName: a.companies?.name ?? undefined,
  title: a.title ?? undefined,
  meterName: a.water_meters?.serial_number ?? undefined,
  locationName: a.water_meters?.locations?.name ?? undefined,
  type: a.type,
  severity: a.severity,
  message: a.message,
  value: a.value ?? undefined,
  threshold: a.threshold ?? undefined,
  unit: a.unit ?? undefined,
  isResolved: a.is_resolved ?? false,
  createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
  resolvedAt: a.resolved_at ? new Date(a.resolved_at).getTime() : undefined,
});

export const getAlerts = async (): Promise<WaterAlert[]> => {
  const { data, error } = await supabase
    .from('water_alerts')
    .select(ALERT_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAlert);
};

export const getAlertsByCompany = async (
  companyId: string,
): Promise<WaterAlert[]> => {
  const { data, error } = await supabase
    .from('water_alerts')
    .select(ALERT_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAlert);
};

export const getAlertsByUser = async (userId: string): Promise<WaterAlert[]> => {
  const { data, error } = await supabase
    .from('water_alerts')
    .select(ALERT_SELECT_INNER)
    .eq('water_meters.user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAlert);
};

export const resolveAlert = async (id: string): Promise<WaterAlert> => {
  const { data, error } = await supabase
    .from('water_alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select(ALERT_SELECT)
    .single();

  if (error) throw error;
  return mapAlert(data);
};
