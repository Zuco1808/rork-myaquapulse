import { supabase } from '@/lib/supabase';

/* ── types ───────────────────────────────────────────── */
export type NotifType       = 'info' | 'warning' | 'error' | 'success';
export type NotifEntityType = 'meter' | 'reading' | 'bill' | 'task' | 'connection';

export interface AppNotification {
  id:                  string;
  user_id:             string;
  utility_id:          string | null;
  title:               string;
  message:             string;
  type:                NotifType;
  is_read:             boolean;
  related_entity_id:   string | null;
  related_entity_type: NotifEntityType | null;
  created_at:          string;
  created_by:          string | null;
}

const mapNotif = (n: any): AppNotification => ({
  id:                  n.id,
  user_id:             n.user_id,
  utility_id:          n.utility_id ?? null,
  title:               n.title,
  message:             n.message,
  type:                n.type as NotifType,
  is_read:             n.is_read,
  related_entity_id:   n.related_entity_id ?? null,
  related_entity_type: n.related_entity_type ?? null,
  created_at:          n.created_at,
  created_by:          n.created_by ?? null,
});

/* ── queries ─────────────────────────────────────────── */

/** Vraća notifikacije trenutnog korisnika (RLS filtrira automatski) */
export const getMyNotifications = async (): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(mapNotif);
};

/** Broj nepročitanih notifikacija */
export const getUnreadCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
};

/* ── mutations ───────────────────────────────────────── */

export const markAsRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
};

export const markAllAsRead = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  if (error) throw error;
};

/**
 * Šalje notifikaciju jednom ili više korisnika.
 *
 * Logika je premještena u Supabase Edge Function `send-notification`:
 *  - Push tokeni se NIKAD ne šalju na klijent
 *  - Tenant scoping (utility_id) se enforcea server-side
 *  - Expo HTTP poziv se dešava server-side (pouzdan, ne ovisi o app lifecycle-u)
 *
 * Vraća broj korisnika kojima je notifikacija poslana.
 */
export const sendNotification = async (params: {
  title:               string;
  message:             string;
  type:                NotifType;
  targetAll?:          boolean;
  targetRoles?:        string[];
  utility_id?:         string | null;
  related_entity_id?:  string;
  related_entity_type?: NotifEntityType;
}): Promise<number> => {
  const { data, error } = await supabase.functions.invoke<{ sent: number }>('send-notification', {
    body: params,
  });

  if (error) throw error;
  return data?.sent ?? 0;
};
